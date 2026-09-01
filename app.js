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
let selectedTonality = tonalities[0];
let root = 0; // Sincronizado con tonalidad
let chordType = chordTypes[0];
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

function noteName(index) { return notes[(index + 12) % 12]; }
function displayNote(index) { const name = noteName(index); return noteLabels[name] || name; }
function getIntervalClass(interval) {
  const normalized = interval % 12;
  return intervalColors[normalized] || { name: 'Otra', color: '#bbb', rgb: [187, 187, 187] };
}
function populateControls() {
  instrumentSelect.innerHTML = Object.entries(instruments).map(([key, inst]) => `<option value="${key}">${inst.name}</option>`).join('');
  rootSelect.innerHTML = notes.map((note, index) => `<option value="${index}">${note}${noteLabels[note] ? ` / ${noteLabels[note]}` : ''}</option>`).join('');
  chordSelect.innerHTML = chordTypes.map(type => `<option value="${type.value}">${type.label}</option>`).join('');
  tonalitySelect.innerHTML = tonalities.map((ton, idx) => `<option value="${idx}">${ton.key}${ton.sharps > 0 ? ` (${ton.sharps}#)` : ton.flats > 0 ? ` (${ton.flats}b)` : ''}</option>`).join('');
  instrumentSelect.value = instrument; rootSelect.value = root; chordSelect.value = chordType.value; tonalitySelect.value = tonalities.indexOf(selectedTonality);
}
function renderFretboard() {
  const inst = instruments[instrument];
  const scaleNotes = new Set(selectedTonality.scaleNotes);
  const chordIntervals = new Set(chordType.intervals);
  
  // Generar números de traste
  const fretNumbers = `<div class="nut"></div>${Array.from({ length: 22 }, (_, i) => `<div>${i}</div>`).join('')}`;
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
      const dot = [3, 5, 7, 9, 15, 17, 19, 21].includes(fret + 1) ? '<span class="fret-dot"></span>' : '';
      const intervalInfo = getIntervalClass(intervalFromRoot);
      const bgColor = isRoot ? '#6f9a68' : inChord ? intervalInfo.color : inScale ? '#bbb' : 'transparent';
      const textColor = isRoot || (inChord && intervalFromRoot !== 0) ? '#f3f0e8' : inScale ? '#1d2521' : '#999';
      return `<div class="fret">${dot}<span class="fret-note" data-note="${displayNote(pitchClass)}" data-interval="${intervalInfo.name}" style="background-color: ${bgColor}; color: ${textColor};" title="${displayNote(pitchClass)} · ${intervalInfo.name}">${showNotes ? displayNote(pitchClass) : ''}</span></div>`;
    }).join('');
    return `<div class="string-row" style="--string-width: ${stringIndex < (instrument === 'guitar' ? 3 : 2) ? 2 : 1}px"><div class="nut" title="Cuerda ${inst.stringNames[stringIndex]}"></div>${frets}</div>`;
  }).join('');
  fretboard.innerHTML = rows;
  document.querySelector('#note-count').textContent = `${selectedTonality.scaleNotes.length} notas`;
}
function updateView() {
  const ton = selectedTonality;
  document.querySelector('#tonality-label').textContent = `${ton.key}${ton.sharps > 0 ? ` (${ton.sharps} sostenidos)` : ton.flats > 0 ? ` (${ton.flats} bemoles)` : ' (natural)'}`;
  document.querySelector('#chord-readout').textContent = `${displayNote(root)}${chordType.suffix}`;
  document.querySelector('#board-title').textContent = `${displayNote(root)}${chordType.suffix} · ${ton.key} Mayor`;
  document.querySelector('.board-eyebrow').textContent = `MÁSTIL / ${instruments[instrument].name.toUpperCase()}`;
  renderFretboard(); renderProgression();
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
  const matchingTonality = tonalities.find(ton => noteToIndex(ton.key) === root);
  if (matchingTonality) {
    selectedTonality = matchingTonality;
    tonalitySelect.value = tonalities.indexOf(matchingTonality);
  }
  updateView();
});
chordSelect.addEventListener('change', event => { chordType = chordTypes.find(type => type.value === event.target.value); updateView(); });
tonalitySelect.addEventListener('change', event => {
  selectedTonality = tonalities[Number(event.target.value)];
  root = noteToIndex(selectedTonality.key);
  rootSelect.value = root;
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
populateControls(); updateView();
