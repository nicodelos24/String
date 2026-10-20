const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { ProgressionPlayer, chordToMidi } = require('../progression-player.js');
const { playbackEntries, validateSections } = require('../sections.js');

// El sandbox repite el de progression.test.cjs y agrega lo que T-20 necesita:
// `localStorage` para «Mi progresión» y un reproductor de mentira al que se le
// puede fingir la vuelta que suena.
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
      reportValidity() { return true; },
      querySelector(selector) { return element(key + selector); },
      attrs: {},
      setAttribute(name, value) { this.attrs[name] = String(value); },
      removeAttribute(name) { delete this.attrs[name]; },
      dispatchEvent(event) { if (this.handlers[event.type]) this.handlers[event.type]({target: this}); return true; },
    });
    return elements.get(key);
  }
  class FakeEvent { constructor(type, init) { this.type = type; Object.assign(this, init); } }
  const store = new Map();
  const ctx = vm.createContext({
    document: {querySelector: element, querySelectorAll: () => [], getElementById: id => element(`#${id}`), addEventListener() {}},
    Event: FakeEvent,
    localStorage: {getItem: key => store.has(key) ? store.get(key) : null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key)},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'), ctx);
  const run = code => JSON.parse(JSON.stringify(vm.runInContext(code, ctx)));
  const runRaw = code => vm.runInContext(code, ctx);
  return {run, runRaw, element, ctx};
}

// La misma base que setupPlayerInterface de progression.test.cjs: app.js y
// player-ui.js en el sandbox sobre un reproductor que no suena, para poder
// disparar `onChord` a mano con la vuelta que interesa.
function setupPlayerInterface() {
  const fixture = setup();
  fixture.runRaw(`
    let testPlayer;
    const window = {handlers: {}, addEventListener(name, fn) {this.handlers[name] = fn;}, dispatchEvent() {}};
    const chordToMidi = ${chordToMidi.toString()};
    class ProgressionPlayer {
      constructor(callbacks) {this.callbacks = callbacks; testPlayer = this; this.running = false; this.starting = false;}
      async start(chords, options) {this.chords = chords; this.options = options; this.running = true; this.callbacks.onState(true);}
      stop() {this.running = false; this.callbacks.onState(false);}
      setTempo(bpm) {return bpm;}
      setVolume(value) {return value;}
      setMuted(value) {return value;}
      setDrumVolume(value) {return value;}
    }
  `);
  fixture.element('#player-bpm').value = '120';
  fixture.element('#player-loop').checked = true;
  fixture.element('#player-style').value = 'none';
  fixture.element('#player-percussion').checked = true;
  fixture.runRaw(fs.readFileSync(path.join(__dirname,'../player-ui.js'),'utf8'));
  const clickPlay = () => fixture.element('#player-toggle').handlers.click({});
  return {...fixture, clickPlay, player: () => fixture.runRaw('testPlayer')};
}

test('las vueltas válidas se guardan y las claves raras se descartan al guardar', () => {
  const {run, runRaw} = setup();
  const progression = [
    {root: 7, rootNoteName: 'G', type: 'maj', mode: 'ionian', ghostMode: 'minorPentatonic',
      variants: {'2': {ghostMode: 'majorPentatonic'}, '1': {ghostMode: 'ionian'},
        '0': {ghostMode: 'lydian'}, '9': {ghostMode: 'lydian'}, '3x': {ghostMode: 'lydian'}, '2.5': {ghostMode: 'lydian'},
        '3': {ghostMode: 'modo-inventado'}, '4': 'no-es-objeto', basura: {ghostMode: 'lydian'}}},
    {root: 0, type: 'maj', mode: 'ionian', variants: 'pepe'},
    {root: 5, type: 'maj', mode: 'ionian'},
  ];
  runRaw(`progression = ${JSON.stringify(progression)}; saveCustomProgression()`);
  const saved = JSON.parse(run('localStorage.getItem("traste.customProgression.v1")'));
  assert.deepEqual(saved[0].variants, {'1': {ghostMode: 'ionian'}, '2': {ghostMode: 'majorPentatonic'}},
    'Solo quedan las vueltas enteras de 1 a 8 con un modo que la app conoce');
  assert.equal(saved[1].variants, undefined, 'Un valor que no es objeto no entra');
  assert.equal(saved[2].variants, undefined);
  // Y la lectura vuelve a dar lo mismo, por la misma puerta (TAREAS T-20:
  // todo pasa por readCustomProgression, no por un lector nuevo).
  const read = run('readCustomProgression()');
  const chords = read.map(item => ({root: item.root, ghostMode: item.ghostMode, variants: item.variants, beats: item.beats}));
  assert.deepEqual(chords[0], {root: 7, ghostMode: 'minorPentatonic', variants: {'1': {ghostMode: 'ionian'}, '2': {ghostMode: 'majorPentatonic'}}, beats: 4});
  assert.equal(chords[1].variants, undefined);
  assert.equal(chords[2].variants, undefined);
});

test('sin secciones cada tarjeta aparece una vez y la vuelta la cuenta el loop', () => {
  const chords = [{root: 7, type: 'maj'}, {root: 0, type: 'maj', variants: {'2': {ghostMode: 'majorPentatonic'}}}];
  const entries = playbackEntries([], chords);
  assert.deepEqual(entries, [{source: chords[0], saved: {root: 7, type: 'maj'}},
    {source: chords[1], saved: {root: 0, type: 'maj', variants: {'2': {ghostMode: 'majorPentatonic'}}}}],
    'El contrato sin secciones queda igual que antes: ni vuelta ni sección extra');
  assert.equal(entries[0].vuelta, undefined);
  assert.equal(entries[0].section, undefined);
});

test('con secciones la etiqueta y la vuelta van acorde a cada repetición', () => {
  const chords = [{root: 0, type: 'maj'}, {root: 5, type: 'maj', variants: {'2': {ghostMode: 'minorPentatonic'}}}];
  const data = validateSections([{name: 'Coro', repeat: 2, indices: [0, 1]}], 2);
  const live = [{items: []}];
  const entries = playbackEntries(data, chords, live);
  assert.equal(entries.length, 4);
  assert.deepEqual(entries.map(entry => entry.vuelta), [1, 1, 2, 2]);
  assert.deepEqual(entries.map(entry => entry.section),
    ['Coro · vuelta 1/2', 'Coro · vuelta 1/2', 'Coro · vuelta 2/2', 'Coro · vuelta 2/2']);
  assert.equal(entries[2].sectionRef, live[0], 'La referencia a la sección viva sigue en la entrada');
});

test('en reproducción la fantasma de la vuelta pisa la del acorde solo en su vuelta', () => {
  const {run, clickPlay, player, runRaw} = setupPlayerInterface();
  runRaw(`progression = [
    {root: 7, rootNoteName: 'G', type: 'maj', mode: 'ionian', ghostMode: '', variants: {'2': {ghostMode: 'majorPentatonic'}}},
    {root: 0, rootNoteName: 'C', type: 'maj', mode: 'ionian', ghostMode: 'minorPentatonic', variants: {'3': {ghostMode: 'lydian'}}}
  ];
  const lista = progression.map(source => ({source, saved: {...source}}));
  window.StringSections = {playback() {return lista;}, follow() {}};`);
  clickPlay();
  assert.equal(run('ghostMode'), '', 'Vuelta 1: el G no tiene fantasma y no se inventa ninguna');
  player().playingPass = 1;
  player().callbacks.onChord(0, 'G', 2);
  assert.equal(run('ghostMode'), 'majorPentatonic', 'Vuelta 2: el G muestra la pentatónica mayor');
  player().playingPass = 5;
  player().callbacks.onChord(0, 'G', 2);
  assert.equal(run('ghostMode'), '', 'La pasada 5 es la vuelta 6: la variante de la vuelta 2 ya no pesa');
  player().callbacks.onChord(1, 'C', 2);
  assert.equal(run('ghostMode'), 'minorPentatonic', 'Vuelta 6 del C: no hay variante 6 y queda la base del acorde');
  player().playingPass = 2;
  player().callbacks.onChord(1, 'C', 2);
  assert.equal(run('ghostMode'), 'lydian', 'Vuelta 3: la variante del C pisa su fantasma de base');
});

test('con secciones la vuelta la da la entrada, no la pasada del loop', () => {
  const {run, clickPlay, player, runRaw} = setupPlayerInterface();
  runRaw(`progression = [
    {root: 7, rootNoteName: 'G', type: 'maj', mode: 'ionian', ghostMode: 'majorPentatonic', variants: {'2': {ghostMode: 'lydian'}}}
  ];
  window.StringSections = {playback() {return [
    {source: progression[0], saved: {...progression[0], ghostMode: ''}, section: 'Coro · vuelta 1/2', vuelta: 1},
    {source: progression[0], saved: {...progression[0]}, section: 'Coro · vuelta 2/2', vuelta: 2}
  ];}, follow() {}};`);
  clickPlay();
  player().playingPass = 7;
  player().callbacks.onChord(0, 'G', 1);
  assert.equal(run('ghostMode'), '', 'Vuelta 1 del coro, en la pasada 7: la fantasma de la vuelta 2 no se filtra');
  player().callbacks.onChord(1, 'G', 1);
  assert.equal(run('ghostMode'), 'lydian', 'Vuelta 2 del coro: ahí sí pisa la fantasma de base');
});

test('el motor cuenta las pasadas y la interfaz pregunta la del acorde que suena', async () => {
  const context = {
    currentTime: 0, state: 'running', destination: {}, sampleRate: 44100, async resume() {},
    createPeriodicWave() {return {};},
    createDynamicsCompressor() {return {threshold:{}, knee:{}, ratio:{}, attack:{}, release:{}, connect(){}};},
    createBiquadFilter() {return {frequency:{}, Q:{}, connect(){}, disconnect(){}};},
    createBuffer(channels, length) {return {getChannelData: () => new Float32Array(length)};},
    createBufferSource() {return {connect(){}, disconnect(){}, start(){}, stop(){}};},
    createOscillator() {return {frequency: {setValueAtTime(){}, exponentialRampToValueAtTime(){}}, setPeriodicWave(){}, connect(){}, disconnect(){}, start(){}, stop(){}};},
    createGain() {return {connect(){}, disconnect(){}, gain: {setValueAtTime(){}, setTargetAtTime(){}, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){}}};},
  };
  const heard = [];
  const player = new ProgressionPlayer({createContext: () => context,
    setTimer: fn => fn, clearTimer: () => {},
    onChord: (index, name) => heard.push([index, name, player.playingPass]),
    onState() {}});
  await player.start([{name: 'C', notes: [48,52,55]}, {name: 'G', notes: [55,59,62]}], {bpm: 120});
  assert.equal(player.playingPass, 0);
  for (const time of [0.05, 2, 2.05, 4, 4.05]) {context.currentTime = time; player.tick();}
  assert.deepEqual(heard[0], [0, 'C', 0], 'Primera pasada: vuelta 1');
  assert.deepEqual(heard[1], [1, 'G', 0]);
  assert.deepEqual(heard[2], [0, 'C', 1], 'El loop volvió a empezar: el acorde suena en la vuelta 2');
  assert.equal(player.currentPass, 1, 'La programación ya va por la vuelta 2');
  player.stop();
});

test('una fantasma que la app no conoce no se dibuja y no revienta la reproducción', () => {
  const {run, clickPlay, player, runRaw} = setupPlayerInterface();
  runRaw(`progression = [
    {root: 7, rootNoteName: 'G', type: 'maj', mode: 'ionian', ghostMode: '', variants: {'2': {ghostMode: 'inventado-me'}}}
  ];
  const lista = [{source: progression[0], saved: {...progression[0]}}];
  window.StringSections = {playback() {return lista;}, follow() {}};`);
  clickPlay();
  player().playingPass = 1;
  player().callbacks.onChord(0, 'G', 1);
  assert.equal(run('ghostMode'), '', 'La variante inválida se descarta y el mástil queda sin fantasma');
});
