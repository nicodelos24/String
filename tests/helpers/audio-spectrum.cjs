// Señal polifónica sintética y FFT de referencia para alimentar el detector como Web Audio.
function audioSpectrum(midis, { sampleRate = 48000, size = 16384, harmonics = 1, noise = 0, detune = 0, amplitudes = [] } = {}) {
  const real = new Float64Array(size), imaginary = new Float64Array(size);
  let seed = 17;
  for (let i = 0; i < size; i++) {
    let sample = 0;
    midis.forEach((midi, index) => {
      const freq = 440 * 2 ** ((midi - 69 + detune / 100) / 12);
      for (let h = 1; h <= harmonics; h++) sample += (amplitudes[index] ?? 0.1) / h ** 1.3 * Math.sin(2 * Math.PI * freq * h * i / sampleRate + index * 0.7);
    });
    seed = (1664525 * seed + 1013904223) >>> 0;
    sample += noise * (seed / 2 ** 32 - 0.5);
    real[i] = sample * (0.42 - 0.5 * Math.cos(2 * Math.PI * i / size) + 0.08 * Math.cos(4 * Math.PI * i / size));
  }
  for (let i = 1, j = 0; i < size; i++) {
    let bit = size >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) [real[i], real[j]] = [real[j], real[i]];
  }
  for (let length = 2; length <= size; length *= 2) {
    for (let start = 0; start < size; start += length) {
      for (let j = 0; j < length / 2; j++) {
        const angle = -2 * Math.PI * j / length, a = start + j, b = a + length / 2;
        const re = real[b] * Math.cos(angle) - imaginary[b] * Math.sin(angle);
        const im = real[b] * Math.sin(angle) + imaginary[b] * Math.cos(angle);
        real[b] = real[a] - re; imaginary[b] = imaginary[a] - im;
        real[a] += re; imaginary[a] += im;
      }
    }
  }
  return Float32Array.from(real.subarray(0, size / 2), (value, i) => 20 * Math.log10(Math.hypot(value, imaginary[i]) / size));
}
module.exports = { audioSpectrum };
