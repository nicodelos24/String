// Envoltorio de micrófono: permisos, AnalyserNode y lazo de detección.
// Publica la nota confirmada (objeto de pitch-detection.js) o null en silencio.
// Conserva la lectura monofónica y añade análisis de acordes si está disponible.

const DEFAULT_FFT_SIZE = 2048;
const DEFAULT_CONFIRM_FRAMES = 3;

function followStable(detected, state = {}, confirmFrames = DEFAULT_CONFIRM_FRAMES) {
  const record = state && state.pending ? state : { current: null, pending: { midi: null, count: 0 } };
  const key = detected ? detected.midi : null;
  const pending = record.pending.midi === key
    ? { midi: key, count: record.pending.count + 1 }
    : { midi: key, count: 1 };
  const next = { current: record.current, pending };
  if (pending.count >= confirmFrames && record.current !== key) {
    next.current = key;
    return { state: next, note: detected };
  }
  return { state: next };
}

class MicrophoneReader {
  constructor(options = {}) {
    this.getUserMedia = options.getUserMedia || defaultGetUserMedia;
    this.createContext = options.createContext || (() => new (window.AudioContext || window.webkitAudioContext)());
    this.createAnalyser = options.createAnalyser || ((context, fftSize) => {
      const analyser = context.createAnalyser();
      analyser.fftSize = fftSize;
      return analyser;
    });
    this.requestFrame = options.requestFrame || (fn => requestAnimationFrame(fn));
    this.cancelFrame = options.cancelFrame || (id => cancelAnimationFrame(id));
    this.onPitch = options.onPitch || (() => {});
    this.onChord = options.onChord || (() => {});
    this.onState = options.onState || (() => {});
    this.detect = options.detect || (typeof detectPitch === 'function' ? detectPitch : () => null);
    this.detectChord = options.detectChord || (typeof detectChord === 'function' ? detectChord : null);
    this.followChord = options.followChord || (typeof followStableChord === 'function' ? followStableChord : null);
    this.chordFftSize = options.chordFftSize || 16384;
    this.now = options.now || (() => performance.now());
    this.fftSize = options.fftSize || DEFAULT_FFT_SIZE;
    this.minFreq = options.minFreq;
    this.maxFreq = options.maxFreq;
    this.silence = options.silence;
    this.confirmFrames = options.confirmFrames || DEFAULT_CONFIRM_FRAMES;
    this.hysteresis = null;
    this.stream = null;
    this.context = null;
    this.analyser = null;
    this.chordAnalyser = null;
    this.frameId = null;
    this.framePointer = null;
    this.starting = false;
  }

  get running() {
    return Boolean(this.stream && this.frameId !== null);
  }

  async start() {
    if (this.stream || this.starting) return;
    this.starting = true;
    this.onState('requesting');
    let stream;
    try {
      stream = await this.getUserMedia();
    } catch (error) {
      this.starting = false;
      this.onState('error', error.message || 'No se pudo usar el micrófono.');
      return;
    }
    try {
      const context = this.createContext();
      this.context = context;
      await context.resume();
      const source = context.createMediaStreamSource(stream);
      const analyser = this.createAnalyser(context, this.fftSize);
      source.connect(analyser);
      const chordAnalyser = this.detectChord && this.followChord ? this.createAnalyser(context, this.chordFftSize) : null;
      if (chordAnalyser) {
        chordAnalyser.smoothingTimeConstant = 0;
        source.connect(chordAnalyser);
      }
      this.stream = stream;
      this.context = context;
      this.analyser = analyser;
      this.chordAnalyser = chordAnalyser;
      this.buffer = new Float32Array(analyser.fftSize);
      this.chordBuffer = chordAnalyser ? new Float32Array(chordAnalyser.frequencyBinCount) : null;
      this.byteBuffer = new Uint8Array(analyser.fftSize);
      this.sampleRate = context.sampleRate;
      this.hysteresis = null;
      this.chordHysteresis = null;
      this.lastChordFrame = -Infinity;
      this.onState('ready');
      this.framePointer = () => this.frame();
      this.schedule();
    } catch (error) {
      this.teardownContext();
      stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.onState('error', error.message || 'No se pudo iniciar el análisis.');
    } finally {
      this.starting = false;
    }
  }

  schedule() {
    if (this.frameId !== null) this.cancelFrame(this.frameId);
    this.frameId = this.requestFrame(this.framePointer);
  }

  frame() {
    if (!this.analyser) return;
    const analyser = this.analyser;
    if (typeof analyser.getFloatTimeDomainData === 'function') {
      analyser.getFloatTimeDomainData(this.buffer);
    } else {
      analyser.getByteTimeDomainData(this.byteBuffer);
      for (let i = 0; i < this.buffer.length; i++) this.buffer[i] = (this.byteBuffer[i] - 128) / 128;
    }
    const detected = this.detect(this.buffer, this.sampleRate, {
      minFreq: this.minFreq,
      maxFreq: this.maxFreq,
      silence: this.silence,
    });
    const result = followStable(detected, this.hysteresis, this.confirmFrames);
    this.hysteresis = result.state;
    if (result.note !== undefined) this.onPitch(result.note);
    const now = this.now();
    if (this.chordAnalyser && this.chordBuffer && now - this.lastChordFrame >= 90) {
      this.lastChordFrame = now;
      this.chordAnalyser.getFloatFrequencyData(this.chordBuffer);
      const candidate = this.detectChord(this.chordBuffer, this.sampleRate, this.chordAnalyser.fftSize);
      const stable = this.followChord(candidate, this.chordHysteresis, now);
      this.chordHysteresis = stable.state;
      if (stable.chord !== undefined) this.onChord(stable.chord);
    }
    this.schedule();
  }

  stop() {
    if (this.frameId !== null) {
      this.cancelFrame(this.frameId);
      this.frameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.teardownContext();
    this.hysteresis = null;
    this.chordHysteresis = null;
    this.onState('stopped');
  }

  teardownContext() {
    if (this.context) {
      const context = this.context;
      this.context = null;
      this.analyser = null;
      this.chordAnalyser = null;
      try { if (typeof context.close === 'function') context.close(); } catch { /* el contexto ya no existe */ }
    }
  }
}

function defaultGetUserMedia() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    return Promise.reject(new Error('Micrófono no disponible en este navegador.'));
  }
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
  });
}

if (typeof module !== 'undefined' && module.exports) module.exports = { MicrophoneReader, followStable };
