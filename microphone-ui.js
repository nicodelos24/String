// Interfaz del micrófono: botón, lectura de la nota detectada y resaltado
// temporal (.live) en las posiciones del mástil y las cuerdas al aire.
// Depende de pitch-detection.js (globals detectPitch, isInTune) y app.js (noteName).
//
// Escala en vivo: igual que el selector «Acorde en vivo» del teclado, tres
// fases controlan si el mástil sigue al micrófono. «Apagado» no cambia la
// escala; «Nota» usa el tipo y el modo elegidos a la izquierda para una sola
// nota y el acorde real si se capta; «Acorde» solo cambia la escala cuando el
// micrófono detecta un acorde (dos o más notas).

// Preferencia de escritura de la raíz de un acorde según el círculo de quintas:
// las raíces del lado de los sostenidos (G, D, A, E, B y F#) se escriben con
// sostenidos y las del lado de los bemoles (F, Bb, Eb, Ab y Db) con bemoles.
// Do no prefiere ninguna: se conserva la elección del usuario.
function preferredRootSpelling(root, ctx) {
  ctx = ctx || {};
  const noteNames = ctx.notes || ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const flatLabels = ctx.noteLabels || { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
  const pitch = ((root % 12) + 12) % 12;
  if ([2, 4, 6, 7, 9, 11].indexOf(pitch) >= 0) return { rootName: noteNames[pitch], useFlats: false };
  if ([1, 3, 5, 8, 10].indexOf(pitch) >= 0) return { rootName: flatLabels[noteNames[pitch]] || noteNames[pitch], useFlats: true };
  return null;
}

// Dado el modo elegido y lo que captó el micrófono (un acorde detectado o una
// nota monofónica confirmada), decide qué acorde debe aplicarse al mástil.
// Devuelve {root, type, mode} o null para no tocar la escala.
function micLiveChord(phase, chord, pitch, ctx) {
  ctx = ctx || {};
  if (!phase || phase === 'off') return null;
  if (chord && typeof chord.root === 'number' && chord.type) {
    const preferred = preferredRootSpelling(chord.root, ctx);
    if (preferred) return Object.assign({}, chord, { rootNoteName: preferred.rootName, useFlats: preferred.useFlats });
    return chord;
  }
  if (phase === 'chord' || !Number.isInteger(pitch)) return null;
  const pitchClass = ((pitch % 12) + 12) % 12;
  const type = ctx.chordType && ctx.chordType.value ? ctx.chordType.value : 'maj';
  const mode = ctx.selectedMode || (type === 'm' ? 'aeolian' : type === 'dim' ? 'locrian' : 'ionian');
  let spelling = ctx.notes && ctx.notes[pitchClass];
  if (spelling && ctx.pianoUseFlats && ctx.noteLabels && ctx.noteLabels[spelling]) spelling = ctx.noteLabels[spelling];
  return { root: pitchClass, rootNoteName: spelling, type: type, mode: mode };
}

// Afinador: lee una nota sostenida y la mide contra la afinación estándar del
// instrumento. Devuelve la cuerda más cercana (o la fijada con lockedIndex),
// su nota objetivo con octava y la desviación en cents (negativa = quedó
// grave). Dentro de ±5 cents la cuerda se da por afinada.
function tunerReading(detection, instrumentKey, table, lockedIndex) {
  if (!detection || !Number.isInteger(detection.midi)) return null;
  const inst = table && table[instrumentKey];
  if (!inst || !Array.isArray(inst.strings) || !inst.strings.length) return null;
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = midi => Math.floor(midi / 12) - 1;
  const exact = detection.midi + (Number.isFinite(detection.cents) ? detection.cents / 100 : 0);
  let target = Number.isInteger(lockedIndex) && lockedIndex >= 0 && lockedIndex < inst.strings.length
    ? lockedIndex : -1;
  if (target < 0) {
    let bestDev = Infinity;
    for (let i = 0; i < inst.strings.length; i++) {
      const dev = Math.abs(100 * (exact - inst.strings[i]));
      if (dev < bestDev) { bestDev = dev; target = i; }
    }
  }
  const cents = Math.round(100 * (exact - inst.strings[target]));
  const midi = inst.strings[target];
  const nameBase = (inst.stringNames && inst.stringNames[target]) || NOTE_NAMES[((midi % 12) + 12) % 12];
  return {
    stringIndex: target,
    stringNumber: target + 1,
    midi: midi,
    noteName: nameBase + octave(midi),
    cents: cents,
    inTune: Math.abs(cents) <= 5,
  };
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
      updateTuner(detection);
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
    if (chord.useFlats !== undefined && typeof setChordSpelling === 'function') setChordSpelling(chord.useFlats);
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
      // Por defecto el mástil sigue al micrófono en la fase «Acorde»: solo un
      // acorde detectado cambia la escala. Se puede pasar a «Nota» (una nota
      // suelta también) o «Apagado» (escala fija).
      setMicroPhase('chord');
      readout.hidden = false;
      readout.textContent = 'esperando nota…';
      if (liveRoot) liveRoot.hidden = false;
      if (tunerOn) setTunerIdle('esperando nota…');
    } else if (state === 'error') {
      toggle.setAttribute('aria-pressed', 'false');
      toggle.title = 'Usar el micrófono para resaltar la nota que tocas';
      label.textContent = 'Micrófono';
      readout.hidden = false;
      readout.textContent = detail || 'No se pudo usar el micrófono.';
      if (liveRoot) liveRoot.hidden = true;
      if (tunerOn) setTunerIdle('Enciende el micrófono para afinar.');
    } else if (state === 'stopped') {
      toggle.setAttribute('aria-pressed', 'false');
      toggle.title = 'Usar el micrófono para resaltar la nota que tocas';
      label.textContent = 'Micrófono';
      readout.hidden = true;
      if (liveRoot) liveRoot.hidden = true;
      clearLive();
      if (tunerOn) setTunerIdle('Enciende el micrófono para afinar.');
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

  // --- Afinador de guitarra y bajo ------------------------------------------
  // Reutiliza el mismo lector del micrófono: marca la cuerda más cercana,
  // cuanto queda aguda/grave y cuándo está afinada (±5 cents).
  const tunerToggle = document.getElementById('tuner-toggle');
  const tunerPanel = document.getElementById('tuner');
  const tunerStringsEl = document.getElementById('tuner-strings');
  const tunerTarget = document.getElementById('tuner-target');
  const tunerNeedle = document.getElementById('tuner-needle');
  const tunerCents = document.getElementById('tuner-cents');
  const tunerStatusEl = document.getElementById('tuner-status');
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  let tunerOn = false;
  let tunerShownInstrument = '';
  let tunerLock = -1; // cuerda fijada a mano; -1 = seguir la más cercana

  const tunerOctave = midi => Math.floor(midi / 12) - 1;

  function renderTunerStrings() {
    const table = typeof instruments !== 'undefined' ? instruments : null;
    const key = typeof instrument !== 'undefined' ? instrument : 'guitar';
    const inst = table && table[key];
    if (!inst) return;
    tunerShownInstrument = key;
    tunerStringsEl.innerHTML = inst.strings.map((midi, i) => {
      const name = (inst.stringNames[i] || '') + tunerOctave(midi);
      return `<button type="button" class="tuner-string" data-string="${i}" aria-label="Cuerda ${i + 1}: ${name}" aria-pressed="false">${name}</button>`;
    }).join('');
  }

  function setTunerIdle(message) {
    tunerTarget.textContent = '–';
    tunerNeedle.style.left = '50%';
    tunerCents.textContent = '0¢';
    tunerStatusEl.textContent = message;
    if (tunerStringsEl.querySelectorAll) {
      // La cuerda fijada a mano (si hay) sigue marcada aunque aún no suene.
      tunerStringsEl.querySelectorAll('.tuner-string').forEach(btn => {
        const isTarget = tunerLock >= 0 && Number(btn.dataset.string) === tunerLock;
        btn.setAttribute('aria-pressed', String(isTarget));
        if (btn.classList && btn.classList.toggle) {
          btn.classList.toggle('is-target', isTarget);
          btn.classList.toggle('is-tuned', false);
        }
      });
    }
  }

  function updateTuner(detection) {
    if (!tunerOn || !tunerPanel) return;
    const table = typeof instruments !== 'undefined' ? instruments : null;
    const key = typeof instrument !== 'undefined' ? instrument : 'guitar';
    if (key !== tunerShownInstrument) renderTunerStrings();
    const reading = tunerReading(detection, key, table, tunerLock);
    if (!reading) { setTunerIdle('esperando nota…'); return; }
    if (tunerStringsEl.querySelectorAll) {
      tunerStringsEl.querySelectorAll('.tuner-string').forEach(btn => {
        const isTarget = Number(btn.dataset.string) === reading.stringIndex;
        btn.setAttribute('aria-pressed', String(isTarget));
        if (btn.classList && btn.classList.toggle) {
          btn.classList.toggle('is-target', isTarget);
          btn.classList.toggle('is-tuned', isTarget && reading.inTune);
        }
      });
    }
    tunerTarget.textContent = reading.noteName;
    tunerNeedle.style.left = Math.max(0, Math.min(100, 50 + reading.cents)) + '%';
    tunerCents.textContent = (reading.cents > 0 ? '+' : '') + reading.cents + '¢';
    tunerStatusEl.textContent = reading.inTune
      ? 'Afinado ✓'
      : (reading.cents < 0 ? 'Queda grave · afloja la cuerda' : 'Queda aguda · aprieta la cuerda');
  }

  if (tunerToggle && tunerPanel) {
    tunerToggle.addEventListener('click', () => {
      tunerOn = !tunerOn;
      tunerToggle.setAttribute('aria-pressed', String(tunerOn));
      tunerPanel.hidden = !tunerOn;
      if (tunerOn) {
        renderTunerStrings();
        setTunerIdle(reader.running ? 'esperando nota…' : 'Enciende el micrófono para afinar.');
      }
    });
    if (tunerStringsEl && tunerStringsEl.addEventListener) {
      tunerStringsEl.addEventListener('click', event => {
        const btn = event.target.closest('.tuner-string');
        if (!btn) return;
        const index = Number(btn.dataset.string);
        tunerLock = tunerLock === index ? -1 : index;
        updateTuner(null); // fija o suelta la marcada, sin necesidad de nota aún
      });
    }
    // Si se cambia el instrumento con el afinador abierto, las cuerdas se repintan.
    const instrumentSel = document.getElementById('instrument-select');
    if (instrumentSel && instrumentSel.addEventListener) {
      instrumentSel.addEventListener('change', () => {
        if (!tunerOn) return;
        tunerLock = -1; // evita fijar una cuerda equivocada del otro instrumento
        renderTunerStrings();
        setTunerIdle(reader.running ? 'esperando nota…' : 'Enciende el micrófono para afinar.');
      });
    }
  }

  window.addEventListener('pagehide', () => reader.stop());
})();

if (typeof module !== 'undefined' && module.exports) module.exports = { micLiveChord, preferredRootSpelling, tunerReading };