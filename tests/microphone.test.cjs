const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MicrophoneReader, followStable } = require('../microphone.js');
const { detectPitch } = require('../pitch-detection.js');

function sineInto(buffer, freq, sampleRate = 48000, amplitude = 0.5) {
  for (let i = 0; i < buffer.length; i++) buffer[i] = amplitude * Math.sin(2 * Math.PI * freq * i / sampleRate);
  return buffer;
}

test('followStable confirma una nota sostenida y luego el silencio', () => {
  const note = { midi: 69 };
  const first = followStable(note);
  assert.equal(first.note, undefined); // aún no confirmada
  const second = followStable(note, first.state);
  assert.equal(second.note, undefined);
  const third = followStable(note, second.state);
  assert.deepEqual(third.note, note); // 3 ventanas estables => publica
  const silent1 = followStable(null, third.state);
  const silent2 = followStable(null, silent1.state);
  assert.equal(silent2.note, undefined);
  const silent3 = followStable(null, silent2.state);
  assert.equal(silent3.note, null); // silencio confirmado
});

test('followStable no publica notas que alternan rápido (ruido)', () => {
  let state;
  const published = [];
  for (let i = 0; i < 12; i++) {
    const current = i % 2 ? { midi: 69 } : null;
    const result = followStable(current, state);
    state = result.state;
    if (result.note !== undefined) published.push(result.note);
  }
  assert.deepEqual(published, []);
});

test('MicrophoneReader detecta una nota desde el AnalyserNode y publica el silencio', async () => {
  const frames = [];
  const cancels = [];
  const tracks = [{ stop() { stopCalls++; } }];
  let stopCalls = 0;
  let closed = 0;
  let silenceMode = false;
  const notes = [];
  const states = [];

  const stream = { getTracks: () => tracks };
  const analyser = {
    fftSize: 2048,
    getFloatTimeDomainData(buffer) {
      if (silenceMode) buffer.fill(0);
      else sineInto(buffer, 440);
    },
    getByteTimeDomainData() {},
  };
  const context = {
    sampleRate: 48000,
    resume: async () => {},
    createMediaStreamSource: () => ({ connect() {} }),
    createAnalyser: () => analyser,
    close() { closed++; },
  };

  const reader = new MicrophoneReader({
    getUserMedia: async () => stream,
    createContext: () => context,
    createAnalyser: () => analyser,
    requestFrame: fn => { frames.push(fn); return frames.length; },
    cancelFrame: id => cancels.push(id),
    onPitch: note => notes.push(note),
    onState: (state, detail) => states.push(detail === undefined ? state : `${state}: ${detail}`),
    detect: detectPitch,
  });

  await reader.start();
  assert.deepEqual(states.slice(0, 2), ['requesting', 'ready']);
  assert.equal(reader.running, true);
  assert.equal(frames.length, 1);

  frames.at(-1)(); frames.at(-1)();
  assert.equal(notes.length, 0); // 2 ventanas, aún sin confirmar
  frames.at(-1)();
  assert.equal(notes.length, 1);
  assert.equal(notes[0].midi, 69);
  assert.ok(Math.abs(notes[0].freq - 440) < 0.5);

  silenceMode = true;
  frames.at(-1)(); frames.at(-1)();
  assert.equal(notes.length, 1);
  frames.at(-1)();
  assert.deepEqual(notes, [notes[0], null]);

  reader.stop();
  assert.equal(reader.running, false);
  assert.equal(stopCalls, 1);
  assert.equal(closed, 1);
  assert.ok(cancels.length >= 1);
  assert.equal(states.at(-1), 'stopped');
});

test('permiso denegado o sin micrófono reporta error y no queda activo', async () => {
  const messages = [];
  const reader = new MicrophoneReader({
    getUserMedia: () => Promise.reject(new Error('Permission denied')),
    onState: (state, detail) => messages.push(detail === undefined ? state : `${state}: ${detail}`),
  });
  await reader.start();
  assert.equal(reader.running, false);
  assert.equal(messages.at(-1), 'error: Permission denied');
});