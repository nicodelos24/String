// Interfaz del micrófono: botón, lectura de la nota detectada y resaltado
// temporal (.live) en las posiciones del mástil y las cuerdas al aire.
// Depende de pitch-detection.js (globals detectPitch, isInTune) y app.js (noteName).

if (typeof document !== 'undefined') (() => {
  const toggle = document.getElementById('microphone-toggle');
  const readout = document.getElementById('microphone-readout');
  if (!toggle || !readout) return;

  const reader = new MicrophoneReader({
    onPitch: detection => {
      if (detection && Number.isInteger(detection.midi)) highlightPitch(detection.midi);
      else clearLive();
      showReadout(detection);
    },
    onState: renderState,
  });

  let liveMidi = null;

  function noteLabel(detection) {
    const pitchClass = detection.midi % 12;
    const octave = Math.floor(detection.midi / 12) - 1;
    const name = noteName(pitchClass) + octave;
    if (!isInTune(detection)) {
      const detune = detection.cents > 0 ? `+${detection.cents}` : String(detection.cents);
      return `${name} · ${detune} cents (desafinado)`;
    }
    return `${name} · ${detection.freq} Hz`;
  }

  function showReadout(detection) {
    readout.hidden = false;
    readout.textContent = detection ? noteLabel(detection) : 'esperando nota…';
  }

  function fadeOut(note) {
    note.classList.remove('live');
    note.classList.add('live-fade');
    setTimeout(() => note.classList.remove('live-fade'), 300);
  }

  function clearLive() {
    document.querySelectorAll('.fret-note.live').forEach(fadeOut);
    document.querySelectorAll('.open-string-note.live').forEach(fadeOut);
    liveMidi = null;
  }

  // La nota suena mientras su pulso permanece: se mantiene hasta una nota
  // distinta o el silencio, y las posiciones que dejan de sonar se atenúan.
  function applyLive(midi) {
    document.querySelectorAll('#fretboard [data-midi], #open-strings [data-midi]').forEach(note => {
      if (Number(note.dataset.midi) === midi) {
        note.classList.remove('live-fade');
        note.classList.add('live');
      } else if (note.classList.contains('live')) {
        fadeOut(note);
      }
    });
  }

  function highlightPitch(midi) {
    if (!Number.isInteger(midi)) return;
    liveMidi = midi;
    applyLive(midi);
  }

  // El mástil se reconstruye al cambiar de acorde/modo; reaplicar si sigue activo.
  const observer = new MutationObserver(() => {
    if (reader.running && liveMidi !== null) applyLive(liveMidi);
  });
  for (const id of ['fretboard', 'open-strings']) {
    const node = document.getElementById(id);
    if (node) observer.observe(node, { childList: true, subtree: true });
  }

  function renderState(state, detail) {
    const label = toggle.querySelector('span:last-child');
    if (state === 'requesting') {
      toggle.setAttribute('aria-pressed', 'true');
      toggle.title = 'Pidiendo permiso de micrófono…';
      label.textContent = 'Pidiendo…';
    } else if (state === 'ready') {
      toggle.setAttribute('aria-pressed', 'true');
      toggle.title = 'Detener micrófono';
      label.textContent = 'Detener';
      readout.hidden = false;
      readout.textContent = 'esperando nota…';
    } else if (state === 'error') {
      toggle.setAttribute('aria-pressed', 'false');
      toggle.title = 'Usar el micrófono para resaltar la nota que tocas';
      label.textContent = 'Micrófono';
      readout.hidden = false;
      readout.textContent = detail || 'No se pudo usar el micrófono.';
    } else if (state === 'stopped') {
      toggle.setAttribute('aria-pressed', 'false');
      toggle.title = 'Usar el micrófono para resaltar la nota que tocas';
      label.textContent = 'Micrófono';
      readout.hidden = true;
      clearLive();
    }
  }

  toggle.addEventListener('click', () => {
    if (reader.running) reader.stop();
    else reader.start();
  });

  window.addEventListener('pagehide', () => reader.stop());
})();