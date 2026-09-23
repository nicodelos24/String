// Interfaz del micrófono: botón, lectura de la nota detectada y resaltado
// temporal (.live) en las posiciones del mástil y las cuerdas al aire.
// Depende de pitch-detection.js (globals detectPitch, isInTune) y app.js (noteName).
//
// Escala en vivo: igual que el selector «Acorde en vivo» del teclado, tres
// fases controlan si el mástil sigue al micrófono. «Apagado» no cambia la
// escala; «Nota» usa el tipo y el modo elegidos a la izquierda para una sola
// nota y el acorde real si se capta; «Acorde» solo cambia la escala cuando el
// micrófono detecta un acorde (dos o más notas).

// Dado el modo elegido y lo que captó el micrófono (un acorde detectado o una
// nota monofónica confirmada), decide qué acorde debe aplicarse al mástil.
// Devuelve {root, type, mode} o null para no tocar la escala.
function micLiveChord(phase, chord, pitch, ctx) {
  ctx = ctx || {};
  if (!phase || phase === 'off') return null;
  if (chord && typeof chord.root === 'number' && chord.type) return chord;
  if (phase === 'chord' || !Number.isInteger(pitch)) return null;
  const pitchClass = ((pitch % 12) + 12) % 12;
  const type = ctx.chordType && ctx.chordType.value ? ctx.chordType.value : 'maj';
  const mode = ctx.selectedMode || (type === 'm' ? 'aeolian' : type === 'dim' ? 'locrian' : 'ionian');
  let spelling = ctx.notes && ctx.notes[pitchClass];
  if (spelling && ctx.pianoUseFlats && ctx.noteLabels && ctx.noteLabels[spelling]) spelling = ctx.noteLabels[spelling];
  return { root: pitchClass, rootNoteName: spelling, type: type, mode: mode };
}

if (typeof document !== 'undefined') (() => {
  const toggle = document.getElementById('microphone-toggle');
  const readout = document.getElementById('microphone-readout');
  const liveRoot = document.getElementById('mic-live-chord');
  if (!toggle || !readout) return;

  let liveChord = null;   // último acorde estable detectado por el micrófono
  let micPitch = null;    // última nota monofónica confirmada (MIDI)
  let microLiveKey = '';  // raíz:tipo:modo ya aplicado desde el micrófono

  // La detección de duración con el micrófono es imprecisa: al enmudecer, la
  // nota queda dibujada al menos NOTE_HOLD_MS y solo se limpia antes si se
  // toca otra nota (que reemplaza el resaltado al instante).
  const NOTE_HOLD_MS = 1000;

  const reader = new MicrophoneReader({
    onPitch: detection => {
      const now = Date.now();
      if (detection && Number.isInteger(detection.midi)) {
        micPitch = detection.midi;
        highlightPitch(detection.midi);
        heldMidi = detection.midi;
        heldSince = now;
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        showReadout(detection);
      } else {
        micPitch = null;
        const holding = heldMidi !== null && now - heldSince < NOTE_HOLD_MS;
        if (holding) {
          scheduleHoldClear();
        } else {
          clearLive();
          heldMidi = null;
          showReadout(detection);
        }
      }
      recomputeMicroLive();
    },
    onChord: detection => {
      if (keyboardOwnsChord()) { liveChord = null; return; }
      liveChord = detection;
      recomputeMicroLive();
    },
    onState: renderState,
  });

  // Mientras el teclado muestra un acorde en vivo, el micrófono cede la palabra
  // para no pisar la escala del mástil.
  function keyboardOwnsChord() {
    const playing = document.getElementById('keyboard-live-chord')?.dataset?.playing;
    return playing === '1';
  }

  // Activo para el guard de clics del mástil: mientras el micrófono siga la
  // escala en vivo, pulsar una nota no cambia la raíz (la lleva el acorde).
  window.__microLiveActive = function () {
    const phase = microPhase();
    return reader.running && (phase === 'note' || phase === 'chord');
  };

  function microButtons() {
    if (!liveRoot || typeof liveRoot.querySelectorAll !== 'function') return [];
    return [].slice.call(liveRoot.querySelectorAll('[data-mic-live-mode]'));
  }

  function microPhase() {
    const buttons = microButtons();
    for (let i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute('aria-pressed') === 'true') return buttons[i].dataset.micLiveMode || 'off';
    }
    return 'off';
  }

  function setMicroPhase(mode) {
    microButtons().forEach(button => {
      const active = button.dataset.micLiveMode === mode;
      button.setAttribute('aria-pressed', String(active));
      if (button.classList && typeof button.classList.toggle === 'function') button.classList.toggle('is-active', active);
    });
  }

  function applyMicroChord(chord) {
    if (!chord || typeof showProgressionChord !== 'function') return;
    const key = chord.root + ':' + chord.type + ':' + chord.mode;
    if (key === microLiveKey) return;
    microLiveKey = key;
    showProgressionChord({ root: chord.root, rootNoteName: chord.rootNoteName, type: chord.type, mode: chord.mode }, -1);
  }

  function recomputeMicroLive() {
    if (keyboardOwnsChord()) { microLiveKey = ''; return; }
    const phase = microPhase();
    if (phase === 'off') return;
    applyMicroChord(micLiveChord(phase, liveChord, micPitch, {
      chordType: typeof chordType !== 'undefined' ? chordType : undefined,
      selectedMode: typeof selectedMode !== 'undefined' ? selectedMode : undefined,
      notes: typeof notes !== 'undefined' ? notes : undefined,
      pianoUseFlats: typeof pianoUseFlats !== 'undefined' ? pianoUseFlats : undefined,
      noteLabels: typeof noteLabels !== 'undefined' ? noteLabels : undefined,
    }));
  }

  microButtons().forEach(button => {
    button.addEventListener('click', () => {
      setMicroPhase(button.dataset.micLiveMode || 'off');
      recomputeMicroLive();
    });
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
      // Por defecto el mástil sigue al micrófono en la fase «Nota»; se puede
      // cambiar a «Acorde» (solo acordes) o «Apagado» (escala fija).
      setMicroPhase('note');
      readout.hidden = false;
      readout.textContent = 'esperando nota…';
      if (liveRoot) liveRoot.hidden = false;
    } else if (state === 'error') {
      toggle.setAttribute('aria-pressed', 'false');
      toggle.title = 'Usar el micrófono para resaltar la nota que tocas';
      label.textContent = 'Micrófono';
      readout.hidden = false;
      readout.textContent = detail || 'No se pudo usar el micrófono.';
      if (liveRoot) liveRoot.hidden = true;
    } else if (state === 'stopped') {
      toggle.setAttribute('aria-pressed', 'false');
      toggle.title = 'Usar el micrófono para resaltar la nota que tocas';
      label.textContent = 'Micrófono';
      readout.hidden = true;
      if (liveRoot) liveRoot.hidden = true;
      clearLive();
    }
    if (state === 'stopped' || state === 'error') {
      liveChord = null;
      micPitch = null;
      microLiveKey = '';
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

if (typeof module !== 'undefined' && module.exports) module.exports = { micLiveChord };