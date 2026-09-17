// Detección de altura (pitch) monofónica mediante autocorrelación normalizada
// (variante YIN). Pensada para una nota a la vez desde un AnalyserNode; sin
// dependencias externas. Fase 1: no reconoce acordes simultáneos.

const DEFAULT_MIN_FREQ = 41;      // E1, registro grave del bajo
const DEFAULT_MAX_FREQ = 1100;    // algo por encima de C6 (1046.5 Hz)
const DEFAULT_SILENCE = 0.01;
const DEFAULT_THRESHOLD = 0.15;

function midiOf(freq) {
  if (!Number.isFinite(freq) || freq <= 0) return null;
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

function centsOf(freq) {
  if (!Number.isFinite(freq) || freq <= 0) return null;
  const midi = 69 + 12 * Math.log2(freq / 440);
  const nearest = 440 * 2 ** ((Math.round(midi) - 69) / 12);
  return Math.round(1200 * Math.log2(freq / nearest));
}

// Un resultado es afinado si su desviación no supera la tolerancia en cents.
function isInTune(detection, tolerance = 40) {
  return Boolean(detection) && Math.abs(detection.cents) <= tolerance;
}

function detectPitch(timeData, sampleRate, options = {}) {
  const minFreq = Number.isFinite(options.minFreq) && options.minFreq > 0 ? options.minFreq : DEFAULT_MIN_FREQ;
  const maxFreq = Number.isFinite(options.maxFreq) && options.maxFreq > minFreq ? options.maxFreq : DEFAULT_MAX_FREQ;
  const silence = Number.isFinite(options.silence) && options.silence >= 0 ? options.silence : DEFAULT_SILENCE;
  const threshold = Number.isFinite(options.threshold) && options.threshold > 0 && options.threshold <= 1 ? options.threshold : DEFAULT_THRESHOLD;
  const n = timeData.length;
  if (!n || n < 4 || !Number.isFinite(sampleRate) || sampleRate <= 0) return null;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    const value = timeData[i];
    if (Number.isFinite(value)) sum += value * value;
    if (value === undefined) return null;
  }
  if (Math.sqrt(sum / n) < silence) return null;

  // El periodo buscado queda acotado por el rango de frecuencias.
  const minTau = Math.max(2, Math.ceil(sampleRate / maxFreq));
  const maxTau = Math.min(Math.floor(sampleRate / minFreq), n - 1);
  if (maxTau <= minTau) return null;

  // Función de diferencia d(tau): energía de la resta Señal[t] - Señal[t+tau].
  const diff = new Float64Array(n);
  for (let tau = 1; tau <= maxTau; tau++) {
    let acc = 0;
    for (let i = 0; i + tau < n; i++) {
      const delta = timeData[i] - timeData[i + tau];
      acc += delta * delta;
    }
    diff[tau] = acc / (n - tau);
  }

  // Normalización acumulada: d'(tau) = d(tau) / media de d(1..tau).
  const norm = new Float64Array(n);
  let running = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    running += diff[tau];
    norm[tau] = running === 0 ? Infinity : diff[tau] / (running / tau);
  }

  // Primer mínimo claro por debajo del umbral: coincide con el periodo base.
  let period = 0;
  let bestNorm = Infinity;
  for (let tau = minTau; tau < maxTau; tau++) {
    if (norm[tau] < threshold && norm[tau] <= norm[tau - 1] && norm[tau] <= norm[tau + 1]) {
      bestNorm = norm[tau];
      period = tau;
      break;
    }
  }

  // Sin mínimo convincente: probar con el mínimo global; si tampoco es
  // fiable, la entrada no tiene un periodo estable (se reporta silencio/ruido).
  if (!period) {
    for (let tau = minTau; tau <= maxTau; tau++) {
      if (norm[tau] < bestNorm) {
        bestNorm = norm[tau];
        period = tau;
      }
    }
    if (bestNorm >= 0.6) return null;
  }

  // Interpolación parabólica alrededor del periodo para afinar la submuestra.
  const a = norm[period - 1];
  const b = norm[period];
  const c = norm[period + 1];
  const denominator = a - 2 * b + c;
  const shift = denominator === 0 ? 0 : 0.5 * (a - c) / denominator;
  const tauExact = period + Math.max(-0.5, Math.min(0.5, shift));
  const freq = sampleRate / tauExact;
  if (freq < minFreq || freq > maxFreq) return null;
  return { midi: midiOf(freq), freq: Math.round(freq * 10) / 10, cents: centsOf(freq), score: bestNorm };
}

function tuningOf(instrument) {
  if (Array.isArray(instrument)) return instrument.slice();
  if (instrument && Array.isArray(instrument.strings)) return instrument.strings.slice();
  return null;
}

// Posiciones donde puede tocarse una nota (trastes 0–22), del traste más bajo al más alto.
function findFret(midi, instrument) {
  const tuning = tuningOf(instrument);
  if (!tuning || !Number.isInteger(midi) || midi < 1 || midi > 127) return [];
  const positions = [];
  for (let string = 0; string < tuning.length; string++) {
    const fret = midi - tuning[string];
    if (fret >= 0 && fret <= 22) positions.push({ string: string + 1, fret, midi });
  }
  return positions.sort((first, second) => (first.fret - second.fret) || (first.string - second.string));
}

if (typeof module !== 'undefined' && module.exports) module.exports = { midiOf, centsOf, isInTune, detectPitch, findFret };