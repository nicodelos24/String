// Botón «Tempo» por pulsaciones: con al menos dos clics estima el BPM. El valor
// se muestra en un campo editable que también aplica cambios manuales y se
// mantiene sincronizado con el acompañamiento y con el video si hay referencia.
// Solo si la fuente activa es «Metrónomo» se fija también su tempo (al tocar/
// editar tempo y también al dar play con esa fuente). El MIDI no se toca:
// conserva su propio tempo.
// Las tarjetas no marcan el tempo: solo este botón. Pulsar una tarjeta elige el
// acorde por el que empieza o reinicia el Acompañamiento, y el doble clic la
// duplica, sin que nada de eso toque el BPM.
(() => {
  const button = document.querySelector('#tempo-tap');
  const bpmInput = document.querySelector('#tempo-tap-bpm');
  if (!button || !bpmInput) return;
  const playerBpm = document.querySelector('#player-bpm');
  const videoBpm = document.querySelector('#video-bpm');
  let taps = [];
  const syncTempoToMetronome = () => {
    const sourceButton = document.querySelector('[data-source][aria-pressed="true"]');
    if (!sourceButton || sourceButton.dataset.source !== 'metronome') return;
    const metroBpm = document.querySelector('#metronome-bpm');
    const metronome = globalThis.StringMetronome;
    if (metronome && typeof metronome.setTempo === 'function') {
      const value = metronome.setTempo(Number(bpmInput.value) || 100);
      if (metroBpm) metroBpm.value = value;
    }
  };
  globalThis.syncTempoToMetronome = syncTempoToMetronome;
  const applyBpm = (bpm) => {
    if (playerBpm) playerBpm.value = bpm;
    if (videoBpm) videoBpm.value = bpm;
    syncTempoToMetronome();
    // Quien esté sonando (el Acompañamiento) ajusta su pulso sin reiniciar.
    globalThis.window?.dispatchEvent?.(new Event('traste:tempo-applied'));
  };
  const clampedBpm = () => Math.min(240, Math.max(30, Math.round(Number(bpmInput.value) || 100)));
  document.querySelectorAll('.tempo-tap-step').forEach(step => step.addEventListener('click', () => {
    bpmInput.value = Math.min(240, Math.max(30, clampedBpm() + Number(step.dataset.step)));
    applyBpm(Number(bpmInput.value));
  }));
  if (playerBpm && playerBpm.value !== '') bpmInput.value = playerBpm.value;
  if (playerBpm) playerBpm.addEventListener('input', () => { bpmInput.value = playerBpm.value; });
  globalThis.window?.addEventListener?.('traste:preset-applied', () => { if (playerBpm) bpmInput.value = playerBpm.value; });
  bpmInput.addEventListener('change', () => {
    const bpm = Math.min(240, Math.max(30, Math.round(Number(bpmInput.value) || 100)));
    bpmInput.value = bpm;
    applyBpm(bpm);
  });
  const tap = () => {
    const now = performance.now();
    if (taps.length && now - taps.at(-1) > 2500) taps = [];
    taps.push(now); taps = taps.slice(-8);
    if (taps.length < 2) return;
    const bpm = Math.round(60000 * (taps.length - 1) / (now - taps[0]));
    if (bpm < 30 || bpm > 240) return;
    bpmInput.value = bpm;
    applyBpm(bpm);
  };
  globalThis.tapProgressionTempo = tap;
  button.addEventListener('click', tap);
})();
