// Botón «Tempo» por pulsaciones: con al menos dos clics estima el BPM y lo
// fija en el acompañamiento; si hay una referencia de video, también allí.
(() => {
  const button = document.querySelector('#tempo-tap');
  const label = document.querySelector('#tempo-tap-label');
  if (!button || !label) return;
  const playerBpm = document.querySelector('#player-bpm');
  const videoBpm = document.querySelector('#video-bpm');
  let taps = [];
  const dismiss = () => { label.hidden = true; };
  if (playerBpm) playerBpm.addEventListener('input', dismiss);
  button.addEventListener('click', () => {
    const now = performance.now();
    if (taps.length && now - taps.at(-1) > 2500) taps = [];
    taps.push(now); taps = taps.slice(-8);
    if (taps.length < 2) return;
    const bpm = Math.round(60000 * (taps.length - 1) / (now - taps[0]));
    if (bpm < 30 || bpm > 240) return;
    if (playerBpm) playerBpm.value = bpm;
    if (videoBpm) videoBpm.value = bpm;
    label.textContent = `${bpm} BPM`;
    label.hidden = false;
  });
})();