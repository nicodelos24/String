const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteLabels = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
const strings = [40, 45, 50, 55, 59, 64];
const stringNames = ['E', 'A', 'D', 'G', 'B', 'e'];
const scales = {
  majorPentatonic: { name: 'Pentatónica mayor', intervals: [0, 2, 4, 7, 9], description: 'Sonido abierto y directo. Un gran punto de partida.' },
  minorPentatonic: { name: 'Pentatónica menor', intervals: [0, 3, 5, 7, 10], description: 'La voz clásica del blues, rock y soul.' },
  dorian: { name: 'Dórica', intervals: [0, 2, 3, 5, 7, 9, 10], description: 'Menor con un brillo modal y mucho movimiento.' },
  mixolydian: { name: 'Mixolidia', intervals: [0, 2, 4, 5, 7, 9, 10], description: 'Dominante, luminosa y con actitud de rock.' },
  major: { name: 'Mayor (Jónica)', intervals: [0, 2, 4, 5, 7, 9, 11], description: 'La escala completa para resolver en la tónica.' },
  minor: { name: 'Menor natural (Eólica)', intervals: [0, 2, 3, 5, 7, 8, 10], description: 'Color menor profundo y familiar.' }
};
const chordTypes = [
  { value: 'maj7', label: 'Mayor 7', suffix: 'maj7', scale: 'majorPentatonic', role: 'I · Tónica' },
  { value: 'm7', label: 'Menor 7', suffix: 'm7', scale: 'dorian', role: 'ii · Subdominante' },
  { value: '7', label: 'Dominante 7', suffix: '7', scale: 'mixolydian', role: 'V · Tensión' },
  { value: 'm', label: 'Menor', suffix: 'm', scale: 'minorPentatonic', role: 'vi · Relativa menor' }
];
let root = 0;
let chordType = chordTypes[0];
let selectedScale = chordType.scale;
let progression = [{ root: 0, type: 'maj7' }, { root: 5, type: 'm7' }, { root: 7, type: '7' }, { root: 0, type: 'maj7' }];
let activeProgression = 0;
let showNotes = false;

const rootSelect = document.querySelector('#root-select');
const chordSelect = document.querySelector('#chord-select');
const scaleSelect = document.querySelector('#scale-select');
const fretboard = document.querySelector('#fretboard');

function noteName(index) { return notes[(index + 12) % 12]; }
function displayNote(index) { const name = noteName(index); return noteLabels[name] || name; }
function populateControls() {
  rootSelect.innerHTML = notes.map((note, index) => `<option value="${index}">${note}${noteLabels[note] ? ` / ${noteLabels[note]}` : ''}</option>`).join('');
  chordSelect.innerHTML = chordTypes.map(type => `<option value="${type.value}">${type.label}</option>`).join('');
  scaleSelect.innerHTML = Object.entries(scales).map(([key, scale]) => `<option value="${key}">${scale.name}</option>`).join('');
  rootSelect.value = root; chordSelect.value = chordType.value; scaleSelect.value = selectedScale;
}
function renderFretboard() {
  const scale = scales[selectedScale];
  const scaleNotes = new Set(scale.intervals.map(interval => (root + interval) % 12));
  const rows = stringNames.map((name, stringIndex) => {
    const openNote = strings[stringIndex];
    const frets = Array.from({ length: 18 }, (_, fret) => {
      const pitch = openNote + fret;
      const pitchClass = pitch % 12;
      const inScale = scaleNotes.has(pitchClass);
      const isRoot = pitchClass === root;
      const dot = [3, 5, 7, 9, 15].includes(fret + 1) ? '<span class="fret-dot"></span>' : '';
      return `<div class="fret">${dot}<span class="fret-note ${inScale ? 'in-scale' : ''} ${isRoot ? 'root' : ''}" data-note="${displayNote(pitchClass)}" title="${displayNote(pitchClass)}${isRoot ? ' · raíz' : ''}">${displayNote(pitchClass)}</span></div>`;
    }).join('');
    return `<div class="string-row" style="--string-width: ${stringIndex < 3 ? 2 : 1}px"><div class="nut" title="Cuerda ${name}"></div>${frets}</div>`;
  }).join('');
  fretboard.innerHTML = rows;
  fretboard.classList.toggle('show-notes', showNotes);
  document.querySelector('#note-count').textContent = `${scale.intervals.length} notas`;
}
function updateView() {
  const scale = scales[selectedScale];
  document.querySelector('#chord-readout').textContent = `${displayNote(root)}${chordType.suffix}`;
  document.querySelector('#chord-role').textContent = chordType.role;
  document.querySelector('#scale-name').textContent = scale.name;
  document.querySelector('#scale-description').textContent = scale.description;
  document.querySelector('#board-title').textContent = `${displayNote(root)} ${scale.name} · ${chordType.suffix}`;
  renderFretboard(); renderProgression();
}
function renderProgression() {
  document.querySelector('#progression').innerHTML = progression.map((item, index) => {
    const type = chordTypes.find(candidate => candidate.value === item.type);
    return `<div class="progression-card ${index === activeProgression ? 'active' : ''}" data-index="${index}"><button type="button" data-remove="${index}" aria-label="Quitar acorde ${index + 1}">×</button><small>${['I', 'ii', 'V', 'I', 'vi', 'IV'][index] || `#${index + 1}`}</small><strong>${displayNote(item.root)}${type.suffix}</strong></div>`;
  }).join('');
}
rootSelect.addEventListener('change', event => { root = Number(event.target.value); updateView(); });
chordSelect.addEventListener('change', event => { chordType = chordTypes.find(type => type.value === event.target.value); selectedScale = chordType.scale; scaleSelect.value = selectedScale; updateView(); });
scaleSelect.addEventListener('change', event => { selectedScale = event.target.value; updateView(); });
document.querySelector('#toggle-notes').addEventListener('click', event => { showNotes = !showNotes; event.currentTarget.setAttribute('aria-pressed', showNotes); renderFretboard(); });
document.querySelector('#progression').addEventListener('click', event => {
  const remove = event.target.closest('[data-remove]');
  if (remove) { if (progression.length > 1) { progression.splice(Number(remove.dataset.remove), 1); activeProgression = Math.min(activeProgression, progression.length - 1); renderProgression(); } return; }
  const card = event.target.closest('[data-index]');
  if (card) { activeProgression = Number(card.dataset.index); const item = progression[activeProgression]; root = item.root; chordType = chordTypes.find(type => type.value === item.type); selectedScale = chordType.scale; populateControls(); updateView(); }
});
document.querySelector('#add-chord').addEventListener('click', () => { progression.push({ root, type: chordType.value }); activeProgression = progression.length - 1; renderProgression(); });
fretboard.addEventListener('click', event => { const note = event.target.closest('.fret-note'); if (note) { document.querySelector('.hint').textContent = `${note.dataset.note}: ${note.classList.contains('root') ? 'raíz de la escala' : 'nota disponible'}`; } });
populateControls(); updateView();
