const { test } = require('node:test');
const assert = require('node:assert/strict');
const { keyStrip, keyLetter, activeBaseMidi, keyboardMidiFor, KEY_OFFSETS, KeySynth } = require('../keyboard-section.js');

test('keyboard: the strip builds 7 white and 5 black keys per octave with ascending MIDI', () => {
  const strip = keyStrip(3, 2, 60);
  assert.equal(strip.whites.length, 14);
  assert.equal(strip.blacks.length, 10);
  assert.equal(strip.totalWhite, 14);
  assert.equal(strip.whites[0].midi, 48);
  assert.equal(strip.whites[13].midi, 71);
  assert.equal(strip.blacks[0].midi, 49);
  const semitones = strip.whites.map(k => k.pitchClass);
  assert.deepEqual(semitones.slice(0, 7), [0, 2, 4, 5, 7, 9, 11]);
  assert.deepEqual(semitones.slice(7), [0, 2, 4, 5, 7, 9, 11]);
});

test('keyboard: a, s, d map to C, D, E and w, e, t to the sharps at the active base', () => {
  assert.equal(KEY_OFFSETS.a, 0);
  assert.equal(KEY_OFFSETS.s, 2);
  assert.equal(KEY_OFFSETS.d, 4);
  assert.equal(KEY_OFFSETS.w, 1);
  assert.equal(KEY_OFFSETS.e, 3);
  assert.equal(KEY_OFFSETS.t, 6);
  assert.equal(keyboardMidiFor(4, 0) + KEY_OFFSETS.a, 60);
  assert.equal(keyboardMidiFor(4, 0) + KEY_OFFSETS.w, 61);
  assert.equal(keyboardMidiFor(4, 0) + KEY_OFFSETS.s, 62);
});

test('keyboard: letters are labelled only inside the active window', () => {
  assert.equal(keyLetter(60, 60), 'a');
  assert.equal(keyLetter(62, 60), 's');
  assert.equal(keyLetter(64, 60), 'd');
  assert.equal(keyLetter(65, 60), 'f');
  assert.equal(keyLetter(48, 60), '', 'fuera de la ventana activa');
  assert.equal(keyLetter(76, 60), 'ñ');
});

test('keyboard: la fila grave arranca en sol (z=G3) y las teclas extras se suman a los sostenidos y naturales', () => {
  const { KEY_OFFSETS, KEY_CODES } = require('../keyboard-section.js');
  assert.equal(KEY_OFFSETS.z, -5); // G3
  assert.equal(KEY_OFFSETS.x, -3); // A3
  assert.equal(KEY_OFFSETS.c, -1); // B3
  assert.equal(KEY_OFFSETS.v, 0);  // C4
  assert.equal(KEY_OFFSETS.b, 2);  // D4
  assert.equal(KEY_OFFSETS.n, 4);  // E4
  assert.equal(KEY_OFFSETS.m, 5);  // F4
  assert.equal(KEY_OFFSETS['{'], 17); // F5
  assert.equal(KEY_OFFSETS['´'], 18);  // F#5
  assert.equal(KEY_OFFSETS['+'], 20);  // G#5
  assert.equal(KEY_OFFSETS.p, 15); // D#5, sigue siendo sostenido
  assert.equal(KEY_OFFSETS.ñ, KEY_OFFSETS[';'], 'ñ es la posición de ; en teclado español');
  assert.equal(KEY_CODES.Semicolon, 16); // ñ → E5
  assert.equal(KEY_CODES.Quote, 17);     // { → F5
  assert.equal(KEY_CODES.BracketLeft, 18); // ´ → F#5
  assert.equal(KEY_CODES.Equal, 20);       // + → G#5
});

test('keyboard: keyOffsetFor usa la letra o la posición física como respaldo', () => {
  const { keyOffsetFor } = require('../keyboard-section.js');
  assert.equal(keyOffsetFor({ key: 'a', code: 'KeyA' }), 0);
  assert.equal(keyOffsetFor({ key: 'ñ', code: 'Semicolon' }), 16);
  assert.equal(keyOffsetFor({ key: 'Z', code: 'KeyZ' }), -5);
  assert.equal(keyOffsetFor({ key: 'Dead', code: 'BracketLeft' }), 18, 'tecla de acento muerto por posición');
  assert.equal(keyOffsetFor({ key: '{', code: 'Quote' }), 17);
  assert.equal(keyOffsetFor({ key: '+', code: 'Equal' }), 20);
  assert.equal(keyOffsetFor({ key: 'q', code: 'KeyQ' }), undefined);
});

test('keyboard: left shift lowers a full octave and right shift raises it, clamped to visible octaves', () => {
  assert.equal(activeBaseMidi(60, -1, 3, 4), 48);
  assert.equal(activeBaseMidi(60, 1, 3, 4), 72);
  assert.equal(activeBaseMidi(48, -1, 3, 4), 48);
  assert.equal(activeBaseMidi(72, 1, 3, 4), 72);
});

test('keyboard synth: hard-clamped octaves do not stay stuck and invalid notes never start audio', async () => {
  const synth = new KeySynth({ createContext: () => { throw new Error('Unexpected audio'); } });
  await synth.noteOn(-1);
  await synth.noteOn(200);
  assert.equal(synth.voices.size, 0);
});

test('keyboard synth: noteOn starts a voice per MIDI, noteOff releases it and allOff clears', async () => {
  const oscillators = [];
  const parameter = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const ctx = {
    currentTime: 0,
    destination: {},
    sampleRate: 44100,
    resume: async () => {},
    createGain: () => ({ gain: parameter(), connect() {}, disconnect() {} }),
    createOscillator: () => {
      const osc = { type: '', frequency: { _value: 0, setValueAtTime(v) { this._value = v; } }, connect() {}, start() {}, stop(time) { this.stopTime = time; } };
      oscillators.push(osc);
      return osc;
    },
  };
  const synth = new KeySynth({ createContext: () => ctx });
  await synth.noteOn(60);
  await synth.noteOn(64);
  assert.equal(synth.voices.size, 2);
  assert.equal(oscillators.length, 6);
  const freqs = oscillators.map(o => Math.round(o.frequency._value));
  assert(freqs.includes(262)); // C4
  assert(freqs.includes(330)); // E4
  synth.noteOff(60);
  assert.equal(synth.voices.size, 1);
  assert(oscillators.slice(0, 3).every(o => o.stopTime !== undefined));
  synth.allOff();
  assert.equal(synth.voices.size, 0);
});

test('keyboard: resalta en el mástil solo las posiciones del mismo MIDI sin tocar el resaltado del micrófono', () => {
  const { mastilKeyToggle } = require('../keyboard-section.js');
  const makeNote = midi => ({
    dataset: { midi: String(midi) },
    classList: {
      set: new Set(),
      contains(c) { return this.set.has(c); },
      add(c) { this.set.add(c); },
      remove(c) { this.set.delete(c); },
    },
  });
  const notes = [makeNote(60), makeNote(60), makeNote(62), makeNote(62)];
  notes[3].classList.add('live'); // resaltado previo del micrófono
  assert.equal(mastilKeyToggle(notes, 60, true), 2);
  assert(notes[0].classList.contains('keyboard-live'));
  assert(notes[1].classList.contains('keyboard-live'));
  assert(!notes[2].classList.contains('keyboard-live'));
  assert(notes[3].classList.contains('live'), 'el resaltado del micrófono queda intacto');
  assert.equal(mastilKeyToggle(notes, 60, true), 0, 'ya resaltadas no cuentan como cambio');
  assert.equal(mastilKeyToggle(notes, 60, false), 2);
  assert(!notes[0].classList.contains('keyboard-live'));
  assert(!notes[1].classList.contains('keyboard-live'));
  assert.equal(mastilKeyToggle(notes, 60, false), 0);
  assert.equal(mastilKeyToggle(notes, 200, true), 0, 'un MIDI fuera del rango del mástil no resalta nada');
});

test('keyboard synth: guitarra y bajo usan una cuerda pulsada que decae y se normaliza', () => {
  const { pluckWave } = require('../keyboard-section.js');
  for (const options of [{ brightness: 0.92 }, { brightness: 0.35, damping: 0.9945 }]) {
    const wave = pluckWave(44100, 220, 2.2, options);
    assert.equal(wave.length, Math.ceil(44100 * 2.2));
    const peak = Math.max(...Array.from(wave, Math.abs));
    assert.ok(peak <= 0.85 + 1e-6, 'la onda se normaliza a 0.85');
    const quarter = Math.floor(wave.length / 4);
    const first = wave.slice(0, quarter).reduce((s, v) => s + Math.abs(v), 0);
    const last = wave.slice(wave.length - quarter).reduce((s, v) => s + Math.abs(v), 0);
    assert.ok(first > last * 5, 'la cuerda se extingue sola');
  }
});

test('keyboard synth: noteOn de guitarra o bajo usa un buffer pulsado y no osciladores', async () => {
  const { KeySynth } = require('../keyboard-section.js');
  const oscillators = [];
  const sources = [];
  const parameter = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const ctx = {
    currentTime: 0,
    destination: {},
    sampleRate: 44100,
    resume: async () => {},
    createBuffer: (ch, n) => { const d = new Float32Array(n); return { getChannelData: () => d }; },
    createBufferSource: () => { const s = { connect() {}, start() {}, stop(t) { this.stopTime = t; } }; sources.push(s); return s; },
    createGain: () => ({ gain: parameter(), connect() {} }),
    createOscillator: () => { const o = { type: '', frequency: {}, connect() {}, start() {}, stop() {} }; oscillators.push(o); return o; },
  };
  const synth = new KeySynth({ createContext: () => ctx });
  await synth.noteOn(40, 'guitar');
  await synth.noteOn(29, 'bass');
  assert.equal(synth.voices.size, 2);
  assert.equal(oscillators.length, 0, 'ningún oscilador para instrumentos pulsados');
  assert.equal(sources.length, 2, 'dos buffer source, uno por nota');
  synth.noteOff(40);
  assert.equal(synth.voices.size, 1);
  synth.allOff();
  assert.equal(synth.voices.size, 0);
  assert.ok(sources.every(s => s.stopTime !== undefined));
});

test('keyboard synth: timbre and effects update even before the context starts', () => {
  const synth = new KeySynth({ createContext: () => { throw new Error('Unexpected audio'); } });
  synth.setTimbre('organ');
  synth.setDelay(true);
  synth.setReverb(true);
  synth.setVolume(0.5);
  assert.equal(synth.timbre, 'organ');
  assert.equal(synth.delay, true);
  assert.equal(synth.reverb, true);
  assert.equal(synth.volume, 0.5);
});