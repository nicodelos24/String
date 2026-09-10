// app.js aporta la progresión y los tipos de acorde; el motor no conoce el DOM.
(() => {
  const button = document.querySelector('#player-toggle');
  const bpm = document.querySelector('#player-bpm');
  const loop = document.querySelector('#player-loop');
  const style = document.querySelector('#player-style');
  const percussion = document.querySelector('#player-percussion');
  const status = document.querySelector('#player-status');
  const setBusy = busy => {
    bpm.disabled = busy;
    loop.disabled = busy;
    style.disabled = busy;
    percussion.disabled = busy;
    button.textContent = busy ? 'Detener' : 'Reproducir';
    button.setAttribute('aria-pressed', String(busy));
  };
  const player = new ProgressionPlayer({
    onChord: (index, name, total) => {
      status.textContent = `Sonando: ${name} · acorde ${index + 1} de ${total}`;
    },
    onState: running => {
      setBusy(running);
      status.textContent = running ? 'Reproduciendo…' : 'Detenido';
    }
  });
  button.addEventListener('click', async () => {
    if (player.running || player.starting) { player.stop(); return; }
    if (!bpm.reportValidity()) return;
    const chords = progression.map(item => {
      const type = chordTypes.find(candidate => candidate.value === item.type);
      return {
        name: (item.rootNoteName || noteName(item.root)) + type.suffix,
        notes: chordToMidi(item.root, type.intervals)
      };
    });
    setBusy(true);
    status.textContent = 'Iniciando…';
    try { await player.start(chords, {bpm: Number(bpm.value), loop: loop.checked,
      style: style.value, percussion: percussion.checked}); }
    catch { setBusy(false); status.textContent = 'No se pudo iniciar el audio. Volvé a intentar.'; }
  });
  document.querySelector('#player-volume').addEventListener('input', event => {
    player.setVolume(Number(event.target.value) / 100);
  });
  document.querySelector('#player-drum-volume').addEventListener('input', event => {
    player.setDrumVolume(Number(event.target.value) / 100);
  });
  window.addEventListener('pagehide', () => player.stop());
})();
