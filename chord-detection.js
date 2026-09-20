// Reconocimiento experimental de acordes simultáneos. No acumula notas de arpegios.
// Recibe el espectro en dB de un AnalyserNode (ventana Blackman, sin suavizado).
const LIVE_CHORD_TEMPLATES = [
  { type: 'maj', intervals: [0, 4, 7], mode: 'ionian' },
  { type: 'm', intervals: [0, 3, 7], mode: 'aeolian' },
  { type: '7', intervals: [0, 4, 7, 10], mode: 'mixolydian' },
  { type: 'maj7', intervals: [0, 4, 7, 11], mode: 'ionian' },
  { type: 'm7', intervals: [0, 3, 7, 10], mode: 'aeolian' },
  { type: 'dim', intervals: [0, 3, 6], mode: 'locrian' },
  { type: 'm7b5', intervals: [0, 3, 6, 10], mode: 'locrian' },
];

function detectChord(spectrum, sampleRate, fftSize = spectrum.length * 2) {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || fftSize < 8192 || spectrum.length !== fftSize / 2) return null;
  const binHz = sampleRate / fftSize;
  const peaks = [];
  // Interpolar los máximos evita redondear directamente los bins a semitonos.
  for (let i = Math.max(2, Math.floor(40 / binHz)); i < Math.min(spectrum.length - 1, 2200 / binHz); i++) {
    const db = spectrum[i], left = spectrum[i - 1], right = spectrum[i + 1];
    if (!Number.isFinite(db) || db < -75 || db <= left || db <= right) continue;
    const denominator = left - 2 * db + right;
    const offset = Number.isFinite(denominator) && denominator !== 0 ? Math.max(-0.5, Math.min(0.5, (left - right) / (2 * denominator))) : 0;
    const freq = (i + offset) * binHz;
    const exactMidi = 69 + 12 * Math.log2(freq / 440);
    const midi = Math.round(exactMidi);
    if (midi < 28 || midi > 96 || Math.abs(exactMidi - midi) > 0.38) continue;
    peaks.push({ freq, midi, amplitude: 10 ** (db / 20) });
  }
  if (peaks.length < 3) return null;
  const loudest = Math.max(...peaks.map(peak => peak.amplitude));
  const audible = peaks.filter(peak => peak.amplitude >= loudest * 0.035);
  const chroma = new Float64Array(12);
  for (let i = 0; i < audible.length; i++) {
    const peak = audible[i];
    let residual = peak.amplitude;
    // Restar la contribución probable de los armónicos de notas inferiores.
    // Una cuerda sola también produce quinta y tercera en sus armónicos.
    for (let j = 0; j < i; j++) {
      const lower = audible[j];
      const harmonic = Math.round(peak.freq / lower.freq);
      if (harmonic < 2 || harmonic > 12) continue;
      const cents = Math.abs(1200 * Math.log2(peak.freq / (lower.freq * harmonic)));
      if (cents < 40) residual -= lower.amplitude * 0.85 / Math.sqrt(harmonic);
    }
    if (residual > loudest * 0.08) chroma[peak.midi % 12] += residual;
  }
  const maximum = Math.max(...chroma);
  if (!maximum) return null;
  const present = [...chroma].map((energy, pitch) => energy >= maximum * 0.18 ? pitch : -1).filter(pitch => pitch >= 0);
  if (present.length < 3 || present.length > 5) return null;
  const total = chroma.reduce((sum, value) => sum + value, 0);
  const candidates = [];
  for (let root = 0; root < 12; root++) {
    for (const template of LIVE_CHORD_TEMPLATES) {
      const pitches = template.intervals.map(interval => (root + interval) % 12);
      // No inventar la raíz ni una séptima que no se escucha.
      if (!pitches.every(pitch => present.includes(pitch))) continue;
      const inside = pitches.reduce((sum, pitch) => sum + chroma[pitch], 0);
      const coverage = inside / total;
      const extra = present.filter(pitch => !pitches.includes(pitch)).length;
      candidates.push({ root, type: template.type, mode: template.mode, confidence: coverage - extra * 0.12 });
    }
  }
  candidates.sort((a, b) => b.confidence - a.confidence);
  const best = candidates[0];
  if (!best || best.confidence < 0.82 || (candidates[1] && best.confidence - candidates[1].confidence < 0.08)) return null;
  return best;
}

// Los tiempos son milisegundos reales, independientes de la tasa de refresco.
function followStableChord(detected, state, now, { confirmMs = 350, releaseMs = 550 } = {}) {
  const previous = state || { current: null, pending: null, since: now };
  const key = detected ? `${detected.root}:${detected.type}` : null;
  const next = { ...previous };
  if (key !== previous.pending) { next.pending = key; next.since = now; }
  if (key !== previous.current && now - next.since >= (key === null ? releaseMs : confirmMs)) {
    next.current = key;
    return { state: next, chord: detected };
  }
  return { state: next };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { detectChord, followStableChord, LIVE_CHORD_TEMPLATES };
