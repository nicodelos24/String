// app.js aporta la progresión y los tipos de acorde; el motor no conoce el DOM.
(() => {
  const button = document.querySelector('#player-toggle');
  const bpm = document.querySelector('#player-bpm');
  const loop = document.querySelector('#player-loop');
  const style = document.querySelector('#player-style');
  const percussion = document.querySelector('#player-percussion');
  const status = document.querySelector('#player-status');
  // Interruptor «Solo pulso» / «Reiniciar»: qué hace pulsar una tarjeta mientras
  // el Acompañamiento ya está sonando.
  const cardMode = () => document.querySelector('[data-card-mode][aria-pressed="true"]')?.dataset?.cardMode || 'pulse';
  let playbackItems = [];
  const icon = playing => `<svg viewBox="0 0 24 24" aria-hidden="true">${playing ? '<path d="M6 6h12v12H6z"/>' : '<path d="M8 5v14l11-7z"/>'}</svg>`;
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
  // Arranca la lista de reproducción. `fromCard` es el índice de la tarjeta en
  // `progression` desde la que se quiere empezar; con secciones la lista no
  // coincide con `progression` (va por secciones y repeticiones), así que se
  // busca la posición de esa tarjeta dentro de ella.
  const startPlayback = async fromCard => {
    if (player.running || player.starting) player.stop();
    if (!bpm.reportValidity()) return;
    window.dispatchEvent?.(new Event('traste:progression-start'));
    try {playbackItems = window.StringSections ? window.StringSections.playback() : progression.map(item => ({source:item, saved:{...item}}));}
    catch(error){status.textContent=error.message;return;}
    const chords = playbackItems.map(({saved:item}) => {
      const type = chordTypes.find(candidate => candidate.value === item.type);
      return {
        name: (item.rootNoteName || noteName(item.root)) + type.suffix,
        notes: chordToMidi(item.root, type.intervals),
        beats: validBeats(item.beats)
      };
    });
    if (!chords.length) { status.textContent = 'No hay tarjetas para reproducir. Añade acordes primero.'; return; }
    const from = Number.isInteger(fromCard) ? playbackItems.findIndex(entry => entry.source === progression[fromCard]) : 0;
    setBusy(true);
    status.textContent = 'Iniciando…';
    try { await player.start(chords, {bpm: Number(bpm.value), loop: loop.checked,
      style: style.value, percussion: percussion.checked, startIndex: from > 0 ? from : 0}); }
    catch { setBusy(false); status.textContent = 'No se pudo iniciar el audio. Intenta de nuevo.'; }
  };
  button.addEventListener('click', async () => {
    if (player.running || player.starting) { player.stop(); return; }
    await startPlayback();
  });
  // `app.js` lo llama al pulsar una tarjeta. Cada pulsación cuenta como golpe
  // de ritmo, igual que el botón «Tempo»; después, si el Acompañamiento está
  // parado arranca en esa tarjeta y, si ya suena, depende del interruptor
  // «Solo pulso» (no se corta el audio) o «Reiniciar». No pisa un MIDI o un
  // metrónomo que el usuario eligió como fuente, y el interruptor de
  // reproducción puede desactivar todo esto.
  globalThis.playProgressionFrom = card => {
    if ((globalThis.StringSources?.active ?? 'progression') !== 'progression') return;
    if (document.querySelector('#player-card-start')?.checked === false) return;
    if (!Number.isInteger(card) || card < 0 || card >= progression.length) return;
    globalThis.tapProgressionTempo?.();
    if (player.running && cardMode() !== 'restart') return;
    return startPlayback(card);
  };
  // El tempo se puede cambiar con la música en marcha (botón «Tempo», las
  // tarjetas o el campo editable) sin reiniciar la reproducción.
  window.addEventListener('traste:tempo-applied', () => { player.setTempo(bpm.value); });
  document.querySelector('#player-volume').addEventListener('input', event => {
    player.setVolume(Number(event.target.value) / 100);
  });
  document.querySelector('#player-drum-volume').addEventListener('input', event => {
    player.setDrumVolume(Number(event.target.value) / 100);
  });
  window.addEventListener('pagehide', () => player.stop());
  window.addEventListener('traste:load-song', () => player.stop());
})();
