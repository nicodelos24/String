const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('micFretLabel: el micrófono escribe el nombre de la nota o su grado', () => {
  const { micFretLabel } = require('../microphone-ui.js');
  // Grado: el intervalo se mide contra la raíz de la escala, con el mismo
  // vocabulario de las tablas de app.js.
  const degrees = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];
  const ctx = { root: 0, degreeFor: interval => degrees[interval] };
  assert.equal(micFretLabel({ midi: 60, name: 'C' }, 'degree', ctx), '1');
  assert.equal(micFretLabel({ midi: 64, name: 'E' }, 'degree', ctx), '3');
  assert.equal(micFretLabel({ midi: 63, name: 'Eb' }, 'degree', ctx), '♭3', 'una nota ajena a la escala también tiene grado');
  assert.equal(micFretLabel({ midi: 75, name: 'Eb' }, 'degree', ctx), '♭3', 'la octava no cambia el grado');
  assert.equal(micFretLabel({ midi: 57, name: 'A' }, 'degree', { root: 9, degreeFor: ctx.degreeFor }), '1', 'con otra raíz el grado se recalcula');
  // Nota: se reutiliza el nombre que la página ya pintó en esa posición, con la
  // grafía de su armadura, y sin octava.
  assert.equal(micFretLabel({ midi: 63, name: 'Eb' }, 'note', ctx), 'Eb');
  assert.equal(micFretLabel({ midi: 58, name: 'A#' }, 'note', ctx), 'A#', 'no se reescribe la grafía: la decide la armadura');
  assert.equal(micFretLabel({ midi: 58, name: 'A#' }, undefined, ctx), 'A#', 'sin modo escrito se lee como nota');
  // Sin nota o sin contexto no se inventa nada.
  assert.equal(micFretLabel(null, 'degree', ctx), '');
  assert.equal(micFretLabel({ name: 'C' }, 'degree', ctx), '');
  assert.equal(micFretLabel({ midi: 60, name: 'C' }, 'degree', {}), '', 'sin getDegreeLabel no hay grado que escribir');
});

function liveButton(mode, pressed) {
  return {
    dataset: { micLiveMode: mode },
    attributes: { 'aria-pressed': String(pressed) },
    classList: { toggle() {} },
    handlers: {},
    addEventListener(event, fn) { this.handlers[event] = fn; },
    setAttribute(key, value) { this.attributes[key] = value; },
    getAttribute(key) { return this.attributes[key]; },
    click() { this.clickCount = (this.clickCount || 0) + 1; if (this.handlers.click) this.handlers.click({ currentTarget: this }); },
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
    events: [], Event: class { constructor(type) { this.type = type; } },
    document: { getElementById: element, querySelectorAll: () => [] },
    window: { addEventListener() {}, dispatchEvent(event) { context.events.push(event.type); } }, MutationObserver: class { observe() {} },
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

test('un toque de Shift alterna «Escala en vivo» entre Nota y Acorde, y desde Apagado va a Nota', () => {
  const { nextMicLivePhase } = require('../microphone-ui.js');
  assert.equal(nextMicLivePhase('note'), 'chord');
  assert.equal(nextMicLivePhase('chord'), 'note');
  assert.equal(nextMicLivePhase('off'), 'note', 'con la escala en vivo apagada se va a Nota, no a Acorde');
});

test('el atajo de Shift cambia la fase del micrófono pulsando su botón, para que se guarde', () => {
  const { context, callbacks, element } = setup();
  const toggle = () => context.window.StringMicrophone.toggleLivePhase();
  callbacks.onState('ready');
  assert.equal(phaseOf(element('mic-live-chord')), 'chord', 'con el micrófono encendido arranca en Acorde');
  toggle();
  assert.equal(phaseOf(element('mic-live-chord')), 'note', 'un toque pasa a Nota');
  toggle();
  assert.equal(phaseOf(element('mic-live-chord')), 'chord', 'y otro toque vuelve a Acorde');
  // preferences.js captura el cambio por el clic, así que el atajo tiene que
  // pasar por el botón y no escribir el atributo por su cuenta.
  element('mic-live-chord').buttons.forEach(button => button.clickCount = 0);
  toggle();
  const clicked = element('mic-live-chord').buttons.filter(button => button.clickCount === 1);
  assert.equal(clicked.length, 1, 'pulsa exactamente un botón');
  assert.equal(clicked[0].dataset.micLiveMode, 'note');
});

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

function fakeNote(midi, name, label) {
  const classes = new Set();
  // `dataset` en el navegador es un DOMStringMap y rechaza las claves con
  // guion: escribir `dataset['data-mic-label']` lanza. El doble lo imita para
  // que ese fallo tampoco pase por aquí.
  const data = new Proxy({ midi: String(midi), note: name }, {
    set(target, key, value) {
      if (typeof key === 'string' && key.includes('-')) {
        throw new TypeError(`'${key}' no es una propiedad válida de DOMStringMap`);
      }
      target[key] = value;
      return true;
    },
  });
  return {
    dataset: data, textContent: label,
    classList: {
      add: c => classes.add(c), remove: c => classes.delete(c),
      contains: c => classes.has(c), toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
    },
    isLive: () => classes.has('live'),
  };
}

// Arnés del rótulo del micrófono: hace falta un mástil de verdad (notas con
// `data-midi`, `data-note` y su rótulo) para ver qué escribe y qué devuelve.
function setupLabels() {
  const DEGREES = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];
  const notes = [fakeNote(64, 'E', ''), fakeNote(65, 'F', '4'), fakeNote(66, 'F#', ''), fakeNote(60, 'C', '1')];
  const labelButtons = [liveButton('note', false), liveButton('degree', true)]
    .map(b => ({ ...b, dataset: { micLabelMode: b.dataset.micLiveMode }, attributes: { ...b.attributes } }));
  const micButtons = [liveButton('off', false), liveButton('note', false), liveButton('chord', true)];
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      checked: false, hidden: true, handlers: {}, attributes: {}, dataset: {},
      textContent: '',
      addEventListener(event, fn) { this.handlers[event] = fn; },
      setAttribute(key, value) { this.attributes[key] = value; },
      getAttribute(key) { return this.attributes[key]; },
      querySelector: () => element('label'),
      querySelectorAll(sel) {
        if (sel === '[data-mic-live-mode]') return micButtons;
        if (sel === '[data-mic-label-mode]') return labelButtons;
        return [];
      },
    });
    return elements.get(id);
  }
  let callbacks;
  const context = vm.createContext({
    events: [], Event: class { constructor(type) { this.type = type; } },
    document: {
      getElementById: element,
      querySelectorAll(sel) {
        if (sel.includes('[data-midi]')) return notes;
        if (sel.includes('.live')) return notes.filter(n => n.isLive());
        return [];
      },
    },
    window: { addEventListener() {}, dispatchEvent(event) { context.events.push(event.type); } }, MutationObserver: class { observe() {} },
    MicrophoneReader: class { constructor(options) { callbacks = options; } },
    setTimeout, root: 0, selectedMode: 'ionian', quality: 'major', activeProgression: 0,
    rootNoteName: 'C', chordType: { value: 'maj' }, ghostMode: '',
    progression: [], progressionEdited: false, draggingProgressionItem: null,
    chordTypes: [{ value: 'maj', suffix: '' }],
    noteName: () => 'C', isInTune: () => true,
    getDegreeLabel: interval => DEGREES[interval],
    renderProgression() {}, showProgressionChord() {},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../microphone-ui.js'), 'utf8'), context);
  return {
    context, notes, element, labelButtons,
    get callbacks() { return callbacks; },
    pressedMode() {
      const on = labelButtons.find(b => b.getAttribute('aria-pressed') === 'true');
      return on ? on.dataset.micLabelMode : null;
    },
  };
}

test('el rótulo del micrófono aparece con el micrófono encendido y arranca en «Grado»', () => {
  const { callbacks, element, pressedMode } = setupLabels();
  assert.equal(element('mic-note-label').hidden, true, 'encendido no, el switch está escondido');
  callbacks.onState('ready');
  assert.equal(element('mic-note-label').hidden, false, 'encendido sí, junto al botón');
  assert.equal(pressedMode(), 'degree');
  callbacks.onState('stopped');
  assert.equal(element('mic-note-label').hidden, true, 'al detenerlo se esconde otra vez');
});

test('el micrófono escribe el grado en la nota que suena y devuelve el rótulo de la página al soltarla', () => {
  const { callbacks, notes, labelButtons } = setupLabels();
  callbacks.onState('ready');
  // El Fa#4 (66) está fuera de Do mayor: con el grado pone ♭5 y no el rótulo
  // que tuviera puesto la página.
  callbacks.onPitch({ midi: 66, freq: 369.99, cents: 0 });
  const faS = notes.find(n => n.dataset.midi === '66');
  const do4 = notes.find(n => n.dataset.midi === '60');
  assert.equal(faS.textContent, '♭5', 'la nota que suena lleva su grado');
  assert.equal(faS.isLive(), true);
  assert.equal(do4.isLive(), false);
  assert.equal(do4.textContent, '1', 'lo que no suena conserva el rótulo de la página');
  // Cambiar a «Nota» reescribe lo que está sonando, sin tocar el resto.
  labelButtons[0].click();
  assert.equal(faS.textContent, 'F#', 'con Nota se escribe el nombre de la nota');
  assert.equal(do4.textContent, '1', 'y fuera de la nota que suena nada cambia');
  // Al apagar el micrófono, cada nota vuelve a su rótulo original.
  callbacks.onState('stopped');
  assert.equal(faS.textContent, '', 'el mástil recupera el rótulo que tenía');
  assert.equal(faS.dataset.micLabel, undefined, 'y no queda rastro del rótulo del micrófono');
  assert.equal(faS.isLive(), false);
});

test('el grado se recalcula cuando cambia la raíz de la escala', () => {
  const { context, callbacks, notes, labelButtons } = setupLabels();
  callbacks.onState('ready');
  callbacks.onPitch({ midi: 66, freq: 369.99, cents: 0 });
  const faS = notes.find(n => n.dataset.midi === '66');
  assert.equal(faS.textContent, '♭5', 'contra Do mayor el Fa# es la quinta disminuida');
  // Si la escala pasa a Fa mayor, la misma nota deja de estar dentro: el mástil
  // se repinta y el micrófono reescribe el rótulo con el criterio vigente.
  context.root = 5;
  callbacks.onPitch({ midi: 66, freq: 369.99, cents: 0 });
  assert.equal(faS.textContent, '♭2', 'contra Fa mayor la misma nota es una segunda menor');
  labelButtons[0].click();
  assert.equal(faS.textContent, 'F#', 'el nombre de la nota no depende de la escala');
});

test('chordFretMidis: una posición por nota, en la octava más cercana a la más grave', () => {
  const { chordFretMidis } = require('../microphone-ui.js');
  // Guitarra: de Mi2+1 (41) a Mi4+22 (86), que es lo que cubre el mástil.
  const guitar = { low: 41, high: 86 };
  // Do mayor con el Do3 (48) como nota más grave: la forma cae en la misma
  // posición que la tocada, no con las cuatro notas repetidas por el mástil.
  assert.deepEqual(chordFretMidis([0, 4, 7], 48, guitar), [48, 52, 55], 'Do3-Mi3-Sol3');
  // Dos octavas más arriba del mismo acorde, la forma sube con él.
  assert.deepEqual(chordFretMidis([0, 4, 7], 60, guitar), [60, 64, 67], 'Do4-Mi4-Sol4');
  // Un acorde invertido sitúa cada nota en la octava más cercana al bajo real.
  assert.deepEqual(chordFretMidis([5, 9, 0, 2], 41, guitar), [41, 45, 48, 50], 'Fa2-Sib2-Do3-Re3');
  // Marcar la misma nota dos veces (octavas del mismo grado) no se repite.
  assert.deepEqual(chordFretMidis([7, 7, 4], 43, guitar), [43, 52], 'sin posiciones repetidas: el Sol una vez y el Mi3 por encima del bajo');
  // Una nota sin ninguna posición en el mástil simplemente no se dibuja.
  assert.deepEqual(chordFretMidis([0, 4, 8], 48, { low: 48, high: 52 }), [48, 52], 'el Sol# no cabe en dos trastes');
  // Si solo hay posiciones por debajo del bajo, se dibuja la más alta.
  assert.deepEqual(chordFretMidis([1], 60, { low: 40, high: 55 }), [49], 'el Db# solo existe por debajo del bajo');
  // Sin nota grave conocida la forma se dibuja en la mitad del mástil, o en la
  // octava de arriba si la de abajo cae más lejos del centro.
  assert.deepEqual(chordFretMidis([0], null, guitar), [72], 'Do en la mitad del mástil');
  assert.deepEqual(chordFretMidis([], 48, guitar), []);
  assert.deepEqual(chordFretMidis(null, 48, guitar), []);
  assert.deepEqual(chordFretMidis([1.5, 'x', 4], 48, guitar), [52], 'descarta lo que no es una nota entera');
  assert.deepEqual(chordFretMidis([0], 48, { low: 86, high: 41 }), [], 'un alcance imposible no inventa posiciones');
  // Bajo: Mi1+1 (29) a Sol4+22 (65). Un Do con el Do2 (36) de grave sale en la
  // posición abierta de siempre, y con el Mi2 (40) de grave, que es la
  // inversión, la forma también se dibuja desde el bajo real.
  const bassRange = { low: 29, high: 65 };
  assert.deepEqual(chordFretMidis([0, 4, 7], 36, bassRange), [36, 40, 43], 'Do2-Mi2-Sol2 en bajo');
  assert.deepEqual(chordFretMidis([0, 4, 7], 40, bassRange), [40, 43, 48], 'con el Mi de grave: Mi2-Sol2-Do3');
});

test('con un acorde se dibujan todas sus notas y la monofónica se aparta', () => {
  const { callbacks, notes } = setupLabels();
  const liveMidis = () => notes.filter(n => n.isLive()).map(n => Number(n.dataset.midi)).sort((a, b) => a - b);
  callbacks.onState('ready');
  // La nota que YIN confirma se marca como hasta ahora.
  callbacks.onPitch({ midi: 64, freq: 329.63, cents: 0 });
  assert.deepEqual(liveMidis(), [64], 'una nota sola marca una posición');
  // Llega un acorde con sus notas y la más grave: se dibuja la forma entera.
  // El Fa3 (53) está en el mástil de mentira a propósito: es la nota que YIN
  // inventó sobre un Do en la medición del navegador, y tiene que existir aquí
  // para que la supresión se pueda comprobar de verdad.
  notes.push(fakeNote(48, 'C', ''), fakeNote(52, 'E', ''), fakeNote(55, 'G', ''), fakeNote(59, 'B', ''), fakeNote(53, 'F', ''));
  callbacks.onChord({ root: 0, type: 'maj7', mode: 'ionian', pitches: [0, 4, 7, 11], bass: 48, confidence: 0.95 });
  assert.deepEqual(liveMidis(), [48, 52, 55, 59], 'la forma del Cmaj7 en la posición sonada');
  // Con el acorde sonando, la nota monofónica no se dibuja: se midió que no es
  // la que se está tocando (0 aciertos de 5) y solo añadía un falso resaltado.
  // Ojo: la nota llega en cada fotograma, así que comprobarla solo justo después
  // del acorde no basta: tiene que seguir fuera con más fotogramas encima.
  callbacks.onPitch({ midi: 53, freq: 174.61, cents: 0 });
  assert.deepEqual(liveMidis(), [48, 52, 55, 59], 'la nota de YIN no se cuela con el acorde');
  callbacks.onPitch({ midi: 53, freq: 174.61, cents: 0 });
  assert.deepEqual(liveMidis(), [48, 52, 55, 59], 'ni en los fotogramas siguientes');
  // Al soltar el acorde, la nota monofónica recupera su lugar.
  callbacks.onChord(null);
  callbacks.onPitch({ midi: 53, freq: 174.61, cents: 0 });
  assert.deepEqual(liveMidis(), [53], 'soltado el acorde, vuelve la nota única');
  // Y un acorde que no trae notas (o viene vacío) no se dibuja, pero tampoco
  // borra lo que hubiera: solo manda si de verdad hay forma que enseñar.
  callbacks.onChord({ root: 0, type: 'maj', mode: 'ionian', confidence: 0.9 });
  assert.deepEqual(liveMidis(), [53], 'un acorde sin notas deja la nota como estaba');
  callbacks.onState('stopped');
  assert.deepEqual(liveMidis(), [], 'al detener el micrófono no queda nada encendido');
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
    events: [], Event: class { constructor(type) { this.type = type; } },
    document: { getElementById: element, querySelectorAll: () => [] },
    window: { addEventListener() {}, dispatchEvent(event) { context.events.push(event.type); } }, MutationObserver: class { observe() {} },
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
test('cada nota confirmada avisa con un evento, y el silencio no', () => {
  // De este evento dependen las dos cosas que hacen que el micrófono lleve la
  // canción: marcar el tempo tocando notas y entrar a la canción al tocar. Si no
  // saliera, las dos no medirían el tiempo.
  // Lo que NO se comprueba aquí es que una nota sostenida no repita el evento:
  // eso no lo decide microphone-ui.js, sino el deduplicado de followStable
  // (microphone.js), que ya tiene sus pruebas en tests/microphone.test.cjs. Aquí
  // el doble llama a onPitch directamente, que es justo saltarse ese filtro.
  const { context, callbacks } = setup();
  callbacks.onState('ready');
  assert.deepEqual(context.events, [], 'sin notas no hay eventos');
  callbacks.onPitch({ midi: 60, freq: 261.63, cents: 0 });
  assert.deepEqual(context.events, ['traste:mic-note'], 'una nota confirmada, un evento');
  callbacks.onPitch({ midi: 64, freq: 329.63, cents: 0 });
  assert.deepEqual(context.events, ['traste:mic-note', 'traste:mic-note'], 'otra nota es otro golpe');
  // Y el silencio no es un golpe: es lo que separa dos de ellos. Si contara,
  // marcar el tempo con notas mediría el doble de lo que toca.
  callbacks.onPitch(null);
  assert.equal(context.events.length, 2, 'el silencio no emite evento');
});
