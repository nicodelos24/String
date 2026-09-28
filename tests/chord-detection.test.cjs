const { test } = require('node:test');
const assert = require('node:assert/strict');
const { detectChord, followStableChord } = require('../chord-detection.js');
const { audioSpectrum } = require('./helpers/audio-spectrum.cjs');

const voicings = [
  ['C', [48, 52, 55], 0, 'maj'], ['Am', [45, 52, 57, 60, 64], 9, 'm'],
  ['G abierto', [43, 47, 50, 55, 59, 67], 7, 'maj'],
  ['Em abierto', [40, 47, 52, 55, 59, 64], 4, 'm'],
  ['D abierto', [50, 57, 62, 66], 2, 'maj'],
  ['C invertido', [52, 55, 60], 0, 'maj'],
  ['G7', [43, 47, 50, 53], 7, '7'], ['Cmaj7', [48, 52, 55, 59], 0, 'maj7'],
  ['Dm7', [50, 53, 57, 60], 2, 'm7'], ['Bdim', [47, 50, 53], 11, 'dim'],
  ['Bm7b5', [47, 50, 53, 57], 11, 'm7b5'],
  ['C6', [48, 52, 55, 57], 0, '6'], ['Am6', [45, 48, 52, 54], 9, 'm6'],
  ['Cadd9', [48, 50, 52, 55], 0, 'add9'], ['C6/9', [48, 50, 52, 55, 57], 0, '6/9'],
  ['G9', [43, 47, 50, 53, 57], 7, '9'], ['Cmaj9', [48, 50, 52, 55, 59], 0, 'maj9'],
  ['Am9', [45, 48, 52, 55, 59], 9, 'm9'],
  ['Csus2', [48, 50, 55], 0, 'sus2'], ['Csus4', [48, 53, 55], 0, 'sus4'],
  ['C7sus4', [48, 53, 55, 58], 0, '7sus4'],
  ['Caug', [48, 52, 56], 0, 'aug'], ['Cdim7', [48, 51, 54, 57], 0, 'dim7'],
];
for (const sampleRate of [44100, 48000]) {
  for (const [name, midis, root, type] of voicings) {
    test(`${name}, ${sampleRate} Hz, con armónicos y ruido moderado`, () => {
      const found = detectChord(audioSpectrum(midis, { sampleRate, harmonics: 6, noise: 0.006 }), sampleRate);
      assert.ok(found, 'Debe reconocer el acorde');
      assert.equal(found.root, root); assert.equal(found.type, type);
    });
  }
}
test('el acorde detectado dice qué notas sonaron y cuál es la más grave', () => {
  // Es lo que permite marcar varias posiciones del mástil a la vez en vez de
  // una: las notas de la plantilla reconocida y la nota más grave que se oye.
  const found = detectChord(audioSpectrum([48, 52, 55], { harmonics: 6, noise: 0.006 }), 48000);
  assert.deepEqual(found.pitches, [0, 4, 7], 'un Do mayor sonando en Do3-Mi3-Sol3');
  assert.equal(found.bass, 48, 'la más grave de verdad, no la más aguda');
  const inverted = detectChord(audioSpectrum([41, 45, 48, 50], { harmonics: 6 }), 48000);
  assert.deepEqual(inverted.pitches, [5, 9, 0, 2], 'Fa6: Fa-Si-Do-Re');
  assert.equal(inverted.bass, 41, 'el Fa grave del bajo manda en la colocación');
  // La nota más grave se busca entre los parciales, no entre las clases: una
  // octava más arriba del mismo acorde cambia la referencia y no las notas.
  const up = detectChord(audioSpectrum([60, 64, 67], { harmonics: 6 }), 48000);
  assert.deepEqual(up.pitches, [0, 4, 7]);
  assert.equal(up.bass, 60);
  // Los acordes con cuartas y sextas también lo dice: un G13 completo
  // (Sol-Si-Re-Fa-La-Mi) trae sus seis notas, no solo las cinco de un G9.
  const thirteen = detectChord(audioSpectrum([43, 47, 50, 53, 57, 64], { harmonics: 6 }), 48000);
  assert.equal(thirteen.type, '13');
  assert.deepEqual(thirteen.pitches.slice().sort((a, b) => a - b), [2, 4, 5, 7, 9, 11]);
  assert.equal(thirteen.bass, 43);
  // Un G9 sin el Mi es un G9, no un G13: las notas que dice son las suyas.
  const nine = detectChord(audioSpectrum([43, 47, 50, 53, 55, 59], { harmonics: 6 }), 48000);
  assert.equal(nine.type, '7');
  assert.deepEqual(nine.pitches.slice().sort((a, b) => a - b), [2, 5, 7, 11]);
});
test('transposición cromática y desafinación leve', () => {
  for (let step = 0; step < 12; step++) {
    const found = detectChord(audioSpectrum([48, 52, 55].map(midi => midi + step), { detune: -15 }), 48000);
    assert.equal(found?.root, step); assert.equal(found?.type, 'maj');
  }
});
test('inversión: nombra el acorde según el bajo real en lugar de descartarlo', () => {
  const found = detectChord(audioSpectrum([41, 45, 48, 50], { harmonics: 6 }), 48000);
  assert.equal(found?.root, 5); assert.equal(found?.type, '6');
});
test('si la raíz apenas suena no se afirma la calidad', () => {
  assert.equal(detectChord(audioSpectrum([48, 52, 55], { amplitudes: [0.06, 0.9, 0.9] }), 48000), null);
});
test('silencio, ruido, notas solas y quintas no inventan acordes', () => {
  for (const midis of [[], [40], [45], [48], [52], [57], [64], [40, 47], [48, 55], [48, 49, 54, 58]]) {
    assert.equal(detectChord(audioSpectrum(midis, { harmonics: 9, noise: 0.002 }), 48000), null, String(midis));
  }
  assert.equal(detectChord(audioSpectrum([], { noise: 0.3 }), 48000), null);
});
test('rechaza dimensiones o frecuencias de muestreo inválidas', () => {
  assert.equal(detectChord(new Float32Array(16), 48000), null);
  assert.equal(detectChord(new Float32Array(8192), NaN), null);
});
test('confirma cambios sostenidos, filtra transitorios y libera en silencio', () => {
  const c = { root: 0, type: 'maj' }, am = { root: 9, type: 'm' };
  let state;
  const events = [];
  for (const [now, detection] of [[0,c],[100,c],[350,c],[400,am],[500,c],[800,c],[900,am],[1250,am],[1300,null],[1500,am],[1600,null],[2150,null],[2300,am],[2650,am]]) {
    const result = followStableChord(detection, state, now); state = result.state;
    if (result.chord !== undefined) events.push(result.chord);
  }
  assert.deepEqual(events, [c, am, null, am]);
});

// --- Lo que se midió al revisar el detector, para que no se rompa en silencio ---

// Voz realista: la cuerda más grave de cada clase del acorde, sin repetir.
function voicingFor(root, intervals) {
  const usados = new Set();
  const out = [];
  for (const interval of intervals) {
    const objetivo = (root + interval) % 12;
    let elegido = null;
    for (let midi = 40; midi <= 84 && elegido === null; midi++) {
      if (midi % 12 === objetivo && !usados.has(midi)) elegido = midi;
    }
    if (elegido === null) return null;
    usados.add(elegido);
    out.push(elegido);
  }
  return out;
}

// Las cuerdas graves suenan más que las agudas, pero siempre por encima de cero:
// una amplitud negativa invierte la fase y la medición no mide nada.
const ampliada = midis => {
  const base = midis[0] < 48 ? 0.19 : 0.16;
  return midis.map(m => base * Math.pow(0.965, Math.max(0, m - 40)));
};
const oye = (midis, harmonics = 6) =>
  detectChord(audioSpectrum(midis, { harmonics, noise: 0.005, amplitudes: ampliada(midis) }), 48000);

test('cejillas y acordes de 6 cuerdas con octavas duplicadas', () => {
  // Cada nota aparece dos veces en la misma clase: si se sumaran mal las
  // octavas, la croma quedaría torcida y el acorde no se nombraría.
  for (const [nombre, midis, raiz, tipo] of [
    ['cejilla de Do en la 8', [52, 60, 64, 67, 72, 76], 0, 'maj'],
    ['cejilla de Fa en la 1', [53, 57, 60, 65, 69, 72], 5, 'maj'],
    ['cejilla de Re menor en la 5', [50, 57, 62, 65, 69, 74], 2, 'm'],
    ['cejilla de Sol en la 3', [55, 59, 62, 67, 71, 74], 7, 'maj'],
    ['Re mayor abierto', [50, 57, 62, 66], 2, 'maj'],
  ]) {
    const found = oye(midis);
    assert.ok(found, nombre + ': debe reconocer el acorde');
    assert.equal(found.root, raiz, nombre);
    assert.equal(found.type, tipo, nombre);
  }
});

test('acordes que se pisan entre sí se nombran por la nota más grave', () => {
  // Disminuidos, aumentados y suspendidos los explican varias plantillas con
  // la misma cobertura; el desempate tiene que quedarse con la correcta.
  for (const [nombre, midis, raiz, tipo] of [
    ['Do[#dim]', [48, 51, 54], 0, 'dim'],
    ['Do[#dim]7', [48, 51, 54, 57], 0, 'dim7'],
    ['Do♯[#dim]7', [49, 52, 55, 58], 1, 'dim7'],
    ['Mi[#dim]7', [51, 54, 57, 60], 3, 'dim7'],
    ['Do[#aug]', [48, 52, 56], 0, 'aug'],
    ['Do♯[#aug]', [49, 53, 57], 1, 'aug'],
    ['Mi[#aug]', [52, 56, 60], 4, 'aug'],
    ['Do[sus]4', [48, 53, 55], 0, 'sus4'],
    ['Do[sus]2', [48, 50, 55], 0, 'sus2'],
    ['Do7[sus]4', [48, 53, 55, 58], 0, '7sus4'],
    ['Si[sus]menor[♭]5', [47, 50, 53, 57], 11, 'm7b5'],
  ]) {
    const found = oye(midis);
    assert.ok(found, nombre + ': debe reconocer el acorde');
    assert.equal(found.root, raiz, nombre);
    assert.equal(found.type, tipo, nombre);
  }
});

test('cuartas y sextas: antes no había plantilla y se rechazaban enteras', () => {
  for (const [nombre, midis, raiz, tipo] of [
    ['C11', [48, 52, 55, 58, 62, 65], 0, '11'],
    ['G11', [43, 47, 50, 53, 57, 60], 7, '11'],
    ['Am11', [45, 48, 52, 55, 59, 62], 9, 'm11'],
    ['Dm11', [50, 53, 57, 60, 64, 67], 2, 'm11'],
    ['G13', [43, 47, 50, 53, 57, 59, 64], 7, '13'],
  ]) {
    const found = oye(midis);
    assert.ok(found, nombre + ': debe reconocer el acorde');
    assert.equal(found.root, raiz, nombre);
    assert.equal(found.type, tipo, nombre);
  }
});

test('una cuerda muy por debajo de las demás hace dudar de la raíz', () => {
  // Con la raíz al 3% el detector no se aventura: es el comportamiento que ya
  // se probó y conviene que siga siendo así.
  const midis = [48, 52, 55];
  const weak = ampliada(midis); weak[0] = 0.03;
  assert.equal(detectChord(audioSpectrum(midis, { harmonics: 6, amplitudes: weak }), 48000), null);
});

test('potencias y dos notas nunca se nombran como acorde', () => {
  for (const midis of [[48, 55], [43, 50], [45, 52], [50, 57], [40, 47], [48, 52], [48, 54]]) {
    assert.equal(oye(midis, 8), null, midis.join('/'));
  }
});
