class Metronome {
  constructor({ createContext, onBeat = () => {}, onState = () => {} } = {}) {
    this.createContext = createContext || (() => new (window.AudioContext || window.webkitAudioContext)());
    this.onBeat = onBeat;
    this.onState = onState;
    this.bpm = 100;
    this.beats = 4;
    this.volume = 0.35;
    this.accent = true;
    this.running = false;
    this.generation = 0;
    this.voices = new Set();
    this.queue = [];
  }
  setTempo(value) {
    if (!Number.isFinite(Number(value)) || String(value).trim() === '') return this.bpm;
    this.bpm = Math.max(30, Math.min(240, Math.round(Number(value))));
    return this.bpm;
  }
  setBeats(value) {
    this.beats = Math.max(1, Math.min(8, Math.round(Number(value)) || 4));
    if (this.running) {
      this.cancelVoices();
      this.nextTime = this.context.currentTime + 0.04;
      this.beat = 0;
      this.tick();
    }
  }
  async start() {
    if (this.running || this.starting) return;
    const generation = ++this.generation;
    this.starting = true;
    try {
      this.context ||= this.createContext();
      await this.context.resume();
      if (generation !== this.generation) return;
      if (this.context.state !== 'running') throw new Error('Audio unavailable');
      this.running = true;
      this.beat = 0;
      this.nextTime = this.context.currentTime + 0.04;
      this.tick();
      this.timer = setInterval(() => this.tick(), 25);
      this.onState(true);
    } finally {
      if (generation === this.generation) this.starting = false;
    }
  }
  tick() {
    if (!this.running) return;
    const now = this.context.currentTime;
    // Skip missed beats after a stalled tab instead of playing a burst of clicks.
    if (this.nextTime < now) this.nextTime = now + 0.04;
    while (this.nextTime < now + 0.1) {
      this.schedule(this.nextTime, this.beat);
      this.queue.push({time: this.nextTime, beat: this.beat});
      this.nextTime += 60 / this.bpm;
      this.beat = (this.beat + 1) % this.beats;
    }
    let latest;
    while (this.queue.length && this.queue[0].time <= now) latest = this.queue.shift();
    if (latest) this.onBeat(latest.beat);
  }
  schedule(time, beat) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.frequency.value = this.accent && beat === 0 ? 1200 : 800;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(this.volume * 0.5, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    const voice = {oscillator, gain};
    this.voices.add(voice);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      this.voices.delete(voice);
    };
    oscillator.start(time);
    oscillator.stop(time + 0.05);
  }
  cancelVoices() {
    for (const {oscillator, gain} of this.voices) {
      gain.disconnect();
      oscillator.stop();
    }
    this.voices.clear();
    this.queue = [];
  }
  stop() {
    this.generation++;
    this.starting = false;
    this.running = false;
    clearInterval(this.timer);
    this.cancelVoices();
    this.onState(false);
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Metronome };
else {
  const button = document.querySelector('#metronome-toggle');
  const bpm = document.querySelector('#metronome-bpm');
  const beats = document.querySelector('#metronome-beats');
  const lights = document.querySelector('#metronome-pulses');
  const status = document.querySelector('#metronome-status');
  const metronome = new Metronome({
    onBeat: beat => Array.from(lights.children).forEach((light, i) => light.classList.toggle('active', i === beat)),
    onState: running => {
      button.textContent = running ? 'Pausar' : 'Iniciar';
      button.setAttribute('aria-pressed', String(running));
      status.textContent = running ? 'En marcha' : 'En pausa';
      if (!running) Array.from(lights.children).forEach(light => light.classList.remove('active'));
    }
  });
  function renderPulses() {
    lights.innerHTML = Array.from({length: metronome.beats}, (_, i) => '<span class="metronome-pulse">' + (i + 1) + '</span>').join('');
  }
  button.addEventListener('click', async () => {
    if (metronome.running || metronome.starting) { metronome.stop(); return; }
    status.textContent = 'Iniciando...';
    try { await metronome.start(); }
    catch { metronome.stop(); status.textContent = 'No se pudo iniciar el audio. Volvé a intentar.'; }
  });
  bpm.addEventListener('change', () => { bpm.value = metronome.setTempo(bpm.value); });
  beats.addEventListener('change', () => { metronome.setBeats(beats.value); renderPulses(); });
  document.querySelector('#metronome-volume').addEventListener('input', event => { metronome.volume = Number(event.target.value) / 100; });
  document.querySelector('#metronome-accent').addEventListener('change', event => { metronome.accent = event.target.checked; });
  window.addEventListener('pagehide', () => metronome.stop());
  renderPulses();
}
