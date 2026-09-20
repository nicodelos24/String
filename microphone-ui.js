// Interfaz del micrófono: botón, lectura de la nota detectada y resaltado
// temporal (.live) en las posiciones del mástil y las cuerdas al aire.
// Depende de pitch-detection.js (globals detectPitch, isInTune) y app.js (noteName).

if (typeof document !== 'undefined') (() => {
  const toggle = document.getElementById('microphone-toggle');
  const readout = document.getElementById('microphone-readout');
  const chordCard = document.getElementById('live-chord-card');
  const chordName = document.getElementById('live-chord-name');
  const chordConfidence = document.getElementById('live-chord-confidence');
  const chordAdd = document.getElementById('live-chord-add');
  const chordAuto = document.getElementById('live-chord-auto');
  const scaleToggle = document.getElementById('live-scale-toggle');
  if (!toggle || !readout) return;

  let liveChord = null;
  let autoAdd = false;

  const reader = new MicrophoneReader({
    onPitch: detection => {
      if (detection && Number.isInteger(detection.midi)) highlightPitch(detection.midi);
      else clearLive();
      showReadout(detection);
    },
    onChord: detection => {
      liveChord = detection;
      showChord(detection);
      if (detection && scaleToggle?.checked && typeof showProgressionChord === 'function') {
        showProgressionChord({ root: detection.root, type: detection.type, mode: detection.mode }, -1);
      }
      if (detection && autoAdd) addDetectedChord();
    },
    onState: renderState,
  });

  function showChord(detection) {
    if (!chordCard) return;
    chordCard.hidden = false;
    chordAdd.disabled = !detection;
    if (!detection) {
      chordName.textContent = '—';
      chordConfidence.textContent = 'Esperando acorde…';
      return;
    }
    const type = typeof chordTypes !== 'undefined' && chordTypes.find(item => item.value === detection.type);
    chordName.textContent = `${noteName(detection.root)}${type?.suffix || ''}`;
    chordConfidence.textContent = 'Detección experimental';
  }

  function addDetectedChord() {
    if (!liveChord || draggingProgressionItem || progression.length >= 4096) return;
    const item = { root: liveChord.root, rootNoteName: noteName(liveChord.root), type: liveChord.type, mode: liveChord.mode, ghostMode: '', beats: 4 };
    progression.push(item);
    progressionEdited = true;
    globalThis.StringSections?.include(null, item);
    renderProgression();
  }
  chordAdd?.addEventListener('click', addDetectedChord);
  scaleToggle?.addEventListener('change', () => {
    if (scaleToggle.checked && liveChord) showProgressionChord(liveChord, -1);
  });
  chordAuto?.addEventListener('click', event => {
    autoAdd = !autoAdd;
    event.currentTarget.setAttribute('aria-pressed', String(autoAdd));
    event.currentTarget.textContent = autoAdd ? 'Auto activo' : 'Auto añadir';
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
    toggle.disabled = state === 'requesting';
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
      showChord(null);
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
      autoAdd = false;
      if (chordCard) chordCard.hidden = true;
      if (chordAdd) chordAdd.disabled = true;
      if (chordAuto) {
        chordAuto.setAttribute('aria-pressed', 'false');
        chordAuto.textContent = 'Auto añadir';
      }
    }
  }

  toggle.addEventListener('click', () => {
    if (reader.running) reader.stop();
    else reader.start();
  });

  window.addEventListener('pagehide', () => reader.stop());
})();
