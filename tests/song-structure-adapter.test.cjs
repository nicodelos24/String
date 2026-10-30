const {test} = require('node:test');
const assert = require('node:assert/strict');
const {
  STRUCTURE_VERSION, parseStructure, structureToWorking, workingToStructure
} = require('../song-structure-adapter.js');
const {playbackEntries} = require('../sections.js');

// T-40 · QA-MOD-02: el adaptador es el puente entre el modelo puro de bloques
// (T-39) y el estado de trabajo legado (progresión plana + secciones) que la
// página ya sabe guardar, abrir, exportar/importar y reproducir sin tocar el
// motor. Las reglas de compatibilidad del plan mandan:
//   · el sobre es {version: 1, blocks, arrangement, tonality?}; otra versión o
//     forma ajena se rechaza en voz alta,
//   · las tarjetas del estado de trabajo son LOS MISMOS OBJETOS que los
//     acordes del bloque: una sola autoridad en memoria (editar una tarjeta
//     de «Verso» toca el bloque; las dos referencias lo ven),
//   · la inversa es explícita y probada: misma deduplicación por (nombre +
//     índices), arreglo en el orden de las secciones, tonalidad de la forma
//     del contrato T-44, y nada inventado: tarjeta fuera de todo bloque = rechazo,
//   · una v1 plana nunca cambia de formato por abrirse ni guardarse.

const VERSO_CHORDS = [
  {root: 0, rootNoteName: 'C', type: 'maj', mode: 'ionian', beats: 4},
  {root: 9, type: 'm', mode: 'aeolian', variants: {'2': {ghostMode: 'lydian'}}, beats: 2},
  {root: 5, type: 'maj', beats: 4},
  {root: 7, type: 'maj', beats: 4}
];
const ESTRIBILLO_CHORDS = [
  {root: 2, type: 'm', beats: 4},
  {root: 7, type: 'maj', beats: 4}
];

function qaComposition() {
  // El repro de verificación del plan: Verso ×2 → Estribillo ×1 → Verso ×1,
  // con los dos «Verso» referidos al MISMO bloque.
  const {createStructure} = require('../song-structure.js');
  return {
    doc: createStructure({
      blocks: [
        {id: 'verso', name: 'Verso', chords: VERSO_CHORDS.map(chord => ({...chord}))},
        {id: 'coro', name: 'Estribillo', chords: ESTRIBILLO_CHORDS.map(chord => ({...chord}))}
      ],
      arrangement: [
        {blockId: 'verso', repeat: 2},
        {blockId: 'coro', repeat: 1},
        {blockId: 'verso', repeat: 1}
      ]
    }),
    reconstruction: {
      version: STRUCTURE_VERSION,
      blocks: [
        {id: 'bloque-1', name: 'Verso', chords: VERSO_CHORDS.map(chord => ({...chord}))},
        {id: 'bloque-2', name: 'Estribillo', chords: ESTRIBILLO_CHORDS.map(chord => ({...chord}))}
      ],
      arrangement: [
        {blockId: 'bloque-1', repeat: 2},
        {blockId: 'bloque-2', repeat: 1},
        {blockId: 'bloque-1', repeat: 1}
      ]
    }
  };
}

test('el sobre versionado: la forma llega validada y toda otra se rechaza en voz alta', () => {
  const {doc} = qaComposition();
  const canonical = parseStructure({version: STRUCTURE_VERSION, blocks: doc.blocks, arrangement: doc.arrangement});
  assert.equal(canonical.version, 1);
  assert.deepEqual(canonical.blocks.map(block => block.name), ['Verso', 'Estribillo']);
  // Copia fresca: mutar lo que sale no toca lo que entra, ni al revés.
  canonical.blocks[0].name = 'otro';
  canonical.blocks[0].chords[0].root = 3;
  assert.equal(doc.blocks[0].name, 'Verso');
  assert.equal(doc.blocks[0].chords[0].root, 0);
  // El documento puro no lleva versión: la pone el sobre del adaptador.
  assert.notDeepEqual(canonical, doc);
  for (const [value, why] of [
    [null, 'null del JSON'],
    [42, 'número'],
    [[], 'arreglo'],
    [{blocks: doc.blocks, arrangement: doc.arrangement}, 'falta la versión'],
    [{version: '1', blocks: doc.blocks, arrangement: doc.arrangement}, 'versión como texto'],
    [{version: 2, blocks: doc.blocks, arrangement: doc.arrangement}, 'versión futura'],
    [{version: 0, blocks: doc.blocks, arrangement: doc.arrangement}, 'versión cero'],
    [{version: 1, arrangement: doc.arrangement}, 'faltan los bloques'],
    [{version: 1, blocks: doc.blocks, arrangement: doc.arrangement, extra: 1}, 'campo ajeno del sobre']
  ]) assert.throws(() => parseStructure(value), Error, `debe rechazar ${why}`);
  // Los defectos del documento cruzan con su propio aviso (fuente única: el modelo).
  assert.throws(() => parseStructure({version: 1, blocks: [{id: 'b', name: 'B', chords: [{root: 0, type: 'no-existe'}]}], arrangement: [{blockId: 'b', repeat: 1}]}), /no-existe|chord/i);
});

test('la tonalidad del sobre es la del contrato tonal T-44 extendido, sin conversión silenciosa', () => {
  const {createStructure} = require('../song-structure.js');
  const doc = createStructure({
    blocks: [{id: 'b', name: 'B', chords: [{root: 0, type: 'maj', beats: 4}]}],
    arrangement: [{blockId: 'b', repeat: 1}],
    tonality: {key: 'C', scale: 'major'}
  });
  const parsed = parseStructure({version: STRUCTURE_VERSION, blocks: doc.blocks, arrangement: doc.arrangement, tonality: {key: 'C', scale: 'major'}});
  assert.deepEqual(parsed.tonality, {key: 'C', scale: 'major'});
  assert.deepEqual(parseStructure({version: 1, blocks: doc.blocks, arrangement: doc.arrangement, tonality: {key: 'A', scale: 'minor'}}).tonality, {key: 'A', scale: 'minor'});
  assert.throws(() => parseStructure({version: 1, blocks: doc.blocks, arrangement: doc.arrangement, tonality: {key: 'C', scale: 'harmonic-minor'}}), /scale|major|minor/i);
  assert.throws(() => parseStructure({version: 1, blocks: doc.blocks, arrangement: doc.arrangement, tonality: {key: 'not-a-key', scale: 'major'}}), Error);
  assert.throws(() => parseStructure({version: 1, blocks: doc.blocks, arrangement: doc.arrangement, tonality: 'C'}), Error, 'la forma es la del contrato, no un texto');
});

test('estructura → estado de trabajo: una sección legada por entrada del arreglo, tarjetas compartidas', () => {
  const {doc} = qaComposition();
  const working = structureToWorking(doc);
  // 6 tarjetas distintas: las 4 del Verso y las 2 del Estribillo, sin las
  // repeticiones materializadas (no se crean tarjetas persistentes duplicadas).
  assert.equal(working.chords.length, 6);
  assert.deepEqual(working.chords.map(chord => chord.root), [0, 9, 5, 7, 2, 7]);
  // Autoridad única: la tarjeta ES el acorde del bloque (misma referencia).
  assert.strictEqual(working.chords[4], doc.blocks[1].chords[0]);
  working.chords[2].beats = 8;
  assert.equal(doc.blocks[0].chords[2].beats, 8, 'editar la tarjeta toca el bloque que la define');
  // Tres entradas en el orden del arreglo, con sus repeticiones e índices.
  assert.deepEqual(working.sections, [
    {name: 'Verso', repeat: 2, indices: [0, 1, 2, 3]},
    {name: 'Estribillo', repeat: 1, indices: [4, 5]},
    {name: 'Verso', repeat: 1, indices: [0, 1, 2, 3]}
  ]);
  assert.equal(doc.blocks[0].chords[2].beats, 8, 'la entrada no muta el documento');
});

test('la lista de reproducción del estado convertido es la del repro: Verso ×2 → Estribillo ×1 → Verso ×1', () => {
  const {doc} = qaComposition();
  const working = structureToWorking(doc);
  const entries = playbackEntries(working.sections, working.chords);
  assert.equal(entries.length, 14);
  // Las vueltas del Verso reflejado dos veces llevan la metadatos que el
  // reproductor usa para las variantes por vuelta (sección etiqueta + vuelta).
  assert.deepEqual(entries.filter(entry => entry.source.root === 9).map(entry => [entry.section, entry.vuelta]), [
    ['Verso · vuelta 1/2', 1],
    ['Verso · vuelta 2/2', 2],
    ['Verso · vuelta 1/1', 1]
  ]);
  assert.deepEqual(entries.filter(entry => entry.source.root === 2).map(entry => entry.section), ['Estribillo · vuelta 1/1']);
  // Sin entradas la reproducción vuelve a lo de siempre: la progresión, una vez.
  assert.deepEqual(playbackEntries([], [{root: 0, type: 'maj'}]).length, 1);
});

test('adaptación a la vista legada hoy imposible: son rechazos en voz alta, no datos inventados', () => {
  const {createStructure} = require('../song-structure.js');
  // Un bloque referido sin acordes lo rechaza el modelo en la puerta (un
  // bloque sin acordes no se puede reproducir): rechazo en voz alta, no
  // sección vacía.
  assert.throws(() => structureToWorking(createStructure({
    blocks: [{id: 'b', name: 'Vacío', chords: []}],
    arrangement: [{blockId: 'b', repeat: 1}]
  })), /acordes/);
  // Un bloque que no aparece en el arreglo no tiene sección que lo cubra:
  // su contenido se perdería al abrir. Rechazo con nombre y apellido.
  assert.throws(() => structureToWorking(createStructure({
    blocks: [
      {id: 'a', name: 'Verso', chords: [{root: 0, type: 'maj', beats: 4}]},
      {id: 'b', name: 'Suelto', chords: [{root: 2, type: 'm', beats: 4}]}
    ],
    arrangement: [{blockId: 'a', repeat: 1}]
  })), /Suelto/);
  // Más de 64 entradas de arreglo no caben en las secciones actuales (límite
  // de validateSections): se declara antes, no al pisar el límite a ciegas.
  assert.throws(() => structureToWorking(createStructure({
    blocks: [{id: 'b', name: 'B', chords: [{root: 0, type: 'maj', beats: 4}]}],
    arrangement: Array.from({length: 65}, () => ({blockId: 'b', repeat: 1}))
  })), /64/);
  // Más de 4096 tarjetas tampoco caben en la biblioteca: la apertura lo dice.
  assert.throws(() => structureToWorking(createStructure({
    blocks: [
      {id: 'a', name: 'A', chords: Array.from({length: 4096}, () => ({root: 0, type: 'maj', beats: 4}))},
      {id: 'b', name: 'B', chords: [{root: 2, type: 'm', beats: 4}]}
    ],
    arrangement: [{blockId: 'a', repeat: 1}, {blockId: 'b', repeat: 1}]
  })), /4096/);
});

test('estado de trabajo → estructura: la inversa explícita vuelve al repro original', () => {
  const {doc, reconstruction} = qaComposition();
  const working = structureToWorking(doc);
  const rebuilt = workingToStructure(working.chords, working.sections);
  // Doc de ida y vuelta plano y serializable: el guardado no lleva funciones ni referencias.
  assert.deepEqual(JSON.parse(JSON.stringify(rebuilt)), rebuilt);
  assert.equal(rebuilt.version, STRUCTURE_VERSION);
  // Dos bloques: los dos «Verso» con los mismos índices vuelven a ser UN bloque.
  assert.deepEqual(rebuilt.blocks.map(block => block.name), ['Verso', 'Estribillo']);
  assert.deepEqual(rebuilt.arrangement, [
    {blockId: rebuilt.blocks[0].id, repeat: 2},
    {blockId: rebuilt.blocks[1].id, repeat: 1},
    {blockId: rebuilt.blocks[0].id, repeat: 1}
  ]);
  assert.deepEqual(rebuilt.blocks[0].chords, VERSO_CHORDS);
  assert.deepEqual(rebuilt.blocks[1].chords, ESTRIBILLO_CHORDS);
  // El sobre que sale lo vuelve a aceptar el sobre que entra, y el documento es
  // semánticamente el original (ids pueden regenerarse; el contenido no).
  const reparsed = parseStructure(rebuilt);
  assert.deepEqual(reparsed.blocks.map(block => block.name), reconstruction.blocks.map(block => block.name));
  assert.deepEqual(reparsed.arrangement.map(entry => [entry.repeat]), reconstruction.arrangement.map(entry => [entry.repeat]));
});

test('la inversa deduplica por nombre e índices, y no inventa bloques de relleno', () => {
  // Mismo nombre con otros índices: bloque distinto, aunque el nombre coincida.
  const chords = [
    {root: 0, type: 'maj', beats: 4},
    {root: 5, type: 'maj', beats: 4}
  ];
  const rebuilt = workingToStructure(chords, [
    {name: 'Verso', repeat: 1, indices: [0]},
    {name: 'Verso', repeat: 2, indices: [1]}
  ]);
  assert.equal(rebuilt.blocks.length, 2, 'el nombre solo no une bloques');
  assert.deepEqual(rebuilt.arrangement.map(entry => entry.repeat), [1, 2]);
  // Tarjeta fuera de todo bloque: rechazo en voz alta, sin bloque fantasma.
  assert.throws(() => workingToStructure(chords, [{name: 'Verso', repeat: 1, indices: [0]}]), /fuera/);
  // Sin secciones no hay qué convertir: el guardado de una v1 plana no estrena
  // el formato estructurado.
  assert.throws(() => workingToStructure(chords, []), Error);
});

test('la tonalidad viaja de ida y de vuelta con la forma del contrato', () => {
  const chords = [{root: 0, type: 'maj', beats: 4}];
  const sections = [{name: 'Verso', repeat: 1, indices: [0]}];
  const withTonal = workingToStructure(chords, sections, 'C');
  assert.deepEqual(withTonal.tonality, {key: 'C', scale: 'major'});
  const withMinor = workingToStructure(chords, sections, 'A', 'minor');
  assert.deepEqual(withMinor.tonality, {key: 'A', scale: 'minor'});
  const withoutTonal = workingToStructure(chords, sections);
  assert.equal(withoutTonal.tonality, undefined);
  assert.throws(() => workingToStructure(chords, sections, 'not-a-key'), Error);
  // Y la tonalidad del documento vuelve al estado de trabajo para el selector.
  const working = structureToWorking(parseStructure(withTonal));
  assert.deepEqual(working.tonality, {key: 'C', scale: 'major'}, 'el contexto tonal migra sin inventarse');
  assert.deepEqual(structureToWorking(parseStructure(withMinor)).tonality, {key: 'A', scale: 'minor'}, 'La menor también vuelve completa para el selector');
  assert.deepEqual(structureToWorking(parseStructure(withoutTonal)).tonality, undefined);
  assert.throws(() => workingToStructure(chords, sections, 'C', 'harmonic-minor'), Error);
});
