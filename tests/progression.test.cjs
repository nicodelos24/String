const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup() {
  const elements = new Map();
  function element(key) {
    if (!elements.has(key)) elements.set(key, {
      options: [], selectedIndex: 0, handlers: {}, style: {setProperty() {}},
      set innerHTML(html) {
        this.html = html;
        this.options = [...html.matchAll(/<option value="([^"]*)"(?: data-note="([^"]*)")?/g)].map(m => ({value:m[1], dataset:{note:m[2]}}));
      },
      get innerHTML() { return this.html || ''; },
      set value(value) { this.currentValue = String(value); const i = this.options.findIndex(o => o.value === String(value)); if (i >= 0) this.selectedIndex = i; },
      get value() { return this.currentValue; },
      addEventListener(name, fn) { this.handlers[name] = fn; },
      querySelectorAll() { return []; },
      querySelector(selector) { return element(key + selector); },
      setAttribute() {},
    });
    return elements.get(key);
  }
  const ctx = vm.createContext({document:{querySelector:element}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),ctx);
  const run = code => vm.runInContext(code,ctx);
  const change = (key,value) => element(key).handlers.change({target:{value}});
  return {run,change,element};
}

test('E major and C minor remain independent after repeated selection and adding', () => {
  const {run,change,element} = setup();
  run("root = 4; rootNoteName = 'E'; updateView(); addProgressionChord();");
  const majorIndex = run('activeProgression');
  change('#quality-select','minor');
  run("root = 0; rootNoteName = 'C'; updateView(); addProgressionChord();");
  const minorIndex = run('activeProgression');
  for(let i=0;i<3;i++) {
    run('selectProgressionChord(' + majorIndex + ')');
    assert.equal(run('quality'), 'major');
    assert.equal(element('#chord-readout').textContent,'E');
    run('selectProgressionChord(' + minorIndex + ')');
    assert.equal(run('quality'), 'minor');
    assert.equal(element('#chord-readout').textContent,'Cm');
  }
  run('selectProgressionChord(' + majorIndex + '); addProgressionChord();');
  assert.equal(run('progression.at(-1).type'),'maj');
  assert.equal(run('progression[' + minorIndex + '].type'),'m');
});

test('saved spelling, mode and overlay survive changes to the current chord', () => {
  const {run,element} = setup();
  run("root = 1; rootNoteName = 'Db'; selectedMode = 'lydian'; ghostMode = 'ionian'; addProgressionChord();");
  const index = run('activeProgression');
  run("root = 6; rootNoteName = 'F#'; selectedMode = 'ionian'; renderProgression();");
  assert(element('#progression').innerHTML.includes('<strong>Db</strong>'));
  run('selectProgressionChord(' + index + ')');
  assert.equal(run('rootNoteName'),'Db');
  assert.equal(element('#root-select').options[element('#root-select').selectedIndex].dataset.note,'Db');
  assert.equal(run('selectedMode'),'lydian');
  assert.equal(run('ghostMode'),'ionian');
});

test('existing seventh chords retain their type and intervals', () => {
  const {run,element} = setup();
  for (const [index,name,type] of [[1,'Fm7','m7'],[2,'G7','7']]) {
    run('selectProgressionChord(' + index + '); updateView();');
    assert.equal(element('#chord-readout').textContent,name);
    assert.equal(run('chordType.value'),type);
    assert.equal(run('chordType.intervals.includes(10)'),true);
  }
});

test('deleting before or at the active chord keeps selection consistent', () => {
  const {run,element} = setup();
  run('selectProgressionChord(2); removeProgressionChord(0);');
  assert.equal(run('activeProgression'),1);
  assert.equal(element('#chord-readout').textContent,'G7');
  run('removeProgressionChord(1);');
  assert.equal(element('#chord-readout').textContent,'C');
  run('removeProgressionChord(0); removeProgressionChord(0);');
  assert.equal(run('progression.length'),1);
});

test('changing quality detaches the draft without modifying saved chords', () => {
  const {run,change} = setup();
  const before = run('JSON.stringify(progression)');
  change('#quality-select','diminished');
  assert.equal(run('activeProgression'),-1);
  assert.equal(run('chordType.value'),'dim');
  assert.equal(run('JSON.stringify(progression)'),before);
});

test('piano accidental switch updates black keys and keeps preference across natural notes', () => {
  const {run,element} = setup();
  element('#root-spelling').handlers.change({target:{checked:true}});
  assert(element('#root-piano').innerHTML.includes('D♭'));
  assert(!element('#root-piano').innerHTML.includes('C♯'));
  run("choosePianoRoot(2, 'D');");
  assert.equal(element('#root-spelling').checked,true);
  run("choosePianoRoot(1, 'Db'); addProgressionChord();");
  const saved = run('activeProgression');
  element('#root-spelling').handlers.change({target:{checked:false}});
  assert.equal(run('rootNoteName'),'C#');
  assert.equal(run('progression[' + saved + '].rootNoteName'),'Db');
  assert(element('#root-piano').innerHTML.includes('C♯'));
  run('selectProgressionChord(' + saved + ')');
  assert.equal(element('#root-spelling').checked,true);
  assert.equal(element('#selected-root-note').textContent,'D♭');
});

test('pentatonic signatures use the appropriate major reference', () => {
  const {run,element} = setup();
  for (const [pitch, name, mode, key] of [[9,'A','minorPentatonic','C'],[0,'C','minorPentatonic','Eb'],[4,'E','minorPentatonic','G'],[6,'F#','minorPentatonic','A'],[1,'Db','majorPentatonic','Db']]) {
    run(`root = ${pitch}; rootNoteName = '${name}'; selectedMode = '${mode}'; updateView();`);
    assert.equal(run('calculateKeySignature(selectedMode, root).key'), key);
    assert.equal(run('selectedTonality.key'), key);
    assert(element('#key-signature-display').textContent.startsWith(key + ' Mayor'));
    const intervals = mode === 'minorPentatonic' ? [0,3,5,7,10] : [0,2,4,7,9];
    assert.equal(run('JSON.stringify(getModeNotes(selectedMode, root))'), JSON.stringify(intervals.map(i=>(pitch+i)%12)));
  }
});

test('triad highlighting excludes extensions and keeps altered fifths', () => {
  const {run} = setup();
  for (const [type, triad, excluded] of [['maj7',[0,4,7],[11]],['m7',[0,3,7],[10]],['7',[0,4,7],[10]],['maj9',[0,4,7],[11,2]],['dim7',[0,3,6],[9]],['aug',[0,4,8],[]]]) {
    run(`chordType = chordTypes.find(type => type.value === '${type}');`);
    for (const interval of triad) assert.equal(run(`shouldHighlightInterval(${interval}, 1)`),true);
    for (const interval of excluded) {
      assert.equal(run(`shouldHighlightInterval(${interval}, 1)`),false);
      assert.equal(run(`shouldHighlightInterval(${interval}, 0)`),true);
    }
  }
});
