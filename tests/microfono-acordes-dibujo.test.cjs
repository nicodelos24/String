// T-57, ronda 1: el dibujo del micrófono tiene que mostrar TODAS las notas que
// suenan, en una forma tocable. Lo que se mide acá es el contrato entre lo que
// el detector entrega y lo que el mástil marca, con dos y con tres notas.
//
// La medición previa (Chromium con micrófono simulado, evidencia de la ronda)
// dejó el defecto con números: una tríada de Do marcaba **nueve** posiciones
// —cada nota repetida en todas las cuerdas— y una doble nota marcaba **cero**.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { audioSpectrum } = require('./helpers/audio-spectrum.cjs');
const { detectChord, detectSoundingNotes, followStableNotes } = require('../chord-detection.js');
const { chordFretShape } = require('../microphone-ui.js');

// La guitarra de la página, de grave a aguda: Mi2 La2 Re3 Sol3 Si3 Mi4.
const GUITAR = [40, 45, 50, 55, 59, 64];
// El alcance del mástil con ese instrumento (cuerda más grave por el traste 1 a
// la más aguda por el 22), el mismo que calcula `fretboardBounds`.
const BOUNDS = { low: 41, high: 86 };
const CONTEXT = { strings: GUITAR, low: 40, high: 86 };

// Dos fundamentales limpias, sin exigir que haya un tercer pico armónico.
// El lóbulo parabólico en dB permite interpolar la frecuencia entre bins.
function isolatedSpectrum(midis, sampleRate, size = 16384, { harmonics = 1, detune = 0 } = {}) {
  const spectrum = new Float32Array(size / 2).fill(-120);
  for (const midi of midis) {
    for (let h = 1; h <= harmonics; h++) {
      const bin = 440 * 2 ** ((midi - 69 + detune / 100) / 12) * h * size / sampleRate;
      if (bin >= spectrum.length - 3) continue;
      for (let i = Math.floor(bin) - 2; i <= Math.ceil(bin) + 2; i++) {
        // Perfil 1/h^0,9: más armónicos que la señal FFT de referencia.
        spectrum[i] = Math.max(spectrum[i], -25 - 18 * Math.log10(h) - 12 * (i - bin) ** 2);
      }
    }
  }
  return spectrum;
}

for (const size of [8192, 16384]) for (const sampleRate of [44100, 48000]) {
  test(`una tríada con armónicos ricos conserva tres notas a ${sampleRate} Hz, FFT ${size}`, () => {
    const spectrum = isolatedSpectrum([48, 52, 55], sampleRate, size, { harmonics: 5 });
    const detected = detectSoundingNotes(spectrum, sampleRate);
    assert.deepEqual(detected?.pitches, [0, 4, 7], 'los parciales no agregan Re ni Si a la tríada');
    const chord = detectChord(spectrum, sampleRate);
    assert.equal(chord?.root, 0);
    assert.equal(chord?.type, 'maj', 'no convierte Do mayor en maj9');
    assert.equal(chord.bass, 48);

    const { callbacks, live } = setupFretboard();
    callbacks.onState('ready');
    let state;
    for (const now of [0, 350]) {
      const result = followStableNotes(detected, state, now);
      state = result.state;
      if (result.chord !== undefined) callbacks.onNotes(result.chord);
    }
    assert.deepEqual(live().map(position => position.midi), [48, 52, 55]);
    callbacks.onChord(chord);
    assert.deepEqual(live().map(position => position.midi), [48, 52, 55], 'el nombre tampoco inventa posiciones');
  });

  test(`dos fundamentales sin armónicos llegan al mástil a ${sampleRate} Hz, FFT ${size}`, () => {
    for (const midis of [[48, 52], [48, 55], [52, 55]]) {
      const spectrum = isolatedSpectrum(midis, sampleRate, size);
      const detected = detectSoundingNotes(spectrum, sampleRate);
      assert.ok(detected, `deben llegar las dos notas ${midis}`);
      assert.deepEqual(detected.pitches, midis.map(midi => midi % 12));
      assert.equal(detected.bass, midis[0]);
      assert.equal(detectChord(spectrum, sampleRate), null, 'dos clases no nombran un acorde');

      const { callbacks, live } = setupFretboard();
      callbacks.onState('ready');
      let state;
      const events = [];
      for (const now of [0, 100, 350, 450, 1000]) {
        const result = followStableNotes(now < 450 ? detected : null, state, now);
        state = result.state;
        if (result.chord !== undefined) {
          events.push(result.chord);
          callbacks.onNotes(result.chord);
          assert.deepEqual(live().map(position => position.midi), now < 450 ? midis : []);
        } else if (now < 350) {
          assert.deepEqual(live(), [], 'no dibuja antes de confirmar');
        }
      }
      assert.deepEqual(events, [detected, null], 'confirma la doble y libera en silencio');
    }
  });

  test(`la resta conserva extensiones y notas coincidentes con armónicos a ${sampleRate} Hz, FFT ${size}`, () => {
    for (const [midis, type] of [
      [[48, 52, 55, 62], 'add9'],
      [[48, 52, 55, 59], 'maj7'],
      [[48, 52, 55, 59, 62], 'maj9'],
      [[48, 67], null], // Sol4 coincide con el tercer armónico de Do3.
      [[48, 76], null], // Mi5, con el quinto.
    ]) {
      // Una extensión real no se confunde con un parcial de otra fundamental.
      const spectrum = isolatedSpectrum(midis, sampleRate, size);
      const expected = midis.map(midi => midi % 12).sort((a, b) => a - b);
      assert.deepEqual(detectSoundingNotes(spectrum, sampleRate)?.pitches, expected, String(midis));
      const chord = detectChord(spectrum, sampleRate);
      assert.equal(chord?.type ?? null, type, String(midis));
      if (chord) assert.equal(chord.root, 0);
    }
  });

  test(`silencio, una fundamental y una octava no inventan simultaneidad a ${sampleRate} Hz, FFT ${size}`, () => {
    for (const midis of [[], [48], [52], [48, 60]]) {
      const spectrum = isolatedSpectrum(midis, sampleRate, size);
      assert.equal(detectSoundingNotes(spectrum, sampleRate), null, String(midis));
      assert.equal(detectChord(spectrum, sampleRate), null, String(midis));
    }
  });
}

test('la corrección de armónicos conserva las notas débiles que la base ya dibuja', () => {
  for (const [midis, amplitudes, harmonics, type] of [
    [[48, 52, 55], [0.03, 0.1, 0.1], 5, null],
    [[48, 52, 55, 59], [0.03, 0.1, 0.1, 0.1], 6, null],
    [[48, 52, 55, 62], [0.1, 0.03, 0.1, 0.1], 5, 'add9'],
    [[48, 52, 55, 59, 62], [0.1, 0.03, 0.1, 0.1, 0.1], 6, 'maj9'],
    [[48, 67], [0.1, 0.03], 1, null],
    [[48, 76], [0.1, 0.03], 5, null],
    [[48, 52, 55, 71], [0.1, 0.1, 0.1, 0.03], 1, 'maj7'],
    [[48, 52, 55, 71], [0.1, 0.1, 0.1, 0.03], 5, 'maj7'],
    [[48, 52, 55, 74], [0.1, 0.1, 0.1, 0.03], 1, 'add9'],
    [[48, 52, 55, 71, 74], [0.1, 0.1, 0.1, 0.1, 0.03], 5, 'maj9'],
  ]) {
    const spectrum = audioSpectrum(midis, { amplitudes, harmonics });
    assert.deepEqual(detectSoundingNotes(spectrum, 48000)?.pitches,
      midis.map(midi => midi % 12).sort((a, b) => a - b), String(midis));
    assert.equal(detectChord(spectrum, 48000)?.type ?? null, type, String(midis));
  }
});

test('la detección dice qué notas suenan a la vez también con dos notas', () => {
  // La doble nota es la que el autor nombró primero. Nombrar un acorde exige
  // tres clases (decisión medida de T-21, no se toca); dibujar, no: si suenan
  // dos notas, el mástil tiene que marcarlas.
  const two = detectSoundingNotes(audioSpectrum([48, 52], { harmonics: 6, noise: 0.006 }), 48000);
  assert.ok(two, 'una doble nota tiene que llegar al dibujo');
  assert.deepEqual(two.pitches, [0, 4], 'Do y Mi, sin inventar la quinta');
  assert.equal(two.bass, 48, 'y con la más grave que se oye');
  // La tríada entrega sus tres clases por el mismo camino.
  const three = detectSoundingNotes(audioSpectrum([48, 52, 55], { harmonics: 6, noise: 0.006 }), 48000);
  assert.deepEqual(three.pitches, [0, 4, 7]);
  assert.equal(three.bass, 48);
  // Cinco cuerdas del mismo Do: las clases del acorde, no una por cuerda.
  const five = detectSoundingNotes(audioSpectrum([48, 52, 55, 60, 64], { harmonics: 6, noise: 0.006 }), 48000);
  assert.deepEqual(five.pitches, [0, 4, 7]);
  // Una nota sola no es una simultaneidad, y el silencio tampoco.
  for (const midis of [[48], [40], [], [45]]) {
    assert.equal(detectSoundingNotes(audioSpectrum(midis, { harmonics: 9, noise: 0.002 }), 48000), null, String(midis));
  }
  assert.equal(detectSoundingNotes(new Float32Array(16), 48000), null, 'medidas inválidas no dibujan nada');
});

test('el conjunto de notas se confirma y se suelta con la misma paciencia que el acorde', () => {
  const c = { pitches: [0, 4], bass: 48 };
  const am = { pitches: [0, 4, 9], bass: 45 };
  let state;
  const events = [];
  for (const [now, detection] of [[0, c], [100, c], [350, c], [400, am], [500, c], [800, c], [900, am], [1250, am], [1300, null], [1500, am], [1600, null], [2150, null], [2300, am], [2650, am]]) {
    const result = followStableNotes(detection, state, now);
    state = result.state;
    if (result.chord !== undefined) events.push(result.chord);
  }
  assert.deepEqual(events, [c, am, null, am], 'un transitorio no llega y el silencio suelta');
});

test('chordFretShape: una posición por nota, en cuerdas distintas y cerca del bajo', () => {
  // Do mayor con el Do3 de grave: la forma abierta de siempre, Do en La3, Mi en
  // Re2 y Sol al aire; tres aros, no nueve.
  const shape = chordFretShape([0, 4, 7], 48, CONTEXT);
  assert.equal(shape.length, 3, 'una posición por nota');
  assert.deepEqual(shape.map(p => p.midi), [48, 52, 55], 'Do3-Mi3-Sol3, de grave a agudo');
  assert.deepEqual(shape.map(p => p.string), [1, 2, 3], 'La2, Re3 y Sol3: tres cuerdas distintas');
  assert.deepEqual(shape.map(p => p.fret), [3, 2, 0]);
  assert.equal(new Set(shape.map(p => p.string)).size, shape.length, 'ninguna cuerda lleva dos notas');
  assert.ok(shape.every(p => p.midi >= 48 && p.midi <= BOUNDS.high), 'nada suena por debajo del bajo ni fuera del mástil');

  // Una doble nota también tiene forma: dos cuerdas, dos aros.
  const two = chordFretShape([0, 4], 48, CONTEXT);
  assert.deepEqual(two.map(p => p.midi), [48, 52]);
  assert.equal(new Set(two.map(p => p.string)).size, 2);

  // La forma sube con el bajo: el mismo Do una octava arriba se dibuja arriba.
  const high = chordFretShape([0, 4, 7], 60, CONTEXT);
  assert.deepEqual(high.map(p => p.midi), [60, 64, 67]);
  assert.deepEqual(high.map(p => p.string), [3, 4, 5], 'Sol3, Si3 y Mi4');

  // Las clases repetidas (octavas del mismo grado) no piden dos posiciones.
  assert.equal(chordFretShape([7, 7, 4], 43, CONTEXT).length, 2, 'Sol una vez y el Mi que falta');

  // Sin la tabla del instrumento no hay cuerdas que repartir: se mantiene el
  // mapa de octavas de siempre, que es lo que usan los dobles de los tests.
  const sinCuerdas = chordFretShape([0, 4, 7], 48, BOUNDS);
  assert.deepEqual(sinCuerdas.map(p => p.midi), [48, 52, 55]);
  assert.ok(sinCuerdas.every(p => p.string === null), 'sin cuerdas no se inventa una posición');

  // Nada que dibujar no inventa posiciones.
  assert.deepEqual(chordFretShape([], 48, CONTEXT), []);
  assert.deepEqual(chordFretShape(null, 48, CONTEXT), []);
});

// --- El dibujo real: qué queda marcado en el mástil -------------------------

// Un mástil de mentira con la estructura de la página: seis cuerdas por 22
// trastes más las cuerdas al aire, cada posición con cuerpo, traste y color,
// igual que los escribe `fretboard-render.js`.
function setupFretboard() {
  const positions = [];
  function note(open, string, fret) {
    const midi = open + fret;
    const classes = new Set();
    const el = {
      dataset: {
        midi: String(midi), note: 'C', string: String(string), fret: String(fret),
        intervalColor: '#c9a227',
      },
      className: fret === 0 ? 'open-string-note chord-note scale-note' : 'fret-note chord-note scale-note',
      textContent: '1',
      style: {
        props: {},
        setProperty(k, v) { this.props[k] = v; },
        getPropertyValue(k) { return Object.hasOwn(this.props, k) ? this.props[k] : ''; },
        removeProperty(k) { delete this.props[k]; },
      },
      attrs: {},
      getAttribute(key) { return Object.hasOwn(this.attrs, key) ? this.attrs[key] : null; },
      setAttribute(key, value) { this.attrs[key] = String(value); },
      removeAttribute(key) { delete this.attrs[key]; },
      classList: {
        add: c => classes.add(c), remove: c => classes.delete(c),
        contains: c => classes.has(c), toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
      },
      isLive: () => classes.has('live'),
    };
    positions.push(el);
    return el;
  }
  GUITAR.forEach((open, string) => {
    note(open, string, 0);
    for (let fret = 1; fret <= 22; fret++) note(open, string, fret);
  });

  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      checked: false, hidden: true, handlers: {}, attributes: {}, dataset: {},
      textContent: '',
      addEventListener(event, fn) { this.handlers[event] = fn; },
      setAttribute(key, value) { this.attributes[key] = String(value); },
      getAttribute(key) { return this.attributes[key]; },
      querySelector: () => element('label'),
      querySelectorAll: () => [],
    });
    return elements.get(id);
  }
  let callbacks;
  const context = vm.createContext({
    events: [], Event: class { constructor(type) { this.type = type; } },
    document: {
      getElementById: element,
      querySelectorAll(sel) {
        if (sel.includes('[data-midi]')) return positions;
        if (sel.includes('.live')) return positions.filter(p => p.isLive());
        return [];
      },
    },
    window: { addEventListener() {}, dispatchEvent(event) { context.events.push(event.type); } },
    MutationObserver: class { observe() {} },
    MicrophoneReader: class { constructor(options) { callbacks = options; } },
    setTimeout: () => 0, clearTimeout() {},
    instruments: { guitar: { strings: GUITAR, stringNames: ['E', 'A', 'D', 'G', 'B', 'e'] } },
    instrument: 'guitar',
    root: 0, selectedMode: 'ionian', quality: 'major', activeProgression: 0,
    rootNoteName: 'C', chordType: { value: 'maj' }, ghostMode: '',
    progression: [], progressionEdited: false, draggingProgressionItem: null,
    chordTypes: [{ value: 'maj', suffix: '' }],
    noteName: () => 'C', isInTune: () => true,
    getDegreeLabel: () => '1',
    renderProgression() {}, showProgressionChord() {},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../note-ink.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../microphone-ui.js'), 'utf8'), context);
  return {
    callbacks,
    positions,
    live: () => positions.filter(p => p.isLive())
      .map(p => ({ midi: Number(p.dataset.midi), string: Number(p.dataset.string), fret: Number(p.dataset.fret) }))
      .sort((a, b) => a.midi - b.midi || a.string - b.string),
  };
}

test('con tres notas el mástil marca una forma: una posición por nota, no todas sus apariciones', () => {
  const { callbacks, live } = setupFretboard();
  callbacks.onState('ready');
  callbacks.onChord({ root: 0, type: 'maj', mode: 'ionian', pitches: [0, 4, 7], bass: 48, confidence: 0.9 });
  const marked = live();
  assert.deepEqual(marked.map(p => p.midi), [48, 52, 55], 'Do, Mi y Sol, cada uno una vez');
  assert.equal(new Set(marked.map(p => p.string)).size, 3, 'cada nota en su cuerda, como se toca un acorde');
  assert.deepEqual(marked.map(p => p.fret), [3, 2, 0], 'la forma abierta de Do, no la nube de nueve aros');
  assert.equal(marked.length, 3, 'nueve posiciones era el defecto medido');
});

test('con dos notas el mástil también dibuja la doble, que antes no dibujaba nada', () => {
  const { callbacks, live } = setupFretboard();
  callbacks.onState('ready');
  // Las dobles llegan por el camino nuevo: no hay acorde que nombrar, sí notas
  // que suenan.
  assert.ok(callbacks.onNotes, 'la interfaz tiene que escuchar el conjunto de notas');
  callbacks.onNotes({ pitches: [0, 4], bass: 48 });
  const marked = live();
  assert.deepEqual(marked.map(p => p.midi), [48, 52], 'Do3 y Mi3 marcados');
  assert.equal(new Set(marked.map(p => p.string)).size, 2);
  // Cuando llega un acorde nombrado, manda el acorde; al soltarlo, la doble
  // sigue dibujada si sigue sonando.
  callbacks.onChord({ root: 0, type: 'maj', mode: 'ionian', pitches: [0, 4, 7], bass: 48, confidence: 0.9 });
  assert.deepEqual(live().map(p => p.midi), [48, 52, 55], 'el acorde trae el Sol');
  callbacks.onChord(null);
  assert.deepEqual(live(), [], 'sin acorde ni notas no queda nada encendido');
  callbacks.onNotes(null);
  assert.deepEqual(live(), [], 'y el silencio limpia');
});

test('el seguimiento actualiza la inversión estable sin emitir cambios pasajeros de bajo', () => {
  for (const [follow, first, inverted] of [
    [followStableNotes, { pitches: [0, 4, 7], bass: 48 }, { pitches: [7, 4, 0], bass: 52 }],
    [require('../chord-detection.js').followStableChord, { root: 0, type: 'maj', bass: 48 }, { root: 0, type: 'maj', bass: 52 }],
  ]) {
    let state;
    const events = [];
    for (const [now, value] of [[0, first], [350, first], [400, inverted], [500, first], [600, inverted], [950, inverted]]) {
      const result = follow(value, state, now);
      state = result.state;
      if (result.chord !== undefined) events.push(result.chord);
    }
    assert.deepEqual(events, [first, inverted]);
  }
});
