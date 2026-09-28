const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup(prepare) {
  const elements = new Map();
  function element(key) {
    if (!elements.has(key)) elements.set(key, {
      options: [], selectedIndex: 0, handlers: {}, style: {setProperty() {}}, dataset: {},
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
      attrs: {},
      setAttribute(name, value) { this.attrs[name] = String(value); },
      // Con dispatchEvent, setChordSpelling recorre de verdad el manejador del
      // switch en vez de solo dejar el checkbox marcado.
      dispatchEvent(event) { if (this.handlers[event.type]) this.handlers[event.type]({target: this}); return true; },
    });
    return elements.get(key);
  }
  class FakeEvent { constructor(type, init) { this.type = type; Object.assign(this, init); } }
  const ctx = vm.createContext({document:{querySelector:element,getElementById:element,querySelectorAll:()=>[]},Event:FakeEvent});
  // Los controles del triple de la tonalidad existen antes de que corra el
  // script, como en la página: si no, sus manejadores nunca se registrarían.
  if (typeof prepare === 'function') prepare(element);
  // La tonalidad se carga antes que app.js, como en index.html: app.js la lee al pintar.
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../tonality.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),ctx);
  const run = code => vm.runInContext(code,ctx);
  const change = (key,value) => element(key).handlers.change({target:{value}});
  return {run,change,element};
}

test('chord views hide non-chord notes and color each chord degree',()=>{
  const {run,element}=setup();
  for(const mode of [3,4]){
    run(`root=4;selectedMode='ionian';displayModeIndex=${mode};updateView()`);
    const html=element('#fretboard').innerHTML;
    const rows=html.split('class="string-row"').slice(1);
    rows.forEach(row=>{
      const roots=[...row.matchAll(/data-midi="(\d+)"[^>]*style="([^"]*)"/g)].filter(m=>Number(m[1])%12===4);
      assert(roots.length>0);
      roots.forEach(make=>assert(make[2].includes('#E53935')));
    });
    assert.match(html,/opacity: 0;/);
    assert(!html.includes('#287a46')&&!html.includes('#c43d3d'));
    assert.match(html,/data-interval="3ª mayor"[^>]*background-color: #4CAF50/);
    assert.match(html,/data-interval="5ª justa"[^>]*background-color: #E6B800/);
    if(mode===4)assert.match(html,/data-interval="7ª mayor"[^>]*background-color: #AB47BC/);
    const open=element('#open-strings').innerHTML;
    assert.match(open,/data-midi="64"[^>]*background-color: #E53935/);
    assert.match(open,/data-midi="40"[^>]*background-color: #E53935/);
  }
});

test('pentatonic selection respects explicit choice and follows modal chord quality',()=>{
  const {run,element}=setup();
  const radios=['ionian','majorPentatonic','minorPentatonic'].map(value=>({value,checked:false}));
  element('#mode-selector').querySelectorAll=()=>radios;
  run("chooseMode('minorPentatonic')");
  assert.equal(run('viewMode()'),'minorPentatonic');
  assert.equal(run('shouldHighlightInterval(5,1)'),false);
  assert.equal(run('shouldHighlightInterval(10,2)'),true);
  assert.equal(run('shouldHighlightInterval(10,3)'),false);
  assert.equal(run('shouldHighlightInterval(10,4)'),true);
  run("chooseMode('majorPentatonic')");
  assert.equal(run('viewMode()'),'majorPentatonic');
  assert.equal(run('shouldHighlightInterval(2,0)'),true);
  assert.equal(run('shouldHighlightInterval(2,1)'),false);
  assert.equal(run('shouldHighlightInterval(11,4)'),false);
  run('displayModeIndex=4;updateView()');
  assert.equal(run('displayModeIndex'),4);
  run("selectedMode='dorian';chordType=chordTypes.find(t=>t.value==='m7');updateView()");
  assert.equal(run('viewMode()'),'minorPentatonic');
  run("root=0;selectedMode='ionian';chordType=chordTypes.find(t=>t.value==='maj7');updateView()");
  assert.equal(run('viewMode()'),'majorPentatonic');
  assert.equal(radios.find(radio=>radio.checked).value,'majorPentatonic');
  const html=element('#fretboard').innerHTML+element('#open-strings').innerHTML;
  assert.doesNotMatch(html,/>B<\/span>/);
});

test('los botones VER y MÁSTIL rotulan zonas distintas sin cruzarse',()=>{
  const {run,element}=setup();
  // VER responde a la escala dibujada; MÁSTIL, a lo que queda fuera de ella.
  // De arranque la escala se rotula con grados (AA GRADOS) y el resto del
  // mástil sin rotular (MÁSTIL apagado).
  assert.equal(run('verLevel'),2);assert.equal(run('mastilScope'),0);
  const html=()=>element('#fretboard').innerHTML+element('#open-strings').innerHTML;
  // Rótulo exacto de una nota ('' si no lleva ninguno), para distinguir nombre de grado.
  const labelOf=m=>{const found=html().match(new RegExp('data-midi="'+m+'"[^>]*>\\s*([^<]*)<'));return found?found[1]:null;};
  // El Fa#3 (54) no es de Do mayor; el Do3 (48) sí.
  // MÁSTIL=notas con VER=notas: nombre en la escala y también fuera de ella.
  run('mastilScope=1;verLevel=1;updateView()');
  assert.equal(labelOf(54),'F#','con MÁSTIL=notas se rotula también lo que no es de la escala');
  assert.equal(labelOf(48),'C','y la escala sigue con su nombre de nota');
  // MÁSTIL=apagado con VER=grados: los grados no salen de la escala.
  run('mastilScope=0;verLevel=2;updateView()');
  assert.equal(labelOf(54),'','con MÁSTIL apagado no hay rótulo fuera de la escala');
  assert.equal(labelOf(48),'1','pero sí dentro, con su grado');
  // MÁSTIL=grados: los grados llegan a todo el mástil.
  run('mastilScope=2;verLevel=1;updateView()');
  assert.equal(labelOf(54),'♭5','con MÁSTIL=grados también los grados llegan a todo el mástil');
  // Y no depende de VER: con VER apagado el mástil sigue escribiendo lo suyo.
  run('mastilScope=2;verLevel=0;updateView()');
  assert.equal(labelOf(54),'♭5','VER apagado no calla a MÁSTIL: cada botón va a lo suyo');
  assert.equal(labelOf(48),'','con VER apagado no hay rótulo en ninguna nota de la escala');
  // Los rótulos de los botones son los de las fases, y la apagada no pone
  // palabra: el nombre fijo del botón («AA», «MÁSTIL») queda solo. No es solo
  // pintura: preferences.js restaura pulsando hasta alcanzar el texto guardado,
  // así que un rótulo que se cambiara sin cambiar las listas de preferences.js
  // dejaría el botón sin restaurar en silencio.
  for(const [ver,mastil,textoVer,textoMastil] of [[0,0,'',''],[1,1,'notas','notas'],[2,2,'grados','grados']]){
    run(`verLevel=${ver};mastilScope=${mastil};paintFretLabelButtons()`);
    assert.equal(element('#toggle-notes').querySelector('span').textContent,textoVer,'VER fase '+ver);
    assert.equal(element('#toggle-degrees').querySelector('span').textContent,textoMastil,'MÁSTIL fase '+mastil);
    // El nombre accesible tiene que contener lo que se ve (criterio «Label in
    // Name»): si no, un lector de pantalla oíría una etiqueta que no está en
    // el botón. En la fase apagada de MÁSTIL solo se comprueba el nombre.
    const ariaVer=element('#toggle-notes').attrs['aria-label'];
    const ariaMastil=element('#toggle-degrees').attrs['aria-label'];
    assert(ariaVer.toLowerCase().includes(textoVer||'aa'),'el aria-label de VER («'+ariaVer+'») no contiene lo que se ve («AA'+(textoVer?' '+textoVer:'')+'»)');
    assert(ariaMastil.toLowerCase().includes(textoMastil||'mástil'),'el aria-label de MÁSTIL («'+ariaMastil+'») no contiene lo que se ve («MÁSTIL'+(textoMastil?' '+textoMastil:'')+'»)');
  }
  // El resalte: la fase apagada es la única sin resaltar en los dos botones.
  // Ojo al orden: la apagada es la primera (FRET_OFF = 0) en los dos, y el
  // resalte la tiene que seguir aunque las fases se reordenen.
  for(const [ver,mastil,pressedVer,pressedMastil] of [[0,0,'false','false'],[1,1,'true','true'],[2,2,'true','true']]){
    run(`verLevel=${ver};mastilScope=${mastil};paintFretLabelButtons()`);
    assert.equal(element('#toggle-notes').attrs['aria-pressed'],pressedVer,'VER fase '+ver);
    assert.equal(element('#toggle-degrees').attrs['aria-pressed'],pressedMastil,'MÁSTIL fase '+mastil);
  }
});

test('el switch de bemoles y sostenidos sigue la armadura de lo que suena',()=>{
  const {run,element}=setup();
  const html=()=>element('#fretboard').innerHTML+element('#open-strings').innerHTML;
  const labelOf=m=>{const found=html().match(new RegExp('data-midi="'+m+'"[^>]*>\\s*([^<]*)<'));return found?found[1]:null;};
  // El Fa#3 (54) y el Sol#3 (56): en Do mayor ninguno es de la escala, y en Re
  // mayor el 54 sí (es su tercera) y el 56 no. Se eligen por eso, para no mirar
  // la zona de AA cuando lo que se quiere comprobar es lo que escribe MÁSTIL.
  // Re mayor lleva dos sostenidos: el switch pasa a sostenidos solo.
  run("rootNoteName='D';root=2;selectedMode='ionian';verLevel=1;mastilScope=1;updateView()");
  assert.equal(element('#root-spelling').checked,false,'Re mayor deja el switch en sostenidos');
  assert.equal(labelOf(56),'G#','y las notas de fuera de la escala se escriben en sostenidos');
  assert.equal(labelOf(54),'F#','la escala, con la armadura de su modo');
  // Fa mayor lleva un bemol: al revés.
  run("rootNoteName='F';root=5;selectedMode='ionian';verLevel=1;mastilScope=1;updateView()");
  assert.equal(element('#root-spelling').checked,true,'Fa mayor deja el switch en bemoles');
  assert.equal(labelOf(56),'Ab','y las de fuera de la escala se escriben en bemoles');
  assert.equal(labelOf(53),'F','la escala, con la armadura de su modo');
  // Do no tiene accidentales: el switch se queda donde lo puso el autor.
  run("rootNoteName='C';root=0;selectedMode='ionian';verLevel=1;mastilScope=1;updateView()");
  assert.equal(element('#root-spelling').checked,true,'en Do el switch no se mueve solo');
  assert.equal(labelOf(54),'Gb','pero MÁSTIL sigue escribiendo con el switch elegido');
  // La escala dibujada no se mezcla con la grafía del switch: sigue la armadura.
  run("rootNoteName='C';root=0;selectedMode='ionian';verLevel=1;mastilScope=1;updateView()");
  const scaleLabel=html().match(new RegExp('data-midi="48"[^>]*>\\s*([^<]*)<'))[1];
  assert.equal(scaleLabel,'C','la escala conserva su grafía aunque el switch esté en bemoles');
  // Mover el switch a mano repinta el mástil: si no, los rótulos se quedan viejos.
  const spellSwitch=element('#root-spelling');
  spellSwitch.checked=false;spellSwitch.handlers.change({target:spellSwitch});
  assert.equal(labelOf(54),'F#','al pasar a sostenidos el Fa# se escribe con sostenido');
  spellSwitch.checked=true;spellSwitch.handlers.change({target:spellSwitch});
  assert.equal(labelOf(54),'Gb','y al volver a bemoles, con bemol');
});

test('defaults show scale degrees and triads; duplicated chords are independent complete copies',()=>{
  const {run}=setup();
  // Por defecto se ven los grados de la escala (AA GRADOS) y el resto del
  // mástil sin rotular (MÁSTIL apagado).
  assert.equal(run('verLevel'),2);assert.equal(run('mastilScope'),0);
  assert.equal(run('displayModeIndex'),1);
  run("progression=[{root:2,type:'m7',mode:'dorian',ghostMode:'aeolian',rootNoteName:'D'}];duplicateProgressionChord(0)");
  assert.equal(run('progression.length'),2);assert.equal(run('activeProgression'),1);
  assert.equal(run('progression[0]===progression[1]'),false);
  assert.equal(run('JSON.stringify(progression[0])'),run('JSON.stringify(progression[1])'));
  run("progression[1].mode='phrygian';removeProgressionChord(1)");
  assert.equal(run('progression.length'),1);assert.equal(run('progression[0].mode'),'dorian');
  run('removeProgressionChord(0)');
  assert.equal(run('progression.length'),0);
});

test('modal chord views highlight only degrees 1-3-5 and 1-3-5-7 of each mode',()=>{
  const {run}=setup();
  for(const [mode,triad,seventh] of [
    ['ionian',[0,4,7],11],['lydian',[0,4,7],11],['mixolydian',[0,4,7],10],
    ['dorian',[0,3,7],10],['aeolian',[0,3,7],10],['phrygian',[0,3,7],10],['locrian',[0,3,6],10]]) {
    run(`selectedMode='${mode}';chordType=chordTypes.find(type=>type.value==='aug')`);
    for(let interval=0;interval<12;interval++) {
      assert.equal(run(`shouldHighlightInterval(${interval},3)`),triad.includes(interval));
      assert.equal(run(`shouldHighlightInterval(${interval},4)`),[...triad,seventh].includes(interval));
    }
  }
  run("selectedMode='majorPentatonic';displayModeIndex=4;updateView()");assert.equal(run('displayModeIndex'),1);
});

test('fret selection changes the root and keeps the mode and saved progression independent',()=>{
  const {run}=setup();
  run("selectedMode='dorian';selectFretNote({dataset:{midi:'66'}})");
  assert.equal(run('root'),6);assert.equal(run('selectedMode'),'dorian');assert.equal(run('activeProgression'),-1);
  assert.equal(run('progression[0].root'),0);
});

test('fret scale lock selects a pitch without changing the scale and does not affect the piano',()=>{
  const {run,element}=setup();element('#fret-scale-lock').checked=true;
  run("selectFretNote({dataset:{midi:'66',interval:'4ta aumentada'}})");
  assert.equal(run('root'),0);assert.equal(run('selectedFretMidi'),66);
  run('choosePianoRoot(9)');assert.equal(run('root'),9);
  element('#fret-scale-lock').checked=false;
  run("selectFretNote({dataset:{midi:'62'}})");assert.equal(run('root'),2);
});

test('MIDI replaces untouched starter chords but preserves edited or loaded progressions',()=>{
  const a=setup();a.run("appendMidiChords([{root:2,type:'m7'}])");assert.equal(a.run('progression.length'),1);assert.equal(a.run('progression[0].root'),2);
  a.run("appendMidiChords([{root:7,type:'7'}])");assert.equal(a.run('progression.length'),2);
  const b=setup();b.run("duplicateProgressionChord(0);removeProgressionChord(1);appendMidiChords([{root:2,type:'m7'}])");assert.equal(b.run('progression.length'),5);
  const c=setup();c.run("progression=progression.map(item=>({...item}));appendMidiChords([{root:2,type:'m7'}])");assert.equal(c.run('progression.length'),5);
});

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
  assert.equal(run('progression.length'),0);
  assert.equal(run('activeProgression'),-1);
});

test('deleting all cards empties the progression and shows the empty hint', () => {
  const {run,element} = setup();
  run('progression=[{root:0,type:"maj",beats:4},{root:5,type:"m7",beats:4},{root:7,type:"7",beats:4}]');
  run('selectProgressionChord(1); removeProgressionChord(1);');
  assert.equal(run('progression.length'),2);
  assert.equal(element('#chord-readout').textContent,'G7');
  run('removeProgressionChord(0); removeProgressionChord(0);');
  assert.equal(run('progression.length'),0);
  assert.equal(run('activeProgression'),-1);
  run('renderProgression()');
  assert.match(element('#progression').innerHTML,/progression-empty/);
  run('addProgressionChord();');
  assert.equal(run('progression.length'),1);
  assert.equal(run('activeProgression'),0);
  assert.equal(run('progression[0].type'),'7');
});

test('changing quality detaches the draft without modifying saved chords', () => {
  const {run,change} = setup();
  const before = run('JSON.stringify(progression)');
  change('#quality-select','diminished');
  assert.equal(run('activeProgression'),-1);
  assert.equal(run('chordType.value'),'dim');
  assert.equal(run('JSON.stringify(progression)'),before);
});

test('piano accidental switch updates black keys and follows the key signature', () => {
  const {run,element} = setup();
  element('#root-spelling').handlers.change({target:{checked:true}});
  assert(element('#root-piano').innerHTML.includes('D♭'));
  assert(!element('#root-piano').innerHTML.includes('C♯'));
  // Re mayor lleva dos sostenidos: el switch pasa a sostenidos por sí solo.
  run("choosePianoRoot(2, 'D');");
  assert.equal(element('#root-spelling').checked,false);
  // Do no tiene accidentales: aquí el switch conserva lo que eligió el autor.
  run("choosePianoRoot(0, 'C');");
  assert.equal(element('#root-spelling').checked,false);
  element('#root-spelling').handlers.change({target:{checked:true}});
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

test('pentatonic view follows each chord quality across the progression and updates title and signature', () => {
  const {run,element} = setup();
  run("progression=[{root:0,type:'maj',mode:'ionian',rootNoteName:'C'},{root:9,type:'m',mode:'aeolian',rootNoteName:'A'}];showProgressionChord(progression[0],0);");
  element('#pentatonic-view').handlers.change({target:{checked:true}});
  assert.equal(run('pentatonicView'),true);
  assert.equal(run('viewMode()'),'majorPentatonic');
  assert.equal(run('JSON.stringify(getModeNotes(viewMode(),root))'),'[0,2,4,7,9]');
  assert(element('#board-title').textContent.endsWith('· Pentatónica mayor'));
  assert(element('#key-signature-display').textContent.startsWith('C Mayor'));
  run("showProgressionChord(progression[1],1);");
  assert.equal(run('viewMode()'),'minorPentatonic');
  assert.equal(run('JSON.stringify(getModeNotes(viewMode(),root))'),'[9,0,2,4,7]');
  assert(element('#board-title').textContent.endsWith('· Pentatónica menor'));
  assert(element('#key-signature-display').textContent.startsWith('C Mayor'));
  run("chooseMode('aeolian');");
  assert.equal(run('pentatonicView'),false);
  assert.equal(run('viewMode()'),'aeolian');
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
      setTempo(bpm) {this.tempo = bpm; return bpm;}
      setVolume(value) {this.volume = value;}
      setMuted(value) {this.muted = Boolean(value); return this.muted;}
      setDrumVolume(value) {this.drumVolume = value;}
    }
  `);
  fixture.element('#player-bpm').value = '120';
  fixture.element('#player-bpm').reportValidity = () => true;
  fixture.element('#player-loop').checked = true;
  fixture.element('#player-style').value = 'none';
  fixture.element('#player-percussion').checked = true;
  fixture.run(fs.readFileSync(path.join(__dirname,'../player-ui.js'),'utf8'));
  // `app.js` delega el clic de las tarjetas con `closest`, así que el objetivo
  // del evento solo tiene que resolver los tres selectores que usa.
  const clickCard = (index, part = 'index') => fixture.element('#progression').handlers.click({
    target: {closest: selector => {
      if (selector === 'select') return part === 'beats' ? {} : null;
      return selector === `[data-${part}]` ? {dataset: {[part]: String(index)}} : null;
    }}
  });
  return {...fixture, clickCard};
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

test('manual addition respects the same limit as saved progressions',()=>{
  const {run}=setup();
  run('progression=Array.from({length:4096},()=>({root:0,type:"maj"}));addProgressionChord();');
  assert.equal(run('progression.length'),4096);
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

test('el silencio calla el Acompañamiento sin parar la secuencia ni perder el volumen', async () => {
  const {run,element} = setupPlayerInterface();
  const mute = element('#accompaniment-mute');
  // El doble de DOM no parte del HTML, así que el estado de partida se mira en el
  // motor: sin pulsar, el Acompañamiento no está en silencio.
  assert.notEqual(run('testPlayer.muted'),true,'arranca con sonido');
  // Silenciar con la música parada: se guarda para cuando empiece a sonar.
  mute.handlers.click();
  assert.equal(run('testPlayer.muted'),true);
  assert.equal(mute.attrs['aria-pressed'],'true');
  assert(mute.attrs['aria-label'].includes('Quitar'),'el nombre accesible dice cómo volver a oír');
  await element('#player-toggle').handlers.click();
  assert.equal(run('testPlayer.running'),true,'silenciar no detiene la reproducción');
  // El volumen se puede mover mientras suena: el silencio está por encima.
  element('#player-volume').handlers.input({target:{value:'80'}});
  assert.equal(run('testPlayer.volume'),0.8);
  assert.equal(run('testPlayer.muted'),true);
  // Las tarjetas siguen cambiando de acorde con el silencio puesto.
  run("testPlayer.callbacks.onChord(1, 'Fm7', 4);");
  assert.equal(element('#player-status').textContent,'Sonando: Fm7 · acorde 2 de 4');
  assert.equal(run('activeProgression'),1);
  // Quitarlo devuelve el sonido, y el botón se apaga.
  mute.handlers.click();
  assert.equal(run('testPlayer.muted'),false);
  assert.equal(mute.attrs['aria-pressed'],'false');
  assert(mute.attrs['aria-label'].includes('Silenciar'),'al volver a sonar el botón propone silenciar');
  assert.equal(run('testPlayer.volume'),0.8,'el nivel no se resetea al quitar el silencio');
});

test('duraciones: cada tarjeta expone su duración y respeta el predeterminado',()=>{
  const {run,element}=setup();
  assert.equal(run('validBeats(0)'),4);
  assert.equal(run('validBeats(2)'),2);
  assert.equal(run('validBeats(17)'),4);
  assert.equal(run('validBeats(4.5)'),4);
  assert.equal(run("beatsLabel(2)"),'½');
  run("progression=[{root:0,type:'7',beats:4},{root:5,type:'7',beats:2},{root:0,type:'7',beats:2},{root:7,type:'7',beats:8}];renderProgression()");
  const html=element('#progression').innerHTML;
  assert.equal((html.match(/data-beats="/g)||[]).length,4,'Cada tarjeta expone su duración');
  assert.match(html,/data-beats="1"[\s\S]*?<option value="2" selected>/);
  assert.equal((html.match(/bar-start/g)||[]).length,0);
  assert.equal((html.match(/bar-number/g)||[]).length,0);
  run('addProgressionChord()');
  assert.equal(run('progression.at(-1).beats'),4);
});

test('mi progresión: los cambios en las tarjetas se guardan solos en el slot',()=>{
  const {run}=setup();
  run("localStorage={_s:{},getItem(k){return this._s[k]??null;},setItem(k,v){this._s[k]=String(v);}}");
  const saved=()=>JSON.parse(run("localStorage.getItem('traste.customProgression.v1')")||'null');
  run('addProgressionChord()');
  assert.equal(saved().length,5,'Añadir una tarjeta guarda el slot');
  run("progression=[{root:0,type:'maj',beats:4},{root:5,type:'m7',beats:2}];saveCustomProgression()");
  assert.deepEqual(saved().map(c=>[c.root,c.type,c.beats]),[[0,'maj',4],[5,'m7',2]]);
  run("progression[0].beats=1;saveCustomProgression()");
  assert.deepEqual(saved().map(c=>[c.root,c.type,c.beats]),[[0,'maj',1],[5,'m7',2]]);
});

test('mi progresión: la escala fantasma también se guarda y se restaura',()=>{
  // Se perdía al recargar porque el autoguardado no escribía el ghostMode, y
  // «Mis progresiones» sí. Ahora los dos caminos guardan lo mismo.
  const {run,element}=setup();
  run("localStorage={_s:{},getItem(k){return this._s[k]??null;},setItem(k,v){this._s[k]=String(v);}}");
  run("progression=[{root:0,type:'maj',mode:'ionian',ghostMode:'lydian',beats:4},{root:5,type:'m7',mode:'dorian',ghostMode:'',beats:2}];saveCustomProgression()");
  const saved=JSON.parse(run("localStorage.getItem('traste.customProgression.v1')"));
  assert.deepEqual(saved.map(c=>c.ghostMode),['lydian',''],'el slot guarda la escala fantasma de cada acorde');
  const leido=run('JSON.stringify(readCustomProgression().map(c=>[c.root,c.ghostMode,c.beats]))');
  assert.equal(leido,JSON.stringify([[0,'lydian',4],[5,'',2]]),'y el lector la devuelve');
  // Al restaurar, la escala fantasma se aplica al acorde. Su selector se
  // retiró de la interfaz (la tonalidad lo sustituye), así que lo que se
  // comprueba es que el dato sigue llegando al acorde y que no toca la
  // tonalidad, que es la que manda en el mástil ahora.
  run('progression=[];restoreCustomProgression()');
  assert.equal(run('activeProgression'),0);
  assert.equal(run('ghostMode'),'lydian');
  assert.equal(run('tonality.on'),false,'restaurar una tarjeta con fantasma no enciende la tonalidad');
  // Una escala fantasma que no exista no puede colarse: se descarta.
  run("localStorage.setItem('traste.customProgression.v1','[{\"root\":0,\"type\":\"maj\",\"ghostMode\":\"inventado\"}]')");
  assert.equal(run("JSON.stringify(readCustomProgression().map(c=>c.ghostMode))"),'[""]');
});

test('mi progresión: una lista vacía guardada se conserva al recargar',()=>{
  // Antes se perdía: el guardado automático sí guardaba la lista vacía, pero al
  // restaurarla se confundía con «no hay guardado» y volvían las cuatro
  // tarjetas iniciales.
  const {run,element}=setup();
  run("localStorage={_s:{},getItem(k){return this._s[k]??null;},setItem(k,v){this._s[k]=String(v);}}");
  const inicio=run('JSON.stringify(progression.map(c=>[c.root,c.type]))');
  assert.equal(run('progression.length'),4,'la página arranca con cuatro tarjetas');
  // Borra todas las tarjetas y comprueba que queda guardado como lista vacía.
  run('removeProgressionChord(3);removeProgressionChord(2);removeProgressionChord(1);removeProgressionChord(0)');
  assert.equal(run('progression.length'),0);
  assert.equal(run("localStorage.getItem('traste.customProgression.v1')"),'[]');
  // Recargar: se respeta la lista vacía.
  run('progression=initialProgression.map(c=>({...c}));progressionEdited=false;activeProgression=0;restoreCustomProgression()');
  assert.equal(run('progression.length'),0,'al recargar no vuelven las tarjetas iniciales');
  assert.equal(run('activeProgression'),-1,'y no queda ninguna seleccionada');
  assert.equal(run('progressionEdited'),true);
  assert.match(element('#progression').innerHTML,/progression-empty/,'la lista avisa de que no hay nada');
  assert.notEqual(inicio,run('JSON.stringify(progression)'));
});

test('mi progresión: un guardado corrupto cae a la progresión inicial',()=>{
  const {run}=setup();
  run("localStorage={_s:{},getItem(k){return this._s[k]??null;},setItem(k,v){this._s[k]=String(v);}}");
  const inicio=run('JSON.stringify(progression)');
  for(const guardado of ['[]','no es json','{"a":1}','[{"root":0,"type":"inventado"}]','[{"root":"x","type":"maj"}]']){
    run(`localStorage.setItem('traste.customProgression.v1',${JSON.stringify(guardado)})`);
    // Una lista vacía sí es válida y sale como lista; el resto, como null.
    const esperado=guardado==='[]'?[]:null;
    assert.equal(run('JSON.stringify(readCustomProgression())'),JSON.stringify(esperado),'con el slot '+guardado);
    run('progression=initialProgression.map(c=>({...c}));progressionEdited=false;restoreCustomProgression()');
    assert.equal(run('progression.length'),guardado==='[]'?0:4,'tras restaurar con el slot '+guardado);
  }
  assert.equal(run('JSON.stringify(progression)'),inicio);
});

test('pulsar una tarjeta arranca el acompañamiento desde ella y la sigue mostrando',async()=>{
  const {run,element,clickCard}=setupPlayerInterface();
  await clickCard(2);
  assert.equal(run('testPlayer.options.startIndex'),2);
  assert.equal(run('testPlayer.running'),true);
  assert.equal(run('activeProgression'),2);
  assert.equal(element('#chord-readout').textContent,'G7');
  assert.equal(element('#player-status').textContent,'Reproduciendo…');
  assert.equal(element('#player-bpm').disabled,true);
});

test('el interruptor viene en «Reiniciar»: otra tarjeta reinicia y la lista se conserva',async()=>{
  const {run,clickCard}=setupPlayerInterface();
  await clickCard(1);
  assert.equal(run('testPlayer.options.startIndex'),1);
  await clickCard(3);
  assert.equal(run('testPlayer.options.startIndex'),3);
  assert.equal(run('testPlayer.running'),true);
  await clickCard(0);
  assert.equal(run('testPlayer.options.startIndex'),0);
  assert.equal(run('testPlayer.chords.length'),4,'La lista completa se conserva para la vuelta');
});

test('pulsar una tarjeta nunca toca el tempo',async()=>{
  const {run,clickCard}=setupPlayerInterface();
  run('globalThis.tempoTaps=[];globalThis.tapProgressionTempo=()=>{globalThis.tempoTaps.push(1);};');
  const taps=()=>JSON.parse(run('JSON.stringify(tempoTaps)'));
  await clickCard(1);
  await clickCard(1);
  await clickCard(3);
  await clickCard(3);
  assert.deepEqual(taps(),[],'El tempo es solo del botón Tempo, no de las tarjetas');
  assert.equal(run('testPlayer.options.startIndex'),3,'Con «Reiniciar» vuelve a empezar en la tarjeta pulsada');
  assert.equal(run('testPlayer.running'),true);
});

test('el tempo cambia en marcha con el botón Tempo',async()=>{
  const {run,element,clickCard}=setupPlayerInterface();
  await clickCard(1);
  element('#player-bpm').value='132';
  run("window.handlers['traste:tempo-applied']();");
  assert.equal(Number(run('testPlayer.tempo')),132,'El motor adopta el tempo sin reiniciar');
  assert.equal(run('testPlayer.running'),true);
  assert.equal(run('testPlayer.options.bpm'),120,'La reproducción sigue con la lista ya iniciada');
});

test('con «Solo pulso» ninguna tarjeta corta lo que está sonando',async()=>{
  const {run,element,clickCard}=setupPlayerInterface();
  element('[data-card-mode][aria-pressed="true"]').dataset={cardMode:'pulse'};
  run('globalThis.tempoTaps=0;globalThis.tapProgressionTempo=()=>{globalThis.tempoTaps++;};');
  await clickCard(1);
  await clickCard(3);
  assert.equal(run('testPlayer.options.startIndex'),1,'No se reinicia desde la otra tarjeta');
  assert.equal(run('testPlayer.running'),true,'La música sigue sonando');
  assert.equal(run('tempoTaps'),0,'Ninguna tarjeta toca el tempo');
  assert.equal(run('activeProgression'),3,'La tarjeta sí se selecciona para editarla');
  assert.equal(element('#player-status').textContent,'Reproduciendo…');
});

test('el clic en una tarjeta no reproduce ni marca el tempo con otra fuente activa',async()=>{
  const {run,clickCard}=setupPlayerInterface();
  run('globalThis.tempoTaps=0;globalThis.tapProgressionTempo=()=>{globalThis.tempoTaps++;};');
  run("globalThis.StringSources={get active(){return 'midi';}};");
  await clickCard(1);
  assert.equal(run('testPlayer.chords'),undefined,'No arranca encima de un MIDI');
  run("globalThis.StringSources={get active(){return 'metronome';}};");
  await clickCard(1);
  assert.equal(run('testPlayer.chords'),undefined,'No pisa el metrónomo');
  assert.equal(run('tempoTaps'),0,'Con otra fuente la tarjeta no toca el tempo');
  run('globalThis.StringSources=undefined;');
  await clickCard(1);
  assert.equal(run('testPlayer.options.startIndex'),1,'Con la Progresión activa vuelve a funcionar');
  assert.equal(run('tempoTaps'),0,'Las tarjetas no marcan el tempo en ningún caso');
});

test('con secciones la tarjeta se busca en la lista de reproducción, no en la progresión',async()=>{
  const {run,clickCard}=setupPlayerInterface();
  run(`window.StringSections={playback(){return [
    {source:progression[1],saved:{...progression[1]},section:'Estribillo'},
    {source:progression[1],saved:{...progression[1]},section:'Estribillo'},
    {source:progression[3],saved:{...progression[3]},section:'Estribillo'}
  ];},follow(){}};`);
  await clickCard(3);
  assert.equal(run('testPlayer.options.startIndex'),2,'La tercera posición de la lista es la tarjeta 4');
  assert.equal(run('testPlayer.chords.length'),3);
  run(`window.StringSections={playback(){return [{source:progression[0],saved:{...progression[0]},section:'Intro'}];},follow(){}};`);
  await clickCard(2);
  assert.equal(run('testPlayer.options.startIndex'),0,'Una tarjeta fuera de la sección arranca al principio');
});

test('con otra fuente activa la tarjeta se sigue seleccionando para editarla',async()=>{
  const {run,clickCard}=setupPlayerInterface();
  run("globalThis.StringSources={get active(){return 'midi';}};");
  await clickCard(1);
  assert.equal(run('testPlayer.chords'),undefined,'No arranca encima de un MIDI');
  assert.equal(run('activeProgression'),1,'La tarjeta sí se selecciona');
  run('globalThis.StringSources=undefined;');
  await clickCard(2);
  assert.equal(run('testPlayer.options.startIndex'),2);
});

test('quitar una tarjeta o cambiar su duración no dispara la reproducción',async()=>{
  const {run,clickCard}=setupPlayerInterface();
  await clickCard(1,'remove');
  assert.equal(run('testPlayer.chords'),undefined);
  assert.equal(run('progression.length'),3,'La tarjeta se elimina igual');
  await clickCard(0,'beats');
  assert.equal(run('testPlayer.chords'),undefined);
  assert.equal(run('progression.length'),3);
});


// --- Tonalidad del tema -----------------------------------------------------
// Antes se calculaba el color de cada nota en los dos pintores por separado
// (los trastes y las cuerdas al aire) y cada uno repetía la decisión. Ahora la
// comparten, y estas pruebas leen lo pintado para comprobar que la tonalidad
// manda de verdad en el color, en el rótulo y en la visibilidad.

const fretOf=(element,midi)=>{
  const html=element.innerHTML;
  const at=html.indexOf(`data-midi="${midi}"`);
  if(at<0)return null;
  const open=html.lastIndexOf('<span',at);
  const close=html.indexOf('</span>',at);
  const tag=html.slice(open,close);
  // El rótulo es el texto del <span>, que va antes de su cierre: desde el
  // final de la etiqueta de apertura hasta donde empieza `</span>`.
  const contentStart=html.indexOf('>',open)+1;
  return {
    classes:(tag.match(/class="(?:fret-note|open-string-note) ?([^"]*)"/)||['',''])[1],
    bg:(tag.match(/background-color: ([^;]*)/)||['',''])[1].trim(),
    interval:(tag.match(/data-interval="([^"]*)"/)||['',''])[1],
    label:html.slice(contentStart,close),
    hidden:/opacity: 0;/.test(tag),
  };
}

// La tonalidad de La contra un acorde: cuál se prueba en cada sitio.
function tonalitySetup(){
  const {run,element}=setup();
  // Los trastes del diapasón: 48 = Do3, 49 = Do#3, 50 = Re3, 51 = Re#3, 54 = Fa#3, 56 = Sol#3.
  run("root=0;rootNoteName='C';chordType=chordTypes[0];quality='major';selectedMode='ionian';displayModeIndex=0;updateView()");
  return {run,element};
}

test('con la tonalidad encendida los colores y los grados se cuentan desde ella',()=>{
  const {run,element}=tonalitySetup();
  // Apagada, cada nota se cuenta desde el acorde: la raíz en rojo y su grado 1.
  const antes=fretOf(element('#fretboard'),48);
  assert.equal(antes.bg,'#E53935');
  assert.equal(antes.label,'1');
  assert.doesNotMatch(antes.classes,/key-root/);
  assert.equal(fretOf(element('#fretboard'),49).bg,'transparent','sin tonalidad no hay nada detrás');

  run("tonality.on=true;tonality.root=9;updateView()");
  const c=fretOf(element('#fretboard'),48);   // Do: en Do mayor, pero ♭3 de La
  assert.equal(c.bg,'#66BB6A','el Do se pinta con el color de su grado en La (3ª menor)');
  assert.equal(c.label,'♭3','y con su grado en La, no el 1 del acorde');
  assert.match(c.classes,/key-root/,'la raíz del acorde se sigue señalando con el aro');
  assert.equal(fretOf(element('#fretboard'),49).bg,'#4CAF50','el Do# solo está en La: 3º grado');
  assert.equal(fretOf(element('#fretboard'),50).bg,'#00897B','el Re está en las dos escalas: 4º grado de La');
  assert.equal(fretOf(element('#fretboard'),50).label,'4');
  assert.equal(fretOf(element('#fretboard'),54).bg,'#FF9800','el Fa# es el 6º de La');
  assert.equal(fretOf(element('#fretboard'),56).bg,'#AB47BC','el Sol# es el 7º de La');
  assert.equal(fretOf(element('#fretboard'),51).bg,'transparent','el Re# no está en ninguna de las dos');
  // La nota de la tonalidad que no es del acorde va marcada como tal, atenuada.
  assert.match(fretOf(element('#fretboard'),49).classes,/tonality-note/);
  // Las cuerdas al aire cuentan lo mismo que los trastes: si se separaran, el
  // mástil y la columna de al aire dirían cosas distintas del mismo acorde.
  const aire=fretOf(element('#open-strings'),64); // Mi4
  assert.equal(aire.bg,'#E6B800','el Mi al aire es el 5º de La');
  assert.equal(aire.label,'5');
  // El Sol al aire no está en La (allí va el Sol#), pero sí en Do mayor: sale
  // con el color de su grado en la tonalidad, no con el del acorde.
  const sol=fretOf(element('#open-strings'),55);
  assert.equal(sol.bg,'#9C27B0');
  assert.equal(sol.label,'♭7');
  assert.doesNotMatch(sol.classes,/tonality-note/,'es nota de la escala que suena, no de la tonalidad');
});

test('apagar la tonalidad devuelve el mástil a pintarse desde el acorde',()=>{
  const {run,element}=tonalitySetup();
  run("tonality.on=true;tonality.root=9;updateView()");
  run('tonality.on=false;updateView()');
  assert.equal(fretOf(element('#fretboard'),48).bg,'#E53935');
  assert.equal(fretOf(element('#fretboard'),48).label,'1');
  assert.equal(fretOf(element('#fretboard'),49).bg,'transparent');
  assert.doesNotMatch(fretOf(element('#fretboard'),48).classes,/key-root/);
  assert.equal(element('#tonality-summary').hidden,true,'la lectura de la tonalidad se esconde');
  assert.equal(element('#key-signature-display').textContent,'C Mayor · Natural');
});

test('S/E, Nota y Grado deciden lo que se escribe en las escalas dibujadas, y fuera sigue mandando MÁSTIL',()=>{
  let botones;
  const {run,element}=setup(el=>{
    // Los tres botones, sembrados antes de que corra tonality.js: es lo que
    // hace la página, y sin ellos sus manejadores no quedarían registrados.
    const off=el('tonality-label-off'),nota=el('tonality-label-note'),grado=el('tonality-label-degree');
    off.dataset.tonalityLabel='off';nota.dataset.tonalityLabel='note';grado.dataset.tonalityLabel='degree';
    el('tonality-label').querySelectorAll=()=>[off,nota,grado];
    botones={off,nota,grado};
  });
  const pulsa=button=>{button.handlers.click();};
  run("root=0;rootNoteName='C';chordType=chordTypes[0];quality='major';selectedMode='ionian';displayModeIndex=0;mastilScope=1;tonality.on=true;tonality.root=9;updateView()");
  // Grado (lo que arranca): el grado dentro de la tonalidad.
  assert.equal(run('tonality.label'),'degree');
  assert.equal(fretOf(element('#fretboard'),48).label,'♭3');
  assert.equal(fretOf(element('#fretboard'),49).label,'3');
  // Nota: el nombre, escrito con la armadura de la tonalidad (La: sostenidos).
  pulsa(botones.nota);
  assert.equal(run('tonality.label'),'note');
  assert.equal(fretOf(element('#fretboard'),49).label,'C#');
  assert.equal(fretOf(element('#fretboard'),48).label,'C');
  // S/E: sin etiqueta en las escalas dibujadas... pero fuera de ellas manda
  // MÁSTIL, que aquí está en notas: el Re# no está en Do mayor ni en La.
  pulsa(botones.off);
  assert.equal(run('tonality.label'),'off');
  assert.equal(fretOf(element('#fretboard'),48).label,'');
  assert.equal(fretOf(element('#fretboard'),49).label,'');
  assert.equal(fretOf(element('#fretboard'),51).label,'D#','fuera de las escalas, MÁSTIL sigue mandando');
  assert.equal(botones.off.attrs['aria-pressed'],'true','el botón pulsado se marca');
  assert.equal(botones.nota.attrs['aria-pressed'],'false');
  // Con la tonalidad apagada, S/E no toca nada: AA y MÁSTIL siguen igual.
  run('tonality.on=false;updateView()');
  assert.equal(fretOf(element('#fretboard'),48).label,'1');
  assert.equal(fretOf(element('#fretboard'),51).label,'D#');
});

test('la escala de la tonalidad también se ve en las vistas Acorde y Acorde 7ma',()=>{
  const {run,element}=tonalitySetup();
  run('tonality.on=true;tonality.root=9;displayModeIndex=3;updateView()');
  const csharp=fretOf(element('#fretboard'),49);   // Do#: en la tonalidad, no en el acorde
  assert.equal(csharp.hidden,false,'la escala de la tonalidad no se esconde detrás del acorde');
  assert.match(csharp.classes,/tonality-note/);
  assert.equal(csharp.bg,'#4CAF50');
  assert.equal(fretOf(element('#fretboard'),51).hidden,true,'lo que no está en ninguna sigue oculto');
  assert.equal(fretOf(element('#fretboard'),48).hidden,false,'y la tónica del acorde se ve');
  // Con la tonalidad apagada, la vista de acorde se queda como estaba: solo
  // las notas del acorde.
  run('tonality.on=false;updateView()');
  assert.equal(fretOf(element('#fretboard'),49).hidden,true);
  assert.equal(fretOf(element('#fretboard'),48).hidden,false);
});

test('la lectura dice qué es este acorde dentro de la tonalidad',()=>{
  const {run,element}=tonalitySetup();
  const resumen=()=>element('#tonality-summary').innerHTML;
  run("tonality.on=true;tonality.root=9;updateView()");
  assert.match(resumen(),/Tonalidad A mayor/);
  // El Do mayor no es un modo de La: es el ♭III del menor paralelo, y decirlo
  // es mejor que forzar un lidio que no es.
  assert.match(resumen(),/no es un modo de ella/);
  assert.equal(element('#key-signature-display').textContent,'A Mayor · 3 sostenidos');
  // El Re mayor sí es el IV de La: lidio.
  run("root=2;rootNoteName='D';chordType=chordTypes[0];quality='major';updateView()");
  assert.match(resumen(),/Lidio \(IV\) de A/);
  assert.doesNotMatch(resumen(),/no es un modo/);
  // Tonalidad bemol: la armadura se lee con la grafía del switch, no con la
  // del acorde que esté sonando. (Fa# y Sol♭ son la misma tónica y suenan
  // distinto en el nombre; 6 sostenidos o 6 bemoles.)
  run("root=0;rootNoteName='C';tonality.root=6;updateView()");
  assert.equal(element('#key-signature-display').textContent,'F# Mayor · 6 sostenidos');
  run('pianoUseFlats=true;updateView()');
  assert.equal(element('#key-signature-display').textContent,'Gb Mayor · 6 bemoles');
  run('pianoUseFlats=false;updateView()');
  // La pentatónica de la tonalidad también es una tonalidad válida.
  run("tonality.root=9;tonality.scale='minorPentatonic';updateView()");
  assert.match(resumen(),/Tonalidad A pentatónica menor/);
  assert.equal(fretOf(element('#fretboard'),56).bg,'transparent','la pentatónica menor de La no tiene el Sol#');
  assert.equal(fretOf(element('#fretboard'),58).bg,'transparent','ni el La#');
  assert.equal(fretOf(element('#fretboard'),59).bg,'#00BCD4','pero sí el Si, que es el 2º de la tonalidad');
  assert.equal(fretOf(element('#fretboard'),59).label,'2');
});

test('la escala fantasma de la tarjeta no pisa a la tonalidad, y sin ella se sigue pintando',()=>{
  const {run,element}=tonalitySetup();
  // La fantasma de la tarjeta es un modo de la raíz del acorde: con la tonalidad
  // apagada sigue igual que antes (el selector se retiró, el dato no). El lidio
  // de Do mayor añade el Fa#.
  run("ghostMode='lydian';updateView()");
  assert.equal(fretOf(element('#fretboard'),54).bg,'rgba(0, 188, 212, 0.35)');
  assert.match(fretOf(element('#fretboard'),54).classes,/ghost-note/);
  assert.doesNotMatch(fretOf(element('#fretboard'),54).classes,/tonality-note/);
  assert.equal(fretOf(element('#fretboard'),49).bg,'transparent','el Do# no es del lidio de Do');
  // Encendida la tonalidad, manda la de la tonalidad: el Fa# es el 6º de La.
  run("tonality.on=true;tonality.root=9;updateView()");
  assert.equal(fretOf(element('#fretboard'),54).bg,'#FF9800');
  assert.match(fretOf(element('#fretboard'),54).classes,/tonality-note/);
  // Y al apagarla, la fantasma de la tarjeta vuelve a su sitio.
  run('tonality.on=false;updateView()');
  assert.equal(fretOf(element('#fretboard'),54).bg,'rgba(0, 188, 212, 0.35)');
});

test('el interruptor de la tonalidad y su guardado la devuelven tal cual al abrir la página',()=>{
  const {run,element}=setup();
  // El switch: se marca y repinta el mástil con la misma mano que el ratón.
  run("tonality.root=9;updateView()");
  assert.equal(fretOf(element('#fretboard'),48).bg,'#E53935');
  const toggle=element('tonality-toggle');
  toggle.checked=true;
  toggle.handlers.change();
  assert.equal(run('tonality.on'),true);
  assert.equal(fretOf(element('#fretboard'),48).bg,'#66BB6A','encender el switch repinta el mástil');
  assert.equal(element('tonality-settings').hidden,false,'y enseña la raíz, la escala y el triple');
  toggle.checked=false;
  toggle.handlers.change();
  assert.equal(element('tonality-settings').hidden,true);
  // El selector de raíz y de escala.
  const raiz=element('tonality-root'),escala=element('tonality-scale');
  toggle.checked=true;toggle.handlers.change();
  // Como en el navegador: el valor está en el control y el manejador lo lee ahí.
  raiz.value='5';raiz.handlers.change();
  assert.equal(run('tonality.root'),5);
  raiz.value='99';raiz.handlers.change();
  assert.equal(run('tonality.root'),0,'una tónica imposible cae en Do');
  raiz.value='10';raiz.handlers.change();
  assert.equal(run('tonality.root'),10);
  escala.value='majorPentatonic';escala.handlers.change();
  assert.equal(run('tonality.scale'),'majorPentatonic');
  escala.value='lydian';escala.handlers.change();
  assert.equal(run('tonality.scale'),'ionian','una escala que no es de la tonalidad no se cuela');
  // Abrir una canción guardada la aplica por su bloque.
  run("globalThis.StringTonality.apply({on:true,root:7,scale:'majorPentatonic',label:'note'})");
  assert.equal(run('JSON.stringify(tonality)'),JSON.stringify({on:true,root:7,scale:'majorPentatonic',label:'note'}));
  run("globalThis.StringTonality.apply(undefined)");
  assert.equal(run('tonality.on'),false,'una canción vieja sin tonalidad la deja apagada');
  assert.equal(fretOf(element('#fretboard'),48).bg,'#E53935');
});
