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
  { sharps: 0, flats: 1, key: 'F', scale: 'major', scaleNotes: [5, 7, 9, 10, 0, 2, 4] },
  { sharps: 0, flats: 2, key: 'Bb', scale: 'major', scaleNotes: [10, 0, 2, 3, 5, 7, 9] },
  { sharps: 0, flats: 3, key: 'Eb', scale: 'major', scaleNotes: [3, 5, 7, 8, 10, 0, 2] },
  { sharps: 0, flats: 4, key: 'Ab', scale: 'major', scaleNotes: [8, 10, 0, 1, 3, 5, 7] },
  { sharps: 0, flats: 5, key: 'Db', scale: 'major', scaleNotes: [1, 3, 5, 6, 8, 10, 0] },
  { sharps: 0, flats: 6, key: 'Gb', scale: 'major', scaleNotes: [6, 8, 10, 11, 1, 3, 5] },
];

const scales = {
  majorPentatonic: { name: 'Pentatónica mayor', intervals: [0, 2, 4, 7, 9], description: 'Sonido abierto y directo. Un gran punto de partida.' },
  minorPentatonic: { name: 'Pentatónica menor', intervals: [0, 3, 5, 7, 10], description: 'La voz clásica del blues, rock y soul.' },
  dorian: { name: 'Dórica', intervals: [0, 2, 3, 5, 7, 9, 10], description: 'Menor con un brillo modal y mucho movimiento.' },
  mixolydian: { name: 'Mixolidia', intervals: [0, 2, 4, 5, 7, 9, 10], description: 'Dominante, luminosa y con actitud de rock.' },
  major: { name: 'Mayor (Jónica)', intervals: [0, 2, 4, 5, 7, 9, 11], description: 'La escala completa para resolver en la tónica.' },
  minor: { name: 'Menor natural (Eólica)', intervals: [0, 2, 3, 5, 7, 8, 10], description: 'Color menor profundo y familiar.' }
};

// Modos con sus intervalos, colores y sus grados en la escala mayor
const modes = {
  // Modos mayores (grados I, IV, V de la escala mayor)
  ionian: { 
    name: 'Jónico (I)', 
    type: 'major',
    degree: 0, // Grado I (tónica)
    intervals: [0, 2, 4, 5, 7, 9, 11], 
    color: 'rgba(63, 81, 181, 0.3)', // Azul transparente
    description: 'Escala mayor natural'
  },
  lydian: { 
    name: 'Lidio (IV)', 
    type: 'major',
    degree: 3, // Grado IV (subdominante)
    intervals: [0, 2, 4, 6, 7, 9, 11], 
    color: 'rgba(0, 188, 212, 0.3)', // Cyan transparente
    description: 'Mayor con 4ª aumentada'
  },
  mixolydian: { 
    name: 'Mixolidio (V)', 
    type: 'major',
    degree: 4, // Grado V (dominante)
    intervals: [0, 2, 4, 5, 7, 9, 10], 
    color: 'rgba(76, 175, 80, 0.3)', // Verde transparente
    description: 'Dominante con 7ª menor'
  },
  // Modos menores (grados ii, iii, vi, vii de la escala mayor)
  dorian: { 
    name: 'Dórico (ii)', 
    type: 'minor',
    degree: 1, // Grado ii
    intervals: [0, 2, 3, 5, 7, 9, 10], 
    color: 'rgba(255, 152, 0, 0.3)', // Naranja transparente
    description: 'Menor con 6ª mayor'
  },
  phrygian: { 
    name: 'Frigio (iii)', 
    type: 'minor',
    degree: 2, // Grado iii
    intervals: [0, 1, 3, 5, 7, 8, 10], 
    color: 'rgba(244, 67, 54, 0.3)', // Rojo transparente
    description: 'Menor con 2ª menor'
  },
  aeolian: { 
    name: 'Eólico (vi)', 
    type: 'minor',
    degree: 5, // Grado vi (relativo menor)
    intervals: [0, 2, 3, 5, 7, 8, 10], 
    color: 'rgba(156, 39, 176, 0.3)', // Púrpura transparente
    description: 'Escala menor natural'
  },
  locrian: { 
    name: 'Locrio (vii°)', 
    type: 'minor',
    degree: 6, // Grado vii
    intervals: [0, 1, 3, 5, 6, 8, 10], 
    color: 'rgba(96, 125, 139, 0.3)', // Gris azulado transparente
    description: 'Menor con 5ª disminuida'
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

const intervalColors = {
  0: { name: 'Raíz', color: '#6f9a68', rgb: [111, 154, 104] },
  3: { name: '3ª menor', color: '#f4c430', rgb: [244, 196, 48] },
  4: { name: '3ª mayor', color: '#ffd700', rgb: [255, 215, 0] },
  6: { name: '5ª dism.', color: '#ff6b6b', rgb: [255, 107, 107] },
  7: { name: '5ª justa', color: '#c95735', rgb: [201, 87, 53] },
  8: { name: '5ª aum.', color: '#d32f2f', rgb: [211, 47, 47] },
  9: { name: '6ª', color: '#ff9800', rgb: [255, 152, 0] },
  10: { name: '7ª menor', color: '#9c27b0', rgb: [156, 39, 176] },
  11: { name: '7ª mayor', color: '#3f51b5', rgb: [63, 81, 181] },
  2: { name: '2ª / 9ª', color: '#00bcd4', rgb: [0, 188, 212] },
  5: { name: '4ª / sus4', color: '#00897b', rgb: [0, 137, 123] },
};

let instrument = 'guitar';
let selectedTonality = tonalities[0]; // Escala global base
let root = 0; // Raíz del acorde
let chordType = chordTypes[0];
let selectedMode = 'ionian'; // Modo seleccionado por defecto
let progression = [{ root: 0, type: 'maj' }, { root: 5, type: 'm7' }, { root: 7, type: '7' }, { root: 0, type: 'maj' }];
let activeProgression = 0;
let showNotes = false;

function noteToIndex(noteName) {
  const cleaned = noteName.replace(' ', '');
  // Buscar en notas naturales
  const idx = notes.indexOf(cleaned);
  if (idx >= 0) return idx;
  // Buscar en etiquetas (bemoles)
  for (let i = 0; i < notes.length; i++) {
    if (noteLabels[notes[i]] === cleaned) return i;
  }
  return 0;
}

const rootSelect = document.querySelector('#root-select');
const chordSelect = document.querySelector('#chord-select');
const tonalitySelect = document.querySelector('#tonality-select');
const instrumentSelect = document.querySelector('#instrument-select');
const fretboard = document.querySelector('#fretboard');
const modeSelector = document.querySelector('#mode-selector');

function noteName(index) { return notes[(index + 12) % 12]; }
function displayNote(index) { const name = noteName(index); return noteLabels[name] || name; }
function getIntervalClass(interval) {
  const normalized = interval % 12;
  return intervalColors[normalized] || { name: 'Otra', color: '#bbb', rgb: [187, 187, 187] };
}

// Función para calcular las notas de un modo de manera congruente
function getModeNotes(modeKey, rootNote) {
  const mode = modes[modeKey];
  if (!mode) return [];
  
  // Encontrar la tonalidad mayor donde esta raíz es el grado correcto
  // Para un modo con grado X, la tónica de la escala mayor es: raíz - X
  const majorRoot = (rootNote - mode.degree + 12) % 12;
  
  // Calcular las notas de la escala mayor desde esa tónica
  const majorScale = [0, 2, 4, 5, 7, 9, 11].map(interval => (majorRoot + interval) % 12);
  
  // Las notas del modo son las mismas notas de la escala mayor
  return majorScale;
}

// Función para obtener modos disponibles según el tipo de acorde
function getAvailableModes(chordTypeValue) {
  if (chordTypeValue.startsWith('m')) {
    // Acorde menor - modos menores disponibles
    return ['aeolian', 'dorian', 'phrygian', 'locrian'];
  } else {
    // Acorde mayor - modos mayores disponibles
    return ['ionian', 'lydian', 'mixolydian'];
  }
}

// Función para encontrar el modo más cercano para una raíz en una tonalidad dada
function findClosestMode(targetRoot, majorRoot, chordTypeValue) {
  const availableModes = getAvailableModes(chordTypeValue);
  const majorRootIndex = majorRoot;
  
  // Calcular qué grado de la escala mayor es la raíz objetivo
  const degreeFromMajor = (targetRoot - majorRootIndex + 12) % 12;
  
  // Encontrar el modo disponible cuyo grado más se acerque
  let closestMode = availableModes[0];
  let minDistance = 12;
  
  for (const modeKey of availableModes) {
    const mode = modes[modeKey];
    const distance = Math.abs(degreeFromMajor - mode.degree);
    if (distance < minDistance) {
      minDistance = distance;
      closestMode = modeKey;
    }
  }
  
  return closestMode;
}
function populateControls() {
  instrumentSelect.innerHTML = Object.entries(instruments).map(([key, inst]) => `<option value="${key}">${inst.name}</option>`).join('');
  rootSelect.innerHTML = notes.map((note, index) => `<option value="${index}">${note}${noteLabels[note] ? ` / ${noteLabels[note]}` : ''}</option>`).join('');
  chordSelect.innerHTML = chordTypes.map(type => `<option value="${type.value}">${type.label}</option>`).join('');
  tonalitySelect.innerHTML = tonalities.map((ton, idx) => `<option value="${idx}">${ton.key}${ton.sharps > 0 ? ` (${ton.sharps}#)` : ton.flats > 0 ? ` (${ton.flats}b)` : ''}</option>`).join('');
  instrumentSelect.value = instrument; rootSelect.value = root; chordSelect.value = chordType.value; tonalitySelect.value = tonalities.indexOf(selectedTonality);
  updateModeSelector();
}

function updateModeSelector() {
  const availableModes = getAvailableModes(chordType.value);
  const majorRoot = noteToIndex(selectedTonality.key);
  
  modeSelector.innerHTML = availableModes.map(modeKey => {
    const mode = modes[modeKey];
    // Calcular qué nota sería la raíz para este modo en la tonalidad actual
    const modeRoot = (majorRoot + mode.degree) % 12;
    const modeRootName = displayNote(modeRoot);
    const modeRootAccidental = noteLabels[notes[modeRoot]] ? `/${noteLabels[notes[modeRoot]]}` : '';
    
    return `
      <label class="mode-option">
        <input type="radio" name="mode" value="${modeKey}" ${selectedMode === modeKey ? 'checked' : ''}>
        <span class="mode-label">${mode.name} <small style="color: var(--muted);">(${modeRootName}${modeRootAccidental})</small></span>
      </label>
    `;
  }).join('');
  
  // Agregar event listeners a los nuevos radio buttons
  modeSelector.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectedMode = e.target.value;
      // Cambiar la raíz para que sea congruente con el nuevo modo
      const selectedModeData = modes[selectedMode];
      root = (majorRoot + selectedModeData.degree) % 12;
      rootSelect.value = root;
      updateView();
    });
  });
}
function renderFretboard() {
  const inst = instruments[instrument];
  const scaleNotes = new Set(selectedTonality.scaleNotes);
  const chordIntervals = new Set(chordType.intervals);
  
  // Calcular notas del modo seleccionado y otros modos disponibles
  const selectedModeNotes = new Set(getModeNotes(selectedMode, root));
  const availableModes = getAvailableModes(chordType.value);
  const ghostModes = availableModes.filter(mode => mode !== selectedMode);
  
  // Crear mapa de notas fantasmas con sus colores
  const ghostNotesMap = new Map();
  ghostModes.forEach(modeKey => {
    const modeNotes = getModeNotes(modeKey, root);
    const modeColor = modes[modeKey].color;
    modeNotes.forEach(note => {
      if (!ghostNotesMap.has(note)) {
        ghostNotesMap.set(note, modeColor);
      }
    });
  });
  
  // Generar números de traste (sin la columna del nut)
  const fretNumbers = Array.from({ length: 22 }, (_, i) => `<div>${i}</div>`).join('');
  document.querySelector('#fret-numbers').innerHTML = fretNumbers;
  
  // Invertir orden de cuerdas (de más aguda a más grave)
  const rows = inst.strings.slice().reverse().map((openNote, reversedIdx) => {
    const stringIndex = inst.strings.length - 1 - reversedIdx;
    const frets = Array.from({ length: 22 }, (_, fret) => {
      const pitch = openNote + fret;
      const pitchClass = pitch % 12;
      const inScale = scaleNotes.has(pitchClass);
      const isRoot = pitchClass === root;
      const intervalFromRoot = (pitchClass - root + 12) % 12;
      const inChord = chordIntervals.has(intervalFromRoot);
      const inSelectedMode = selectedModeNotes.has(pitchClass);
      const dot = [3, 5, 7, 9, 15, 17, 19, 21].includes(fret + 1) ? '<span class="fret-dot"></span>' : '';
      const intervalInfo = getIntervalClass(intervalFromRoot);
      
      // Determinar color de fondo
      let bgColor;
      let textColor;
      
      if (isRoot) {
        bgColor = '#6f9a68';
        textColor = '#f3f0e8';
      } else if (inChord) {
        bgColor = intervalInfo.color;
        textColor = '#f3f0e8';
      } else if (inSelectedMode) {
        bgColor = '#bbb';
        textColor = '#1d2521';
      } else if (ghostNotesMap.has(pitchClass)) {
        // Nota fantasma de otro modo
        bgColor = ghostNotesMap.get(pitchClass);
        textColor = 'rgba(29, 37, 33, 0.5)';
      } else {
        bgColor = 'transparent';
        textColor = '#999';
      }
      
      return `<div class="fret">${dot}<span class="fret-note" data-note="${displayNote(pitchClass)}" data-interval="${intervalInfo.name}" style="background-color: ${bgColor}; color: ${textColor};" title="${displayNote(pitchClass)} · ${intervalInfo.name}">${showNotes ? displayNote(pitchClass) : ''}</span></div>`;
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
  
  // Calcular notas del modo seleccionado y otros modos disponibles
  const selectedModeNotes = new Set(getModeNotes(selectedMode, root));
  const availableModes = getAvailableModes(chordType.value);
  const ghostModes = availableModes.filter(mode => mode !== selectedMode);
  
  // Crear mapa de notas fantasmas con sus colores
  const ghostNotesMap = new Map();
  ghostModes.forEach(modeKey => {
    const modeNotes = getModeNotes(modeKey, root);
    const modeColor = modes[modeKey].color;
    modeNotes.forEach(note => {
      if (!ghostNotesMap.has(note)) {
        ghostNotesMap.set(note, modeColor);
      }
    });
  });
  
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
      
      if (isRoot) {
        bgColor = '#6f9a68';
        textColor = '#f3f0e8';
      } else if (inChord) {
        bgColor = intervalInfo.color;
        textColor = '#f3f0e8';
      } else if (inSelectedMode) {
        bgColor = '#bbb';
        textColor = '#1d2521';
      } else if (ghostNotesMap.has(pitchClass)) {
        // Nota fantasma de otro modo
        bgColor = ghostNotesMap.get(pitchClass);
        textColor = 'rgba(29, 37, 33, 0.5)';
      } else {
        bgColor = 'transparent';
        textColor = '#1d2521';
      }
      
      return `<div class="open-string-note" style="background-color: ${bgColor}; color: ${textColor};" title="${displayNote(pitchClass)} · ${intervalInfo.name}">${displayNote(pitchClass)}</div>`;
    }).join('');
  
  document.querySelector('#open-strings').innerHTML = openStringsHtml;
}
function updateView() {
  const ton = selectedTonality;
  const noteName = displayNote(root);
  const accidentalText = noteLabels[notes[root]] ? `(${noteLabels[notes[root]]})` : '';
  const selectedModeData = modes[selectedMode];
  
  // Mostrar la tonalidad global base (escala mayor)
  document.querySelector('#tonality-label').textContent = `${ton.key}${ton.sharps > 0 ? ` (${ton.sharps} sostenidos)` : ton.flats > 0 ? ` (${ton.flats} bemoles)` : ' (natural)'}`;
  document.querySelector('#chord-readout').textContent = `${noteName}${chordType.suffix}`;
  document.querySelector('#accidentals').textContent = accidentalText;
  document.querySelector('#board-title').textContent = `${noteName}${chordType.suffix} · ${selectedModeData.name} (${ton.key} Mayor)`;
  document.querySelector('.board-eyebrow').textContent = `MÁSTIL / ${instruments[instrument].name.toUpperCase()}`;
  updateModeLegend();
  renderOpenStrings(); renderFretboard(); renderProgression();
}

function updateModeLegend() {
  const availableModes = getAvailableModes(chordType.value);
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
    return `<div class="progression-card ${index === activeProgression ? 'active' : ''}" data-index="${index}"><button type="button" data-remove="${index}" aria-label="Quitar acorde ${index + 1}">×</button><small>${['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'][index] || `#${index + 1}`}</small><strong>${displayNote(item.root)}${type.suffix}</strong></div>`;
  }).join('');
}
instrumentSelect.addEventListener('change', event => { instrument = event.target.value; updateView(); });
rootSelect.addEventListener('change', event => {
  root = Number(event.target.value);
  // Actualizar la tonalidad mayor basada en el modo seleccionado
  const selectedModeData = modes[selectedMode];
  const majorRoot = (root - selectedModeData.degree + 12) % 12;
  const matchingTonality = tonalities.find(ton => noteToIndex(ton.key) === majorRoot);
  if (matchingTonality) {
    selectedTonality = matchingTonality;
    tonalitySelect.value = tonalities.indexOf(matchingTonality);
  }
  updateModeSelector();
  updateView();
});
chordSelect.addEventListener('change', event => { 
  chordType = chordTypes.find(type => type.value === event.target.value);
  // Actualizar el modo seleccionado basado en el nuevo tipo de acorde
  const availableModes = getAvailableModes(chordType.value);
  if (!availableModes.includes(selectedMode)) {
    // Si el modo actual no es compatible, intentar mantener el modo equivalente
    // Por ejemplo, si estaba en Dórico (menor) y pasa a mayor, intentar mantener un modo mayor
    const currentModeType = modes[selectedMode]?.type;
    const newType = chordType.value.startsWith('m') ? 'minor' : 'major';
    
    // Buscar un modo del nuevo tipo que sea similar al anterior
    if (currentModeType !== newType) {
      // Intentar encontrar un modo equivalente
      selectedMode = availableModes[0]; // Por defecto al primero disponible
    } else {
      selectedMode = availableModes[0]; // Mantener el primero del mismo tipo
    }
  }
  updateModeSelector();
  updateView(); 
});
tonalitySelect.addEventListener('change', event => {
  selectedTonality = tonalities[Number(event.target.value)];
  const majorRoot = noteToIndex(selectedTonality.key);
  
  // Encontrar el modo más cercano que sea congruente con la raíz actual
  const closestMode = findClosestMode(root, majorRoot, chordType.value);
  selectedMode = closestMode;
  
  // Actualizar la raíz para que sea congruente con el nuevo modo
  const selectedModeData = modes[selectedMode];
  root = (majorRoot + selectedModeData.degree) % 12;
  rootSelect.value = root;
  
  updateModeSelector();
  updateView();
});
document.querySelector('#toggle-notes').addEventListener('click', event => { showNotes = !showNotes; event.currentTarget.setAttribute('aria-pressed', showNotes); renderFretboard(); });
document.querySelector('#progression').addEventListener('click', event => {
  const remove = event.target.closest('[data-remove]');
  if (remove) { if (progression.length > 1) { progression.splice(Number(remove.dataset.remove), 1); activeProgression = Math.min(activeProgression, progression.length - 1); renderProgression(); } return; }
  const card = event.target.closest('[data-index]');
  if (card) { activeProgression = Number(card.dataset.index); const item = progression[activeProgression]; root = item.root; chordType = chordTypes.find(type => type.value === item.type); populateControls(); updateView(); }
});
document.querySelector('#add-chord').addEventListener('click', () => { progression.push({ root, type: chordType.value }); activeProgression = progression.length - 1; renderProgression(); });
fretboard.addEventListener('click', event => { const note = event.target.closest('.fret-note'); if (note) { document.querySelector('.hint').textContent = `${note.dataset.note}: ${note.dataset.interval}`; } });
populateControls(); updateModeLegend(); updateView();
