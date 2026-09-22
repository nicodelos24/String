const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup() {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      checked: false, hidden: true, handlers: {}, attributes: {}, dataset: {},
      addEventListener(event, fn) { this.handlers[event] = fn; },
      setAttribute(key, value) { this.attributes[key] = value; },
      querySelector: () => element('label'),
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
    renderProgression() {}, showProgressionChord(chord) { context.root = chord.root; context.selectedMode = chord.mode; },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../microphone-ui.js'), 'utf8'), context);
  return { context, callbacks, element, click(id) { const el = element(id); el.handlers.click({ currentTarget: el }); } };
}

test('el acorde escuchado marca el mástil sin añadir a la progresión y sin tocar los controles', () => {
  const { context, callbacks, element } = setup();
  callbacks.onState('ready');
  assert.equal(element('live-scale-toggle').checked, true, 'Al activar el micrófono la escala en vivo arranca activada');
  element('live-scale-toggle').checked = false;
  callbacks.onChord({ root: 9, type: 'm', mode: 'aeolian', confidence: .95 });
  assert.equal(context.progression.length, 0, 'El micrófono no agrega acordes a la progresión por sí solo');
  callbacks.onChord(null);
  assert.equal(context.progression.length, 0);
  callbacks.onState('stopped');
  assert.equal(context.root, 0); assert.equal(context.quality, 'major');
  assert.equal(context.selectedMode, 'ionian'); assert.equal(context.ghostMode, 'lydian');
  assert.equal(context.activeProgression, 2); assert.equal(context.progressionEdited, false);
});

test('activar Escala en vivo aplica el acorde actual; apagado mantiene la última escala', () => {
  const { context, callbacks, element } = setup();
  callbacks.onChord({ root: 9, type: 'm', mode: 'aeolian' });
  const toggle = element('live-scale-toggle');
  toggle.checked = true; toggle.handlers.change();
  assert.equal(context.root, 9); assert.equal(context.selectedMode, 'aeolian');
  callbacks.onChord({ root: 7, type: '7', mode: 'mixolydian' });
  assert.equal(context.root, 7);
  toggle.checked = false; toggle.handlers.change();
  callbacks.onChord({ root: 9, type: 'm', mode: 'aeolian' });
  assert.equal(context.root, 7);
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
