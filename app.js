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
  5: { name: '4ª justa / 11ª', color: '#9C27B0' },
  6: { name: '5ª disminuida', color: '#C9A227' },
  7: { name: '5ª justa', color: '#E6B800' },
  8: { name: '6ª menor / 13ª menor', color: '#EF8700' },
  9: { name: '6ª mayor / 13ª mayor', color: '#FF9800' },
  10: { name: '7ª menor', color: '#00897B' },
  11: { name: '7ª mayor', color: '#26A69A' },
};

// Variantes enarmónicas: el mismo semitono puede cumplir otra función.
const alteredIntervalColors = {
  augmentedFourth: { name: '4ª aumentada / 11ª aumentada', color: '#AB47BC' },
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
let activeProgression = 0;
let showNotes = 0; // 0 = sin notas, 1 = solo notas de escala, 2 = todas las notas
let displayModeIndex = 0; // 0 = grados completos, 1 = raíz, 3ra, 5ta, 2 = raíz, 3ra, 5ta, 7ma
const displayModes = ['full', 'triad', 'seventh'];
const displayModeLabels = ['grados', 'triada', '7ma'];
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
  
  // Obtener la armadura de clave actual
  const keySignature = calculateKeySignature(selectedMode, root);
  
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
  const normalized = interval % 12;
  const displayMode = displayModes[displayModeIndex];
  
  switch (displayMode) {
    case 'triad':
      // Intervalos de la triada actual, incluida la quinta disminuida.
      return chordType.intervals.includes(normalized);
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
  
  // Para pentatónicas (type: 'both'), usar la tonalidad mayor de la raíz directamente
  if (mode.type === 'both') {
    const matchingTonality = tonalities.find(ton => noteToIndex(ton.key) === rootNote);
    
    if (matchingTonality) {
      // Si el usuario seleccionó una nota con bemol (Db, Eb, etc.), priorizar tonalidades con bemoles
      if (rootNoteName && (rootNoteName.includes('b') || rootNoteName === 'Cb')) {
        const flatTonality = tonalities.find(ton => 
          noteToIndex(ton.key) === rootNote && ton.flats > 0
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
          noteToIndex(ton.key) === rootNote && ton.sharps > 0
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
  
  // Encontrar la tonalidad mayor donde esta raíz es el grado correcto
  // Para un modo con grado X, la tónica de la escala mayor es: raíz - X
  const majorRoot = (rootNote - mode.degree + 12) % 12;
  
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
  
  qualitySelect.innerHTML = Object.entries(qualities).map(([key, qual]) => `<option value="${key}">${qual.label}</option>`).join('');
  instrumentSelect.value = instrument; rootSelect.value = root; qualitySelect.value = quality;
  
  // Establecer el nombre de la nota raíz seleccionada
  const selectedOption = rootSelect.options[rootSelect.selectedIndex];
  if (selectedOption) {
    rootNoteName = selectedOption.dataset.note || 'C';
  }
  
  updateModeSelector();
}

function updateModeSelector() {
  const availableModes = getAvailableModes(quality);
  
  // Si el modo actual no está disponible, cambiar al modo por defecto de la calidad
  if (!availableModes.includes(selectedMode)) {
    selectedMode = qualities[quality].defaultMode;
  }
  
  modeSelector.innerHTML = availableModes.map(modeKey => {
    const mode = modes[modeKey];
    return `
      <label class="mode-option">
        <input type="radio" name="mode" value="${modeKey}" ${selectedMode === modeKey ? 'checked' : ''}>
        <span class="mode-label">${mode.name}</span>
      </label>
    `;
  }).join('');
  
  // Agregar event listeners a los nuevos radio buttons
  modeSelector.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectedMode = e.target.value;
      updateView();
    });
  });
  
  // Actualizar el selector de modo fantasma
  updateGhostModeSelector();
}

function updateGhostModeSelector() {
  const ghostModeSelect = document.querySelector('#ghost-mode-select');
  if (!ghostModeSelect) return;
  
  const availableModes = getAvailableModes(quality);
  
  // Generar opciones: "Ninguna" + todos los modos disponibles excepto el seleccionado
  const options = availableModes
    .filter(modeKey => modeKey !== selectedMode)
    .map(modeKey => {
      const mode = modes[modeKey];
      return `<option value="${modeKey}" ${ghostMode === modeKey ? 'selected' : ''}>${mode.name}</option>`;
    }).join('');
  
  ghostModeSelect.innerHTML = `<option value="" ${ghostMode === '' ? 'selected' : ''}>Ninguna</option>` + options;
}
function renderFretboard() {
  const inst = instruments[instrument];
  const scaleNotes = new Set(selectedTonality.scaleNotes);
  const chordIntervals = new Set(chordType.intervals);
  
  // Calcular notas del modo seleccionado
  const selectedModeNotes = new Set(getModeNotes(selectedMode, root));
  
  // Crear mapa de notas fantasmas con sus colores (solo si hay un modo fantasma seleccionado)
  const ghostNotesMap = new Map();
  if (ghostMode && ghostMode !== selectedMode) {
    const modeNotes = getModeNotes(ghostMode, root);
    const modeColor = modes[ghostMode].color;
    modeNotes.forEach(note => {
      if (!ghostNotesMap.has(note)) {
        ghostNotesMap.set(note, modeColor);
      }
    });
  }
  
  // Generar números de traste (1-22)
  const fretNumbers = Array.from({ length: 22 }, (_, i) => `<div>${i + 1}</div>`).join('');
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
      const dot = [3, 5, 7, 9, 12, 15, 17, 19, 21].includes(actualFret) ? '<span class="fret-dot"></span>' : '';
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
      } else if (ghostNotesMap.has(pitchClass)) {
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
        showNoteName = inSelectedMode || isRoot || inChord;
      }
      // showNotes === 0: no mostrar ninguna nota
      
      return `<div class="fret">${dot}<span class="${noteClass}" data-note="${displayNote(pitchClass)}" data-interval="${intervalInfo.name}" style="background-color: ${bgColor}; color: ${textColor};" title="${displayNote(pitchClass)} · ${intervalInfo.name}">${showNoteName ? displayNote(pitchClass) : ''}</span></div>`;
    }).join('');
    return `<div class="string-row" style="--string-width: ${stringIndex < (instrument === 'guitar' ? 3 : 2) ? 2 : 1}px">${frets}</div>`;
  }).join('');
  fretboard.innerHTML = rows;
  document.querySelector('#note-count').textContent = `${selectedModeNotes.size} notas`;
}
function renderOpenStrings() {
  const inst = instruments[instrument];
  const scaleNotes = new Set(selectedTonality.scaleNotes);
  const chordIntervals = new Set(chordType.intervals);
  
  // Calcular notas del modo seleccionado
  const selectedModeNotes = new Set(getModeNotes(selectedMode, root));
  
  // Crear mapa de notas fantasmas con sus colores (solo si hay un modo fantasma seleccionado)
  const ghostNotesMap = new Map();
  if (ghostMode && ghostMode !== selectedMode) {
    const modeNotes = getModeNotes(ghostMode, root);
    const modeColor = modes[ghostMode].color;
    modeNotes.forEach(note => {
      if (!ghostNotesMap.has(note)) {
        ghostNotesMap.set(note, modeColor);
      }
    });
  }
  
  const openStringsHtml = `<div class="open-string-label">Aire</div>` + 
    inst.strings.slice().reverse().map((openNote, reversedIdx) => {
      const pitchClass = openNote % 12;
      const inScale = scaleNotes.has(pitchClass);
      const isRoot = pitchClass === root;
      const intervalFromRoot = (pitchClass - root + 12) % 12;
      const inChord = chordIntervals.has(intervalFromRoot);
      const inSelectedMode = selectedModeNotes.has(pitchClass);
      const intervalInfo = getIntervalClass(intervalFromRoot);
      
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
      } else if (ghostNotesMap.has(pitchClass)) {
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
        showNoteName = inSelectedMode || isRoot || inChord;
      }
      // showNotes === 0: no mostrar ninguna nota
      
      return `<div class="open-string-note" style="background-color: ${bgColor}; color: ${textColor};" title="${displayNote(pitchClass)} · ${intervalInfo.name}">${showNoteName ? displayNote(pitchClass) : ''}</div>`;
    }).join('');
  
  document.querySelector('#open-strings').innerHTML = openStringsHtml;
}
function updateView() {
  const selectedModeData = modes[selectedMode];
  
  // Calcular la armadura de clave según modo y nota
  const keySignature = calculateKeySignature(selectedMode, root);
  
  // Determinar el tipo de acorde según la calidad
  let chordSuffix = '';
  if (quality === 'major') chordSuffix = '';
  else if (quality === 'minor') chordSuffix = 'm';
  else if (quality === 'diminished') chordSuffix = 'dim';
  
  // Actualizar la tonalidad global basada en el modo seleccionado
  const majorRoot = (root - selectedModeData.degree + 12) % 12;
  const matchingTonality = tonalities.find(ton => noteToIndex(ton.key) === majorRoot);
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
  document.querySelector('.board-eyebrow').textContent = `MÁSTIL / ${instruments[instrument].name.toUpperCase()}`;
  
  // Actualizar el tipo de acorde para compatibility
  if (quality === 'major') chordType = chordTypes[0]; // Mayor
  else if (quality === 'minor') chordType = chordTypes[3]; // Menor
  else if (quality === 'diminished') chordType = chordTypes[6]; // Disminuido
  
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
function renderProgression() {
  document.querySelector('#progression').innerHTML = progression.map((item, index) => {
    const type = chordTypes.find(candidate => candidate.value === item.type);
    return `<div class="progression-card ${index === activeProgression ? 'active' : ''}" data-index="${index}"><button type="button" data-remove="${index}" aria-label="Quitar acorde ${index + 1}">×</button><small>${['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'][index] || `#${index + 1}`}</small><strong>${displayNote(item.root)}${type ? type.suffix : ''}</strong></div>`;
  }).join('');
}
instrumentSelect.addEventListener('change', event => { instrument = event.target.value; updateView(); });
rootSelect.addEventListener('change', event => {
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
    renderFretboard();
  });
}

// Event listener para el botón de ciclo de modo de visualización
document.querySelector('#toggle-display').addEventListener('click', event => { 
  displayModeIndex = (displayModeIndex + 1) % displayModes.length; // Ciclar entre 0, 1, 2
  const button = event.currentTarget;
  const buttonText = button.querySelector('#display-label');
  
  // Actualizar el texto del botón según el modo
  buttonText.textContent = displayModeLabels[displayModeIndex];
  
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
document.querySelector('#progression').addEventListener('click', event => {
  const remove = event.target.closest('[data-remove]');
  if (remove) { if (progression.length > 1) { progression.splice(Number(remove.dataset.remove), 1); activeProgression = Math.min(activeProgression, progression.length - 1); renderProgression(); } return; }
  const card = event.target.closest('[data-index]');
  if (card) { activeProgression = Number(card.dataset.index); const item = progression[activeProgression]; root = item.root; chordType = chordTypes.find(type => type.value === item.type) || chordTypes[0]; populateControls(); updateView(); }
});
document.querySelector('#add-chord').addEventListener('click', () => { progression.push({ root, type: chordType.value }); activeProgression = progression.length - 1; renderProgression(); });
fretboard.addEventListener('click', event => { const note = event.target.closest('.fret-note'); if (note) { document.querySelector('.hint').textContent = `${note.dataset.note}: ${note.dataset.interval}`; } });
populateControls(); renderIntervalLegend(); updateModeLegend(); updateView();
