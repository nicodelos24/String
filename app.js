// Estado, controles y render de la página.
// Las tablas musicales y sus funciones puras viven en `music-model.js`, el
// estado en `app-state.js` y el dibujo de la escala y del mástil en
// `fretboard-render.js`; `index.html` carga los tres antes que este archivo
// (T-01). Acá se declara el estado una sola vez y cada nombre queda publicado
// como acceso al objeto central, así que el resto de los scripts lo sigue
// leyendo y escribiendo por su nombre. Este archivo queda como el orquestador:
// controles, listeners, leyendas, tarjetas y persistencia.
declareAppState('instrument', 'guitar');
declareAppState('selectedTonality', tonalities[0]); // Escala global base
// T-45 · QA-TONAL-02: la tonalidad de la canción. Cuando está fijada es el
// contexto tonal de la página: colores y grados se leen desde su tónica y el
// modo diatónico lo decide el contrato T-44 (tonal-context.js). Lo de la
// tarjeta no se toca: posiciones, resaltado y modo explícito siguen midiendo
// desde la raíz, así que un acorde prestado o cromático no se infla.
declareAppState('songTonality', null);
const songTonalityByKey = id => tonalities.find(item => tonalityId(item) === id || (item.scale === 'major' && item.key === id)) ?? null;
function setSongTonality(id) {
  songTonality = id ? songTonalityByKey(id) : null;
  renderSongTonalityPiano();
  updateView();
}
// Tónica de la tonalidad fijada, como índice de clase de paso. Sin tonalidad es
// null y cada uso cae al comportamiento de la tarjeta con el mismo resultado
// que hoy: el mástil no nota la tonalidad que no está.
function songTonic() {
  return songTonality ? noteToIndex(songTonality.key) : null;
}
// T-45 · corrección de la devolución QA-TONAL-02: el modo que gobierna el
// mástil con la tonalidad de canción fijada sale del contrato T-44
// (tonal-context.js), y no del modo guardado de la tarjeta. Un acorde
// diatónico a la tonalidad se dibuja con el modo de su grado (Dm en Do es el
// ii grado → dórico, aunque el acorde esté guardado como eólico); el
// prestado, el cromático o la calidad incompatible devuelven null y el
// mástil conserva el modo explícito de la tarjeta, sin conversión
// silenciosa. El modo explícito nunca se pisa: queda para el rótulo de su
// tarjeta, su guardado y el mástil sin tonalidad.
function songInferredMode() {
  if (!songTonality) return null;
  const inferred = typeof TonalContext !== 'undefined' && TonalContext?.inferTonalContext
    ? TonalContext.inferTonalContext(
        { root, type: chordType?.value },
        { key: songTonality.key, scale: songTonality.scale }
      )
    : null;
  return inferred && Object.hasOwn(modes, inferred) ? inferred : null;
}
declareAppState('root', 0); // Raíz del acorde (índice)
declareAppState('rootNoteName', 'C'); // Nombre específico de la nota seleccionada por el usuario
declareAppState('quality', 'major'); // Calidad seleccionada (mayor, minor, diminished)
declareAppState('selectedMode', 'ionian'); // Modo seleccionado por defecto
declareAppState('chordType', chordTypes[0]); // Tipo de acorde específico (para compatibility)
declareAppState('progression', [{ root: 0, type: 'maj' }, { root: 5, type: 'm7' }, { root: 7, type: '7' }, { root: 0, type: 'maj' }]);
const initialProgression=progression;
const initialProgressionSnapshot=JSON.stringify(progression);
declareAppState('progressionEdited', false);
const customProgressionKey='traste.customProgression.v1';
function saveCustomProgression(){
  if(typeof localStorage==='undefined')return;
  try{
    localStorage.setItem(customProgressionKey, JSON.stringify(progression.map(item=>({
      root:item.root,
      rootNoteName:item.rootNoteName||undefined,
      type:item.type,
      mode:item.mode,
      ghostMode:validGhostMode(item.ghostMode),
      variants:validVariants(item.variants),
      beats:validBeats(item.beats)
    }))));
  }catch{/* Sin almacenamiento: la opción «Mi progresión» usa la progresión actual. */}
}
// Lee el slot de «Mi progresión» y lo devuelve ya limpio. Un null significa «no
// hay guardado» o «está corrupto», y una lista vacía es una decisión del autor
// (borró todas las tarjetas), no un fallo: por eso no se puede preguntar solo
// por la longitud, que es lo que hacía que al recargar volvieran las tarjetas
// iniciales. Lo usan tanto la restauración al cargar como la plantilla.
function readCustomProgression(){
  if(typeof localStorage==='undefined')return null;
  try{
    const raw=localStorage.getItem(customProgressionKey);
    const parsed=raw?JSON.parse(raw):null;
    if(!Array.isArray(parsed))return null;
    const chords=parsed.map(item=>({
      root:Number.isInteger(item.root)?((item.root%12)+12)%12:null,
      rootNoteName:item.rootNoteName,
      type:item.type,
      mode:item.mode,
      ghostMode:validGhostMode(item.ghostMode),
      variants:validVariants(item.variants),
      beats:validBeats(item.beats)
    })).filter(item=>item.root!==null&&chordTypes.some(type=>type.value===item.type));
    // Si traía acordes y todos son inservibles, el guardado está corrupto y se
    // devuelve null: mejor la progresión inicial que un mástil sin nada que tocar.
    return !chords.length&&parsed.length?null:chords;
  }catch{return null;}
}
// Al recargar se restaura la progresión propia guardada, igual que si se
// eligiera «Mi progresión»: las tarjetas quedan tal como se estaban editando.
function restoreCustomProgression(){
  const chords=readCustomProgression();
  if(!chords)return;
  playingProgressionItem=null;
  progressionEdited=true;
  progression=chords;
  activeProgression=progression.length?0:-1;
  if(activeProgression>=0)selectProgressionChord(0);
  renderProgression();
}
declareAppState('selectedFretMidi', null);
declareAppState('activeProgression', 0);
declareAppState('playingProgressionItem', null);
declareAppState('draggingProgressionItem', null);
// Qué se ve en cada traste y cuánto del mástil se muestra. Antes eran dos
// variables que las dos hablaba del alcance («escala» o «todas»), y por eso los
// botones se pisaban: ahora cada botón contesta una sola pregunta.
// Los dos botones del pie no se cruzan: cada uno rotula una zona del mástil y
// solo él. VER escribe en la escala dibujada (las notas del modo y, con la
// pentatónica apagada, las del acorde) y MÁSTIL en el resto del mástil, que es
// lo que queda fuera de la escala.
// Las fases se nombran, no se escriben con números: se reordenaron un par de
// veces al cambiar los rótulos, y con números sueltas el resalte y el valor de
// arranque se quedaban apuntando a la fase equivocada. FRET_OFF es la apagada
// en los dos botones.
// La escala arranca en grados, que es lo que pediste; con un clic pasa a
// apagada. Cambiar el arranque es cambiar esta línea y el `span` de
// `index.html`, para que el HTML estático no contradiga a lo que se pinta.
const FRET_OFF = 0, FRET_NOTES = 1, FRET_DEGREES = 2;
declareAppState('verLevel', FRET_DEGREES);    // qué pone en cada nota de la escala dibujada
declareAppState('mastilScope', FRET_OFF);     // qué pone en el resto del mástil
declareAppState('displayModeIndex', 1); // 0 = grados completos, 1 = raíz, 3ra, 5ta, 2 = raíz, 3ra, 5ta, 7ma
const displayModes = ['full', 'triad', 'seventh', 'modeChord', 'modeSeventh'];
const displayModeLabels = ['grados', 'tríada', '7ma', 'Acorde', 'Acorde 7ma'];
declareAppState('ghostMode', ''); // Modo fantasma seleccionado (vacío = ninguno)

// Inicializar el tipo de acorde según la calidad
if (quality === 'major') chordType = chordTypes[0]; // Mayor
else if (quality === 'minor') chordType = chordTypes[3]; // Menor
else if (quality === 'diminished') chordType = chordTypes[6]; // Disminuido


const rootSelect = document.querySelector('#root-select');
const qualitySelect = document.querySelector('#quality-select');
const instrumentSelect = document.querySelector('#instrument-select');
const fretboard = document.querySelector('#fretboard');
const modeSelector = document.querySelector('#mode-selector');

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



declareAppState('pianoUseFlats', false);

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
  // Mover el switch a mano también cambia cómo MÁSTIL escribe el resto del
  // mástil, así que hay que repintarlo aunque la raíz no cambie de nombre.
  else { renderRootPiano(); renderFretboard(); }
});

// Refleja la escritura ♯/♭ en el switch de la raíz y en su espejo del teclado
// sin cambiar la raíz ni la escala. Lo usan los acordes en vivo (micrófono y
// teclado) para que el switch acompañe a la nota que está sonando.
function setChordSpelling(useFlats) {
  pianoUseFlats = Boolean(useFlats);
  const el = document.querySelector('#root-spelling');
  if (el) {
    const changed = el.checked !== pianoUseFlats;
    el.checked = pianoUseFlats;
    if (changed && typeof el.dispatchEvent === 'function' && typeof Event !== 'undefined') {
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}
// El switch ♯/♭ acompaña a lo que está sonando: al elegir un acorde o un modo
// se coloca en la armadura de su clave (Re mayor → sostenidos, Fa mayor →
// bemoles), igual que ya hacían los acordes en vivo del micrófono y del
// teclado. Solo se mueve cuando la clave tiene accidentales: en Do no hay
// nada que seguir y el switch queda como lo deje el autor, que es donde hace
// falta para nombrar a mano las notas que no son de la escala.
// Devuelve si se movió, para que quien llama sepa si la armadura cambió.
function syncSpellingToKeySignature(keySignature) {
  if (!keySignature || (keySignature.flats === 0 && keySignature.sharps === 0)) return false;
  const useFlats = keySignature.flats > 0;
  if (useFlats === pianoUseFlats) return false;
  setChordSpelling(useFlats);
  return true;
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

// T-31 · Panel de variantes por vuelta: crear, mostrar, cambiar y quitar las
// excepciones de fantasma de las vueltas 1 a 8 del acorde seleccionado, desde
// la interfaz y sin editar JSON. La oferta por vuelta es la de la calidad del
// acorde sin su modo (acotación de QA en T-20): nunca un modo que la app no
// dibuje. Se vuelve a pintar con renderProgression y showProgressionChord,
// así la carga, la biblioteca, las plantillas y la selección lo dejan siempre
// acorde con la tarjeta activa.
function updateVariantsEditor() {
  const editor = document.querySelector('#variants-editor');
  if (!editor) return;
  // Re-entrega T-31 (acotación QA): el repintado reescribe innerHTML y tiraba
  // el foco al BODY justo cuando se cambiaba una vuelta con el teclado — para
  // editar las ocho vueltas había que volver a tabular desde el principio.
  // Antes de reescribir se anota el [data-vuelta] enfocado; al terminar, el
  // foco vuelve al select de la misma vuelta (nodo nuevo tras el repaint).
  // Guarda por el sandbox de los tests: no todo documento fake define
  // activeElement ni propaga closest.
  const marcado = document.activeElement;
  const enfocado = marcado && typeof marcado.closest === 'function'
    ? marcado.closest('[data-vuelta]')
    : null;
  const vueltaFoco = enfocado ? Number(enfocado.dataset.vuelta) : null;
  const activo = Number.isInteger(activeProgression) && activeProgression >= 0 ? progression[activeProgression] : null;
  if (!activo) {
    editor.innerHTML = '<summary>Variantes por vuelta</summary><p class="variants-hint">Elegí una tarjeta: el panel edita sus vueltas.</p>';
    return;
  }
  const type = chordTypes.find(candidate => candidate.value === activo.type);
  const calidad = chordQualityOf(activo);
  const modoBase = activo.mode || defaultChordMode(activo);
  const ofrecidos = getAvailableModes(calidad).filter(modeKey => modeKey !== modoBase);
  // validVariants da el objeto normalizado (vueltas 1–8, modos conocidos): lo
  // leen el contador del resumen y cada fila. Las claves pueden ser texto
  // («2») del JSON restaurado o número: la lectura por índice cubre ambas.
  const variantes = validVariants(activo.variants) || {};
  const cuenta = Object.keys(variantes).length;
  let filas = '';
  for (let vuelta = 1; vuelta <= 8; vuelta++) {
    const vigente = validGhostMode(variantes[vuelta] && variantes[vuelta].ghostMode);
    // Una variante que el modo base no deja ofrecer pero ya estaba guardada
    // no desaparece: entra a la lista para poder verla y volver a la base.
    const opciones = vigente && !ofrecidos.includes(vigente) ? [vigente].concat(ofrecidos) : ofrecidos;
    filas += `<label class="variants-row"><span class="variants-vuelta">V${vuelta}</span><select data-vuelta="${vuelta}" aria-label="Fantasma de la vuelta ${vuelta} del acorde ${activeProgression + 1}"><option value=""${vigente ? '' : ' selected'}>(base del acorde)</option>${opciones.map(modeKey => `<option value="${modeKey}"${modeKey === vigente ? ' selected' : ''}>${modes[modeKey]?.name || modeKey}</option>`).join('')}</select></label>`;
  }
  const nombre = (activo.rootNoteName || noteName(activo.root)) + (type ? type.suffix : '');
  editor.innerHTML = `<summary>Variantes por vuelta · ${cuenta ? `${cuenta} variante${cuenta === 1 ? '' : 's'}` : 'sin variantes'} <span class="variants-chord">de ${nombre}</span></summary><div class="variants-rows">${filas}</div><p class="variants-hint">Cada vuelta del Acompañamiento puede mostrar en el mástil otra escala adicional sin cambiar el acorde. La opción base es el modo del acorde; las variantes viajan con la tarjeta al guardar, reabrir y duplicar.</p>`;
  // Re-entrega T-31: restauro el foco solo si la vuelta enfocada sigue en el
  // panel repintado (tras borrar la tarjeta las filas ya no están ahí).
  if (vueltaFoco !== null) {
    const reelegido = editor.querySelector(`select[data-vuelta="${vueltaFoco}"]`);
    if (reelegido && typeof reelegido.focus === 'function') reelegido.focus();
  }
}

// T-31 · Escribe o borra la variante de una vuelta (1 a 8) del acorde activo.
// La oferta manda: un modo que no esté en la calidad correspondiente (o que
// sea el modo del acorde, que es la base) no se guarda aunque llegue por el
// evento. Volver la vuelta a base la borra; sin una sola variante, la clave
// sale del acorde. Persistencia por la puerta de siempre: saveCustomProgression.
function setProgressionVariants(index, vuelta, ghost) {
  if (!Number.isInteger(index) || index < 0 || index >= progression.length) return;
  const item = progression[index];
  if (!Number.isInteger(vuelta) || vuelta < 1 || vuelta > 8) return;
  const modo = validGhostMode(ghost);
  const ofrecidos = getAvailableModes(chordQualityOf(item)).filter(modeKey => modeKey !== (item.mode || defaultChordMode(item)));
  if (modo && ofrecidos.includes(modo)) {
    const variantes = validVariants(item.variants) || {};
    variantes[vuelta] = {ghostMode: modo};
    item.variants = variantes;
  } else if (item.variants && typeof item.variants === 'object') {
    delete item.variants[vuelta];
    delete item.variants[String(vuelta)];
    if (!validVariants(item.variants)) item.variants = undefined;
  }
  progressionEdited = true;
  saveCustomProgression();
  renderProgression();
}


declareAppState('pentatonicView', false);
function pentatonicMode(){
  if(selectedMode==='majorPentatonic'||selectedMode==='minorPentatonic')return selectedMode;
  return chordType.intervals.includes(3)?'minorPentatonic':'majorPentatonic';
}
// Respeta la elección explícita; en modos diatónicos adapta la pentatónica al acorde.
// Con la tonalidad de la canción fijada, el modo que gobierna el mástil sale
// del contrato T-44 (ver songInferredMode): el inferido manda y el modo
// explícito de la tarjeta solo vuelve cuando la inferencia da null.
function viewMode(){
  if(pentatonicView)return pentatonicMode();
  return songInferredMode() ?? selectedMode;
}
document.querySelector('#pentatonic-view').addEventListener('change',event=>{pentatonicView=event.target.checked;updateView();});
let updateViewDepth = 0;
function updateView({ renderCards = true } = {}) {
  const outermost = updateViewDepth === 0;
  updateViewDepth++;
  try {
  const mode = viewMode();
  modeSelector.querySelectorAll('input[name="mode"]').forEach(radio=>{radio.checked=radio.value===mode;});
  if(displayModeIndex>=3 && !pentatonicView && modes[mode].intervals.length!==7)displayModeIndex=1;
  document.querySelector('#display-label').textContent=displayModeLabels[displayModeIndex];
  renderRootPiano();
  const selectedModeData = modes[mode];

  // Calcular la armadura de clave según el modo efectivo (la pentatónica tiene su propia referencia)
  // El switch ♯/♭ se coloca en esa armadura; si al colocarse cambia el nombre
  // de la raíz, la armadura se recalcula con la grafía ya corregida.
  let keySignature = calculateKeySignature(mode, root, rootNoteName);
  if (syncSpellingToKeySignature(keySignature)) keySignature = calculateKeySignature(mode, root, rootNoteName);

  const chordSuffix = chordType.suffix;

  // T-45 · QA-TONAL-02: con la tonalidad de la canción fijada, la armadura que
  // se muestra es la de la canción: cambiar de tarjeta no mueve el contexto.
  if (songTonality) {
    keySignature = { sharps: songTonality.sharps, flats: songTonality.flats, key: songTonality.key };
  }

  // Actualizar la tonalidad global basada en el modo seleccionado
  const matchingTonality = songTonality || tonalities.find(ton => ton.scale === 'major' && ton.key === keySignature.key);
  if (matchingTonality) {
    selectedTonality = matchingTonality;
  }

  // Mostrar la armadura de clave calculada
  const keySignatureText = keySignature.sharps > 0 
    ? `${keySignature.sharps} sostenidos` 
    : keySignature.flats > 0 
      ? `${keySignature.flats} bemoles` 
      : 'Natural';

  document.querySelector('#key-signature-display').textContent = `${keySignature.key} ${songTonality?.scale === 'minor' ? 'Menor' : 'Mayor'} · ${keySignatureText}`;
  document.querySelector('#chord-readout').textContent = `${rootNoteName}${chordSuffix}`;
  document.querySelector('#mode-display').textContent = selectedModeData.name;
  document.querySelector('#key-signature-chord').textContent = `Armadura: ${keySignatureText}`;
  document.querySelector('#board-title').textContent = `${rootNoteName}${chordSuffix} · ${selectedModeData.name}`;
  document.querySelector('#board-add-chord').textContent = `${rootNoteName}${chordSuffix}`.replace(/#/g, '♯').replace(/b/g, '♭');
  document.querySelector('.board-eyebrow').textContent = `MÁSTIL / ${instruments[instrument].name.toUpperCase()}`;

  updateModeLegend();
  renderFretboard();
  if (renderCards && outermost) renderProgression();
  } finally {
    updateViewDepth--;
  }
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
// Validación, normalización, rótulos y cuadrícula viven en `progression-duration.js`,
// el único contrato de duraciones: lo consumen app.js, la biblioteca (al validar y
// guardar) y la cuantización del importado MIDI. index.html lo carga antes de app.js.
// El DEFAULT_BEATS que expone es el del acorde nuevo/sin duración; el 4 del
// compás musical se queda escrito a mano.

function renderProgression() {
  if (draggingProgressionItem) return;
  // T-31 · El panel de variantes pinta con la tarjeta activa: es el mismo
  // punto de re-pintado que usan la carga, la biblioteca, las plantillas y
  // la selección (updateView llama renderProgression).
  updateVariantsEditor();
  const entries=globalThis.StringSections?globalThis.StringSections.visible():progression.map((item,index)=>({item,index}));
  const list=document.querySelector('#progression');
  if(!entries.length){
    list.innerHTML=progression.length?'':'<p class="progression-empty">Agrega con «añadir acorde».</p>';
    return;
  }
  let cursor = 0; // Pulsos acumulados: marcan el inicio de cada compás de 4/4.
  list.innerHTML = entries.map(({item,index}) => {
    const type = chordTypes.find(candidate => candidate.value === item.type);
    const beats = validBeats(item.beats);
    const barNumber = Math.floor(cursor / 4) + 1;
    cursor += beats;
    // Una duración fuera de la cuadrícula de la interfaz no se prohibió en el
    // guardado, así que no se oculta: el selector muestra el valor real como
    // opción extra, y elegir alguna de las ocho vuelve a la cuadrícula.
    const fueraDeRejilla = beatOptions.includes(beats) ? '' : `<option value="${beats}" selected>${beatsLabel(beats)}</option>`;
    // T-31 · El badge de variantes: cuenta las vueltas con excepción válida
    // (el mismo normalizador del guardado) y abre el panel al clicar.
    const cuentaVariantes = Object.keys(validVariants(item.variants) || {}).length;
    const badgeVariantes = `<button type="button" class="variants-badge" data-variants="${index}" title="Variantes por vuelta" aria-label="Variantes por vuelta del acorde ${index + 1}">♪${cuentaVariantes ? ' ' + cuentaVariantes : ''}</button>`;
    // T-09 · Si la tarjeta tiene marca de tiempo del video, su minuto es un
    // botón que salta el video a ese punto. Sin marca no se pinta nada: no hay
    // destino al que saltar. Va en la fila de controles que ya existe para no
    // mover el alto de la banda fija de T-53.
    const marcaVideo = globalThis.StringVideoSync?.labelFor?.(index) || '';
    const saltoVideo = marcaVideo ? `<button type="button" class="video-jump" data-video-jump="${index}" title="Salta el video a ${marcaVideo}" aria-label="Salta el video a ${marcaVideo} (acorde ${index + 1})">${marcaVideo}</button>` : '';
    const beatsSelect = `<label class="beats-control" title="Duración: ${beatsLabel(beats)} de compás"><span class="sr-only">Duración del acorde ${index + 1}</span><select data-beats="${index}" aria-label="Duración del acorde ${index + 1}">${fueraDeRejilla}${beatOptions.map(option => `<option value="${option}"${option === beats ? ' selected' : ''}>${beatsLabel(option)}</option>`).join('')}</select></label>`;
    // El minuto del video comparte la línea de la duración: así el chip no
    // agrega alto y la banda de T-53 no crece. Sin marca se deja la duración
    // sola, con el mismo marcado de antes.
    const filaBeats = saltoVideo ? `<span class="beats-row">${beatsSelect}${saltoVideo}</span>` : beatsSelect;
    return `<div class="progression-card ${index === activeProgression ? 'active' : ''} ${item === playingProgressionItem ? 'playing' : ''}" data-index="${index}" tabindex="0" role="group" aria-label="Acorde ${index + 1}, compás ${barNumber}, ${beatsLabel(beats)} de compás. Arrastrar o usar Alt y flechas para mover. Flechas arriba y abajo para recorrer. Supr para borrar.">><button type="button" data-remove="${index}" aria-label="Quitar acorde ${index + 1}">×</button>${badgeVariantes}<small>${index + 1}${item === playingProgressionItem ? ' · sonando' : ''}</small><span class="progression-mode">${modes[item.mode || defaultChordMode(item)]?.name || ''}</span>${filaBeats}<span class="drag-grip" aria-hidden="true">⠿</span><strong>${item.rootNoteName || noteName(item.root)}${type ? type.suffix : ''}</strong></div>`;
  }).join('');
}

// Seleccionar una tarjeta cambia su estado activo/sonando, no el contenido de
// las demás. No reconstruir miles de nodos en cada cambio de acorde: los flujos
// que sí cambian la lista siguen llamando a renderProgression() explícitamente.
function updateProgressionSelection() {
  const list = document.querySelector('#progression');
  if (!list) return;
  const active = list.querySelector('.progression-card.active');
  active?.classList?.remove('active');
  const playing = list.querySelector('.progression-card.playing');
  if (playing) {
    playing.classList?.remove('playing');
    const index = Number(playing.dataset?.index);
    const label = playing.querySelector?.('small');
    if (label && Number.isInteger(index)) label.textContent = String(index + 1);
  }
  const activeIndex = Number.isInteger(activeProgression) ? activeProgression : -1;
  const activeCard = activeIndex >= 0 ? list.querySelector(`[data-index="${activeIndex}"]`) : null;
  activeCard?.classList?.add('active');
  const playingIndex = progression.indexOf(playingProgressionItem);
  if (playingIndex >= 0) {
    const playingCard = list.querySelector(`[data-index="${playingIndex}"]`);
    playingCard?.classList?.add('playing');
    const label = playingCard?.querySelector?.('small');
    if (label) label.textContent = `${playingIndex + 1} · sonando`;
  }
  updateVariantsEditor();
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

// T-31 · Los select del panel de variantes: cada change escribe o borra la
// variante de esa vuelta del acorde activo (misma puerta que el resto del
// autoguardado). El badge de la tarjeta y el resumen quedan al día porque
// setProgressionVariants repinta las tarjetas.
const variantsEditor = document.querySelector('#variants-editor');
if (variantsEditor) {
  variantsEditor.addEventListener('change', event => {
    const select = event.target.closest('[data-vuelta]');
    if (!select) return;
    setProgressionVariants(activeProgression, Number(select.dataset.vuelta), select.value);
  });
}

// T-45 · QA-TONAL-02: el selector de tonalidad de canción arma el contexto
// tonal de la página; volver a «Sin tonalidad fija» devuelve el mástil al
// comportamiento de la tarjeta de siempre.
const songTonalitySelect = document.querySelector('#song-tonality');
if (songTonalitySelect) {
  songTonalitySelect.addEventListener('change', event => {
    setSongTonality(event.target.value);
  });
}

// T-59: ambos controles usan la tonalidad de canción; no hay estado ni
// persistencia paralela. Entre enarmónicas se conserva la grafía elegida
// y, si no existe en el otro modo, se usa la armadura más sencilla.
function songPianoTonality(pitch, scale) {
  const candidates = tonalities.filter(item => item.scale === scale && noteToIndex(item.key) === pitch);
  return candidates.find(item => item.key === songTonality?.key)
    || candidates.sort((a, b) => (a.sharps + a.flats) - (b.sharps + b.flats))[0];
}

function renderSongTonalityPiano() {
  const piano = document.querySelector('#song-tonality-piano');
  if (!piano) return;
  const scale = songTonality?.scale || 'major';
  const key = (pitch, black, position) => {
    const tonality = songPianoTonality(pitch, scale);
    const label = tonality.key.replace('#', '♯').replace('b', '♭');
    return `<button type="button" class="piano-key ${black ? 'piano-black' : 'piano-white'}" data-song-pitch="${pitch}" aria-pressed="${songTonic() === pitch}" aria-label="${label} ${scale === 'minor' ? 'menor' : 'mayor'}" style="--key-position: ${position}"><span>${label}</span></button>`;
  };
  piano.innerHTML = [0, 2, 4, 5, 7, 9, 11].map((pitch, i) => key(pitch, false, i)).join('')
    + [[1, 1], [3, 2], [6, 4], [8, 5], [10, 6]].map(([pitch, position]) => key(pitch, true, position)).join('');
  document.querySelector('#song-tonality-minor').checked = scale === 'minor';
  document.querySelector('#song-tonality').value = songTonality ? tonalityId(songTonality) : '';
  document.querySelector('#song-tonality-current').textContent = songTonality
    ? `${songTonality.key.replace('#', '♯').replace('b', '♭')} ${scale === 'minor' ? 'menor' : 'mayor'}`
    : 'Sin tonalidad fija';
}

document.querySelector('#song-tonality-piano')?.addEventListener('click', event => {
  const key = event.target.closest('[data-song-pitch]');
  if (!key) return;
  const pitch = Number(key.dataset.songPitch);
  const tonality = songPianoTonality(pitch, songTonality?.scale || 'major');
  if (!tonality) return;
  setSongTonality(tonalityId(tonality));
  document.querySelector(`#song-tonality-piano [data-song-pitch="${pitch}"]`)?.focus();
});
document.querySelector('#song-tonality-minor')?.addEventListener('change', event => {
  const tonality = songPianoTonality(songTonic() ?? 0, event.target.checked ? 'minor' : 'major');
  setSongTonality(tonalityId(tonality));
});
renderSongTonalityPiano();

// Event listener para el botón de ciclo de modo de visualización
document.querySelector('#toggle-display').addEventListener('click', event => { 
  displayModeIndex = (displayModeIndex + 1) % (pentatonicView || modes[viewMode()].intervals.length===7 ? displayModes.length : 3);
  const button = event.currentTarget;
  const buttonText = button.querySelector('#display-label');

  // Actualizar el texto del botón según el modo
  buttonText.textContent = displayModeLabels[displayModeIndex];

  renderFretboard(); 
});

document.querySelector('#toggle-notes').addEventListener('click', () => {
  verLevel = (verLevel + 1) % VER_LABELS.length;
  paintFretLabelButtons();
  renderFretboard();
});

document.querySelector('#toggle-degrees').addEventListener('click', () => {
  mastilScope = (mastilScope + 1) % MASTIL_LABELS.length;
  paintFretLabelButtons();
  renderFretboard();
});

paintFretLabelButtons();

function defaultChordMode(item) {
  const type = chordTypes.find(candidate => candidate.value === item.type) || chordTypes[0];
  if (item.type === '7' || item.type === '7sus4' || item.type === '9' || item.type === 'sus2' || item.type === 'sus4') return 'mixolydian';
  // La 11 es la dominante con la Once puesta: también mixolidio. La 13 sobre
  // fundamental mayor también; sobre menor, dórico como las novenas.
  if (item.type === '11' || item.type === '13') return 'mixolydian';
  if (item.type === 'm6' || item.type === 'm9' || item.type === 'm11') return 'dorian';
  return type.intervals.includes(6) ? 'locrian'
    : type.intervals.includes(3) ? 'aeolian' : 'ionian';
}

function showProgressionChord(item, index = -1) {
  if (!item) return;
  activeProgression = index;
  root = item.root;
  rootNoteName = item.rootNoteName || noteName(root);
  chordType = chordTypes.find(type => type.value === item.type) || chordTypes[0];
  quality = chordQualityOf(item);
  selectedMode = item.mode || defaultChordMode(item);
  ghostMode = item.ghostMode || '';
  populateControls();
  updateView({ renderCards: false });
  updateProgressionSelection();
  // Desplazar solo la banda, y solo lo necesario: no mover la página ni
  // interferir con la rueda cuando la tarjeta ya está a la vista.
  const list = document.querySelector('#progression');
  const card = index >= 0 && list.querySelector(`.progression-card[data-index="${index}"]`);
  if (card?.getBoundingClientRect && list.getBoundingClientRect) {
    const bounds = list.getBoundingClientRect(), rect = card.getBoundingClientRect();
    if (rect.left < bounds.left || (rect.width > bounds.width && rect.right > bounds.right)) list.scrollLeft += rect.left - bounds.left;
    else if (rect.right > bounds.right) list.scrollLeft += rect.right - bounds.right;
    if (rect.top < bounds.top || (rect.height > bounds.height && rect.bottom > bounds.bottom)) list.scrollTop += rect.top - bounds.top;
    else if (rect.bottom > bounds.bottom) list.scrollTop += rect.bottom - bounds.bottom;
  }
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

// `deferSave`: el compositor de bloques (sections.js) duplica un bloque entero
// en un bucle y después recoloca las copias al final. Si cada clon escribe su
// propio autoguardado, customProgression.v1 queda con el orden intermedio del
// bucle (devolución QA de T-41): el flujo entero persiste UNA vez, cuando el
// que orquesta termina. Los demás usos (una tarjeta a la vez) no lo pasan y
// guardan como siempre.
// T-31 · Copia de las variantes para duplicar: superficial hacia afuera y
// profunda en cada vuelta, para que el clon herede las variantes pero ya no
// comparta el objeto con la original (mutar uno no mueve al otro).
function cloneVariants(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const out = {};
  for (const key of Object.keys(value)) {
    const turno = value[key];
    out[key] = turno && typeof turno === 'object' && !Array.isArray(turno) ? {...turno} : turno;
  }
  return out;
}

function duplicateProgressionChord(index, deferSave=false) {
  if (!Number.isInteger(index) || !progression[index] || progression.length >= 4096 || draggingProgressionItem) return;
  const clon = {...progression[index], variants: cloneVariants(progression[index].variants)};
  progression.splice(index + 1, 0, clon);
  globalThis.StringSections?.include(progression[index],progression[index+1]);
  progressionEdited=true;
  if(!deferSave)saveCustomProgression();
  selectProgressionChord(index + 1);
  renderProgression();
}

// La tarjeta que se añade. Sin `item` es la de siempre: lo que está elegido a la
// izquierda. Con `item` es la que trae el micrófono o el teclado, y entonces el
// tipo y el modo son los de esa detección y no los de los controles, que es lo
// único que hace que «improvisar» pueda añadir lo que se está tocando y no lo
// que estaba seleccionado de antes.
function progressionChordEntry(item) {
  if (!item || !Number.isInteger(item.root)) return {root, rootNoteName, type: chordType.value, mode: selectedMode, ghostMode, beats: DEFAULT_BEATS};
  const type = chordTypes.find(candidate => candidate.value === item.type);
  if (!type) return {root, rootNoteName, type: chordType.value, mode: selectedMode, ghostMode, beats: DEFAULT_BEATS};
  const rootIndex = ((item.root % 12) + 12) % 12;
  // Un modo que la app no conoce (un guardado raro, o una detección nueva) cae al
  // que le corresponde al acorde: pintar el mástil hace modes[mode].color y una
  // clave inventada lo reventaría.
  const mode = item.mode && modes[item.mode] ? item.mode : defaultChordMode({root: rootIndex, type: type.value});
  return {root: rootIndex, rootNoteName: item.rootNoteName || displayNoteSpelled(rootIndex), type: type.value, mode, beats: DEFAULT_BEATS};
}

function addProgressionChord(item) {
  if(draggingProgressionItem || progression.length>=4096)return false;
  progressionEdited=true;
  progression.push(progressionChordEntry(item));
  globalThis.StringSections?.include(null,progression[progression.length-1]);
  activeProgression = progression.length - 1;
  saveCustomProgression();
  // Un acorde explícito puede no ser el que estaba sonando, así que se selecciona
  // para que el mástil lo muestre. Sin item no hace falta: los controles ya lo
  // son, y volver a pintar sería trabajo de más.
  if(item)selectProgressionChord(activeProgression);
  renderProgression();
  return true;
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
    renderProgression();
  } else {
    if (activeProgression > index) activeProgression--;
    renderProgression();
  }
}

document.querySelector('#progression').addEventListener('click', event => {
  if (event.target.closest('select')) return;
  const remove = event.target.closest('[data-remove]');
  if (remove) { removeProgressionChord(Number(remove.dataset.remove)); return; }
  // T-31 · El badge de variantes: deja al acorde seleccionado y abre el
  // panel, sin arrancar el Acompañamiento (no cae en el branch de la
  // tarjeta, que sí reproduce desde ahí).
  const badge = event.target.closest('[data-variants]');
  if (badge) {
    selectProgressionChord(Number(badge.dataset.variants));
    const editor = document.querySelector('#variants-editor');
    if (editor) editor.open = true;
    return;
  }
  const card = event.target.closest('[data-index]');
  if (card) {
    const index = Number(card.dataset.index);
    selectProgressionChord(index);
    globalThis.playProgressionFrom?.(index);
  }
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
document.querySelector('#legend-add-chord')?.addEventListener('click', addProgressionChord);
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
    return;
  }
  choosePianoRoot(pitch,pianoUseFlats ? noteLabels[notes[pitch]] || notes[pitch] : notes[pitch]);
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
restoreCustomProgression();
