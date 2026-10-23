// Modelo puro de bloques y arreglo (T-39 · QA-MOD-01): el documento que la
// página todavía no consume. Un bloque reutilizable (un «Verso») se define
// una vez y el arreglo lo refiere las veces que sea; editar el bloque alcanza
// todas sus apariciones, y duplicarlo crea un bloque independiente con id
// nuevo y copia profunda. Autocontenido y sin pantallas: nada de su árbol de
// interfaz, ni de su almacenamiento, ni audio, ni eventos, ni globales de la
// app. Entradas y salidas son objetos planos y copias frescas: ninguna
// función muta lo que recibe y lo que entra de un respaldo no se confía a la
// cara (la forma del acorde es la whitelist que el guardado escribe — su
// guarda vela con app.js leído como texto).
// El sobre versionado al persistir es decisión de T-40 (adaptador); acá el
// documento es puro: {blocks, arrangement, tonality?}. La tonalidad de
// canción es campo del documento (nunca por índice de tarjeta ni por
// instancia de bloque) con la forma definida por el contrato tonal (T-44).
// Límites espejo de las secciones actuales: nombres ≤40, repeticiones 1–8,
// 64 bloques, 4096 acordes por bloque (el techo de la progresión y la
// biblioteca) y 32768 entradas aplanadas («Estructura demasiado larga»).

const NOTE_PC = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
const CHORD_FIELDS = ['root', 'rootNoteName', 'type', 'mode', 'ghostMode', 'variants', 'beats'];
const MAX_BLOCKS = 64;
const MAX_NAME_LENGTH = 40;
const MIN_REPEAT = 1;
const MAX_REPEAT = 8;
const MAX_CHORDS_PER_BLOCK = 4096;
const MAX_FLAT_ENTRIES = 32768;

function isPlain(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Copia profunda de datos planos: los acordes y sus variantes por vuelta
// viajan siempre en copia nueva (la lección T-20: ninguna referencia viva
// cruza el contrato). El techo 1..16 y el predeterminado 4 de duración son
// del módulo progression-duration (T-35); acá el acorde solo exige un
// entero positivo de pulsos y el adaptador normaliza con ese contrato único.
function copyValue(value) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value.map(copyValue);
  if (isPlain(value)) {
    const out = {};
    for (const key of Object.keys(value)) {
      if (value[key] === undefined) continue;
      out[key] = copyValue(value[key]);
    }
    return out;
  }
  throw new Error('El modelo solo lleva datos planos: entró una función u objeto vivo de la app.');
}

// La tónica con la grafía del cómputo ('C', 'F#', 'Bb'… — la misma regla que
// el contrato tonal): cualquier otra cosa es null, sin adivinar. La prueba
// cruza esta copia contra TonalContext.parsePitchClass para que no diverjan.
function parseTonic(text) {
  if (typeof text !== 'string' || text.length < 1) return null;
  const base = NOTE_PC[text[0].toUpperCase()];
  if (base === undefined) return null;
  let alter = 0;
  for (const ch of text.slice(1)) {
    if (ch === '#' || ch === '♯') alter += 1;
    else if (ch === 'b' || ch === '♭') alter -= 1;
    else return null;
  }
  return ((base + alter) % 12 + 12) % 12;
}

// El contexto tonal opcional de canción: la forma (única) del contrato T-44.
// Sin tonalidad el campo no viaja; con ella, mayor y tónica del cómputo.
// Un campo de más se rechaza en voz alta: por acá no se pierde un dato
// sin que alguien lo sepa.
function validateTonality(value) {
  if (value === undefined) return undefined;
  if (!isPlain(value)) throw new Error('La tonalidad de la canción debe ser la forma del contrato tonal (T-44).');
  for (const key of Object.keys(value)) {
    if (key !== 'key' && key !== 'scale') throw new Error(`Tonalidad de la canción con campo desconocido: ${key}.`);
  }
  if (value.scale !== 'major') throw new Error('El contrato tonal (T-44) solo lleva tonalidad mayor: sin conversión silenciosa.');
  if (parseTonic(value.key) === null) throw new Error('La tónica de la tonalidad de la canción debe ser una nota del cómputo (C, F#, Bb…).');
  return {key: value.key, scale: 'major'};
}

function validateChord(value) {
  if (!isPlain(value)) throw new Error('Acorde no válido.');
  for (const key of Object.keys(value)) {
    if (!CHORD_FIELDS.includes(key)) throw new Error(`Acorde con campo desconocido: ${key}.`);
  }
  if (!Number.isInteger(value.root) || value.root < 0 || value.root > 11) throw new Error('La raíz del acorde debe ser una de las 12 del cómputo.');
  if (typeof value.type !== 'string' || !value.type) throw new Error('El acorde debe declarar un tipo válido.');
  for (const key of ['rootNoteName', 'mode', 'ghostMode']) {
    if (value[key] !== undefined && typeof value[key] !== 'string') throw new Error(`El campo ${key} del acorde no es de texto.`);
  }
  if (value.beats !== undefined && (!Number.isInteger(value.beats) || value.beats < 1)) throw new Error('La duración del acorde debe ser un entero positivo de pulsos.');
  if (value.variants !== undefined) {
    if (!isPlain(value.variants)) throw new Error('Las variantes por vuelta deben ser un objeto.');
    for (const vuelta of Object.keys(value.variants)) {
      if (!isPlain(value.variants[vuelta])) throw new Error(`La variante de la vuelta ${vuelta} debe ser un objeto.`);
    }
  }
  const out = {root: value.root, type: value.type};
  for (const key of ['rootNoteName', 'mode', 'ghostMode', 'variants', 'beats']) {
    if (value[key] !== undefined) out[key] = copyValue(value[key]);
  }
  return out;
}

function validateBlock(block, index, ids) {
  if (!isPlain(block)) throw new Error(`El bloque ${index + 1} no es un objeto.`);
  for (const key of Object.keys(block)) {
    if (key !== 'id' && key !== 'name' && key !== 'chords') throw new Error(`Bloque con campo desconocido: ${key}.`);
  }
  if (typeof block.id !== 'string' || !block.id.trim()) throw new Error('Cada bloque necesita un id propio y estable: nunca el índice de una tarjeta.');
  const id = block.id.trim();
  if (ids.has(id)) throw new Error(`Los ids de los bloques son únicos y hay dos con ${id}.`);
  ids.add(id);
  if (typeof block.name !== 'string' || !block.name.trim()) throw new Error(`El bloque ${id} necesita un nombre no vacío para mostrarse.`);
  if (block.name.length > MAX_NAME_LENGTH) throw new Error(`El nombre del bloque ${id} supera ${MAX_NAME_LENGTH} caracteres.`);
  if (!Array.isArray(block.chords) || !block.chords.length) throw new Error(`El bloque ${id} no trae acordes: un bloque sin acordes no se puede reproducir.`);
  if (block.chords.length > MAX_CHORDS_PER_BLOCK) throw new Error(`El bloque ${id} supera el límite de ${MAX_CHORDS_PER_BLOCK} acordes de la progresión y la biblioteca.`);
  return {id, name: block.name.trim(), chords: block.chords.map(validateChord)};
}

function validateArrangement(entries, blockIds, sizes) {
  if (!Array.isArray(entries)) throw new Error('El arreglo debe ser una lista de referencias a bloques.');
  let total = 0;
  return entries.map((entry, index) => {
    if (!isPlain(entry)) throw new Error(`La referencia ${index + 1} del arreglo no es un objeto.`);
    for (const key of Object.keys(entry)) {
      if (key !== 'blockId' && key !== 'repeat') throw new Error(`Referencia del arreglo con campo desconocido: ${key}.`);
    }
    const blockId = typeof entry.blockId === 'string' ? entry.blockId.trim() : '';
    if (!blockIds.has(blockId)) throw new Error(`La referencia ${index + 1} del arreglo apunta a un bloque que no existe: no se inventan bloques implícitos.`);
    if (!Number.isInteger(entry.repeat) || entry.repeat < MIN_REPEAT || entry.repeat > MAX_REPEAT) throw new Error('Las repeticiones del arreglo van de 1 a 8 vueltas, como las secciones de siempre.');
    total += sizes.get(blockId) * entry.repeat;
    if (total > MAX_FLAT_ENTRIES) throw new Error('Estructura demasiado larga: más de 32768 entradas aplanadas.');
    return {blockId, repeat: entry.repeat};
  });
}

// La única puerta: todo documento que el modelo devuelve nace de acá,
// validado por dentro y por fuera, en copias nuevas.
function createStructure(value) {
  if (!isPlain(value)) throw new Error('La estructura debe ser un objeto con bloques y arreglo.');
  for (const key of Object.keys(value)) {
    if (key !== 'blocks' && key !== 'arrangement' && key !== 'tonality') throw new Error(`Estructura con campo desconocido: ${key}.`);
  }
  const ids = new Set();
  const sizes = new Map();
  const blocksIn = value.blocks === undefined ? [] : value.blocks;
  if (!Array.isArray(blocksIn)) throw new Error('Los bloques van en una lista.');
  if (blocksIn.length > MAX_BLOCKS) throw new Error(`La estructura supera el límite de ${MAX_BLOCKS} bloques.`);
  const blocks = blocksIn.map((block, index) => validateBlock(block, index, ids));
  for (const block of blocks) sizes.set(block.id, block.chords.length);
  const arrangementIn = value.arrangement === undefined ? [] : value.arrangement;
  const arrangement = validateArrangement(arrangementIn, ids, sizes);
  const out = {blocks, arrangement};
  const tonality = validateTonality(value.tonality);
  if (tonality) out.tonality = tonality;
  return out;
}

// El id nuevo es opaco y estable: la primera serie libre b1, b2, sin llegar
// a pisar ids propios que el dato ya trae.
function nextBlockId(ids) {
  let n = 1;
  while (ids.has(`b${n}`)) n++;
  return `b${n}`;
}

function editStructure(doc, edit) {
  return createStructure(edit(createStructure(doc)));
}

function addBlock(doc, value) {
  if (!isPlain(value)) throw new Error('El bloque nuevo se describe con un objeto {id?, name, chords}.');
  for (const key of Object.keys(value)) {
    if (key !== 'id' && key !== 'name' && key !== 'chords') throw new Error(`Bloque nuevo con campo desconocido: ${key}.`);
  }
  return editStructure(doc, current => {
    const raw = {
      id: value.id === undefined ? nextBlockId(new Set(current.blocks.map(b => b.id))) : value.id,
      name: value.name,
      chords: value.chords
    };
    return {...current, blocks: [...current.blocks, raw]};
  });
}

function duplicateBlock(doc, blockId) {
  return editStructure(doc, current => {
    const block = current.blocks.find(item => item.id === blockId);
    if (!block) throw new Error(`No existe el bloque ${blockId} para duplicar.`);
    const copy = {
      id: nextBlockId(new Set(current.blocks.map(item => item.id))),
      name: block.name,
      chords: block.chords.map(copyValue)
    };
    return {...current, blocks: [...current.blocks, copy]};
  });
}

function updateBlock(doc, blockId, patch) {
  if (!isPlain(patch)) throw new Error('La edición del bloque se describe con un objeto {name?, chords?}.');
  for (const key of Object.keys(patch)) {
    if (key !== 'name' && key !== 'chords') throw new Error(`Edición del bloque con campo desconocido: ${key}.`);
  }
  if (patch.name === undefined && patch.chords === undefined) throw new Error('La edición del bloque debe traer un nombre o acordes: nada se cambia sin que se note.');
  return editStructure(doc, current => {
    const at = current.blocks.findIndex(item => item.id === blockId);
    if (at < 0) throw new Error(`No existe el bloque ${blockId} para editar.`);
    const next = {...current.blocks[at]};
    if (patch.name !== undefined) next.name = patch.name;
    if (patch.chords !== undefined) next.chords = patch.chords;
    return {...current, blocks: current.blocks.map((block, index) => index === at ? next : block)};
  });
}

// Quitar un bloque suelta sus referencias del arreglo: la referencia
// colgante sería una invalidez silenciosa, y acá nada queda colgando.
function removeBlock(doc, blockId) {
  return editStructure(doc, current => {
    if (!current.blocks.some(item => item.id === blockId)) throw new Error(`No existe el bloque ${blockId} para quitar.`);
    const next = {
      blocks: current.blocks.filter(item => item.id !== blockId),
      arrangement: current.arrangement.filter(entry => entry.blockId !== blockId)
    };
    if (current.tonality) next.tonality = current.tonality;
    return next;
  });
}

function appendArrangement(doc, blockId, repeat = 1) {
  return editStructure(doc, current => ({...current, arrangement: [...current.arrangement, {blockId, repeat}]}));
}

function setArrangementRepeat(doc, index, repeat) {
  return editStructure(doc, current => {
    if (!Number.isInteger(index) || index < 0 || index >= current.arrangement.length) throw new Error(`La posición ${index} del arreglo no existe.`);
    return {...current, arrangement: current.arrangement.map((entry, at) => at === index ? {blockId: entry.blockId, repeat} : entry)};
  });
}

function moveArrangementEntry(doc, from, to) {
  return editStructure(doc, current => {
    const total = current.arrangement.length;
    if (!Number.isInteger(from) || from < 0 || from >= total) throw new Error(`La posición ${from} del arreglo no existe.`);
    if (!Number.isInteger(to) || to < 0 || to >= total) throw new Error(`La posición ${to} del arreglo no existe.`);
    const arrangement = current.arrangement.slice();
    const [entry] = arrangement.splice(from, 1);
    arrangement.splice(to, 0, entry);
    return {...current, arrangement};
  });
}

function removeArrangementEntry(doc, index) {
  return editStructure(doc, current => {
    if (!Number.isInteger(index) || index < 0 || index >= current.arrangement.length) throw new Error(`La posición ${index} del arreglo no existe.`);
    return {...current, arrangement: current.arrangement.filter((entry, at) => at !== index)};
  });
}

// La expansión para reproducción es copia y metadata, en orden determinista:
// entrada a entrada, vuelta a vuelta, acorde a acorde. no muta la
// composición y cada llamada aplanada vuelve a copiar (la copia de ejecución
// que T-20 fijó para el audio se toma de estas copias en T-40).
function flattenArrangement(doc) {
  const current = createStructure(doc);
  const byId = new Map(current.blocks.map(block => [block.id, block]));
  const out = [];
  let pass = 0;
  current.arrangement.forEach((entry, entryIndex) => {
    const block = byId.get(entry.blockId);
    for (let occurrence = 1; occurrence <= entry.repeat; occurrence++) {
      block.chords.forEach((chord, chordIndex) => {
        out.push({
          pass: ++pass,
          entryIndex,
          blockId: entry.blockId,
          occurrence,
          chordIndex,
          label: `${block.name} · repetición ${occurrence}/${entry.repeat}`,
          chord: copyValue(chord)
        });
      });
    }
  });
  return out;
}

// El tamaño expandido sin materializar nada: es el mismo conteo que la
// validación usa contra el techo de 32768 de las secciones.
function flatSize(doc) {
  const current = createStructure(doc);
  const sizes = new Map(current.blocks.map(block => [block.id, block.chords.length]));
  return current.arrangement.reduce((total, entry) => total + sizes.get(entry.blockId) * entry.repeat, 0);
}

function isValidStructure(value) {
  try {
    createStructure(value);
    return true;
  } catch {
    return false;
  }
}

const SongStructure = {
  CHORD_FIELDS,
  MAX_BLOCKS,
  MAX_NAME_LENGTH,
  MIN_REPEAT,
  MAX_REPEAT,
  MAX_CHORDS_PER_BLOCK,
  MAX_FLAT_ENTRIES,
  parseTonic,
  createStructure,
  isValidStructure,
  addBlock,
  duplicateBlock,
  updateBlock,
  removeBlock,
  appendArrangement,
  setArrangementRepeat,
  moveArrangementEntry,
  removeArrangementEntry,
  flattenArrangement,
  flatSize
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SongStructure;
} else if (typeof window !== 'undefined') {
  // En la página (T-40 la carga antes de sus consumidores) queda en window,
  // igual que TonalContext y progression-duration.
  window.SongStructure = SongStructure;
}
