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
  assert.equal(keyLetter(48, 60), '');
  assert.equal(keyLetter(76, 60), ';');
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