// Convierte números MIDI en frecuencias; A4 (69) equivale a 440 Hz.
function midiToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function chordToMidi(root, intervals) {
  let previous = -1;
  return intervals.map(interval => {
    let note = 48 + root + interval;
    // Las extensiones almacenadas como clases de altura van sobre la séptima.
    while (note <= previous) note += 12;
    previous = note;
    return note;
  });
}

// Posiciones en negras, dentro de un compás de cuatro pulsos.
// Cada ataque de acorde define [pulso, duración en pulsos, intensidad].
const accompanimentStyles = {
  reggae: {name:'Reggae',chords:[[0.5,0.3,0.85],[1.5,0.3,0.8],[2.5,0.3,0.85],[3.5,0.3,0.8]],kick:[2],snare:[2],hat:[0.5,1.5,2.5,3.5]},
  disco: {name:'Disco',chords:[[0,0.65,0.8],[1.5,0.4,0.7],[2,0.65,0.85],[3.5,0.4,0.7]],kick:[0,1,2,3],snare:[1,3],hat:[0.5,1.5,2.5,3.5]},
  ballad: {name:'Balada',chords:[[0,3.8,0.8]],kick:[0,2.5],snare:[2],hat:[0,1,2,3]},
  none: {name:'Sin ritmo', chords:[[0,4,1]], kick:[], snare:[], hat:[]},
  pop: {name:'Pop / rock', chords:[[0,1.8,1],[2,1.8,0.9]],
    kick:[0,2], snare:[1,3], hat:[0,0.5,1,1.5,2,2.5,3,3.5]},
  jazz: {name:'Jazz suave', chords:[[0,0.9,0.85],[5/3,0.65,0.7],[3,0.8,0.8]],
    kick:[0,2], snare:[1,3], hat:[0,2/3,1,5/3,2,8/3,3,11/3]},
  trap: {name:'Trap suave', chords:[[0,3.8,0.95]],
    kick:[0,1.75,2.5], snare:[2], hat:[0,0.25,0.5,0.75,1,1.25,1.5,1.75,2,2.25,2.5,2.75,3,3.25,3.5,3.75]},
  funk: {name:'Funk', chords:[[0,0.4,0.9],[0.75,0.35,0.65],[1.5,0.4,0.8],[2.75,0.35,0.9],[3.5,0.4,0.7]],
    kick:[0,1.5,2.75],snare:[1,3],hat:[0,0.25,0.5,0.75,1,1.5,2,2.25,2.5,2.75,3,3.5]},
  bossa: {name:'Bossa suave', chords:[[0,0.8,0.7],[1.5,0.6,0.65],[2.5,0.6,0.75],[3.5,0.45,0.6]],
    kick:[0,1.5,2,3.5],snare:[0,1.5,3],hat:[0,0.5,1,1.5,2,2.5,3,3.5]},
  reggaeton: {name:'Reggaetón suave', chords:[[0,1.3,0.85],[1.5,0.4,0.7],[2,1.3,0.85],[3.5,0.45,0.7]],
    kick:[0,2],snare:[0.75,1.5,2.75,3.5],hat:[0,0.5,1,1.5,2,2.5,3,3.5]}
};

function chordLevels(notes) {
  // Compensación moderada de agudos y energía similar entre tríadas y séptimas.
  const weights = notes.map(note => Math.max(0.7, Math.min(1.25, 2 ** (-(note - 60) / 48))));
  const energy = Math.sqrt(weights.reduce((sum, weight) => sum + weight * weight, 0));
  return weights.map(weight => 0.32 * weight / energy);
}

class ProgressionPlayer {
  constructor({createContext, onChord = () => {}, onState = () => {},
    // Las funciones nativas de Window necesitan conservar su contexto.
    setTimer = (callback, delay) => globalThis.setInterval(callback, delay),
    clearTimer = timer => globalThis.clearInterval(timer)} = {}) {
    this.createContext = createContext || (() => new (window.AudioContext || window.webkitAudioContext)());
    this.onChord = onChord;
    this.onState = onState;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.running = false;
    this.starting = false;
    this.generation = 0;
    this.volume = 0.35;
    this.drumVolume = 0.4;
    this.voices = new Set();
    this.queue = [];
  }

  setVolume(value) {
    if (!Number.isFinite(Number(value)) || String(value).trim() === '') return this.volume;
    this.volume = Math.max(0, Math.min(1, Number(value)));
    if (this.master) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.01);
    return this.volume;
  }

  setDrumVolume(value) {
    if (!Number.isFinite(Number(value)) || String(value).trim() === '') return this.drumVolume;
    this.drumVolume = Math.max(0, Math.min(1, Number(value)));
    if (this.drumBus) this.drumBus.gain.setTargetAtTime(this.drumVolume, this.context.currentTime, 0.01);
    return this.drumVolume;
  }

  connectOutput() {
    if (this.master) return;
    this.master = this.context.createGain();
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.01;
    this.compressor.release.value = 0.15;
    this.master.connect(this.compressor);
    this.compressor.connect(this.context.destination);
    this.chordWave = this.context.createPeriodicWave(new Float32Array(4), new Float32Array([0,1,0.12,0.04]));
  }

  async start(chords, {bpm = 100, loop = true, style = 'none', percussion = true} = {}) {
    if (this.running || this.starting) return;
    if (!Array.isArray(chords) || !chords.length || chords.some(chord =>
      !Array.isArray(chord.notes) || !chord.notes.length || chord.notes.some(note =>
        !Number.isInteger(note) || note < 0 || note > 127))) {
      throw new Error('La progresión no contiene notas válidas.');
    }
    if (!Number.isFinite(Number(bpm)) || Number(bpm) < 30 || Number(bpm) > 240) {
      throw new Error('El tempo debe estar entre 30 y 240 BPM.');
    }
    if (!Object.hasOwn(accompanimentStyles, style)) throw new Error('Estilo desconocido.');
    // Una copia mantiene estable la reproducción mientras se edita la progresión.
    this.chords = chords.map(chord => ({name: chord.name, notes: [...chord.notes]}));
    this.duration = 4 * 60 / Number(bpm);
    this.loop = Boolean(loop);
    this.style = style;
    this.percussion = Boolean(percussion);
    const generation = ++this.generation;
    this.starting = true;
    try {
      this.context ||= this.createContext();
      await this.context.resume();
      if (generation !== this.generation) return;
      if (this.context.state !== 'running') throw new Error('No se pudo activar el audio.');
      this.connectOutput();
      this.master.gain.setValueAtTime(this.volume, this.context.currentTime);
      this.index = 0;
      this.endTime = null;
      this.nextTime = this.context.currentTime + 0.04;
      this.running = true;
      this.tick();
      this.timer = this.setTimer(() => this.tick(), 25);
      this.onState(true);
    } catch (error) {
      if (generation === this.generation) this.stop();
      throw error;
    } finally {
      if (generation === this.generation) this.starting = false;
    }
  }

  tick() {
    if (!this.running) return;
    const now = this.context.currentTime;
    if (this.endTime !== null && now >= this.endTime) { this.stop(); return; }
    // Una pestaña demorada continúa sin lanzar todos los acordes omitidos juntos.
    if (this.nextTime < now) this.nextTime = now + 0.04;
    if (this.endTime === null && this.nextTime < now + 0.1) {
      const chord = this.chords[this.index];
      this.scheduleBar(chord, this.nextTime);
      this.queue.push({time: this.nextTime, index: this.index, name: chord.name});
      this.nextTime += this.duration;
      this.index++;
      if (this.index === this.chords.length) {
        if (this.loop) this.index = 0;
        else this.endTime = this.nextTime;
      }
    }
    let latest;
    while (this.queue.length && this.queue[0].time <= now) latest = this.queue.shift();
    if (latest) this.onChord(latest.index, latest.name, this.chords.length);
  }

  scheduleBar(chord, time) {
    const pattern = accompanimentStyles[this.style];
    const beat = this.duration / 4;
    for (const [position, duration, velocity] of pattern.chords) {
      this.scheduleChord(chord, time + position * beat, duration * beat, velocity);
    }
    if (!this.percussion || this.style === 'none') return;
    for (const kind of ['kick','snare','hat']) {
      pattern[kind].forEach((position, index) => this.scheduleDrum(kind, time + position * beat,
        (['jazz','bossa'].includes(this.style) ? 0.55 : 0.85) * (kind === 'hat' && index % 2 ? 0.7 : 1)));
    }
  }

  scheduleChord(chord, time, duration = this.duration, velocity = 1) {
    const end = time + duration - 0.02;
    const levels = chordLevels(chord.notes);
    for (const [index, note] of chord.notes.entries()) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.setPeriodicWave(this.chordWave);
      oscillator.frequency.value = midiToFrequency(note);
      gain.gain.setValueAtTime(0, time);
      const peak = levels[index] * velocity;
      const sustain = peak * 0.65;
      gain.gain.linearRampToValueAtTime(peak, time + Math.min(0.025, duration * 0.1));
      gain.gain.linearRampToValueAtTime(sustain, time + duration * 0.25);
      gain.gain.setValueAtTime(sustain, time + duration * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain);
      gain.connect(this.master);
      const voice = {oscillator, gain};
      this.voices.add(voice);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        this.voices.delete(voice);
      };
      oscillator.start(time);
      oscillator.stop(end + 0.01);
    }
  }

  scheduleDrum(kind, time, velocity) {
    if (!this.drumBus) {
      this.drumBus = this.context.createGain();
      this.drumBus.gain.setValueAtTime(this.drumVolume, this.context.currentTime);
      this.drumBus.connect(this.master);
    }
    const gain = this.context.createGain();
    const duration = kind === 'kick' ? 0.18 : kind === 'snare' ? 0.12 : 0.035;
    let source, filter;
    if (kind === 'kick') {
      source = this.context.createOscillator();
      source.type = 'sine';
      source.frequency.setValueAtTime(130, time);
      source.frequency.exponentialRampToValueAtTime(48, time + duration);
    } else {
      if (!this.noise) {
        this.noise = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * 0.2), this.context.sampleRate);
        const samples = this.noise.getChannelData(0);
        for (let i=0;i<samples.length;i++) samples[i] = Math.random() * 2 - 1;
      }
      source = this.context.createBufferSource();
      source.buffer = this.noise;
      filter = this.context.createBiquadFilter();
      filter.type = kind === 'hat' ? 'highpass' : 'bandpass';
      filter.frequency.value = kind === 'hat' ? 7000 : 1800;
      filter.Q.value = 0.7;
    }
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(velocity * (kind === 'kick' ? 0.65 : kind === 'snare' ? 0.4 : 0.22), time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    if (filter) {source.connect(filter); filter.connect(gain);} else source.connect(gain);
    gain.connect(this.drumBus);
    const voice = {oscillator:source, gain};
    this.voices.add(voice);
    source.onended = () => {
      source.disconnect();
      if (filter) filter.disconnect();
      gain.disconnect();
      this.voices.delete(voice);
    };
    source.start(time);
    source.stop(time + duration + 0.005);
  }

  stop() {
    this.generation++;
    this.starting = false;
    this.running = false;
    this.clearTimer(this.timer);
    this.timer = undefined;
    for (const {oscillator, gain} of this.voices) {
      gain.disconnect();
      oscillator.stop();
    }
    this.voices.clear();
    this.queue = [];
    this.onState(false);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {ProgressionPlayer, midiToFrequency, chordToMidi, accompanimentStyles, chordLevels};
}
