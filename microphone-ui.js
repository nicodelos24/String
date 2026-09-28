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

// Dónde se dibuja un acorde en el mástil: una posición por cada nota que suena,
// en la octava más cercana a la nota más grave que se oye y siempre dentro del
// alcance del instrumento. Así se ve una forma plausible en un punto del mástil,
// en vez de las mismas clases de altura repetidas por las seis cuerdas y 22
// trastes. La forma no baja del bajo: en una posición real ninguna nota suena
// por debajo de la más grave, y medir la distancia sin esa condición elegía
// clases de la octava de abajo. Si una nota no tiene ninguna posición en el
// mástil, no se dibuja: no hay donde marcarla.
function chordFretMidis(pitches, bass, bounds) {
  if (!Array.isArray(pitches) || !pitches.length) return [];
  const low = Number.isInteger(bounds && bounds.low) ? bounds.low : 0;
  const high = Number.isInteger(bounds && bounds.high) ? bounds.high : 127;
  if (high < low) return [];
  // Sin nota grave conocida, la forma se dibuja en la parte media del mástil.
  const anchor = Number.isInteger(bass) ? bass : (low + high) / 2;
  const chosen = [];
  for (const pitch of pitches) {
    if (!Number.isInteger(pitch)) continue;
    const pitchClass = ((pitch % 12) + 12) % 12;
    // La primera aparición de esa clase en o por encima de `low`.
    let best = null, bestDistance = Infinity;
    let highestBelow = null;
    for (let midi = low + ((pitchClass - (low % 12) + 12) % 12); midi <= high; midi += 12) {
      if (midi < anchor) { highestBelow = midi; continue; }
      const away = midi - anchor;
      if (away < bestDistance) { bestDistance = away; best = midi; }
    }
    // Si solo hay posiciones por debajo del bajo (caso raro: la nota más grave
    // se oye en una octava que el mástil no cubre), se dibuja la más alta.
    if (best === null) best = highestBelow;
    if (best !== null && !chosen.includes(best)) chosen.push(best);
  }
  // De grave a agudo: la forma se lee como una posición, no como el orden en
  // que el acordelista las nombró.
  return chosen.sort((a, b) => a - b);
}

// Rótulo que el micrófono escribe en las posiciones que están sonando. Es un
// estado propio del micrófono, aparte de los botones AA y MÁSTIL: estos siguen
// decidiendo el resto del mástil. «Nota» reutiliza el nombre que la página ya
// pintó en esa posición, con la grafía de su armadura, y «Grado» usa el grado
// respecto a la escala actual, el mismo vocabulario que el botón AA GRADOS.
function micFretLabel(note, mode, ctx) {
  ctx = ctx || {};
  if (!note || !Number.isInteger(note.midi)) return '';
  if (mode !== 'degree') return note.name || '';
  if (typeof ctx.degreeFor !== 'function') return '';
  const pitch = ((note.midi % 12) + 12) % 12;
  const rootPitch = Number.isInteger(ctx.root) ? ((ctx.root % 12) + 12) % 12 : 0;
  return ctx.degreeFor(((pitch - rootPitch) + 12) % 12) || '';
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
  const labelRoot = document.getElementById('mic-note-label');
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

  // --- Rótulo de las notas que suenan ---------------------------------------
  // «Nota» o «Grado», a la derecha del botón del micrófono y visible solo con
  // el micrófono encendido, como «Escala en vivo». Escribe únicamente en las
  // posiciones resaltadas; el resto del mástil sigue hablando con AA y MÁSTIL.
  // `dataset` es un DOMStringMap: sus claves van en camelCase. Escribir
  // `dataset['data-mic-label']` lanza en el navegador, así que el nombre se
  // escribe como `dataset.micLabel`.
  const MIC_LABEL_SLOT = 'micLabel';
  let micLabelChosen = false;

  function micLabelButtons() {
    if (!labelRoot || typeof labelRoot.querySelectorAll !== 'function') return [];
    return [].slice.call(labelRoot.querySelectorAll('[data-mic-label-mode]'));
  }

  function micLabelMode() {
    const buttons = micLabelButtons();
    for (let i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute('aria-pressed') === 'true') return buttons[i].dataset.micLabelMode || 'degree';
    }
    return 'degree';
  }

  function setMicLabelMode(mode) {
    micLabelButtons().forEach(button => {
      const active = button.dataset.micLabelMode === mode;
      button.setAttribute('aria-pressed', String(active));
      if (button.classList && typeof button.classList.toggle === 'function') button.classList.toggle('is-active', active);
    });
  }

  // El rótulo de la página se guarda aparte (MIC_LABEL_SLOT) para poder
  // devolverlo tal cual cuando la nota deja de sonar. Se escribe solo si cambia:
  // el observer del mástil vigila este mismo árbol y una escritura idéntica
  // seguiría disparándolo.
  function applyMicLabel(element) {
    if (!element || !element.dataset) return;
    const label = micFretLabel(
      { midi: Number(element.dataset.midi), name: element.dataset.note },
      micLabelMode(),
      {
        root: typeof root !== 'undefined' ? root : 0,
        degreeFor: typeof getDegreeLabel === 'function' ? getDegreeLabel : null,
      });
    if (element.dataset[MIC_LABEL_SLOT] === undefined) element.dataset[MIC_LABEL_SLOT] = element.textContent;
    if (element.textContent !== label) element.textContent = label;
  }

  function restoreMicLabel(element) {
    if (!element || !element.dataset || element.dataset[MIC_LABEL_SLOT] === undefined) return;
    element.textContent = element.dataset[MIC_LABEL_SLOT];
    delete element.dataset[MIC_LABEL_SLOT];
  }

  function repaintMicLabels() {
    document.querySelectorAll('.fret-note.live, .open-string-note.live').forEach(applyMicLabel);
  }

  micLabelButtons().forEach(button => {
    button.addEventListener('click', () => {
      micLabelChosen = true;
      setMicLabelMode(button.dataset.micLabelMode || 'degree');
      // Lo que ya está sonando se reescribe con el criterio nuevo; lo que esté
      // apagado conserva el rótulo de la página.
      repaintMicLabels();
    });
  });

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
    restoreMicLabel(note);
    setTimeout(() => note.classList.remove('live-fade'), 300);
  }

  function clearLive() {
    document.querySelectorAll('.fret-note.live').forEach(fadeOut);
    document.querySelectorAll('.open-string-note.live').forEach(fadeOut);
    liveMidi = null;
  }

  // El alcance del mástil con el instrumento elegido: la cuerda más grave por
  // el primer traste y la más aguda por el vigésimo segundo. Es lo que decide
  // qué posiciones existen para colocar la forma de un acorde.
  function fretboardBounds() {
    const table = typeof instruments !== 'undefined' ? instruments : null;
    const key = typeof instrument !== 'undefined' ? instrument : 'guitar';
    const strings = table && table[key] && table[key].strings;
    if (!Array.isArray(strings) || !strings.length) return { low: 40, high: 88 };
    return { low: Math.min(...strings) + 1, high: Math.max(...strings) + 22 };
  }

  // La nota suena mientras su pulso permanece: se mantiene hasta una nota
  // distinta o el silencio, y las posiciones que dejan de sonar se atenúan.
  function applyLive(midi) {
    document.querySelectorAll('#fretboard [data-midi], #open-strings [data-midi]').forEach(note => {
      if (Number(note.dataset.midi) === midi) {
        note.classList.remove('live-fade');
        note.classList.add('live');
        applyMicLabel(note);
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

  // Con un acorde estable, la forma manda. Medido en Chromium con acordes
  // sintéticos: la forma del acorde acertó en 4 de 5 y la nota de YIN en 0 de
  // 5 (F3 sobre un Do, E1 sobre un Cmaj7, A1 sobre un Am7), así que dejarla
  // dibujada a la vez añadía un resaltado que no estaba sonando. La nota
  // monofónica sigue llegando en cada fotograma, así que la elección no puede
  // ser solo la de llegar: mientras haya forma, `applyLive` dibuja la forma y
  // descarta la nota. Al soltarse el acorde, esta vuelve a dibujar sola.
  function highlightChord(midis) {
    liveChordMidis = Array.isArray(midis) && midis.length ? midis : null;
    applyLive();
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
      // El rótulo de las notas arranca en «Grado», pero solo si no lo has
      // tocado: si las preferencias lo trajeron, gana lo elegido antes.
      if (!micLabelChosen) setMicLabelMode('degree');
      readout.hidden = false;
      readout.textContent = 'esperando nota…';
      if (liveRoot) liveRoot.hidden = false;
      if (labelRoot) labelRoot.hidden = false;
      if (tunerOn) setTunerIdle('esperando nota…');
    } else if (state === 'error') {
      toggle.setAttribute('aria-pressed', 'false');
      toggle.title = 'Usar el micrófono para resaltar la nota que tocas';
      label.textContent = 'Micrófono';
      readout.hidden = false;
      readout.textContent = detail || 'No se pudo usar el micrófono.';
      if (liveRoot) liveRoot.hidden = true;
      if (labelRoot) labelRoot.hidden = true;
      clearLive();
      if (tunerOn) setTunerIdle('Enciende el micrófono para afinar.');
    } else if (state === 'stopped') {
      toggle.setAttribute('aria-pressed', 'false');
      toggle.title = 'Usar el micrófono para resaltar la nota que tocas';
      label.textContent = 'Micrófono';
      readout.hidden = true;
      if (liveRoot) liveRoot.hidden = true;
      if (labelRoot) labelRoot.hidden = true;
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

if (typeof module !== 'undefined' && module.exports) module.exports = { micLiveChord, preferredRootSpelling, tunerReading, micFretLabel };