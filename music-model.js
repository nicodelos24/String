// Modelo musical puro de String (T-01).
// Vive aparte de app.js para que las tablas de notas, modos, escalas, acordes,
// calidades, colores y armadura tengan una sola fuente y puedan probarse sin
// navegador. Lo carga `index.html` antes de app.js: al ser scripts clásicos,
// las declaraciones de arriba comparten el ámbito global con el resto.

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
  // Menores naturales: relativas menores de las armaduras anteriores. El
  // identificador distingue, por ejemplo, A mayor de A menor sin cambiar la
  // grafía de tónica que usan el cómputo y la armadura.
  { sharps: 0, flats: 0, key: 'A', id: 'A:minor', scale: 'minor', scaleNotes: [9, 11, 0, 2, 4, 5, 7] },
  { sharps: 1, flats: 0, key: 'E', id: 'E:minor', scale: 'minor', scaleNotes: [4, 6, 7, 9, 11, 0, 2] },
  { sharps: 2, flats: 0, key: 'B', id: 'B:minor', scale: 'minor', scaleNotes: [11, 1, 2, 4, 6, 7, 9] },
  { sharps: 3, flats: 0, key: 'F#', id: 'F#:minor', scale: 'minor', scaleNotes: [6, 8, 9, 11, 1, 2, 4] },
  { sharps: 4, flats: 0, key: 'C#', id: 'C#:minor', scale: 'minor', scaleNotes: [1, 3, 4, 6, 8, 9, 11] },
  { sharps: 5, flats: 0, key: 'G#', id: 'G#:minor', scale: 'minor', scaleNotes: [8, 10, 11, 1, 3, 4, 6] },
  { sharps: 6, flats: 0, key: 'D#', id: 'D#:minor', scale: 'minor', scaleNotes: [3, 5, 6, 8, 10, 11, 1] },
  { sharps: 7, flats: 0, key: 'A#', id: 'A#:minor', scale: 'minor', scaleNotes: [10, 0, 1, 3, 5, 6, 8] },
  { sharps: 0, flats: 1, key: 'D', id: 'D:minor', scale: 'minor', scaleNotes: [2, 4, 5, 7, 9, 10, 0] },
  { sharps: 0, flats: 2, key: 'G', id: 'G:minor', scale: 'minor', scaleNotes: [7, 9, 10, 0, 2, 3, 5] },
  { sharps: 0, flats: 3, key: 'C', id: 'C:minor', scale: 'minor', scaleNotes: [0, 2, 3, 5, 7, 8, 10] },
  { sharps: 0, flats: 4, key: 'F', id: 'F:minor', scale: 'minor', scaleNotes: [5, 7, 8, 10, 0, 1, 3] },
  { sharps: 0, flats: 5, key: 'Bb', id: 'Bb:minor', scale: 'minor', scaleNotes: [10, 0, 1, 3, 5, 6, 8] },
  { sharps: 0, flats: 6, key: 'Eb', id: 'Eb:minor', scale: 'minor', scaleNotes: [3, 5, 6, 8, 10, 11, 1] },
  { sharps: 0, flats: 7, key: 'Ab', id: 'Ab:minor', scale: 'minor', scaleNotes: [8, 10, 11, 1, 3, 4, 6] },
];

const tonalityId = tonality => tonality?.scale === 'minor' ? `${tonality.key}:minor` : tonality?.key;

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
  { value: 'm11', label: 'Menor 11', suffix: 'm11', intervals: [0, 3, 7, 10, 2, 5] },
  { value: '11', label: 'Once', suffix: '11', intervals: [0, 4, 7, 10, 2, 5] },
  { value: 'maj13', label: 'Mayor 13', suffix: 'maj13', intervals: [0, 4, 7, 11, 2, 9] },
  { value: '13', label: 'Dominante 13', suffix: '13', intervals: [0, 4, 7, 10, 2, 9] },
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

// La escala fantasma se guarda con el acorde, como en «Mis progresiones». Solo
// se acepta si es un modo que la app conoce: un guardado corrupto no debe poder
// colar una clave que reviente al pintar el mástil.
const validGhostMode=value=>(value&&Object.hasOwn(modes,value))?value:'';
// Las variantes por vuelta guardan excepciones del modo fantasma para
// vueltas concretas del mismo acorde: la vuelta de una sección que se
// repite (el coro, el estribillo) o la pasada del loop del Acompañamiento
// cuando no hay secciones. La clave es el número de vuelta (1 a 8, el
// mismo techo que las repeticiones de una sección) y el valor solo
// cambia el modo fantasma, con la misma validación que el modo del
// acorde: un guardado raro no coló una clave que reviente al pintar el
// mástil.
function validVariants(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
  const out={};
  for(const key of Object.keys(value)){
    const vuelta=Number(key);
    const variant=value[key];
    if(!Number.isInteger(vuelta)||vuelta<1||vuelta>8||!variant||typeof variant!=='object')continue;
    const ghost=validGhostMode(variant.ghostMode);
    if(!ghost)continue;
    out[vuelta]={ghostMode:ghost};
  }
  return Object.keys(out).length?out:undefined;
}

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

// T-31 · La calidad de un acorde según su tipo: la misma regla con la que
// showProgressionChord arma los controles. La usan las variantes por vuelta
// para acotar su oferta de modos.
function chordQualityOf(item) {
  const type = chordTypes.find(candidate => candidate.value === item.type) || chordTypes[0];
  return type.intervals.includes(6) ? 'diminished' : type.intervals.includes(3) ? 'minor' : 'major';
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
function calculateKeySignature(modeKey, rootNote, rootSpelling = '') {
  const mode = modes[modeKey];
  if (!mode) return { sharps: 0, flats: 0, key: 'C' };

  // La pentatónica menor usa como referencia su relativa mayor.
  const degree = modeKey === 'minorPentatonic' ? 9 : mode.degree;
  const majorRoot = (rootNote - degree + 12) % 12;

  // Buscar la tonalidad correspondiente, pero respetar la grafía pedida (bemoles o sostenidos)
  const matchingTonality = tonalities.find(ton => noteToIndex(ton.key) === majorRoot);

  if (matchingTonality) {
    // Si el usuario seleccionó una nota con bemol (Db, Eb, etc.), priorizar tonalidades con bemoles
    if (rootSpelling && (rootSpelling.includes('b') || rootSpelling === 'Cb')) {
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
    else if (rootSpelling && (rootSpelling.includes('#') || rootSpelling === 'C#')) {
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

// Puente para Node: los tests cargan el modelo directamente, sin navegador.
// En la página, las declaraciones de arriba ya son visibles para app.js y para
// los demás scripts clásicos; este objeto no cambia ese contrato.
const MusicModel = {
  notes, noteLabels, instruments, tonalities, tonalityId, scales, modes, chordTypes, qualities,
  intervalColors, alteredIntervalColors, sharpToFlat, flatToSharp,
  noteName, noteToIndex, getModeNotes, getAvailableModes, chordQualityOf, findClosestMode,
  validGhostMode, validVariants, calculateKeySignature,
};
if (typeof module !== 'undefined' && module.exports) module.exports = MusicModel;
