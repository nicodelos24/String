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
    setChordSpelling(useFlats) { context.spelling = useFlats; },
    renderProgression() {}, showProgressionChord(chord) { context.root = chord.root; context.selectedMode = chord.mode; },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../microphone-ui.js'), 'utf8'), context);
  return { context, callbacks, element, click(id) { element(id).click(); } };
}

function phaseOf(element) {
  const pressed = element.buttons.filter(button => button.getAttribute('aria-pressed') === 'true');
  return pressed.length ? pressed[0].dataset.micLiveMode : 'off';
}

test('al activar el micrófono la escala en vivo arranca en «Acorde» y un acorde cambiado marca el mástil', () => {
  const { context, callbacks, element } = setup();
  callbacks.onState('ready');
  assert.equal(phaseOf(element('mic-live-chord')), 'chord', 'Al encender el micrófono la fase por defecto es Acorde');
  callbacks.onChord({ root: 9, type: 'm', mode: 'aeolian', confidence: .95 });
  assert.equal(context.root, 9, 'El acorde detectado cambia la escala');
  assert.equal(context.selectedMode, 'aeolian');
  assert.equal(context.spelling, false, 'La raíz La prefiere sostenidos');
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
  element('mic-live-chord').buttons[1].click(); // «Nota»
  assert.equal(phaseOf(element('mic-live-chord')), 'note');
  callbacks.onPitch({ midi: 60, freq: 261.63, cents: 0 });
  assert.equal(context.root, 0, 'Do suena → raíz Do');
  assert.equal(context.selectedMode, 'ionian', 'Usa el modo elegido a la izquierda');
  callbacks.onChord({ root: 5, type: '7', mode: 'mixolydian', confidence: .95 });
  assert.equal(context.root, 5, 'Al captar un acorde se aplica el acorde real');
});

test('fase «Acorde» (por defecto): la nota sola no cambia la escala; el acorde sí', () => {
  const { context, callbacks, element } = setup();
  callbacks.onState('ready');
  assert.equal(phaseOf(element('mic-live-chord')), 'chord', 'El arranque por defecto es Acorde');
  callbacks.onPitch({ midi: 60, freq: 261.63, cents: 0 });
  assert.equal(context.root, 0, 'Una nota sola no mueve la escala');
  callbacks.onChord({ root: 9, type: 'm', mode: 'aeolian', confidence: .95 });
  assert.equal(context.root, 9, 'El acorde captado sí cambia la escala');
});

test('los acordes en vivo ajustan el switch ♯/♭ a la escritura de su raíz', () => {
  const { context, callbacks } = setup();
  callbacks.onState('ready');
  callbacks.onChord({ root: 2, type: 'maj', mode: 'ionian', confidence: .95 });
  assert.equal(context.spelling, false, 'Re mayor prefiere sostenidos');
  callbacks.onChord({ root: 10, type: 'maj', mode: 'ionian', confidence: .95 });
  assert.equal(context.spelling, true, 'Sib mayor prefiere bemoles');
  callbacks.onChord({ root: 0, type: 'maj', mode: 'ionian', confidence: .95 });
  assert.equal(context.spelling, true, 'Do no cambia la elección del usuario');
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
  const expected = { ...chord, rootNoteName: 'A', useFlats: false };
  assert.equal(micLiveChord('off', chord, 60), null);
  assert.deepEqual(micLiveChord('note', chord, 60), expected, 'Nota: acorde real gana a la nota y lleva su escritura');
  assert.deepEqual(micLiveChord('chord', chord, 60), expected);
  assert.equal(micLiveChord('chord', null, 60), null, 'Acorde: sin acorde no cambia');
  assert.equal(micLiveChord('note', { root: 0, type: 'maj', mode: 'ionian', confidence: .9 }, 60).useFlats,
    undefined, 'Do no añade escritura propia');
  assert.deepEqual(micLiveChord('note', null, 60, { chordType: { value: 'm' }, selectedMode: 'dorian' }),
    { root: 0, rootNoteName: undefined, type: 'm', mode: 'dorian' });
  assert.deepEqual(micLiveChord('note', null, 62, { chordType: { value: 'maj' } }),
    { root: 2, rootNoteName: undefined, type: 'maj', mode: 'ionian' }, 'Sin modo elegido usa el del tipo');
  assert.equal(micLiveChord('note', null, null), null, 'Sin nota ni acorde no aplica');
});

test('preferredRootSpelling: el círculo de quintas decide la escritura de la raíz', () => {
  const { preferredRootSpelling } = require('../microphone-ui.js');
  assert.deepEqual(preferredRootSpelling(2), { rootName: 'D', useFlats: false });
  assert.deepEqual(preferredRootSpelling(4), { rootName: 'E', useFlats: false });
  assert.deepEqual(preferredRootSpelling(6), { rootName: 'F#', useFlats: false });
  assert.deepEqual(preferredRootSpelling(7), { rootName: 'G', useFlats: false });
  assert.deepEqual(preferredRootSpelling(9), { rootName: 'A', useFlats: false });
  assert.deepEqual(preferredRootSpelling(11), { rootName: 'B', useFlats: false });
  assert.deepEqual(preferredRootSpelling(1), { rootName: 'Db', useFlats: true });
  assert.deepEqual(preferredRootSpelling(3), { rootName: 'Eb', useFlats: true });
  assert.deepEqual(preferredRootSpelling(5), { rootName: 'F', useFlats: true });
  assert.deepEqual(preferredRootSpelling(8), { rootName: 'Ab', useFlats: true });
  assert.deepEqual(preferredRootSpelling(10), { rootName: 'Bb', useFlats: true });
  assert.equal(preferredRootSpelling(0), null, 'Do no prefiere escritura');
  assert.deepEqual(preferredRootSpelling(14), { rootName: 'D', useFlats: false }, 'Fuera de rango se normaliza módulo 12');
});

test('tunerReading: apunta la cuerda más cercana, su nota objetivo y los cents', () => {
  const { tunerReading } = require('../microphone-ui.js');
  const table = {
    guitar: { strings: [40, 45, 50, 55, 59, 64], stringNames: ['E', 'A', 'D', 'G', 'B', 'e'] },
    bass: { strings: [28, 33, 38, 43], stringNames: ['E', 'A', 'D', 'G'] },
  };
  const e2 = tunerReading({ midi: 40, cents: 0 }, 'guitar', table);
  assert.equal(e2.stringIndex, 0); assert.equal(e2.stringNumber, 1);
  assert.equal(e2.noteName, 'E2'); assert.equal(e2.cents, 0); assert.equal(e2.inTune, true);
  const a2Grave = tunerReading({ midi: 45, cents: -120 }, 'guitar', table);
  assert.equal(a2Grave.stringIndex, 1); assert.equal(a2Grave.noteName, 'A2');
  assert.equal(a2Grave.cents, -120); assert.equal(a2Grave.inTune, false);
  const e4 = tunerReading({ midi: 64, cents: -50 }, 'guitar', table);
  assert.equal(e4.stringIndex, 5); assert.equal(e4.noteName, 'e4'); assert.equal(e4.cents, -50);
  const g2 = tunerReading({ midi: 43, cents: 5 }, 'bass', table);
  assert.equal(g2.stringIndex, 3); assert.equal(g2.noteName, 'G2'); assert.equal(g2.inTune, true);
  const locked = tunerReading({ midi: 64, cents: 0 }, 'guitar', table, 0);
  assert.equal(locked.stringIndex, 0); assert.equal(locked.noteName, 'E2');
  assert.equal(locked.cents, 2400, 'Con la cuerda fijada se mide contra ella, no la más cercana');
  assert.equal(tunerReading(null, 'guitar', table), null, 'Sin detección no hay lectura');
  assert.equal(tunerReading({ midi: 40, cents: 0 }, 'piano', table), null, 'Instrumento desconocido no afina');
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