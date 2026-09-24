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
