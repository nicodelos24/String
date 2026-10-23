// Adaptador del modelo de bloques (T-39) con el estado de trabajo legado de la
// app (progresión plana + secciones de siempre) y con lo que persiste (T-40 ·
// QA-MOD-02). Puro: sin DOM, sin audio, sin eventos, sin globales de la app;
// las salidas son objetos planos y copias frescas por la única puerta del
// modelo (SongStructure.createStructure), así que lo que entra de un respaldo
// no se confía a la cara. La única excepción declarada es de autoridad, no de
// copia: structureToWorking devuelve las tarjetas compartiendo los acordes del
// bloque, para que editar una tarjeta toque el bloque y las dos referencias lo
// vean (una sola fuente de verdad en memoria, como pide el mapa T-38).
//
// Reglas de compatibilidad que acá se deciden y se prueban:
//   · el sobre persistido es {version: 1, blocks, arrangement, tonality?};
//     otra versión o forma ajena se rechaza en voz alta — sin conversión
//     silenciosa (versión futura = dato que la app de hoy no sabe leer),
//   · la tonalidad, cuando viaja, es la forma única del contrato tonal (T-44):
//     {key, scale: 'major'}; el selector de canción (T-45) sigue siendo la
//     autoridad del dato vivo — acá se versiona y migra, no se inventa,
//   · estructura → estado de trabajo: una sección legada por ENTRADA del
//     arreglo; las tarjetas son los acordes del bloque en su orden de
//     aparición (las repeticiones del enunciado no se materializan en
//     tarjetas: las hace el reproductor con las secciones de siempre),
//   · la inversa deduplica por (nombre + índices): «Verso» referido dos veces
//     con las mismas tarjetas vuelve a ser un bloque con dos referencias,
//   · lo que la vista legada de hoy no puede representar sin inventar datos se
//     rechaza en voz alta (bloque sin acordes o fuera del arreglo, más de 64
//     entradas, más de 4096 tarjetas, tarjeta fuera de todo bloque): son los
//     límites de secciones y biblioteca, declarados antes de pisarlos.

const STRUCTURE_VERSION = 1;

// El símbolo del guardado tiene dedo: modelName?. El sobre solo lleva las
// tres llaves del contrato — versión, bloques y arreglo — y la tonalidad
// cuando viaja. Todo lo demás ('name', 'settings', un Symbol escondido…) es
// rechazo en voz alta: nada se pierde a silencio.
function checkStructureModel() {
  if (typeof SongStructure !== 'undefined') return SongStructure;
  if (typeof window !== 'undefined' && window.SongStructure) return window.SongStructure;
  if (typeof globalThis !== 'undefined' && globalThis.SongStructure) return globalThis.SongStructure;
  if (typeof require === 'function') {
    try { return require('./song-structure.js'); } catch {/* Node con otra ruta de carga */}
  }
  return null;
}

function checkEnvelope(value) {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('El arreglo estructurado es un objeto con versión, bloques y arreglo.');
  }
  const own = Reflect.ownKeys(value);
  for (const key of own) {
    if (key !== 'version' && key !== 'blocks' && key !== 'arrangement' && key !== 'tonality') {
      throw new Error('El sobre del arreglo estructurado solo lleva versión, bloques, arreglo y tonalidad.');
    }
  }
  if (value.version !== STRUCTURE_VERSION) {
    throw new Error('La versión del arreglo estructurado no es compatible con esta app.');
  }
}

// Puerta de entrada del dato persistido: valida el sobre y deja el documento
// en las manos del modelo (que valida bloques, arreglo y tonalidad en copias
// frescas). Lo que sale no es lo que entra: es la copia que la app va a usar.
function parseStructure(value) {
  checkEnvelope(value);
  const model = checkStructureModel();
  if (!model) throw new Error('El modelo de bloques no está cargado.');
  const inner = {blocks: value.blocks, arrangement: value.arrangement};
  if (value.tonality !== undefined) inner.tonality = value.tonality;
  const doc = model.createStructure(inner);
  const out = {version: STRUCTURE_VERSION, blocks: doc.blocks, arrangement: doc.arrangement};
  if (doc.tonality !== undefined) out.tonality = doc.tonality;
  return out;
}

// Composición → estado de trabajo: una sección de las de siempre por ENTRADA
// del arreglo, con las tarjetas siendo los acordes del bloque (referencias
// compartidas a propósito). Exige cobertura completa: todos los bloques
// referidos llevan acordes que la vista puede mostrar y ninguno queda fuera.
function structureToWorking(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new Error('La estructura no es un documento de bloques.');
  const model = checkStructureModel();
  if (!model) throw new Error('El modelo de bloques no está cargado.');
  const byId = new Map();
  for (const block of doc.blocks || []) byId.set(block.id, block);
  const entries = doc.arrangement || [];
  if (entries.length > 64) throw new Error(`El arreglo trae ${entries.length} entradas y la vista legada de hoy admite 64 secciones.`);
  const chords = [];
  const base = new Map(); // blockId → posición de la primera copia en la vista
  const sections = [];
  for (const entry of entries) {
    const block = byId.get(entry.blockId);
    if (!block) throw new Error(`La entrada del arreglo apunta al bloque ${entry.blockId}, que no existe.`);
    if (!Array.isArray(block.chords) || !block.chords.length) throw new Error(`El bloque ${block.name || entry.blockId} no trae acordes que la vista pueda mostrar.`);
    let at = base.get(entry.blockId);
    if (at === undefined) {
      at = chords.length;
      for (const chord of block.chords) chords.push(chord);
      base.set(entry.blockId, at);
    }
    sections.push({name: block.name, repeat: entry.repeat, indices: block.chords.map((chord, index) => at + index)});
  }
  if (chords.length > 4096) throw new Error(`El arreglo necesita ${chords.length} tarjetas y la biblioteca admite 4096.`);
  const activeIds = new Set(entries.map(entry => entry.blockId));
  for (const block of doc.blocks || []) {
    if (!activeIds.has(block.id)) throw new Error(`El bloque ${block.name} no está en el arreglo: abrirlo en la vista de hoy perdería sus acordes.`);
  }
  return {chords, sections, tonality: doc.tonality === undefined ? undefined : doc.tonality};
}

// Estado de trabajo → sobre de composición, la inversa explícita: bloques
// deduplicados por (nombre + índices), arreglo en el orden de las secciones.
// No es de guardado pasivo: solo se llama cuando el documento vivo viene de
// una composición, y exige que cada tarjeta esté dentro de algún bloque (una
// tarjeta suelta no tiene dónde vivir en la composición — los bloques de
// relleno, uno solo para la progresión, son ya cosas del compositor de T-41).
function workingToStructure(chords, sections, tonality) {
  if (!Array.isArray(chords) || !Array.isArray(sections)) throw new Error('La inversa del adaptador pide la lista de tarjetas y las secciones.');
  if (!sections.length) throw new Error('No hay secciones que convertir: el estado legado sin secciones no estrena la estructura.');
  const covered = new Set();
  const seen = new Map(); // (nombre + índices) → id del bloque
  const blocks = [];
  const arrangement = [];
  let nextId = 1;
  for (const section of sections) {
    const indices = Array.isArray(section.indices) ? section.indices : [];
    if (new Set(indices).size !== indices.length) {
      throw new Error('Una sección no puede incluir dos veces la misma tarjeta. Usa las repeticiones.');
    }
    for (const index of indices) {
      if (!Number.isInteger(index) || index < 0 || index >= chords.length) {
        throw new Error('Una sección apunta fuera de la progresión: los índices de las secciones son referencias cardinales de la lista, no se inventan.');
      }
      covered.add(index);
    }
    const sig = `${JSON.stringify(indices)}|${section.name}`;
    let blockId = seen.get(sig);
    if (blockId === undefined) {
      blockId = `b${nextId}`;
      nextId += 1;
      seen.set(sig, blockId);
      blocks.push({id: blockId, name: section.name, chords: indices.map(index => chords[index])});
    }
    arrangement.push({blockId, repeat: section.repeat});
  }
  const missing = chords.length - covered.size;
  if (missing) throw new Error(`Hay ${missing} tarjetas fuera de los bloques: la composición no se inventa un bloque de relleno.`);
  const model = checkStructureModel();
  if (!model) throw new Error('El modelo de bloques no está cargado.');
  const inner = {blocks, arrangement};
  if (tonality !== undefined) inner.tonality = {key: tonality, scale: 'major'};
  const doc = model.createStructure(inner);
  const out = {version: STRUCTURE_VERSION, blocks: doc.blocks, arrangement: doc.arrangement};
  if (doc.tonality !== undefined) out.tonality = doc.tonality;
  return out;
}

const SongStructureAdapter = {
  STRUCTURE_VERSION,
  parseStructure,
  structureToWorking,
  workingToStructure
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SongStructureAdapter;
} else if (typeof window !== 'undefined') {
  // En la página queda en window, igual que SongStructure y TonalContext.
  window.SongStructureAdapter = SongStructureAdapter;
}
