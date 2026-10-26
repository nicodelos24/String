// Render de la escala y del mástil (T-01, paso 4).
//
// Hasta esta ronda el dibujo del mástil vivía en `app.js`, mezclado con el
// estado, los controles y la persistencia. Acá quedan las funciones que pintan
// la escala dibujada y el resto del mástil —las dos zonas que separan los
// botones VER y MÁSTIL— y las que deciden qué dice cada posición: el nombre de
// la nota según la armadura, el grado, el color del intervalo y el resaltado
// del modo de visualización.
//
// El módulo no declara estado ni escucha eventos: lee los globales de
// `app-state.js` (root, selectedMode, verLevel, …) y del modelo
// (`music-model.js`), y solo escribe el DOM cuando `app.js` lo llama. Por eso
// se puede cargar sin `document` y no pinta nada al cargarse. `index.html` lo
// carga después de `note-ink.js` y antes de `app.js`.

function displayNote(index) {
  const name = noteName(index);

  // Si es la raíz, usar el nombre exacto seleccionado por el usuario
  if (index === root && rootNoteName) {
    return rootNoteName;
  }

  // Obtener la armadura de clave actual; con la vista pentatónica se usa la referencia de la pentatónica
  const keySignature = calculateKeySignature(viewMode(), root, rootNoteName);

  // Determinar si usar bemoles o sostenidos según la armadura
  let useFlats = keySignature.flats > 0;
  let useSharps = keySignature.sharps > 0;

  // Si es natural (C Mayor), usar sostenidos por defecto
  if (keySignature.flats === 0 && keySignature.sharps === 0) {
    useSharps = true;
  }

  // Convertir la nota según la armadura
  if (useFlats && sharpToFlat[name]) {
    return sharpToFlat[name];
  } else if (useSharps && flatToSharp[name]) {
    return flatToSharp[name];
  }

  return name;
}
function getIntervalClass(interval, modeKey = selectedMode) {
  const normalized = ((interval % 12) + 12) % 12;
  if (normalized === 6 && modeKey === 'lydian') {
    return alteredIntervalColors.augmentedFourth;
  }
  if (normalized === 8 && chordType.value === 'aug') {
    return alteredIntervalColors.augmentedFifth;
  }
  return intervalColors[normalized];
}

// Función para determinar si un intervalo debe ser coloreado según el modo de visualización
function shouldHighlightInterval(interval, displayModeIndex) {
  if(pentatonicView){
    const notes=modes[pentatonicMode()].intervals;
    const note=interval%12;
    if(!notes.includes(note))return false;
    if(displayModeIndex===0)return true;
    const chordNotes=pentatonicMode()==='minorPentatonic'?[0,3,7]:[0,4,7];
    if(displayModeIndex===2 || displayModeIndex===4)chordNotes.push(10,11);
    return chordNotes.includes(note);
  }
  const normalized = interval % 12;
  const displayMode = displayModes[displayModeIndex];

  switch (displayMode) {
    case 'modeChord':
    case 'modeSeventh': {
      // La triada/septima es del modo dibujado: con la tonalidad de la
      // canción fijada, viewMode() devuelve el modo inferido del contrato.
      const intervals=modes[viewMode()].intervals;
      if(intervals.length!==7)return false;
      const degrees=displayMode==='modeChord'?[0,2,4]:[0,2,4,6];
      return degrees.some(degree=>intervals[degree]===normalized);
    }
    case 'triad':
      // Intervalos de la triada actual, incluida la quinta disminuida.
      return chordType.intervals.slice(0, 3).includes(normalized);
    case 'seventh':
      // Raíz (0), 3ra menor (3), 3ra mayor (4), 5ta justa (7), 7ma menor (10), 7ma mayor (11)
      return chordType.intervals.includes(normalized) || [10, 11].includes(normalized);
    case 'full':
    default:
      // Todos los intervalos
      return true;
  }
}

function getDegreeLabel(interval, modeKey = selectedMode) {
  const normalized = ((interval % 12) + 12) % 12;
  if (normalized === 6 && modeKey === 'lydian') return '♯4';
  if (normalized === 8 && chordType.value === 'aug') return '♯5';
  return ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'][normalized];
}

// Las notas que MÁSTIL escribe fuera de la escala se nombran con el switch
// ♯/♭, no con la armadura de la escala: así el mástil entero se lee con la
// misma grafía que el switch. La escala dibujada sigue la armadura, que es lo
// que corresponde a cada modo.
function displayNoteSpelled(index) {
  const name = noteName(index);
  if (pianoUseFlats) return sharpToFlat[name] || name;
  return flatToSharp[name] || name;
}

// Una sola función decide el rótulo de cada nota, y cada nota solo depende de
// su botón: las de la escala de VER y las de fuera del mástil de MÁSTIL.
function getFretLabel(pitchClass, interval, inScaleZone) {
  if (inScaleZone) {
    if (verLevel === FRET_OFF) return '';
    if (verLevel === FRET_DEGREES) return getDegreeLabel(interval);
    return displayNote(pitchClass);
  }
  if (mastilScope === FRET_OFF) return '';
  if (mastilScope === FRET_DEGREES) return getDegreeLabel(interval);
  return displayNoteSpelled(pitchClass);
}

function renderFretboard() {
  renderOpenStrings();
  const inst = instruments[instrument];
  const scaleNotes = new Set(selectedTonality.scaleNotes);
  const chordIntervals = new Set(chordType.intervals);

  // Calcular notas del modo dibujado. Con la tonalidad de la canción fijada,
  // ese modo es el inferido por el contrato T-44 (ver viewMode).
  const selectedModeNotes = new Set(getModeNotes(viewMode(), root));

  // Crear mapa de notas fantasmas con sus colores (solo si hay un modo fantasma seleccionado)
  const ghostNotesMap = new Map();
  if (!pentatonicView && ghostMode && ghostMode !== selectedMode) {
    const modeNotes = getModeNotes(ghostMode, root);
    const modeColor = modes[ghostMode].color;
    modeNotes.forEach(note => {
      if (!ghostNotesMap.has(note)) {
        ghostNotesMap.set(note, modeColor);
      }
    });
  }

  // Generar números de traste (1-22)
  const fretColumns = Array.from({ length: 22 }, (_, i) => `${Math.pow(2, -i / 24).toFixed(6)}fr`).join(' ');
  document.querySelector('.fretboard-layout').style.setProperty('--fret-columns', fretColumns);
  const fretNumbers = Array.from({ length: 22 }, (_, i) => `<div class="${i === 11 ? 'octave-number' : ''}">${i + 1}</div>`).join('');
  document.querySelector('#fret-numbers').innerHTML = fretNumbers;

  // Invertir orden de cuerdas (de más aguda a más grave)
  const rows = inst.strings.slice().reverse().map((openNote, reversedIdx) => {
    const stringIndex = inst.strings.length - 1 - reversedIdx;
    const frets = Array.from({ length: 22 }, (_, fret) => {
      const actualFret = fret + 1; // Trastes 1-22
      const pitch = openNote + actualFret;
      const pitchClass = pitch % 12;
      const inScale = scaleNotes.has(pitchClass);
      const isRoot = pitchClass === root;
      const intervalFromRoot = (pitchClass - root + 12) % 12;
      const inChord = chordIntervals.has(intervalFromRoot);
      const inSelectedMode = selectedModeNotes.has(pitchClass);

      // Con tonalidad de canción fijada, el rótulo y el color salen de su
      // tónica (qué grado es esta nota EN LA CANCIÓN); sin ella es el mismo
      // intervalo de la raíz de siempre. El resaltado y el modo ya decididos
      // arriba siguen mirando a la tarjeta.
      const songTonicPitch = songTonic();
      const intervalForLabel = songTonicPitch === null ? intervalFromRoot : (pitchClass - songTonicPitch + 12) % 12;
      const intervalInfo = getIntervalClass(intervalForLabel, !inSelectedMode && ghostNotesMap.has(pitchClass) ? ghostMode : viewMode());

      // Determinar color de fondo y clase CSS
      let bgColor;
      let textColor;
      let noteClass = 'fret-note';

      // Verificar si el intervalo debe ser resaltado según el modo de visualización
      const shouldHighlight = shouldHighlightInterval(intervalFromRoot, displayModeIndex);

      // La tinta sale del relleno, no de la clase: note-ink.js elige la de más
      // contraste y así todo relleno de la tabla llega a AA (T-36, línea 2).
      if (isRoot) {
        bgColor = intervalInfo.color;
        // Raíz y nota del acorde piden la tinta suave: el autor las quiere
        // resaltadas, pero sin el negro pleno que le rompía la vista (A-33).
        textColor = NoteInk.inkOverFill(bgColor, { soft: true });
        noteClass += ' root-note scale-note';
      } else if (inChord && shouldHighlight) {
        bgColor = intervalInfo.color;
        textColor = NoteInk.inkOverFill(bgColor, { soft: true });
        noteClass += ' chord-note scale-note';
      } else if (inSelectedMode && shouldHighlight) {
        bgColor = intervalInfo.color;
        textColor = NoteInk.inkOverFill(bgColor);
        noteClass += ' scale-note';
      } else if (inSelectedMode && !shouldHighlight) {
        // Nota de la escala pero no resaltada en este modo - gris
        bgColor = '#bbb';
        textColor = NoteInk.inkOverFill(bgColor);
        noteClass += ' scale-note';
      } else if (ghostNotesMap.has(pitchClass) && displayModeIndex < 3) {
        // Nota fantasma de otro modo
        bgColor = ghostNotesMap.get(pitchClass);
        textColor = 'rgba(29, 37, 33, 0.5)';
        noteClass += ' ghost-note';
      } else {
        bgColor = 'transparent';
        textColor = '#999';
      }



      // La zona de VER: la escala dibujada. Con la pentatónica apagada también
      // entran las notas del acorde que quedan fuera de la escala.
      const inScaleZone = inSelectedMode || (!pentatonicView && (isRoot || inChord));

      // El halo de la nota que suena va al revés de la tinta (style.css). Como
      // la tinta ya no la decide la clase, la polaridad viaja con la clase que
      // escribe este render —`ink-dark` pide halo claro e `ink-light`, oscuro—
      // y la decide la luminancia, que también funciona con la tinta suave del
      // énfasis (A-33).
      const shadowClass = NoteInk.inkShadowClass(bgColor, textColor);
      const inkClass = shadowClass ? ` ${shadowClass}` : '';

      // El color que ya decidió getIntervalClass para esta posición se queda
      // escrito en la posición (`data-interval-color`): es de donde lee el
      // micrófono al tintar la nota que suena, sin una tabla propia (T-21).
      return `<div class="fret"><span class="${noteClass}${inkClass}" data-midi="${openNote + actualFret}" data-note="${displayNote(pitchClass)}" data-interval="${intervalInfo.name}" data-interval-color="${intervalInfo.color}" style="background-color: ${bgColor}; color: ${textColor};${displayModeIndex >= 3 && !shouldHighlight ? ' opacity: 0;' : ''}" title="${displayNote(pitchClass)} · ${intervalInfo.name}">${getFretLabel(pitchClass, intervalForLabel, inScaleZone)}</span></div>`;
    }).join('');
    return `<div class="string-row" style="--string-width: ${stringIndex < (instrument === 'guitar' ? 3 : 2) ? 2 : 1}px">${frets}</div>`;
  }).join('');
  const inlays = Array.from({ length: 22 }, (_, i) => {
    const fret = i + 1;
    const marker = fret === 12
      ? '<span class="inlay-dot inlay-triple-top"></span><span class="inlay-dot"></span><span class="inlay-dot inlay-triple-bottom"></span>'
      : [3, 5, 7, 9, 15, 17, 19, 21].includes(fret) ? '<span class="inlay-dot"></span>' : '';
    return `<div class="inlay-cell ${fret === 12 ? 'octave-inlay' : ''}">${marker}</div>`;
  }).join('');
  fretboard.innerHTML = `<div class="fret-inlays" aria-hidden="true">${inlays}</div>${rows}`;
}
function renderOpenStrings() {
  const inst = instruments[instrument];
  const scaleNotes = new Set(selectedTonality.scaleNotes);
  const chordIntervals = new Set(chordType.intervals);

  // Calcular notas del modo dibujado. Con la tonalidad de la canción fijada,
  // ese modo es el inferido por el contrato T-44 (ver viewMode).
  const selectedModeNotes = new Set(getModeNotes(viewMode(), root));

  // Crear mapa de notas fantasmas con sus colores (solo si hay un modo fantasma seleccionado)
  const ghostNotesMap = new Map();
  if (!pentatonicView && ghostMode && ghostMode !== selectedMode) {
    const modeNotes = getModeNotes(ghostMode, root);
    const modeColor = modes[ghostMode].color;
    modeNotes.forEach(note => {
      if (!ghostNotesMap.has(note)) {
        ghostNotesMap.set(note, modeColor);
      }
    });
  }

  const openStringsHtml =
    inst.strings.slice().reverse().map((openNote, reversedIdx) => {
      const pitchClass = openNote % 12;
      const inScale = scaleNotes.has(pitchClass);
      const isRoot = pitchClass === root;
      const intervalFromRoot = (pitchClass - root + 12) % 12;
      const inChord = chordIntervals.has(intervalFromRoot);
      const inSelectedMode = selectedModeNotes.has(pitchClass);
      // Con tonalidad de canción fijada, el rótulo y el color salen de su
      // tónica, igual que en el mástil (ver renderFretboard).
      const songTonicPitch = songTonic();
      const intervalForLabel = songTonicPitch === null ? intervalFromRoot : (pitchClass - songTonicPitch + 12) % 12;
      const intervalInfo = getIntervalClass(intervalForLabel, !inSelectedMode && ghostNotesMap.has(pitchClass) ? ghostMode : viewMode());

      let bgColor;
      let textColor;
      let noteClass = 'open-string-note';

      // Verificar si el intervalo debe ser resaltado según el modo de visualización
      const shouldHighlight = shouldHighlightInterval(intervalFromRoot, displayModeIndex);

      // La tinta sale del relleno, no de la clase: note-ink.js elige la de más
      // contraste y así todo relleno de la tabla llega a AA (T-36, línea 2).
      if (isRoot) {
        bgColor = intervalInfo.color;
        // Raíz y nota del acorde piden la tinta suave: el autor las quiere
        // resaltadas, pero sin el negro pleno que le rompía la vista (A-33).
        textColor = NoteInk.inkOverFill(bgColor, { soft: true });
        noteClass += ' root-note scale-note';
      } else if (inChord && shouldHighlight) {
        bgColor = intervalInfo.color;
        textColor = NoteInk.inkOverFill(bgColor, { soft: true });
        noteClass += ' chord-note scale-note';
      } else if (inSelectedMode && shouldHighlight) {
        bgColor = intervalInfo.color;
        textColor = NoteInk.inkOverFill(bgColor);
        noteClass += ' scale-note';
      } else if (inSelectedMode && !shouldHighlight) {
        // Nota de la escala pero no resaltada en este modo - gris
        bgColor = '#bbb';
        textColor = NoteInk.inkOverFill(bgColor);
        noteClass += ' scale-note';
      } else if (ghostNotesMap.has(pitchClass) && displayModeIndex < 3) {
        // Nota fantasma de otro modo
        bgColor = ghostNotesMap.get(pitchClass);
        textColor = 'rgba(29, 37, 33, 0.5)';
        noteClass += ' ghost-note';
      } else {
        bgColor = 'transparent';
        textColor = '#1d2521';
      }



      // La zona de VER: la escala dibujada (ver renderFretboard).
      const inScaleZone = inSelectedMode || (!pentatonicView && (isRoot || inChord));

      // La polaridad del halo, igual que en el mástil (ver renderFretboard).
      const shadowClass = NoteInk.inkShadowClass(bgColor, textColor);
      const inkClass = shadowClass ? ` ${shadowClass}` : '';

      // `data-interval-color` igual que en renderFretboard: el color que el
      // mástil ya decidió para la posición, de donde lee el micrófono (T-21).
      return `<div class="open-string-row"><span class="${noteClass}${inkClass}" data-midi="${openNote}" data-note="${displayNote(pitchClass)}" data-interval="${intervalInfo.name}" data-interval-color="${intervalInfo.color}" style="background-color: ${bgColor}; color: ${textColor};${displayModeIndex >= 3 && !shouldHighlight ? ' opacity: 0;' : ''}" title="${displayNote(pitchClass)} · ${intervalInfo.name}">${getFretLabel(pitchClass, intervalForLabel, inScaleZone)}</span></div>`;
    }).join('');

  document.querySelector('#open-strings').innerHTML = openStringsHtml;
}

// Los dos botones del pie responden a preguntas distintas y no se cruzan:
//   VER     -> qué pone en cada nota de la escala dibujada: nada, notas o grados.
//   MÁSTIL  -> qué pone en el resto del mástil, lo que no es la escala:
//              nada, notas o grados.
// Los dos botones se leen igual: el nombre va fijo en el HTML («AA» y «MÁSTIL»)
// y el `span` de dentro lleva la fase, que es lo único que cambia. Con el
// botón apagado el `span` queda vacío y solo se ve el nombre, que es la forma
// de decir que no está escribiendo nada. El resalte separa la fase apagada de
// las otras dos, que son las que se ven distinto de lo de siempre.
const VER_LABELS = ['NOTAS', 'notas', 'grados'];
const MASTIL_LABELS = ['', 'notas', 'grados'];
// El nombre visible de cada botón, que el `aria-label` tiene que contener.
const VER_PREFIX = 'AA', MASTIL_PREFIX = 'MÁSTIL';
// Lo que se lee en voz alta, que no es lo mismo que lo que se ve: en pantalla
// «AA» a secas no diría que el botón está apagado.
const VER_SPOKEN = ['apagado: no escribe nada en la escala', 'el nombre de la nota', 'el grado dentro de la escala'];
const MASTIL_SPOKEN = ['apagado: nada fuera de la escala', 'el nombre de la nota', 'el grado dentro de la escala'];
const VER_HELP = 'Qué pone en cada nota de la escala dibujada: el nombre de la nota, el grado dentro de la escala o nada.';
const MASTIL_HELP = 'Qué pone en el resto del mástil, fuera de la escala: nada, el nombre de la nota o su grado. En modo notas se escriben con el switch de bemoles o sostenidos.';
// El nombre accesible tiene que contener el texto que se ve (criterio «Label in
// Name»), así que se arma con el rótulo de la fase y no con una palabra
// inventada; por eso la fase apagada, que no tiene palabra, pone solo el nombre.
const fretLabel = (prefix, word, spoken, help) =>
  prefix + (word ? ' ' + word : '') + ': ' + spoken + '. Clic para cambiar. ' + help;

function paintFretLabelButtons() {
  const ver = document.querySelector('#toggle-notes'), mastil = document.querySelector('#toggle-degrees');
  const verText = VER_LABELS[verLevel], mastilText = MASTIL_LABELS[mastilScope];
  ver.querySelector('span').textContent = verText;
  mastil.querySelector('span').textContent = mastilText;
  ver.setAttribute('aria-pressed', String(verLevel !== FRET_OFF));
  mastil.setAttribute('aria-pressed', String(mastilScope !== FRET_OFF));
  ver.setAttribute('aria-label', fretLabel(VER_PREFIX, verText, VER_SPOKEN[verLevel], VER_HELP));
  mastil.setAttribute('aria-label', fretLabel(MASTIL_PREFIX, mastilText, MASTIL_SPOKEN[mastilScope], MASTIL_HELP));
  ver.title = VER_HELP;
  mastil.title = MASTIL_HELP;
}
