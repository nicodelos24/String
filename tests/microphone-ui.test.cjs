const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function liveButton(mode, pressed) {
  return {
    dataset: { micLiveMode: mode },
    attributes: { 'aria-pressed': String(pressed) },
    classList: { toggle() {} },
    handlers: {},
    addEventListener(event, fn) { this.handlers[event] = fn; },
    setAttribute(key, value) { this.attributes[key] = value; },
    getAttribute(key) { return this.attributes[key]; },
    click() { if (this.handlers.click) this.handlers.click({ currentTarget: this }); },
  };
}

function setup() {
  const elements = new Map();
  const micLiveButtons = [liveButton('off', false), liveButton('note', true), liveButton('chord', false)];
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      checked: false, hidden: true, handlers: {}, attributes: {}, dataset: {},
      addEventListener(event, fn) { this.handlers[event] = fn; },
      setAttribute(key, value) { this.attributes[key] = value; },
      getAttribute(key) { return this.attributes[key]; },
      querySelector: () => element('label'),
      querySelectorAll(sel) { return sel === '[data-mic-live-mode]' ? micLiveButtons : []; },
      buttons: micLiveButtons,
    });
    return elements.get(id);
  }
  let callbacks;
  const context = vm.createContext({
    document: { getElementById: element, querySelectorAll: () => [] },
    window: { addEventListener() {} }, MutationObserver: class { observe() {} },
    MicrophoneReader: class { constructor(options) { callbacks = options; } },
    setTimeout, root: 0, quality: 'major', selectedMode: 'ionian', activeProgression: 2,
    rootNoteName: 'C', chordType: { value: 'maj' }, ghostMode: 'lydian',
    progression: [], progressionEdited: false, draggingProgressionItem: null,
    chordTypes: [{ value: 'm', suffix: 'm' }, { value: '7', suffix: '7' }],
    noteName: root => ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][root],
    isInTune: detection => Math.abs(detection.cents) <= 40,
    renderProgression() {}, showProgressionChord(chord) { context.root = chord.root; context.selectedMode = chord.mode; },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../microphone-ui.js'), 'utf8'), context);
  return { context, callbacks, element, click(id) { element(id).click(); } };
}

function phaseOf(element) {
  const pressed = element.buttons.filter(button => button.getAttribute('aria-pressed') === 'true');
  return pressed.length ? pressed[0].dataset.micLiveMode : 'off';
}

test('al activar el micrófono la escala en vivo arranca en «Nota» y un acorde cambiado marca el mástil', () => {
  const { context, callbacks, element } = setup();
  callbacks.onState('ready');
  assert.equal(phaseOf(element('mic-live-chord')), 'note', 'Al encender el micrófono la fase por defecto es Nota');
  callbacks.onChord({ root: 9, type: 'm', mode: 'aeolian', confidence: .95 });
  assert.equal(context.root, 9, 'El acorde detectado cambia la escala');
  assert.equal(context.selectedMode, 'aeolian');
  assert.equal(context.progression.length, 0, 'El micrófono no agrega acordes a la progresión por sí solo');
  callbacks.onChord(null);
  assert.equal(context.progression.length, 0);
  callbacks.onState('stopped');
  assert.equal(context.root, 9, 'Al detener el micrófono se conserva la última escala');
  assert.equal(context.selectedMode, 'aeolian');
  assert.equal(context.ghostMode, 'lydian');
  assert.equal(context.activeProgression, 2); assert.equal(context.progressionEdited, false);
});

test('fase «Nota»: una sola nota usa la calidad y el modo elegidos', () => {
  const { context, callbacks, element } = setup();
  callbacks.onState('ready');
  callbacks.onPitch({ midi: 60, freq: 261.63, cents: 0 });
  assert.equal(context.root, 0, 'Do suena → raíz Do');
  assert.equal(context.selectedMode, 'ionian', 'Usa el modo elegido a la izquierda');
  callbacks.onChord({ root: 5, type: '7', mode: 'mixolydian', confidence: .95 });
  assert.equal(context.root, 5, 'Al captar un acorde se aplica el acorde real');
});

test('fase «Acorde»: la nota sola no cambia la escala; el acorde sí', () => {
  const { context, callbacks, element } = setup();
  callbacks.onState('ready');
  element('mic-live-chord').buttons[2].click(); // «Acorde»
  assert.equal(phaseOf(element('mic-live-chord')), 'chord');
  callbacks.onPitch({ midi: 60, freq: 261.63, cents: 0 });
  assert.equal(context.root, 0, 'Una nota sola no mueve la escala');
  callbacks.onChord({ root: 9, type: 'm', mode: 'aeolian', confidence: .95 });
  assert.equal(context.root, 9, 'El acorde captado sí cambia la escala');
});

test('fase «Apagado»: el micrófono no cambia la escala', () => {
  const { context, callbacks, element } = setup();
  callbacks.onState('ready');
  element('mic-live-chord').buttons[0].click(); // «Apagado»
  assert.equal(phaseOf(element('mic-live-chord')), 'off');
  callbacks.onPitch({ midi: 60, freq: 261.63, cents: 0 });
  callbacks.onChord({ root: 9, type: 'm', mode: 'aeolian', confidence: .95 });
  assert.equal(context.root, 0, 'Con Apagado la escala se conserva');
});

test('micLiveChord: decisión pura por fase', () => {
  const { micLiveChord } = require('../microphone-ui.js');
  const chord = { root: 9, type: 'm', mode: 'aeolian', confidence: .95 };
  assert.equal(micLiveChord('off', chord, 60), null);
  assert.deepEqual(micLiveChord('note', chord, 60), chord, 'Nota: acorde real gana a la nota');
  assert.deepEqual(micLiveChord('chord', chord, 60), chord);
  assert.equal(micLiveChord('chord', null, 60), null, 'Acorde: sin acorde no cambia');
  assert.deepEqual(micLiveChord('note', null, 60, { chordType: { value: 'm' }, selectedMode: 'dorian' }),
    { root: 0, rootNoteName: undefined, type: 'm', mode: 'dorian' });
  assert.deepEqual(micLiveChord('note', null, 62, { chordType: { value: 'maj' } }),
    { root: 2, rootNoteName: undefined, type: 'maj', mode: 'ionian' }, 'Sin modo elegido usa el del tipo');
  assert.equal(micLiveChord('note', null, null), null, 'Sin nota ni acorde no aplica');
});

function setupPitch() {
  const timers = [];
  let fakeNow = 0;
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      checked: false, hidden: true, handlers: {}, attributes: {}, dataset: {},
      addEventListener(event, fn) { this.handlers[event] = fn; },
      setAttribute(key, value) { this.attributes[key] = value; },
      querySelector: () => element('label'),
      querySelectorAll: () => [],
    });
    return elements.get(id);
  }
  let callbacks;
  class FakeDate extends Date { static now() { return fakeNow; } }
  const context = vm.createContext({
    document: { getElementById: element, querySelectorAll: () => [] },
    window: { addEventListener() {} }, MutationObserver: class { observe() {} },
    MicrophoneReader: class { constructor(options) { callbacks = options; } },
    Date: FakeDate,
    setTimeout(fn, ms) { timers.push({ fn, ms }); return timers.length; },
    clearTimeout() {},
    root: 0, quality: 'major', selectedMode: 'ionian', activeProgression: 2,
    rootNoteName: 'C', chordType: { value: 'maj' }, ghostMode: 'lydian',
    progression: [], progressionEdited: false, draggingProgressionItem: null,
    chordTypes: [{ value: 'm', suffix: 'm' }, { value: '7', suffix: '7' }],
    noteName: root => ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][root],
    isInTune: detection => Math.abs(detection.cents) <= 40,
    renderProgression() {}, showProgressionChord(chord) { context.root = chord.root; context.selectedMode = chord.mode; },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../microphone-ui.js'), 'utf8'), context);
  return {
    callbacks,
    readout: element('microphone-readout'),
    timers,
    delay(ms) { fakeNow += ms; },
    fire(t) { t.fn(); },
  };
}

test('al enmudecer la nota queda dibujada al menos un segundo y luego se limpia', () => {
  const { callbacks, readout, timers, delay, fire } = setupPitch();
  callbacks.onState('ready');
  callbacks.onPitch({ midi: 60, freq: 261.63, cents: 0 });
  assert.equal(readout.textContent, 'C4 · 261.63 Hz');

  callbacks.onPitch(null);
  assert.equal(readout.textContent, 'C4 · 261.63 Hz', 'La nota sigue dibujada durante el sostén');
  const hold = timers.find(t => t.ms === 1000);
  assert.ok(hold, 'Se programa la limpieza al cumplirse el segundo');

  delay(1100);
  fire(hold);
  assert.equal(readout.textContent, 'esperando nota…', 'Pasado el segundo sin otra nota, se limpia');
});

test('una nota nueva durante el sostén reemplaza al instante y extiende el reloj', () => {
  const { callbacks, readout, timers, delay, fire } = setupPitch();
  callbacks.onState('ready');
  callbacks.onPitch({ midi: 60, freq: 261.63, cents: 0 });
  delay(400);
  callbacks.onPitch(null);
  timers.length = 0; // descarta la limpieza del primer sostén, la nota nueva la reemplaza
  callbacks.onPitch({ midi: 62, freq: 293.66, cents: 5 });
  assert.equal(readout.textContent, 'D4 · 293.66 Hz', 'La nota nueva reemplaza la anterior al instante');
  delay(400);
  callbacks.onPitch(null);
  const hold = timers.find(t => t.ms === 600);
  assert.ok(hold, 'El sostén se reanuda desde la nota nueva');
  delay(700);
  fire(hold);
  assert.equal(readout.textContent, 'esperando nota…');
});