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

function setupPlayerInterface() {
  const fixture = setup();
  fixture.run(`
    let testPlayer;
    const window = {handlers: {}, addEventListener(name, fn) {this.handlers[name] = fn;}};
    const chordToMidi = ${require('../progression-player.js').chordToMidi.toString()};
    class ProgressionPlayer {
      constructor(callbacks) {this.callbacks = callbacks; testPlayer = this;}
      async start(chords, options) {
        this.chords = chords; this.options = options; this.running = true;
        this.callbacks.onState(true);
      }
      stop() {this.running = false; this.callbacks.onState(false);}
      setVolume(value) {this.volume = value;}
      setDrumVolume(value) {this.drumVolume = value;}
    }
  `);
  fixture.element('#player-bpm').value = '120';
  fixture.element('#player-bpm').reportValidity = () => true;
  fixture.element('#player-loop').checked = true;
  fixture.element('#player-style').value = 'none';
  fixture.element('#player-percussion').checked = true;
  fixture.run(fs.readFileSync(path.join(__dirname,'../player-ui.js'),'utf8'));
  return fixture;
}

test('PLY-12: player controls pass saved chords to audio and follow their mode in the editor', async () => {
  const {run,element} = setupPlayerInterface();
  const before = run('JSON.stringify(progression)');
  await element('#player-toggle').handlers.click();
  assert.equal(run('testPlayer.chords[1].name'),'Fm7');
  assert.equal(run('JSON.stringify(testPlayer.chords[1].notes)'),'[53,56,60,63]');
  assert.equal(run('testPlayer.options.bpm'),120);
  assert.equal(element('#player-bpm').disabled,true);
  run("testPlayer.callbacks.onChord(1, 'Fm7', 4);");
  assert.equal(element('#player-status').textContent,'Sonando: Fm7 · acorde 2 de 4');
  assert.equal(run('JSON.stringify(progression)'),before);
  assert.equal(run('activeProgression'),1);
  assert.equal(element('#chord-readout').textContent,'Fm7');
  assert.equal(run('selectedMode'),'aeolian');
  await element('#player-toggle').handlers.click();
  assert.equal(element('#player-bpm').disabled,false);
  assert.equal(element('#player-status').textContent,'Detenido');
});

test('mode selection proposes the diatonic seventh and preserves mode on save', () => {
  const {run} = setup();
  for (const [quality,mode,type] of [['major','ionian','maj7'],['major','lydian','maj7'],['major','mixolydian','7'],['minor','dorian','m7'],['minor','aeolian','m7'],['minor','phrygian','m7'],['diminished','locrian','m7b5']]) {
    run(`quality='${quality}'; chooseMode('${mode}'); addProgressionChord();`);
    assert.equal(run('progression.at(-1).type'),type);
    assert.equal(run('progression.at(-1).mode'),mode);
    run('selectProgressionChord(progression.length-1)');
    assert.equal(run('chordType.value'),type);
  }
  run("quality='minor'; chooseMode('minorPentatonic');");
  assert.equal(run('chordType.value'),'m');
});

test('moving cards in both directions preserves selected chord and all saved settings', () => {
  const {run} = setup();
  run("selectProgressionChord(1); progression[1].mode='dorian'; progression[1].ghostMode='aeolian'; moveProgressionChord(1,3);");
  assert.equal(run('activeProgression'),3);
  assert.equal(run('progression[3].type'),'m7');
  assert.equal(run('progression[3].mode'),'dorian');
  assert.equal(run('progression[3].ghostMode'),'aeolian');
  run('moveProgressionChord(3,0)');
  assert.equal(run('activeProgression'),0);
  run('moveProgressionChord(0,-1)');
  assert.equal(run('progression.length'),4);
});

test('playback follows its saved snapshot after cards are moved or deleted', async () => {
  const {run,element} = setupPlayerInterface();
  run("progression[1].mode='dorian'; progression[1].ghostMode='aeolian';");
  await element('#player-toggle').handlers.click();
  run("moveProgressionChord(1,0); testPlayer.callbacks.onChord(1,'Fm7',4);");
  assert.equal(run('activeProgression'),0);
  assert.equal(run('selectedMode'),'dorian');
  assert.equal(run('ghostMode'),'aeolian');
  run("removeProgressionChord(0); testPlayer.callbacks.onChord(1,'Fm7',4);");
  assert.equal(run('activeProgression'),-1);
  assert.equal(element('#chord-readout').textContent,'Fm7');
  assert.equal(run('selectedMode'),'dorian');
});

test('PLY-13: interface rejects invalid tempo, handles failure and stops on pagehide', async () => {
  const {run,element} = setupPlayerInterface();
  element('#player-bpm').reportValidity = () => false;
  await element('#player-toggle').handlers.click();
  assert.equal(run('testPlayer.chords'),undefined);
  element('#player-bpm').reportValidity = () => true;
  await element('#player-toggle').handlers.click();
  element('#player-volume').handlers.input({target:{value:'0'}});
  assert.equal(run('testPlayer.volume'),0);
  run('window.handlers.pagehide();');
  assert.equal(run('testPlayer.running'),false);
  run("testPlayer.start = async () => {throw new Error('Unavailable');};");
  await element('#player-toggle').handlers.click();
  assert.equal(element('#player-bpm').disabled,false);
  assert(element('#player-status').textContent.includes('No se pudo iniciar'));
});

test('RIT-06: style and percussion controls reach the player and lock only during playback', async () => {
  const {run,element} = setupPlayerInterface();
  element('#player-style').value = 'jazz';
  element('#player-percussion').checked = false;
  await element('#player-toggle').handlers.click();
  assert.equal(run('testPlayer.options.style'),'jazz');
  assert.equal(run('testPlayer.options.percussion'),false);
  assert.equal(element('#player-style').disabled,true);
  assert.equal(element('#player-percussion').disabled,true);
  element('#player-drum-volume').handlers.input({target:{value:'25'}});
  assert.equal(run('testPlayer.drumVolume'),0.25);
  await element('#player-toggle').handlers.click();
  assert.equal(element('#player-style').disabled,false);
  assert.equal(element('#player-percussion').disabled,false);
});
