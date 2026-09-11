// app.js aporta la progresión y los tipos de acorde; el motor no conoce el DOM.
(() => {
  const button = document.querySelector('#player-toggle');
  const bpm = document.querySelector('#player-bpm');
  const loop = document.querySelector('#player-loop');
  const style = document.querySelector('#player-style');
  const percussion = document.querySelector('#player-percussion');
  const status = document.querySelector('#player-status');
  let playbackItems = [];
  const icon = playing => `<svg viewBox="0 0 24 24" aria-hidden="true">${playing ? '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>' : '<path d="M8 5v14l11-7z"/>'}</svg>`;
  const setBusy = busy => {
    bpm.disabled = busy;
    loop.disabled = busy;
    style.disabled = busy;
    percussion.disabled = busy;
    button.innerHTML = icon(busy);
    button.setAttribute('aria-label', busy ? 'Detener' : 'Reproducir');
    button.title = busy ? 'Detener' : 'Reproducir';
    button.setAttribute('aria-pressed', String(busy));
  };
  const player = new ProgressionPlayer({
    onChord: (index, name, total) => {
      const entry = playbackItems[index];
      if (entry) {
        window.StringSections?.follow(entry);
        playingProgressionItem = entry.source;
        showProgressionChord(entry.saved, progression.indexOf(entry.source));
      }
      status.textContent = `Sonando: ${name} · ${entry?.section ? entry.section+" · " : ""}acorde ${index + 1} de ${total}`;
    },
    onState: running => {
      if (!running) {playingProgressionItem = null; renderProgression();}
      setBusy(running);
      status.textContent = running ? 'Reproduciendo…' : 'Detenido';
    }
  });
  button.addEventListener('click', async () => {
    if (player.running || player.starting) { player.stop(); return; }
    if (!bpm.reportValidity()) return;
    window.dispatchEvent?.(new Event('traste:progression-start'));
    try {playbackItems = window.StringSections ? window.StringSections.playback() : progression.map(item => ({source:item, saved:{...item}}));}
    catch(error){status.textContent=error.message;return;}
    const chords = playbackItems.map(({saved:item}) => {
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
  window.addEventListener('traste:load-song', () => player.stop());
})();
