const { test } = require('node:test');
const assert = require('node:assert/strict');
const { detectPitch, midiOf, centsOf, isInTune, findFret } = require('../pitch-detection.js');

function sine(freq, sampleRate = 48000, length = 2048, amplitude = 0.5) {
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) data[i] = amplitude * Math.sin(2 * Math.PI * freq * i / sampleRate);
  return data;
}

const GUITAR = [40, 45, 50, 55, 59, 64];
const BASS = [28, 33, 38, 43];

test('detecta A4 a 440 Hz como MIDI 69 afinado', () => {
  const pitch = detectPitch(sine(440), 48000);
  assert.ok(pitch);
  assert.equal(pitch.midi, 69);
  assert.ok(Math.abs(pitch.freq - 440) < 0.5, `freq=${pitch.freq}`);
  assert.ok(Math.abs(pitch.cents) <= 1, `cents=${pitch.cents}`);
  assert.ok(isInTune(pitch));
});

test('silencio devuelve null', () => {
  assert.equal(detectPitch(new Float32Array(2048), 48000), null);
  assert.equal(detectPitch(sine(440, 48000, 2048, 0), 48000), null);
});

test('nota grave: E2 (82.4 Hz) → MIDI 40', () => {
  const pitch = detectPitch(sine(82.407), 48000);
  assert.ok(pitch);
  assert.equal(pitch.midi, 40);
  assert.ok(isInTune(pitch));
});

test('nota aguda: C6 (1046.5 Hz) → MIDI 84', () => {
  const pitch = detectPitch(sine(1046.5), 48000);
  assert.ok(pitch);
  assert.equal(pitch.midi, 84);
});

test('desafinación dentro de ±40 cents se marca afinada', () => {
  const flat = detectPitch(sine(432), 48000); // A4 ~ -32 cents
  assert.ok(flat && flat.midi === 69);
  assert.ok(flat.cents < 0);
  assert.ok(isInTune(flat));
});

test('desafinación mayor a ±40 cents se marca no afinada', () => {
  const flat = detectPitch(sine(426.1), 48000); // a mitad de camino entre A4 y Ab4, ~ -55/-44 cents
  assert.ok(flat);
  assert.ok(Math.abs(flat.cents) > 40, `cents=${flat.cents}`);
  assert.equal(isInTune(flat), false);
});

test('midiOf y centsOf', () => {
  assert.equal(midiOf(440), 69);
  assert.equal(centsOf(440), 0);
});

test('buffer demasiado corto o sin datos devuelve null', () => {
  assert.equal(detectPitch(new Float32Array(3), 48000), null);
  assert.equal(detectPitch(new Float32Array(0), 48000), null);
});

test('findFret en guitarra devuelve posiciones de traste más bajo a más alto', () => {
  assert.deepEqual(findFret(69, GUITAR), [
    { string: 6, fret: 5, midi: 69 },
    { string: 5, fret: 10, midi: 69 },
    { string: 4, fret: 14, midi: 69 },
    { string: 3, fret: 19, midi: 69 },
  ]);
});

test('findFret en bajo con cuerda al aire', () => {
  assert.deepEqual(findFret(28, BASS), [{ string: 1, fret: 0, midi: 28 }]);
});

test('findFret fuera del mástil o entrada inválida devuelve lista vacía', () => {
  assert.deepEqual(findFret(127, GUITAR), []);
  assert.deepEqual(findFret(40, { strings: [] }), []);
  assert.deepEqual(findFret(69, null), []);
  assert.deepEqual(findFret(60.5, GUITAR), []);
});