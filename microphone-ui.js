// Interfaz del micrófono: botón, lectura de la nota detectada y resaltado
// temporal (.live) en las posiciones del mástil y las cuerdas al aire.
// Depende de pitch-detection.js (globals detectPitch, isInTune) y app.js (noteName).

if (typeof document !== 'undefined') (() => {
  const toggle = document.getElementById('microphone-toggle');
  const readout = document.getElementById('microphone-readout');
  const scaleToggle = document.getElementById('live-scale-toggle');
  if (!toggle || !readout) return;

  let liveChord = null;

  // La detección de duración con el micrófono es imprecisa: al enmudecer, la
  // nota queda dibujada al menos NOTE_HOLD_MS y solo se limpia antes si se
  // toca otra nota (que reemplaza el resaltado al instante).
  const NOTE_HOLD_MS = 1000;

  const reader = new MicrophoneReader({
    onPitch: detection => {
      const now = Date.now();
      if (detection && Number.isInteger(detection.midi)) {
        highlightPitch(detection.midi);
        heldMidi = detection.midi;
        heldSince = now;
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        showReadout(detection);
      } else {
        const holding = heldMidi !== null && now - heldSince < NOTE_HOLD_MS;
        if (holding) {
          scheduleHoldClear();
        } else {
          clearLive();
          heldMidi = null;
          showReadout(detection);
        }
      }
    },
    onChord: detection => {
      if (keyboardOwnsChord()) return;
      liveChord = detection;
      if (detection && scaleToggle?.checked && typeof showProgressionChord === 'function') {
        showProgressionChord({ root: detection.root, type: detection.type, mode: detection.mode }, -1);
      }
    },
    onState: renderState,
  });

  // Mientras el teclado muestra un acorde en vivo, el micrófono cede la palabra
  // para no pisar la escala del mástil.
  function keyboardOwnsChord() {
    const playing = document.getElementById('keyboard-live-chord')?.dataset?.playing;
    return playing === '1';
  }

  scaleToggle?.addEventListener('change', () => {
    if (scaleToggle.checked && liveChord) showProgressionChord(liveChord, -1);
  });

  let liveMidi = null;
  let heldMidi = null;
  let heldSince = 0;
  let holdTimer = null;

  function scheduleHoldClear() {
    if (holdTimer) return;
    const remaining = Math.max(0, heldSince + NOTE_HOLD_MS - Date.now());
    holdTimer = setTimeout(() => {
      holdTimer = null;
      if (heldMidi !== null && Date.now() - heldSince >= NOTE_HOLD_MS) {
        clearLive();
        heldMidi = null;
        showReadout(null);
      }
    }, remaining);
  }

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
    toggle.disabled = state === 'requesting';
    if (state === 'requesting') {
      toggle.setAttribute('aria-pressed', 'true');
      toggle.title = 'Pidiendo permiso de micrófono…';
      label.textContent = 'Pidiendo…';
    } else if (state === 'ready') {
      toggle.setAttribute('aria-pressed', 'true');
      toggle.title = 'Detener micrófono';
      label.textContent = 'Detener';
      // Por defecto el mástil sigue el acorde en vivo; se puede apagar con el switch.
      if (scaleToggle) scaleToggle.checked = true;
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
    if (state === 'stopped' || state === 'error') {
      liveChord = null;
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      heldMidi = null;
    }
  }

  toggle.addEventListener('click', () => {
    if (reader.running) reader.stop();
    else reader.start();
  });

  window.addEventListener('pagehide', () => reader.stop());
})();
