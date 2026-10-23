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

const CHORD_FIELDS = ['root', 'rootNoteName', 'type', 'mode', 'ghostMode', 'variants', 'beats'];
// Los tipos de acorde que la app conoce: la lista vigente de chordTypes en
// app.js, la misma contra la que valida la biblioteca (song-library-ui.js:24)
// y la que la carga de progresiones usa para descartar ajenos (app.js:291).
// Es una copia cotejada — la prueba la compara contra app.js leído como texto;
// no hay require del árbol de la app (devolución QA-MOD-01: el documento puro
// no puede aceptar y propagar a T-40 un tipo que la aplicación rechaza).
const CHORD_TYPES = ['maj', 'maj7', 'maj9', 'm', 'm7', 'm9', 'dim', 'dim7', 'aug', '7', '7sus4', 'm7b5', '6', 'm6', 'add9', '6/9', '9', 'm11', '11', 'maj13', '13', 'sus2', 'sus4'];
// Los modos que la app conoce: las claves vigentes del objeto modes en
// app.js — las mismas contra las que valida la biblioteca con Object.hasOwn
// (song-library-ui.js:25-26) y las que app.js consume para indexar modes al
// pintar. Copia cotejada como la de arriba (segunda devolución QA-MOD-01:
// el documento puro no puede propagar a T-40 un acorde que la biblioteca
// rechaza o cuyo consumidor no es seguro).
const MODES = ['ionian', 'lydian', 'mixolydian', 'dorian', 'phrygian', 'aeolian', 'locrian', 'majorPentatonic', 'minorPentatonic'];
// La gramática del nombre raíz del acorde: la misma regex que la biblioteca
// escribe en song-library-ui.js:28 — letra A–G con una accidental opcional
// en sus dos escrituras (# b / ♯ ♭). Copia cotejada como CHORD_TYPES y
// MODES: la prueba la compara contra el texto fuente de la biblioteca
// (cuarta devolución QA-MOD-01: el documento puro no puede aceptar y
// propagar a T-40 un acorde que las canciones v1 rechazan al guardarlo).
const NOTE_NAME_PATTERN = /^[A-G](?:#|b|♯|♭)?$/;
const MAX_BLOCKS = 64;
const MAX_NAME_LENGTH = 40;
const MIN_REPEAT = 1;
const MAX_REPEAT = 8;
const MAX_CHORDS_PER_BLOCK = 4096;
const MAX_FLAT_ENTRIES = 32768;

// "Plano" de verdad: objeto con el prototipo propio de Object o ninguno.
// Una instancia de la app (new Date(), un Map, Object.create(…) heredado)
// no viaja: copyValue podría reducirla a {} sin que nadie lo note y el
// documento puro no puede propagar a T-40 un dato que el contrato degrada
// silenciosamente (cuarta devolución QA-MOD-01).
function isPlain(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
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

// El barrido completo de claves propias de cada forma de contrato: nombres y
// Symbol, enumerables o no — Reflect.ownKeys trae getOwnPropertyNames más
// getOwnPropertySymbols, sin importar el enumerable. Sexta devolución
// QA-MOD-01: Object.keys() no veía las propiedades no enumerables ni las
// claves Symbol; ese dato entraba invisible al validador, pasaba, y
// desaparecía en la copia fresca que la puerta única hace — normalización a
// espaldas del que llama. Acá las formas solo viajan con sus campos
// contractuales: lo demás, también lo que llega escondido, es rechazo en voz
// alta, con la entrada intacta.
function checkFields(value, allowed, what) {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === 'symbol') {
      throw new Error(`${what} lleva una propiedad simbólica (${String(key)}): las formas del contrato solo viajan con sus campos.`);
    }
    if (!allowed.includes(key)) {
      throw new Error(`${what} con campo desconocido: ${key}.`);
    }
  }
}

// La tónica con la grafía del cómputo ('C', 'F#', 'Bb'… — la misma regla que
// el contrato tonal): cualquier otra cosa es null, sin adivinar. La prueba
// cruza esta copia contra TonalContext.parsePitchClass para que no diverjan.
// El mapa letra→clase vive dentro de la función: es su única consumidora y la
// página carga este módulo como script clásico junto a tonal-context.js, que
// declara el mismo nombre — un const al nivel superior colisionaría.
function parseTonic(text) {
  const NOTE_PC = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
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
  checkFields(value, ['key', 'scale'], 'Tonalidad de la canción');
  if (value.scale !== 'major') throw new Error('El contrato tonal (T-44) solo lleva tonalidad mayor: sin conversión silenciosa.');
  if (parseTonic(value.key) === null) throw new Error('La tónica de la tonalidad de la canción debe ser una nota del cómputo (C, F#, Bb…).');
  return {key: value.key, scale: 'major'};
}

function validateChord(value) {
  if (!isPlain(value)) throw new Error('Acorde no válido.');
  // El barrido propio completo, como en toda forma de contrato: un campo
  // ajeno —enumerable o escondido— y un Symbol propio se rechazan en voz
  // alta (sexta devolución QA-MOD-01).
  checkFields(value, CHORD_FIELDS, 'Acorde');
  if (!Number.isInteger(value.root) || value.root < 0 || value.root > 11) throw new Error('La raíz del acorde debe ser una de las 12 del cómputo.');
  if (typeof value.type !== 'string' || !value.type) throw new Error('El acorde debe declarar un tipo válido.');
  // El tipo se valida contra la lista vigente de chordTypes: es la fuente
  // que la biblioteca y la carga de la app ya usan — un tipo ajeno (el
  // 'no-existe' del repro de QA) se rechaza en voz alta, sin mutar la
  // entrada, en vez de colarse al reproductor de T-40.
  if (!CHORD_TYPES.includes(value.type)) throw new Error(`El tipo del acorde no es de la lista que la app conoce (chordTypes): ${value.type}.`);
  for (const key of ['rootNoteName', 'mode', 'ghostMode']) {
    if (value[key] !== undefined && typeof value[key] !== 'string') throw new Error(`El campo ${key} del acorde no es de texto.`);
  }
  // El modo y el modo fantasma se validan contra la lista vigente de modes:
  // es la fuente que la biblioteca ya usa con Object.hasOwn
  // (song-library-ui.js:25-26) y la que app.js consume para indexar al
  // pintar. Un ghostMode vacío conserva el significado «sin fantasma» (la
  // misma guarda de la biblioteca); un mode definido que no sea clave de
  // modes no viaja, y un modo ajeno se rechaza en voz alta, sin mutar la
  // entrada, en vez de colarse al reproductor de T-40.
  if (value.mode !== undefined && !MODES.includes(value.mode)) throw new Error(`El modo del acorde no es de la lista que la app conoce (modes): ${value.mode}.`);
  if (value.ghostMode && !MODES.includes(value.ghostMode)) throw new Error(`El modo fantasma del acorde no es de la lista que la app conoce (modes): ${value.ghostMode}.`);
  // El nombre raíz, cuando viaja, es de la gramática de la biblioteca
  // (song-library-ui.js:28): la misma regex cotejada de arriba — letra A–G
  // con una accidental opcional. Un nombre ajeno (el «No-es-nota» del repro
  // de QA) se rechaza en voz alta, sin mutar la entrada, en vez de salir
  // como documento que las canciones v1 rechazan al guardarlo.
  if (value.rootNoteName !== undefined && !NOTE_NAME_PATTERN.test(value.rootNoteName)) {
    throw new Error(`El nombre raíz del acorde no es de la gramática de la biblioteca: ${value.rootNoteName}.`);
  }
  if (value.beats !== undefined && (!Number.isInteger(value.beats) || value.beats < 1)) throw new Error('La duración del acorde debe ser un entero positivo de pulsos.');
  const out = {root: value.root, type: value.type};
  // Las variantes por vuelta se validan con la regla exacta de
  // validVariants (app.js:245-256, tercera devolución QA-MOD-01) y viajan
  // normalizadas con la vuelta entera, no con el texto que entró.
  const normalizedVariants = validateVariants(value.variants);
  if (normalizedVariants !== undefined) out.variants = normalizedVariants;
  for (const key of ['rootNoteName', 'mode', 'ghostMode', 'beats']) {
    if (value[key] !== undefined) out[key] = copyValue(value[key]);
  }
  return out;
}

// La forma exacta de las variantes por vuelta, la regla que la app aplica
// al guardar (validVariants, app.js:245-256, tercera devolución QA-MOD-01):
// vuelta entera 1..8 —el techo de las repeticiones de sección,
// MIN/MAX_REPEAT—, valor con la forma exacta {ghostMode} y modo fantasma no
// vacío presente en MODES. La clave de la vuelta es la canónica del entero
// (séptima devolución QA-MOD-01): una alias («01», «1.0», «1e0», «+1», « 1»,
// «0x1») canoniza con Number() a una vuelta ya vista y la copia fresca pisa
// el dato sin avisar — la app (validVariants) degrada así ese documento, y
// acá es rechazo en voz alta, sin mutar la entrada. En el documento puro
// nada se limpia a silencio como en la app: fuera del contrato es rechazo
// en voz alta, en vez de colarse al reproductor de T-40.
function validateVariants(value) {
  if (value === undefined) return undefined;
  if (!isPlain(value)) throw new Error('Las variantes por vuelta deben ser un objeto.');
  // Una variants PRESENTE no viaja vacía: en la app validVariants limpia
  // ese caso a silencio (la forma opcional del contrato), pero el
  // documento puro no normaliza a espaldas del que escribe — fuera del
  // contrato de {ghostMode} es rechazo en voz alta (cuarta devolución
  // QA-MOD-01).
  // Presencia medida con las claves propias completas: una vuelta que apenas
  // llegue escondida (no enumerable) es contractual y viaja — contada con
  // Object.keys quedaría «vacía» para la guarda y el dato se perdería.
  if (!Reflect.ownKeys(value).length) throw new Error('Las variantes por vuelta, si están presentes, traen al menos una vuelta.');
  const variants = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === 'symbol') {
      throw new Error(`La vuelta de una variante no puede ser una clave Symbol (${String(key)}): las vueltas viajan numeradas.`);
    }
    const vuelta = Number(key);
    // La clave de la vuelta es la canónica del entero ('1'..'8'), la misma
    // convención que validateDenseList aplica a los índices de las tres
    // listas. Una alias («01», «1.0», «1e0», «+1», « 1», «0x1») canoniza con
    // Number() a una vuelta ya vista y la copia fresca la pisa en silencio —
    // séptima devolución QA-MOD-01: {'1': dorian, '01': lydian} salía con una
    // sola vuelta y el otro modo desaparecía sin aviso (igual de ambos
    // órdenes). Se rechaza en voz alta, sin mutar la entrada, en vez de
    // normalizar a espaldas del que escribe.
    if (!/^\d+$/.test(key) || String(vuelta) !== key || !Number.isInteger(vuelta) || vuelta < MIN_REPEAT || vuelta > MAX_REPEAT) {
      throw new Error(`La vuelta de la variante debe viajar como la clave canónica de su entero de ${MIN_REPEAT} a ${MAX_REPEAT}, sin alias que canonice a una vuelta ya vista («01», «1.0», «+1»…): ${JSON.stringify(key)}.`);
    }
    const variant = value[key];
    if (!isPlain(variant)) throw new Error(`La variante de la vuelta ${vuelta} debe ser un objeto.`);
    for (const campo of Reflect.ownKeys(variant)) {
      if (typeof campo === 'symbol') {
        throw new Error(`La variante de la vuelta ${vuelta} lleva la forma exacta {ghostMode}: campo simbólico desconocido (${String(campo)}).`);
      }
      if (campo !== 'ghostMode') throw new Error(`La variante de la vuelta ${vuelta} lleva la forma exacta {ghostMode}: campo desconocido: ${campo}.`);
    }
    // El campo propio, no heredado: la misma Object.hasOwn que usa la
    // biblioteca — una variante creada con prototipo ajeno (el repro de
    // QA: {'2': Object.create({ghostMode: 'dorian'})}) no tiene la forma
    // exacta que la app escribe, y en el modelo no se copia a espaldas del
    // dato: se rechaza en voz alta.
    if (!Object.hasOwn(variant, 'ghostMode')) throw new Error(`La variante de la vuelta ${vuelta} lleva la forma exacta {ghostMode}: falta el campo propio ghostMode.`);
    const ghost = variant.ghostMode;
    if (typeof ghost !== 'string' || !ghost) throw new Error(`El modo fantasma de la variante de la vuelta ${vuelta} es obligatorio y no vacío.`);
    if (!MODES.includes(ghost)) throw new Error(`El modo fantasma de la variante de la vuelta ${vuelta} no es de la lista que la app conoce (modes): ${ghost}.`);
    variants[vuelta] = {ghostMode: ghost};
  }
  return variants;
}

// Las tres listas del contrato (bloques, acordes del bloque y referencias
// del arreglo) viajan densas: cada índice 0..length-1 es una propiedad
// PROPIA con dato, y ninguna lista lleva propiedades fuera de sus
// posiciones. Quinta devolución QA-MOD-01: el map/forEach omite los huecos,
// así que el documento puro aceptaba `chords: [chord, , ]` con un conteo
// (flatSize, que ve el length) distinto de su aplanado (los puestos con
// dato), y `arrangement: [,]` pasaba y se aplanaba como vacío. El hueco es
// rechazo en voz alta, sin mutar la entrada; y las propiedades ajenas no
// viajan porque la copia (.map) las tiraría sin que nadie lo note. Es una
// regla propia del documento puro — el respaldo JSON no puede llevar huecos
// (viajan como null, que los validadores ya rechazan): esta guarda cubre la
// forma viva que sí puede.
function validateDenseList(list, what) {
  if (!Array.isArray(list)) throw new Error(`${what} va en una lista.`);
  // El barrido también es completo: Reflect.ownKeys trae 'length' (siempre
  // propia y no enumerable del mecanismo del array), los índices —densos o no—
  // y cualquier propiedad ajena, enumerable o escondida, y los Symbol — la
  // sexta devolución QA-MOD-01: un extra definido con defineProperty o una
  // clave Symbol fueron invisibles y la copia los tiraba a silencio.
  for (const key of Reflect.ownKeys(list)) {
    if (typeof key === 'symbol') {
      throw new Error(`Propiedad simbólica (${String(key)}) de ${what}: las listas solo traen sus índices.`);
    }
    if (key === 'length') continue;
    if (!/^\d+$/.test(key) || String(Number(key)) !== key || Number(key) >= list.length) {
      throw new Error(`Propiedad ${JSON.stringify(key)} fuera de las posiciones de ${what}: las listas solo traen sus índices.`);
    }
  }
  for (let i = 0; i < list.length; i++) {
    if (!Object.hasOwn(list, i)) {
      throw new Error(`Hueco en ${what}: la posición ${i + 1} no existe (no es propiedad propia); las listas del contrato viajan densas, con dato en cada posición.`);
    }
  }
  return list;
}

function validateBlock(block, index, ids) {
  if (!isPlain(block)) throw new Error(`El bloque ${index + 1} no es un objeto.`);
  checkFields(block, ['id', 'name', 'chords'], 'Bloque');
  if (typeof block.id !== 'string' || !block.id.trim()) throw new Error('Cada bloque necesita un id propio y estable: nunca el índice de una tarjeta.');
  const id = block.id.trim();
  if (ids.has(id)) throw new Error(`Los ids de los bloques son únicos y hay dos con ${id}.`);
  ids.add(id);
  if (typeof block.name !== 'string' || !block.name.trim()) throw new Error(`El bloque ${id} necesita un nombre no vacío para mostrarse.`);
  if (block.name.length > MAX_NAME_LENGTH) throw new Error(`El nombre del bloque ${id} supera ${MAX_NAME_LENGTH} caracteres.`);
  if (!Array.isArray(block.chords) || !block.chords.length) throw new Error(`El bloque ${id} no trae acordes: un bloque sin acordes no se puede reproducir.`);
  validateDenseList(block.chords, `los acordes del bloque ${id}`);
  if (block.chords.length > MAX_CHORDS_PER_BLOCK) throw new Error(`El bloque ${id} supera el límite de ${MAX_CHORDS_PER_BLOCK} acordes de la progresión y la biblioteca.`);
  return {id, name: block.name.trim(), chords: block.chords.map(validateChord)};
}

function validateArrangement(entries, blockIds, sizes) {
  if (!Array.isArray(entries)) throw new Error('El arreglo debe ser una lista de referencias a bloques.');
  validateDenseList(entries, 'el arreglo');
  let total = 0;
  return entries.map((entry, index) => {
    if (!isPlain(entry)) throw new Error(`La referencia ${index + 1} del arreglo no es un objeto.`);
    checkFields(entry, ['blockId', 'repeat'], 'Referencia del arreglo');
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
  checkFields(value, ['blocks', 'arrangement', 'tonality'], 'Estructura');
  const ids = new Set();
  const sizes = new Map();
  const blocksIn = value.blocks === undefined ? [] : value.blocks;
  if (!Array.isArray(blocksIn)) throw new Error('Los bloques van en una lista.');
  if (blocksIn.length > MAX_BLOCKS) throw new Error(`La estructura supera el límite de ${MAX_BLOCKS} bloques.`);
  validateDenseList(blocksIn, 'la lista de bloques');
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
  // El descriptor del bloque nuevo pasa por el mismo barrido completo: nada
  // de datos ajenos, escondidos o Symbol, que la forma {id?, name, chords}
  // tiraría sin que nadie lo note (sexta devolución QA-MOD-01).
  checkFields(value, ['id', 'name', 'chords'], 'Bloque nuevo');
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
  checkFields(patch, ['name', 'chords'], 'Edición del bloque');
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
  CHORD_TYPES,
  MODES,
  NOTE_NAME_PATTERN,
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
