// Preferencias visibles persistentes.
// Se carga al final de index.html para que todos los controles ya existan.
// Cada cambio de cualquier control visible vuelve a guardar un snapshot
// completo en localStorage; al cargar, se reaplica el último snapshot
// disparando los mismos eventos que manejan los controles.
(() => {
  if (typeof document === 'undefined') return;
  const KEY = 'traste.preferences.v1';

  const $ = selector => { try { return document.querySelector(selector); } catch { return null; } };
  const all = selector => { try { return Array.from(document.querySelectorAll(selector)); } catch { return []; } };

  const setValue = (element, value) => { if (element && value !== undefined && value !== null) element.value = value; };
  const setChecked = (element, value) => { if (element) element.checked = Boolean(value); };
  const fire = (element, type) => {
    if (!element || typeof element.dispatchEvent !== 'function' || typeof Event === 'undefined') return;
    try { element.dispatchEvent(new Event(type, { bubbles: true })); } catch {}
  };

  // Leyendas de los botones cíclicos: el texto se usa como estado para
  // capturar y para restaurar pulsando hasta alcanzar el objetivo. La fase
  // apagada de los dos botones no pone palabra (solo el nombre fijo del
  // botón), así que su estado es el texto vacío, y por eso los dos índices
  // caen en 0 cuando no reconocen el rótulo.
  const NOTES_LABELS = ['', 'notas', 'grados'];
  const DEGREE_LABELS = ['', 'notas', 'grados'];
  // Guardados de la versión anterior: showNotes (0 sin, 1 escala, 2 todas) y
  // degreeDisplay (0 no, 1 escala, 2 todas).
  const fromLegacy = saved => {
    if (saved.degreeDisplay) return 2;         // había grados -> VER = «AA GRADOS»
    if (saved.showNotes === 0) return 0;       // no había ni notas -> VER apagado
    return 1;                                  // notas -> VER = «AA NOTAS»
  };
  const fromLegacyScope = saved => (saved.degreeDisplay === 2 || saved.showNotes === 2) ? 1 : 0;
  // Los rótulos de VER se reordenaron al ponerles nombre propio: antes 0 = notas,
  // 1 = grados y 2 = apagado; ahora 0 = apagado («AA» a secas), 1 = «AA NOTAS» y
  // 2 = «AA GRADOS». Como el snapshot guarda el número de fase, un guardado
  // anterior hay que desplazarlo o el botón se abriría en otra fase. Se marca
  // con `fretPhases` para no desplazar dos veces los que ya son de esta versión.
  // MÁSTIL no lo necesita: su orden (apagado, notas, grados) no cambió.
  const FRET_PHASES = 2;
  const VER_OLD_TO_NEW = [1, 2, 0];
  const notesIndex = text => {
    const index = NOTES_LABELS.indexOf(text);
    return index >= 0 ? index : 1;
  };
  const degreesIndex = text => {
    const index = DEGREE_LABELS.indexOf(text);
    return index >= 0 ? index : 0;
  };

  const readSnapshot = () => {
    const datasetKey = selector => {
      const match = selector.match(/data-([\w-]+)/);
      return match ? match[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase()) : null;
    };
    const pressedValue = (selector, fallback) => {
      const button = all(selector).find(el => el.getAttribute('aria-pressed') === 'true');
      const key = datasetKey(selector);
      return button && key ? button.dataset[key] : fallback;
    };
    const selectedOptionValue = id => {
      const select = $(id);
      if (!select || !select.options) return '';
      return select.options[select.selectedIndex || 0]?.dataset?.note || '';
    };
    return {
      instrument: all('#instrument-picker input[name="string-instrument"]').find(r => r.checked)?.value || '',
      rootPitch: all('#root-piano .piano-key').find(k => k.getAttribute('aria-pressed') === 'true')?.dataset?.pitch || 0,
      rootNoteName: selectedOptionValue('#root-select') || 'C',
      useFlats: $('#root-spelling')?.checked || false,
      quality: all('#quality-select input[name="quality"]').find(r => r.checked)?.value || '',
      mode: all('#mode-selector input[name="mode"]').find(r => r.checked)?.value || '',
      ghostMode: $('#ghost-mode-select')?.value || '',
      pentatonicView: $('#pentatonic-view')?.checked || false,
      // Marca de la nomenclatura de las fases de VER, para saber si un guardado
      // hay que desplazarlo al restaurarlo.
      fretPhases: FRET_PHASES,
      verLevel: notesIndex(($('#toggle-notes span')?.textContent || '').trim()),
      mastilScope: degreesIndex(($('#toggle-degrees span')?.textContent || '').trim()),
      displayLabel: $('#display-label')?.textContent || '',
      source: pressedValue('[data-source]', 'progression'),
      cardMode: pressedValue('[data-card-mode]', 'restart'),
      keyboardMode: pressedValue('#keyboard-modes [data-keyboard-mode]', 'mastil'),
      keyboardLive: pressedValue('#keyboard-live-chord [data-live-mode]', 'chord'),
      micLive: pressedValue('#mic-live-chord [data-mic-live-mode]', 'chord'),
      micLabel: pressedValue('#mic-note-label [data-mic-label-mode]', 'degree'),
      rowView: $('#progression')?.classList.contains('single-row') || false,
      followMidi: $('#follow-midi')?.checked || false,
      fretScaleLock: $('#fret-scale-lock')?.checked || false,
      youtubeFloat: $('#youtube-float')?.checked || true,
      playerBpm: $('#player-bpm')?.value || '',
      playerStyle: $('#player-style')?.value || '',
      playerLoop: $('#player-loop')?.checked || false,
      playerPercussion: $('#player-percussion')?.checked || false,
      playerVolume: $('#player-volume')?.value || '',
      playerDrumVolume: $('#player-drum-volume')?.value || '',
      accompanimentMuted: $('#accompaniment-mute')?.getAttribute('aria-pressed') === 'true' || false,
      metronomeBpm: $('#metronome-bpm')?.value || '',
      metronomeBeats: $('#metronome-beats')?.value || '',
      metronomeAccent: $('#metronome-accent')?.checked || true,
      metronomeVolume: $('#metronome-volume')?.value || '',
      synthTimbre: $('#keyboard-timbre')?.value || '',
      synthDelay: $('#keyboard-delay')?.checked || false,
      synthReverb: $('#keyboard-reverb')?.checked || false,
      synthVolume: $('#keyboard-volume')?.value || '',
      mastilVolume: $('#mastil-volume')?.value || ''
    };
  };

  const readSaved = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
  };
  const writeSaved = snapshot => {
    try { localStorage.setItem(KEY, JSON.stringify(snapshot)); } catch {}
  };

  const setRadio = (selector, name, value) => {
    const radio = all(selector + ' input[name="' + name + '"]').find(r => r.value === value);
    if (!radio) return;
    setChecked(radio, true);
    fire(radio, 'change');
  };

  const setSelectIfOption = (selector, value) => {
    const select = $(selector);
    if (!select || !select.options || !Array.from(select.options).some(option => option.value === value)) return;
    setValue(select, value);
    fire(select, 'change');
  };

  const clickPressedTarget = (selector, attr, value) => {
    const button = all(selector).find(el => el.getAttribute(attr) === value);
    if (!button || typeof button.click !== 'function') return;
    button.click();
  };

  // Restaura un botón cíclico pulsando hasta que su leyenda coincida con la
  // esperada. Se protege con un límite para no dejar la vista ciclando.
  const clickUntil = (buttonSelector, getText, targetText) => {
    for (let i = 0; i < 6; i++) {
      if (getText() === targetText) return;
      const button = $(buttonSelector);
      if (!button || typeof button.click !== 'function') return;
      button.click();
    }
  };

  const apply = saved => {
    if (!saved || typeof saved !== 'object') return;

    setSelectIfOption('#instrument-select', saved.instrument);
    setRadio('#quality-select', 'quality', saved.quality);
    setRadio('#mode-selector', 'mode', saved.mode);
    setChecked($('#pentatonic-view'), saved.pentatonicView);
    fire($('#pentatonic-view'), 'change');
    setSelectIfOption('#ghost-mode-select', saved.ghostMode || '');
    setChecked($('#root-spelling'), saved.useFlats);
    fire($('#root-spelling'), 'change');
    if (saved.rootPitch !== undefined) {
      clickPressedTarget('#root-piano .piano-key', 'data-pitch', String(saved.rootPitch));
    }
    const clampIndex = (value, fallback, max) => {
      const number = Number(value);
      return Number.isFinite(number) ? Math.min(Math.max(Math.round(number), 0), max) : fallback;
    };
    // Los botones se reconstruyeron (AA y MÁSTIL), así que un guardado de la
    // versión anterior trae `showNotes` y `degreeDisplay`. Se traducen: los
    // grados de antes pasaban a AA GRADOS y su alcance a MÁSTIL, y sin grados
    // «todas» era MÁSTIL=notas, que es lo más cercano que hay ahora (MÁSTIL en
    // grados muestra todas las cuerdas con su grado, no su nombre).
    const ver = saved.verLevel === undefined
      ? fromLegacy(saved)
      : (saved.fretPhases === FRET_PHASES
        ? clampIndex(saved.verLevel, 0, 2)
        : VER_OLD_TO_NEW[clampIndex(saved.verLevel, 0, 2)]);
    const alcance = saved.mastilScope === undefined ? fromLegacyScope(saved) : clampIndex(saved.mastilScope, 0, 2);
    clickUntil('#toggle-notes',
      () => ($('#toggle-notes span')?.textContent || '').trim(),
      NOTES_LABELS[ver]);
    clickUntil('#toggle-degrees',
      () => ($('#toggle-degrees span')?.textContent || '').trim(),
      DEGREE_LABELS[alcance]);
    if (saved.displayLabel) {
      clickUntil('#toggle-display', () => $('#display-label')?.textContent || '', String(saved.displayLabel));
    }

    clickPressedTarget('[data-source]', 'data-source', saved.source);
    clickPressedTarget('[data-card-mode]', 'data-card-mode', saved.cardMode || 'restart');
    clickPressedTarget('#keyboard-modes [data-keyboard-mode]', 'data-keyboard-mode', saved.keyboardMode);
    clickPressedTarget('#keyboard-live-chord [data-live-mode]', 'data-live-mode', saved.keyboardLive);
    clickPressedTarget('#mic-live-chord [data-mic-live-mode]', 'data-mic-live-mode', saved.micLive);
    clickPressedTarget('#mic-note-label [data-mic-label-mode]', 'data-mic-label-mode', saved.micLabel || 'degree');

    const metronomeBpm = $('#metronome-bpm');
    setValue(metronomeBpm, saved.metronomeBpm);
    fire(metronomeBpm, 'change');
    const metronomeBeats = $('#metronome-beats');
    setValue(metronomeBeats, saved.metronomeBeats);
    fire(metronomeBeats, 'change');
    setChecked($('#metronome-accent'), saved.metronomeAccent);
    fire($('#metronome-accent'), 'change');
    const metronomeVolume = $('#metronome-volume');
    setValue(metronomeVolume, saved.metronomeVolume);
    fire(metronomeVolume, 'input');

    setValue($('#player-bpm'), saved.playerBpm);
    setValue($('#tempo-tap-bpm'), saved.playerBpm);
    setSelectIfOption('#player-style', saved.playerStyle);
    setChecked($('#player-loop'), saved.playerLoop);
    setChecked($('#player-percussion'), saved.playerPercussion);
    const playerVolume = $('#player-volume');
    setValue(playerVolume, saved.playerVolume);
    fire(playerVolume, 'input');
    const drumVolume = $('#player-drum-volume');
    setValue(drumVolume, saved.playerDrumVolume);
    fire(drumVolume, 'input');
    // El silencio es un botón de pulsación, no un valor: se restaura con un clic
    // y solo si el estado actual no es el guardado, para no alternar al revés.
    const muteButton = $('#accompaniment-mute');
    if (muteButton && (muteButton.getAttribute('aria-pressed') === 'true') !== Boolean(saved.accompanimentMuted)) {
      if (typeof muteButton.click === 'function') muteButton.click();
    }

    setSelectIfOption('#keyboard-timbre', saved.synthTimbre);
    setChecked($('#keyboard-delay'), saved.synthDelay);
    fire($('#keyboard-delay'), 'change');
    setChecked($('#keyboard-reverb'), saved.synthReverb);
    fire($('#keyboard-reverb'), 'change');
    const synthVolume = $('#keyboard-volume');
    setValue(synthVolume, saved.synthVolume);
    setValue($('#mastil-volume'), saved.synthVolume);
    fire(synthVolume, 'input');

    const followMidi = $('#follow-midi');
    setChecked(followMidi, saved.followMidi);
    fire(followMidi, 'change');
    setChecked($('#fret-scale-lock'), saved.fretScaleLock);
    const floatToggle = $('#youtube-float');
    setChecked(floatToggle, saved.youtubeFloat);
    fire(floatToggle, 'change');
    const rowViewNow = $('#progression')?.classList.contains('single-row') || false;
    if (rowViewNow !== Boolean(saved.rowView)) {
      const viewButton = $('#progression-view');
      if (viewButton && typeof viewButton.click === 'function') viewButton.click();
    }
  };

  let applying = false;
  let lastText = '';

  const capture = () => {
    if (applying) return;
    const text = JSON.stringify(readSnapshot());
    if (text === lastText) return;
    lastText = text;
    writeSaved(JSON.parse(text));
  };

  const load = () => {
    const saved = readSaved();
    if (saved) {
      applying = true;
      try { apply(saved); } finally { applying = false; }
    }
    lastText = JSON.stringify(readSnapshot());
    // El clic se escucha en fase de captura para que ningún `stopPropagation`
    // de un control se lleve la guardado por delante, pero eso tiene un precio:
    // en captura el manejador del propio botón todavía no ha corrido, así que
    // se guardaba el valor de ANTES del clic. Con los botones cíclicos (VER,
    // MÁSTIL, el modo de visualización) eso dejaba el snapshot un paso atrasado
    // y al recargar salía la fase anterior. Se aplaza la captura un turno para
    // que corra cuando todos los manejadores ya han pintado sus etiquetas.
    ['change', 'input', 'click'].forEach(type =>
      document.addEventListener(type, () => setTimeout(capture, 0), true));
  };

  load();

  if (typeof window !== 'undefined') window.StringPreferences = { KEY, readSnapshot, apply, readSaved, writeSaved };
})();