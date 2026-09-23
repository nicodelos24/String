const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteLabels = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };

const instruments = {
  guitar: { name: 'Guitarra', strings: [40, 45, 50, 55, 59, 64], stringNames: ['E', 'A', 'D', 'G', 'B', 'e'] },
  bass: { name: 'Bajo', strings: [28, 33, 38, 43], stringNames: ['E', 'A', 'D', 'G'] }
};

const tonalities = [
  { sharps: 0, flats: 0, key: 'C', scale: 'major', scaleNotes: [0, 2, 4, 5, 7, 9, 11] },
  { sharps: 1, flats: 0, key: 'G', scale: 'major', scaleNotes: [7, 9, 11, 0, 2, 4, 6] },
  { sharps: 2, flats: 0, key: 'D', scale: 'major', scaleNotes: [2, 4, 6, 7, 9, 11, 1] },
  { sharps: 3, flats: 0, key: 'A', scale: 'major', scaleNotes: [9, 11, 1, 2, 4, 6, 8] },
  { sharps: 4, flats: 0, key: 'E', scale: 'major', scaleNotes: [4, 6, 8, 9, 11, 1, 3] },
  { sharps: 5, flats: 0, key: 'B', scale: 'major', scaleNotes: [11, 1, 3, 4, 6, 8, 10] },
  { sharps: 6, flats: 0, key: 'F#', scale: 'major', scaleNotes: [6, 8, 10, 11, 1, 3, 5] },
  { sharps: 7, flats: 0, key: 'C#', scale: 'major', scaleNotes: [1, 3, 5, 6, 8, 10, 0] },
  { sharps: 0, flats: 1, key: 'F', scale: 'major', scaleNotes: [5, 7, 9, 10, 0, 2, 4] },
  { sharps: 0, flats: 2, key: 'Bb', scale: 'major', scaleNotes: [10, 0, 2, 3, 5, 7, 9] },
  { sharps: 0, flats: 3, key: 'Eb', scale: 'major', scaleNotes: [3, 5, 7, 8, 10, 0, 2] },
  { sharps: 0, flats: 4, key: 'Ab', scale: 'major', scaleNotes: [8, 10, 0, 1, 3, 5, 7] },
  { sharps: 0, flats: 5, key: 'Db', scale: 'major', scaleNotes: [1, 3, 5, 6, 8, 10, 0] },
  { sharps: 0, flats: 6, key: 'Gb', scale: 'major', scaleNotes: [6, 8, 10, 11, 1, 3, 5] },
  { sharps: 0, flats: 7, key: 'Cb', scale: 'major', scaleNotes: [11, 1, 3, 4, 6, 8, 10] },
];

const scales = {
  majorPentatonic: { name: 'Pentatónica mayor', intervals: [0, 2, 4, 7, 9], description: 'Sonido abierto y directo. Un gran punto de partida.' },
  minorPentatonic: { name: 'Pentatónica menor', intervals: [0, 3, 5, 7, 10], description: 'La voz clásica del blues, rock y soul.' },
  dorian: { name: 'Dórica', intervals: [0, 2, 3, 5, 7, 9, 10], description: 'Menor con un brillo modal y mucho movimiento.' },
  mixolydian: { name: 'Mixolidia', intervals: [0, 2, 4, 5, 7, 9, 10], description: 'Dominante, luminosa y con actitud de rock.' },
  major: { name: 'Mayor (Jónica)', intervals: [0, 2, 4, 5, 7, 9, 11], description: 'La escala completa para resolver en la tónica.' },
  minor: { name: 'Menor natural (Eólica)', intervals: [0, 2, 3, 5, 7, 8, 10], description: 'Color menor profundo y familiar.' }
};

// Modos con sus intervalos, colores y sus grados en la escala mayor (en semitonos)
const modes = {
  // Modos mayores (grados I, IV, V de la escala mayor)
  ionian: { 
    name: 'Jónico (I)', 
    type: 'major',
    degree: 0, // Grado I (tónica) - 0 semitonos
    intervals: [0, 2, 4, 5, 7, 9, 11], 
    color: 'rgba(63, 81, 181, 0.35)', // Azul más transparente
    description: 'Escala mayor natural'
  },
  lydian: { 
    name: 'Lidio (IV)', 
    type: 'major',
    degree: 5, // Grado IV (subdominante) - 5 semitonos
    intervals: [0, 2, 4, 6, 7, 9, 11], 
    color: 'rgba(0, 188, 212, 0.35)', // Cyan más transparente
    description: 'Mayor con 4ª aumentada'
  },
  mixolydian: { 
    name: 'Mixolidio (V)', 
    type: 'major',
    degree: 7, // Grado V (dominante) - 7 semitonos
    intervals: [0, 2, 4, 5, 7, 9, 10], 
    color: 'rgba(76, 175, 80, 0.35)', // Verde más transparente
    description: 'Dominante con 7ª menor'
  },
  // Modos menores (grados ii, iii, vi, vii de la escala mayor)
  dorian: { 
    name: 'Dórico (ii)', 
    type: 'minor',
    degree: 2, // Grado ii - 2 semitonos
    intervals: [0, 2, 3, 5, 7, 9, 10], 
    color: 'rgba(255, 152, 0, 0.35)', // Naranja más transparente
    description: 'Menor con 6ª mayor'
  },
  phrygian: { 
    name: 'Frigio (iii)', 
    type: 'minor',
    degree: 4, // Grado iii - 4 semitonos
    intervals: [0, 1, 3, 5, 7, 8, 10], 
    color: 'rgba(244, 67, 54, 0.35)', // Rojo más transparente
    description: 'Menor con 2ª menor'
  },
  aeolian: { 
    name: 'Eólico (vi)', 
    type: 'minor',
    degree: 9, // Grado vi (relativo menor) - 9 semitonos
    intervals: [0, 2, 3, 5, 7, 8, 10], 
    color: 'rgba(156, 39, 176, 0.35)', // Púrpura más transparente
    description: 'Escala menor natural'
  },
  locrian: { 
    name: 'Locrio (vii°)', 
    type: 'minor',
    degree: 11, // Grado vii - 11 semitonos
    intervals: [0, 1, 3, 5, 6, 8, 10], 
    color: 'rgba(96, 125, 139, 0.35)', // Gris azulado más transparente
    description: 'Menor con 5ª disminuida'
  },
  // Escalas pentatónicas (disponibles para cualquier calidad)
  majorPentatonic: { 
    name: 'Pentatónica mayor', 
    type: 'both', // Disponible para ambas calidades
    degree: 0, // Se basa en la tónica
    intervals: [0, 2, 4, 7, 9], 
    color: 'rgba(255, 193, 7, 0.35)', // Amarillo dorado más transparente
    description: 'Sonido abierto y directo. Un gran punto de partida.'
  },
  minorPentatonic: { 
    name: 'Pentatónica menor', 
    type: 'both', // Disponible para ambas calidades
    degree: 0, // Se basa en la tónica
    intervals: [0, 3, 5, 7, 10], 
    color: 'rgba(255, 87, 34, 0.35)', // Naranja rojizo más transparente
    description: 'La voz clásica del blues, rock y soul.'
  }
};

const chordTypes = [
  { value: 'maj', label: 'Mayor', suffix: '', intervals: [0, 4, 7] },
  { value: 'maj7', label: 'Mayor 7', suffix: 'maj7', intervals: [0, 4, 7, 11] },
  { value: 'maj9', label: 'Mayor 9', suffix: 'maj9', intervals: [0, 4, 7, 11, 2] },
  { value: 'm', label: 'Menor', suffix: 'm', intervals: [0, 3, 7] },
  { value: 'm7', label: 'Menor 7', suffix: 'm7', intervals: [0, 3, 7, 10] },
  { value: 'm9', label: 'Menor 9', suffix: 'm9', intervals: [0, 3, 7, 10, 2] },
  { value: 'dim', label: 'Disminuido', suffix: 'dim', intervals: [0, 3, 6] },
  { value: 'dim7', label: 'Disminuido 7', suffix: 'dim7', intervals: [0, 3, 6, 9] },
  { value: 'aug', label: 'Aumentado', suffix: 'aug', intervals: [0, 4, 8] },
  { value: '7', label: 'Dominante 7', suffix: '7', intervals: [0, 4, 7, 10] },
  { value: '7sus4', label: 'Dom 7sus4', suffix: '7sus4', intervals: [0, 5, 7, 10] },
  { value: 'm7b5', label: 'Semidisminuido', suffix: 'm7♭5', intervals: [0, 3, 6, 10] },
  { value: '6', label: 'Sexta', suffix: '6', intervals: [0, 4, 7, 9] },
  { value: 'm6', label: 'Menor sexta', suffix: 'm6', intervals: [0, 3, 7, 9] },
  { value: 'add9', label: 'Novena añadida', suffix: 'add9', intervals: [0, 4, 7, 2] },
  { value: '6/9', label: 'Novenas 6/9', suffix: '6/9', intervals: [0, 4, 7, 9, 2] },
  { value: '9', label: 'Novena', suffix: '9', intervals: [0, 4, 7, 10, 2] },
  { value: 'sus2', label: 'Suspendido 2', suffix: 'sus2', intervals: [0, 2, 7] },
  { value: 'sus4', label: 'Suspendido 4', suffix: 'sus4', intervals: [0, 5, 7] },
];

// Calidades para el nuevo flujo de selección
const qualities = {
  major: { 
    label: 'Mayor', 
    modes: ['ionian', 'lydian', 'mixolydian', 'majorPentatonic', 'minorPentatonic'],
    defaultMode: 'ionian'
  },
  minor: { 
    label: 'Menor', 
    modes: ['dorian', 'aeolian', 'phrygian', 'majorPentatonic', 'minorPentatonic'],
    defaultMode: 'aeolian'
  },
  diminished: { 
    label: 'Disminuido', 
    modes: ['locrian', 'majorPentatonic', 'minorPentatonic'],
    defaultMode: 'locrian'
  }
};

const intervalColors = {
  0: { name: 'Raíz', color: '#E53935' },
  1: { name: '2ª menor / 9ª menor', color: '#26A6BC' },
  2: { name: '2ª mayor / 9ª mayor', color: '#00BCD4' },
  3: { name: '3ª menor', color: '#66BB6A' },
  4: { name: '3ª mayor', color: '#4CAF50' },
  5: { name: '4ª justa / 11ª', color: '#00897B' },
  6: { name: '5ª disminuida', color: '#C9A227' },
  7: { name: '5ª justa', color: '#E6B800' },
  8: { name: '6ª menor / 13ª menor', color: '#EF8700' },
  9: { name: '6ª mayor / 13ª mayor', color: '#FF9800' },
  10: { name: '7ª menor', color: '#9C27B0' },
  11: { name: '7ª mayor', color: '#AB47BC' },
};

// Variantes enarmónicas: el mismo semitono puede cumplir otra función.
const alteredIntervalColors = {
  augmentedFourth: { name: '4ª aumentada / 11ª aumentada', color: '#26A69A' },
  augmentedFifth: { name: '5ª aumentada', color: '#F0C83D' },
};

Object.values({ ...intervalColors, ...alteredIntervalColors }).forEach(interval => {
  interval.rgb = interval.color.match(/[a-f0-9]{2}/gi).map(value => parseInt(value, 16));
});

let instrument = 'guitar';
let selectedTonality = tonalities[0]; // Escala global base
let root = 0; // Raíz del acorde (índice)
let rootNoteName = 'C'; // Nombre específico de la nota seleccionada por el usuario
let quality = 'major'; // Calidad seleccionada (mayor, minor, diminished)
let selectedMode = 'ionian'; // Modo seleccionado por defecto
let chordType = chordTypes[0]; // Tipo de acorde específico (para compatibility)
let progression = [{ root: 0, type: 'maj' }, { root: 5, type: 'm7' }, { root: 7, type: '7' }, { root: 0, type: 'maj' }];
const initialProgression=progression;
const initialProgressionSnapshot=JSON.stringify(progression);
let progressionEdited=false;
const customProgressionKey='traste.customProgression.v1';
function saveCustomProgression(){
  if(typeof localStorage==='undefined')return;
  try{
    localStorage.setItem(customProgressionKey, JSON.stringify(progression.map(item=>({
      root:item.root,
      rootNoteName:item.rootNoteName||undefined,
      type:item.type,
      mode:item.mode,
      beats:validBeats(item.beats)
    }))));
  }catch{/* Sin almacenamiento: la opción «Mi progresión» usa la progresión actual. */}
}
let selectedFretMidi=null;
let activeProgression = 0;
let playingProgressionItem = null;
let draggingProgressionItem = null;
let degreeDisplay = 0; // 0 = sin grados, 1 = escala, 2 = todo el mastil
let showNotes = 1; // 0 = sin notas, 1 = solo notas de escala, 2 = todas las notas
let displayModeIndex = 1; // 0 = grados completos, 1 = raíz, 3ra, 5ta, 2 = raíz, 3ra, 5ta, 7ma
const displayModes = ['full', 'triad', 'seventh', 'modeChord', 'modeSeventh'];
const displayModeLabels = ['grados', 'tríada', '7ma', 'Acorde', 'Acorde 7ma'];
let ghostMode = ''; // Modo fantasma seleccionado (vacío = ninguno)

// Inicializar el tipo de acorde según la calidad
if (quality === 'major') chordType = chordTypes[0]; // Mayor
else if (quality === 'minor') chordType = chordTypes[3]; // Menor
else if (quality === 'diminished') chordType = chordTypes[6]; // Disminuido

function noteToIndex(noteName) {
  const cleaned = noteName.replace(' ', '');
  // Buscar en notas naturales
  const idx = notes.indexOf(cleaned);
  if (idx >= 0) return idx;
  // Buscar en etiquetas (bemoles)
  for (let i = 0; i < notes.length; i++) {
    if (noteLabels[notes[i]] === cleaned) return i;
  }
  // Manejar casos especiales para notas enarmónicas extendidas
  if (cleaned === 'Cb') return 11; // Cb = B
  if (cleaned === 'C#') return 1;
  if (cleaned === 'Db') return 1;
  return 0;
}

const rootSelect = document.querySelector('#root-select');
const qualitySelect = document.querySelector('#quality-select');
const instrumentSelect = document.querySelector('#instrument-select');
const fretboard = document.querySelector('#fretboard');
const modeSelector = document.querySelector('#mode-selector');

function noteName(index) { return notes[(index + 12) % 12]; }

// Mapa de conversiones entre sostenidos y bemoles
const sharpToFlat = {
  'C#': 'Db',
  'D#': 'Eb', 
  'F#': 'Gb',
  'G#': 'Ab',
  'A#': 'Bb'
};

const flatToSharp = {
  'Db': 'C#',
  'Eb': 'D#',
  'Gb': 'F#',
  'Ab': 'G#',
  'Bb': 'A#'
};

function displayNote(index) { 
  const name = noteName(index); 

  // Si es la raíz, usar el nombre exacto seleccionado por el usuario
  if (index === root && rootNoteName) {
    return rootNoteName;
  }

  // Obtener la armadura de clave actual; con la vista pentatónica se usa la referencia de la pentatónica
  const keySignature = calculateKeySignature(viewMode(), root);

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

function renderIntervalLegend() {
  const entries = [
    ...Object.values(intervalColors).slice(0, 6),
    alteredIntervalColors.augmentedFourth,
    intervalColors[6], intervalColors[7], alteredIntervalColors.augmentedFifth,
    ...Object.values(intervalColors).slice(8),
    { name: 'Nota de escala sin resaltar', color: '#bbb' },
  ];
  document.querySelector('#interval-legend').innerHTML = entries.map(interval => `
    <div class="legend-item">
      <span class="legend-dot" style="background-color: ${interval.color};"></span>
      <span class="legend-label">${interval.name}</span>
    </div>
  `).join('');
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
      const intervals=modes[selectedMode].intervals;
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

// Función para calcular las notas de un modo de manera congruente
function getModeNotes(modeKey, rootNote) {
  const mode = modes[modeKey];
  if (!mode) return [];

  // Para pentatónicas (type: 'both'), calcular notas directamente desde la raíz
  if (mode.type === 'both') {
    return mode.intervals.map(interval => (rootNote + interval) % 12);
  }

  // Encontrar la tonalidad mayor donde esta raíz es el grado correcto
  // Para un modo con grado X, la tónica de la escala mayor es: raíz - X
  const majorRoot = (rootNote - mode.degree + 12) % 12;

  // Calcular las notas de la escala mayor desde esa tónica
  const majorScale = [0, 2, 4, 5, 7, 9, 11].map(interval => (majorRoot + interval) % 12);

  // Las notas del modo son las mismas notas de la escala mayor
  return majorScale;
}

// Función para obtener modos disponibles según la calidad
function getAvailableModes(qualityValue) {
  return qualities[qualityValue]?.modes || [];
}

// Función para encontrar el modo más cercano para una raíz en una tonalidad dada
function findClosestMode(targetRoot, majorRoot, qualityValue) {
  const availableModes = getAvailableModes(qualityValue);
  const majorRootIndex = majorRoot;

  // Calcular qué grado de la escala mayor es la raíz objetivo
  const degreeFromMajor = (targetRoot - majorRootIndex + 12) % 12;

  // Encontrar el modo disponible cuyo grado más se acerque
  let closestMode = availableModes[0];
  let minDistance = 12;

  for (const modeKey of availableModes) {
    const mode = modes[modeKey];
    // Para pentatónicas (type: 'both'), usar distancia 0 (siempre aplicable)
    if (mode.type === 'both') {
      const distance = 0;
      if (distance < minDistance) {
        minDistance = distance;
        closestMode = modeKey;
      }
    } else {
      const distance = Math.abs(degreeFromMajor - mode.degree);
      if (distance < minDistance) {
        minDistance = distance;
        closestMode = modeKey;
      }
    }
  }

  return closestMode;
}

// Función para calcular la armadura de clave según modo y nota
function calculateKeySignature(modeKey, rootNote) {
  const mode = modes[modeKey];
  if (!mode) return { sharps: 0, flats: 0, key: 'C' };

  // La pentatónica menor usa como referencia su relativa mayor.
  const degree = modeKey === 'minorPentatonic' ? 9 : mode.degree;
  const majorRoot = (rootNote - degree + 12) % 12;

  // Buscar la tonalidad correspondiente, pero respetar si el usuario seleccionó bemoles o sostenidos
  const matchingTonality = tonalities.find(ton => noteToIndex(ton.key) === majorRoot);

  if (matchingTonality) {
    // Si el usuario seleccionó una nota con bemol (Db, Eb, etc.), priorizar tonalidades con bemoles
    if (rootNoteName && (rootNoteName.includes('b') || rootNoteName === 'Cb')) {
      const flatTonality = tonalities.find(ton => 
        noteToIndex(ton.key) === majorRoot && ton.flats > 0
      );
      if (flatTonality) {
        return {
          sharps: flatTonality.sharps,
          flats: flatTonality.flats,
          key: flatTonality.key
        };
      }
    }
    // Si el usuario seleccionó una nota con sostenido (C#, F#, etc.), priorizar tonalidades con sostenidos
    else if (rootNoteName && (rootNoteName.includes('#') || rootNoteName === 'C#')) {
      const sharpTonality = tonalities.find(ton => 
        noteToIndex(ton.key) === majorRoot && ton.sharps > 0
      );
      if (sharpTonality) {
        return {
          sharps: sharpTonality.sharps,
          flats: sharpTonality.flats,
          key: sharpTonality.key
        };
      }
    }

    return {
      sharps: matchingTonality.sharps,
      flats: matchingTonality.flats,
      key: matchingTonality.key
    };
  }

  return { sharps: 0, flats: 0, key: 'C' };
}
let pianoUseFlats = false;

function renderRootPiano() {
  if (noteLabels[notes[root]]) pianoUseFlats = rootNoteName.includes('b');
  document.querySelector('#selected-root-note').textContent = rootNoteName.replace('#', '♯').replace('b', '♭');
  const whiteKeys = [0, 2, 4, 5, 7, 9, 11];
  const blackKeys = [[1, 1], [3, 2], [6, 4], [8, 5], [10, 6]];
  const key = (pitch, black, position) => {
    const name = notes[pitch];
    const flat = noteLabels[name];
    const label = (pianoUseFlats && flat ? flat : name).replace('#', '♯').replace('b', '♭');
    return `<button type="button" class="piano-key ${black ? 'piano-black' : 'piano-white'}" data-pitch="${pitch}" aria-pressed="${root === pitch}" aria-label="${label}" style="--key-position: ${position}"><span>${label}</span></button>`;
  };
  document.querySelector('#root-piano').innerHTML = whiteKeys.map((pitch, i) => key(pitch, false, i)).join('')
    + blackKeys.map(([pitch, position]) => key(pitch, true, position)).join('');
  document.querySelector('#root-spelling').checked = pianoUseFlats;
}

function choosePianoRoot(pitch, spelling = notes[pitch]) {
  if (!Number.isInteger(pitch) || pitch < 0 || pitch > 11) return;
  root = pitch;
  rootNoteName = spelling;
  activeProgression = -1;
  const index = Array.from(rootSelect.options).findIndex(option => option.dataset.note === spelling);
  if (index >= 0) rootSelect.selectedIndex = index;
  updateView();
}

document.querySelector('#root-piano').addEventListener('click', event => {
  const key = event.target.closest('[data-pitch]');
  if (!key) return;
  const pitch = Number(key.dataset.pitch);
  choosePianoRoot(pitch, pianoUseFlats ? noteLabels[notes[pitch]] || notes[pitch] : notes[pitch]);
  document.querySelector('#root-piano').querySelector('[data-pitch="' + pitch + '"]').focus();
});
document.querySelector('#root-spelling').addEventListener('change', event => {
  pianoUseFlats = event.target.checked;
  const spelling = pianoUseFlats ? noteLabels[notes[root]] || notes[root] : notes[root];
  if (spelling !== rootNoteName) choosePianoRoot(root, spelling);
  else renderRootPiano();
});

function populateControls() {
  instrumentSelect.innerHTML = Object.entries(instruments).map(([key, inst]) => `<option value="${key}">${inst.name}</option>`).join('');

  // Agregar todas las notas incluyendo enarmónicas
  const allNotes = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
  const noteIndices = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 
    'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
  };

  rootSelect.innerHTML = allNotes.map(note => 
    `<option value="${noteIndices[note]}" data-note="${note}">${note}</option>`
  ).join('');


  instrumentSelect.value = instrument; rootSelect.value = root;

  const savedNoteIndex = Array.from(rootSelect.options).findIndex(option => option.dataset.note === rootNoteName);
  if (savedNoteIndex >= 0) rootSelect.selectedIndex = savedNoteIndex;

  // Establecer el nombre de la nota raíz seleccionada
  const selectedOption = rootSelect.options[rootSelect.selectedIndex];
  if (selectedOption) {
    rootNoteName = selectedOption.dataset.note || 'C';
  }

  updateModeSelector();
}

function chooseMode(modeKey) {
  if (!getAvailableModes(quality).includes(modeKey)) return;
  selectedMode = modeKey;
  // Elegir una pentatónica activa la vista; elegir un modo vuelve a la vista normal.
  const pentatonicChoice=modeKey==='majorPentatonic'||modeKey==='minorPentatonic';
  pentatonicView=pentatonicChoice;document.querySelector('#pentatonic-view').checked=pentatonicChoice;
  const types = {ionian:'maj7',lydian:'maj7',mixolydian:'7',dorian:'m7',
    phrygian:'m7',aeolian:'m7',locrian:'m7b5'};
  const type = types[modeKey] || ({major:'maj',minor:'m',diminished:'dim'})[quality];
  chordType = chordTypes.find(candidate => candidate.value === type);
  activeProgression = -1;
  updateGhostModeSelector();
  updateView();
}

function updateModeSelector() {
  qualitySelect.innerHTML = Object.entries(qualities).map(([key, qual]) => `
    <label class="mode-option">
      <input type="radio" name="quality" value="${key}" ${quality === key ? 'checked' : ''}>
      <span class="mode-label">${qual.label}</span>
    </label>
  `).join('');
  const availableModes = getAvailableModes(quality);

  // Si el modo actual no está disponible, cambiar al modo por defecto de la calidad
  if (!availableModes.includes(selectedMode)) {
    selectedMode = qualities[quality].defaultMode;
  }

  const groups = [
    { label: 'Modos', keys: availableModes.filter(key => modes[key].type !== 'both') },
    { label: 'Pentatónicas', keys: availableModes.filter(key => modes[key].type === 'both') }
  ];
  modeSelector.innerHTML = groups.map(group => `
    <div class="mode-group" role="group" aria-label="${group.label}">
      <span class="mode-group-title">${group.label}</span>
      <div class="mode-options-row">
        ${group.keys.map(modeKey => `
          <label class="mode-option">
            <input type="radio" name="mode" value="${modeKey}" ${viewMode() === modeKey ? 'checked' : ''}>
            <span class="mode-label">${modes[modeKey].name}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');

  // Agregar event listeners a los nuevos radio buttons
  modeSelector.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('click', (e) => {
      // También permite aplicar la séptima al pulsar el modo ya seleccionado.
      if (e.target.value === selectedMode) chooseMode(e.target.value);
    });
    radio.addEventListener('change', (e) => {
      chooseMode(e.target.value);
    });
  });

  // Actualizar el selector de modo fantasma
  updateGhostModeSelector();
}

function updateGhostModeSelector() {
  const ghostModeSelect = document.querySelector('#ghost-mode-select');
  if (!ghostModeSelect) return;

  const availableModes = getAvailableModes(quality);

  if (ghostMode === selectedMode || !availableModes.includes(ghostMode)) ghostMode = '';

  // Generar opciones: "Ninguna" + todos los modos disponibles excepto el seleccionado
  const options = availableModes
    .filter(modeKey => modeKey !== selectedMode)
    .map(modeKey => {
      const mode = modes[modeKey];
      return `<option value="${modeKey}" ${ghostMode === modeKey ? 'selected' : ''}>${mode.name}</option>`;
    }).join('');

  ghostModeSelect.innerHTML = `<option value="" ${ghostMode === '' ? 'selected' : ''}>Ninguna</option>` + options;
}
function getDegreeLabel(interval, modeKey = selectedMode) {
  const normalized = ((interval % 12) + 12) % 12;
  if (normalized === 6 && modeKey === 'lydian') return '♯4';
  if (normalized === 8 && chordType.value === 'aug') return '♯5';
  return ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'][normalized];
}

function getFretLabel(pitchClass, interval, inSelectedMode, inChord, showNoteName) {
  if (degreeDisplay === 2 || (degreeDisplay === 1 && inSelectedMode)) return getDegreeLabel(interval);
  return showNoteName ? displayNote(pitchClass) : '';
}

let pentatonicView=false;
function pentatonicMode(){
  if(selectedMode==='majorPentatonic'||selectedMode==='minorPentatonic')return selectedMode;
  return chordType.intervals.includes(3)?'minorPentatonic':'majorPentatonic';
}
// Respeta la elección explícita; en modos diatónicos adapta la pentatónica al acorde.
function viewMode(){return pentatonicView?pentatonicMode():selectedMode;}
document.querySelector('#pentatonic-view').addEventListener('change',event=>{pentatonicView=event.target.checked;updateView();});
function renderFretboard() {
  renderOpenStrings();
  const inst = instruments[instrument];
  const scaleNotes = new Set(selectedTonality.scaleNotes);
  const chordIntervals = new Set(chordType.intervals);

  // Calcular notas del modo seleccionado
  const selectedModeNotes = new Set(getModeNotes(pentatonicView?pentatonicMode():selectedMode, root));

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

      const intervalInfo = getIntervalClass(intervalFromRoot, !inSelectedMode && ghostNotesMap.has(pitchClass) ? ghostMode : selectedMode);

      // Determinar color de fondo y clase CSS
      let bgColor;
      let textColor;
      let noteClass = 'fret-note';

      // Verificar si el intervalo debe ser resaltado según el modo de visualización
      const shouldHighlight = shouldHighlightInterval(intervalFromRoot, displayModeIndex);

      if (isRoot) {
        bgColor = intervalInfo.color;
        textColor = '#f3f0e8';
        noteClass += ' root-note scale-note';
      } else if (inChord && shouldHighlight) {
        bgColor = intervalInfo.color;
        textColor = '#f3f0e8';
        noteClass += ' chord-note scale-note';
      } else if (inSelectedMode && shouldHighlight) {
        bgColor = intervalInfo.color;
        textColor = '#1d2521';
        noteClass += ' scale-note';
      } else if (inSelectedMode && !shouldHighlight) {
        // Nota de la escala pero no resaltada en este modo - gris
        bgColor = '#bbb';
        textColor = '#666';
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

      

      // Determinar si mostrar el nombre de la nota según el modo
      let showNoteName = false;
      if (showNotes === 2) {
        // Modo "todas": mostrar todas las notas
        showNoteName = true;
      } else if (showNotes === 1) {
        // Modo "escala": mostrar solo notas de la escala seleccionada
        showNoteName = inSelectedMode || (!pentatonicView && (isRoot || inChord));
      }
      // showNotes === 0: no mostrar ninguna nota

      return `<div class="fret"><span class="${noteClass}" data-midi="${openNote + actualFret}" data-note="${displayNote(pitchClass)}" data-interval="${intervalInfo.name}" style="background-color: ${bgColor}; color: ${textColor};${displayModeIndex >= 3 && !shouldHighlight ? ' opacity: 0;' : ''}" title="${displayNote(pitchClass)} · ${intervalInfo.name}">${getFretLabel(pitchClass, intervalFromRoot, inSelectedMode, inChord, showNoteName)}</span></div>`;
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
  document.querySelector('#note-count').textContent = `${selectedModeNotes.size} notas`;
}
function renderOpenStrings() {
  const inst = instruments[instrument];
  const scaleNotes = new Set(selectedTonality.scaleNotes);
  const chordIntervals = new Set(chordType.intervals);

  // Calcular notas del modo seleccionado
  const selectedModeNotes = new Set(getModeNotes(pentatonicView?pentatonicMode():selectedMode, root));

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
      const intervalInfo = getIntervalClass(intervalFromRoot, !inSelectedMode && ghostNotesMap.has(pitchClass) ? ghostMode : selectedMode);

      let bgColor;
      let textColor;
      let noteClass = 'open-string-note';

      // Verificar si el intervalo debe ser resaltado según el modo de visualización
      const shouldHighlight = shouldHighlightInterval(intervalFromRoot, displayModeIndex);

      if (isRoot) {
        bgColor = '#E53935';
        textColor = '#f3f0e8';
        noteClass += ' root-note scale-note';
      } else if (inChord && shouldHighlight) {
        bgColor = intervalInfo.color;
        textColor = '#f3f0e8';
        noteClass += ' chord-note scale-note';
      } else if (inSelectedMode && shouldHighlight) {
        bgColor = intervalInfo.color;
        textColor = '#1d2521';
        noteClass += ' scale-note';
      } else if (inSelectedMode && !shouldHighlight) {
        // Nota de la escala pero no resaltada en este modo - gris
        bgColor = '#bbb';
        textColor = '#666';
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

      

      // Determinar si mostrar el nombre de la nota según el modo
      let showNoteName = false;
      if (showNotes === 2) {
        // Modo "todas": mostrar todas las notas
        showNoteName = true;
      } else if (showNotes === 1) {
        // Modo "escala": mostrar solo notas de la escala seleccionada
        showNoteName = inSelectedMode || (!pentatonicView && (isRoot || inChord));
      }
      // showNotes === 0: no mostrar ninguna nota

      return `<div class="open-string-row"><span class="${noteClass}" data-midi="${openNote}" data-note="${displayNote(pitchClass)}" data-interval="${intervalInfo.name}" style="background-color: ${bgColor}; color: ${textColor};${displayModeIndex >= 3 && !shouldHighlight ? ' opacity: 0;' : ''}" title="${displayNote(pitchClass)} · ${intervalInfo.name}">${getFretLabel(pitchClass, intervalFromRoot, inSelectedMode, inChord, showNoteName)}</span></div>`;
    }).join('');

  document.querySelector('#open-strings').innerHTML = openStringsHtml;
}
function updateView() {
  const mode = viewMode();
  modeSelector.querySelectorAll('input[name="mode"]').forEach(radio=>{radio.checked=radio.value===mode;});
  if(displayModeIndex>=3 && !pentatonicView && modes[mode].intervals.length!==7)displayModeIndex=1;
  document.querySelector('#display-label').textContent=displayModeLabels[displayModeIndex];
  renderRootPiano();
  const selectedModeData = modes[mode];

  // Calcular la armadura de clave según el modo efectivo (la pentatónica tiene su propia referencia)
  const keySignature = calculateKeySignature(mode, root);

  const chordSuffix = chordType.suffix;

  // Actualizar la tonalidad global basada en el modo seleccionado
  const matchingTonality = tonalities.find(ton => ton.key === keySignature.key);
  if (matchingTonality) {
    selectedTonality = matchingTonality;
  }

  // Mostrar la armadura de clave calculada
  const keySignatureText = keySignature.sharps > 0 
    ? `${keySignature.sharps} sostenidos` 
    : keySignature.flats > 0 
      ? `${keySignature.flats} bemoles` 
      : 'Natural';

  document.querySelector('#key-signature-display').textContent = `${keySignature.key} Mayor · ${keySignatureText}`;
  document.querySelector('#chord-readout').textContent = `${rootNoteName}${chordSuffix}`;
  document.querySelector('#mode-display').textContent = selectedModeData.name;
  document.querySelector('#key-signature-chord').textContent = `Armadura: ${keySignatureText}`;
  document.querySelector('#board-title').textContent = `${rootNoteName}${chordSuffix} · ${selectedModeData.name}`;
  document.querySelector('#board-add-chord').textContent = `${rootNoteName}${chordSuffix}`.replace(/#/g, '♯').replace(/b/g, '♭');
  document.querySelector('.board-eyebrow').textContent = `MÁSTIL / ${instruments[instrument].name.toUpperCase()}`;

  updateModeLegend();
  renderFretboard(); renderProgression();
}

function updateModeLegend() {
  const availableModes = getAvailableModes(quality);
  const modeLegend = document.querySelector('#mode-legend');

  modeLegend.innerHTML = availableModes.map(modeKey => {
    const mode = modes[modeKey];
    return `
      <div class="legend-item">
        <span class="legend-dot" style="background-color: ${mode.color};"></span>
        <span class="legend-label">${mode.name}</span>
      </div>
    `;
  }).join('');
}
// Duración de cada acorde en pulsos de 4/4. Cuatro pulsos equivalen a un compás.
const beatOptions = [1, 2, 3, 4, 6, 8, 12, 16];
const beatLabels = {1: '¼', 2: '½', 3: '¾', 4: '1', 6: '1½', 8: '2', 12: '3', 16: '4'};
function validBeats(value) {
  const beats = Number(value);
  return Number.isInteger(beats) && beats >= 1 && beats <= 16 ? beats : 4;
}
function beatsLabel(value) { return beatLabels[validBeats(value)]; }

function renderProgression() {
  if (draggingProgressionItem) return;
  const entries=globalThis.StringSections?globalThis.StringSections.visible():progression.map((item,index)=>({item,index}));
  const list=document.querySelector('#progression');
  if(!entries.length){
    list.innerHTML=progression.length?'':'<p class="progression-empty">Sin acordes. Elige una nota y pulsa «añadir acorde» para empezar.</p>';
    return;
  }
  let cursor = 0; // Pulsos acumulados: marcan el inicio de cada compás de 4/4.
  list.innerHTML = entries.map(({item,index}) => {
    const type = chordTypes.find(candidate => candidate.value === item.type);
    const beats = validBeats(item.beats);
    const barNumber = Math.floor(cursor / 4) + 1;
    cursor += beats;
    const beatsSelect = `<label class="beats-control" title="Duración: ${beatsLabel(beats)} de compás"><span class="sr-only">Duración del acorde ${index + 1}</span><select data-beats="${index}" aria-label="Duración del acorde ${index + 1}">${beatOptions.map(option => `<option value="${option}"${option === beats ? ' selected' : ''}>${beatLabels[option]}</option>`).join('')}</select></label>`;
    return `<div class="progression-card ${index === activeProgression ? 'active' : ''} ${item === playingProgressionItem ? 'playing' : ''}" data-index="${index}" tabindex="0" role="group" aria-label="Acorde ${index + 1}, compás ${barNumber}, ${beatsLabel(beats)} de compás. Arrastrar o usar Alt y flechas para mover."><button type="button" data-remove="${index}" aria-label="Quitar acorde ${index + 1}">×</button><small>${index + 1}${item === playingProgressionItem ? ' · sonando' : ''}</small><span class="progression-mode">${modes[item.mode || defaultChordMode(item)]?.name || ''}</span>${beatsSelect}<span class="drag-grip" aria-hidden="true">⠿</span><strong>${item.rootNoteName || noteName(item.root)}${type ? type.suffix : ''}</strong></div>`;
  }).join('');
}
instrumentSelect.addEventListener('change', event => { instrument = event.target.value; updateView(); });
rootSelect.addEventListener('change', event => {
  activeProgression = -1;
  root = Number(event.target.value);
  // Actualizar el nombre de la nota raíz seleccionada
  const selectedOption = rootSelect.options[rootSelect.selectedIndex];
  if (selectedOption) {
    rootNoteName = selectedOption.dataset.note || 'C';
  }
  updateView();
});
qualitySelect.addEventListener('change', event => { 
  quality = event.target.value;
  chordType = chordTypes.find(type => type.value === ({major: 'maj', minor: 'm', diminished: 'dim'})[quality]);
  activeProgression = -1;
  // Actualizar el modo seleccionado basado en la nueva calidad
  const availableModes = getAvailableModes(quality);
  if (!availableModes.includes(selectedMode)) {
    selectedMode = qualities[quality].defaultMode;
  }
  // Resetear el modo fantasma cuando cambia la calidad
  ghostMode = '';
  updateModeSelector();
  updateView(); 
});

// Event listener para el selector de modo fantasma
const ghostModeSelect = document.querySelector('#ghost-mode-select');
if (ghostModeSelect) {
  ghostModeSelect.addEventListener('change', event => {
    ghostMode = event.target.value;
    activeProgression = -1;
    renderProgression();
    renderFretboard();
  });
}

// Event listener para el botón de ciclo de modo de visualización
document.querySelector('#toggle-display').addEventListener('click', event => { 
  displayModeIndex = (displayModeIndex + 1) % (pentatonicView || modes[viewMode()].intervals.length===7 ? displayModes.length : 3);
  const button = event.currentTarget;
  const buttonText = button.querySelector('#display-label');

  // Actualizar el texto del botón según el modo
  buttonText.textContent = displayModeLabels[displayModeIndex];

  renderFretboard(); 
});
document.querySelector('#toggle-degrees').addEventListener('click', event => {
  degreeDisplay = (degreeDisplay + 1) % 3;
  const button = event.currentTarget;
  const labels = ['grados: no', 'grados: escala', 'grados: todos'];
  button.querySelector('span').textContent = labels[degreeDisplay];
  button.setAttribute('aria-pressed', String(degreeDisplay !== 0));
  button.setAttribute('aria-label', labels[degreeDisplay] + '. Clic para cambiar.');
  renderFretboard();
});
document.querySelector('#toggle-notes').addEventListener('click', event => { 
  showNotes = (showNotes + 1) % 3; // Ciclar entre 0, 1, 2
  const button = event.currentTarget;
  const buttonText = button.querySelector('span');

  // Actualizar el texto del botón según el modo
  if (showNotes === 0) {
    button.setAttribute('aria-pressed', 'false');
    buttonText.textContent = 'notas';
  } else if (showNotes === 1) {
    button.setAttribute('aria-pressed', 'true');
    buttonText.textContent = 'escala';
  } else {
    button.setAttribute('aria-pressed', 'true');
    buttonText.textContent = 'todas';
  }

  renderFretboard(); 
});
function defaultChordMode(item) {
  const type = chordTypes.find(candidate => candidate.value === item.type) || chordTypes[0];
  if (item.type === '7' || item.type === '7sus4' || item.type === '9' || item.type === 'sus2' || item.type === 'sus4') return 'mixolydian';
  if (item.type === 'm6' || item.type === 'm9') return 'dorian';
  return type.intervals.includes(6) ? 'locrian'
    : type.intervals.includes(3) ? 'aeolian' : 'ionian';
}

function showProgressionChord(item, index = -1) {
  if (!item) return;
  activeProgression = index;
  root = item.root;
  rootNoteName = item.rootNoteName || noteName(root);
  chordType = chordTypes.find(type => type.value === item.type) || chordTypes[0];
  quality = chordType.intervals.includes(6) ? 'diminished' : chordType.intervals.includes(3) ? 'minor' : 'major';
  selectedMode = item.mode || defaultChordMode(item);
  ghostMode = item.ghostMode || '';
  populateControls();
  updateView();
}

function selectProgressionChord(index) {
  showProgressionChord(progression[index], index);
}

function moveProgressionChord(from, to) {
  if(globalThis.StringSections?.move(from,to))return;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0
    || from >= progression.length || to >= progression.length || from === to) return;
  const selected = progression[activeProgression];
  progressionEdited=true;
  const [item] = progression.splice(from, 1);
  progression.splice(to, 0, item);
  activeProgression = selected ? progression.indexOf(selected) : -1;
  saveCustomProgression();
  renderProgression();
}

function duplicateProgressionChord(index) {
  if (!Number.isInteger(index) || !progression[index] || progression.length >= 4096 || draggingProgressionItem) return;
  progression.splice(index + 1, 0, {...progression[index]});
  globalThis.StringSections?.include(progression[index],progression[index+1]);
  progressionEdited=true;
  saveCustomProgression();
  selectProgressionChord(index + 1);
}

function addProgressionChord() {
  if(draggingProgressionItem || progression.length>=4096)return;
  progressionEdited=true;
  progression.push({ root, rootNoteName, type: chordType.value, mode: selectedMode, ghostMode, beats: 4 });
  globalThis.StringSections?.include(null,progression[progression.length-1]);
  activeProgression = progression.length - 1;
  saveCustomProgression();
  renderProgression();
}

function removeProgressionChord(index) {
  if (!progression[index]) return;
  progressionEdited=true;
  progression.splice(index, 1);
  saveCustomProgression();
  if (progression.length === 0) {
    activeProgression = -1;
    renderProgression();
  } else if (activeProgression === index) {
    selectProgressionChord(Math.min(index, progression.length - 1));
  } else {
    if (activeProgression > index) activeProgression--;
    renderProgression();
  }
}

document.querySelector('#progression').addEventListener('click', event => {
  if (event.target.closest('select')) return;
  const remove = event.target.closest('[data-remove]');
  if (remove) { removeProgressionChord(Number(remove.dataset.remove)); return; }
  const card = event.target.closest('[data-index]');
  if (card) selectProgressionChord(Number(card.dataset.index));
});
document.querySelector('#progression').addEventListener('change', event => {
  const select = event.target.closest('[data-beats]');
  if (!select) return;
  const item = progression[Number(select.dataset.beats)];
  const beats = validBeats(select.value);
  if (!item || validBeats(item.beats) === beats) return;
  item.beats = beats;
  progressionEdited = true;
  saveCustomProgression();
  renderProgression();
});
document.querySelector('#add-chord').addEventListener('click', addProgressionChord);
document.querySelector('#keyboard-add-chord')?.addEventListener('click', addProgressionChord);
function selectFretNote(note) {
  if(!note)return;
  const pitch=Number(note.dataset.midi)%12;
  if(!Number.isInteger(pitch))return;
  selectedFretMidi=Number(note.dataset.midi);
  const liveChordActive = typeof window !== 'undefined' && typeof window.__liveChordActive === 'function' ? window.__liveChordActive() : false;
  if(liveChordActive || document.querySelector('#fret-scale-lock').checked) {
    document.querySelectorAll('.is-picked').forEach(item=>item.classList.remove('is-picked'));
    note.classList?.add('is-picked');
    document.querySelector('.hint').textContent=`Nota seleccionada: ${displayNote(pitch)}${note.dataset.interval ? ` · ${note.dataset.interval}` : ''}${liveChordActive ? ' · la escala la lleva el acorde en vivo.' : '. Escala fija.'}`;
    return;
  }
  choosePianoRoot(pitch,pianoUseFlats ? noteLabels[notes[pitch]] || notes[pitch] : notes[pitch]);
  document.querySelector('.hint').textContent=`Nota base: ${rootNoteName}. El modo seleccionado se conserva.`;
}

function appendMidiChords(chords) {
  if(!chords.length || draggingProgressionItem)return false;
  const replace=!progressionEdited && progression===initialProgression && JSON.stringify(progression)===initialProgressionSnapshot;
  if((replace?0:progression.length)+chords.length>4096)return false;
  const first=replace?0:progression.length;
  if(replace)progression=[];
  progression.push(...chords.map(item=>({...item})));
  progressionEdited=true;selectProgressionChord(first);
  return {replaced:replace};
}
fretboard.addEventListener('click', event => selectFretNote(event.target.closest('.fret-note')));
document.querySelector('#open-strings').addEventListener('click', event => {
  const note = event.target.closest('.open-string-note');
  selectFretNote(note);
});
populateControls(); renderIntervalLegend(); updateModeLegend(); updateView();
