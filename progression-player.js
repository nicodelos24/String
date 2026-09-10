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
    this.voices = new Set();
    this.queue = [];
  }

  setVolume(value) {
    if (!Number.isFinite(Number(value)) || String(value).trim() === '') return this.volume;
    this.volume = Math.max(0, Math.min(1, Number(value)));
    if (this.master) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.01);
    return this.volume;
  }

  async start(chords, {bpm = 100, loop = true} = {}) {
    if (this.running || this.starting) return;
    if (!Array.isArray(chords) || !chords.length || chords.some(chord =>
      !Array.isArray(chord.notes) || !chord.notes.length || chord.notes.some(note =>
        !Number.isInteger(note) || note < 0 || note > 127))) {
      throw new Error('La progresión no contiene notas válidas.');
    }
    if (!Number.isFinite(Number(bpm)) || Number(bpm) < 30 || Number(bpm) > 240) {
      throw new Error('El tempo debe estar entre 30 y 240 BPM.');
    }
    // Una copia mantiene estable la reproducción mientras se edita la progresión.
    this.chords = chords.map(chord => ({name: chord.name, notes: [...chord.notes]}));
    this.duration = 4 * 60 / Number(bpm);
    this.loop = Boolean(loop);
    const generation = ++this.generation;
    this.starting = true;
    try {
      this.context ||= this.createContext();
      await this.context.resume();
      if (generation !== this.generation) return;
      if (this.context.state !== 'running') throw new Error('No se pudo activar el audio.');
      if (!this.master) {
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
      }
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
      this.scheduleChord(chord, this.nextTime);
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

  scheduleChord(chord, time) {
    const end = time + this.duration - 0.03;
    for (const note of chord.notes) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = midiToFrequency(note);
      gain.gain.setValueAtTime(0, time);
      const peak = 0.7 / chord.notes.length;
      const sustain = peak * 0.65;
      gain.gain.linearRampToValueAtTime(peak, time + 0.02);
      gain.gain.linearRampToValueAtTime(sustain, time + 0.15);
      gain.gain.setValueAtTime(sustain, end - 0.15);
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
  module.exports = {ProgressionPlayer, midiToFrequency, chordToMidi};
}
