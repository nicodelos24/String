const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TonalContext = require('../tonal-context.js');
const {
  CHORD_FIELDS, CHORD_TYPES, MODES, MAX_BLOCKS, MAX_NAME_LENGTH, MIN_REPEAT, MAX_REPEAT,
  MAX_CHORDS_PER_BLOCK, MAX_FLAT_ENTRIES,
  createStructure, isValidStructure, addBlock, duplicateBlock, updateBlock,
  removeBlock, appendArrangement, setArrangementRepeat, moveArrangementEntry,
  removeArrangementEntry, flattenArrangement, flatSize, parseTonic
} = require('../song-structure.js');

// La matriz de aceptación del mapa (docs/MAPA-COMPOSITOR.md, sección T-39)
// y el contrato del plan QA §QA-MOD-01 en Node: un «Verso» de cuatro acordes
// aparece dos veces y una edición del bloque se ve en ambas expansiones;
// duplicarlo genera otro id y editarlo no cambia el original; reordenar
// entradas no cambia el contenido; ids ausentes/repetidos, referencias
// inválidas, repeticiones inválidas y expansiones excesivas se rechazan sin
// mutar la entrada; y el contexto tonal opcional viaja con la forma de T-44.

const BASE = createStructure({
  blocks: [
    {id: 'verso', name: 'Verso', chords: [
      {root: 0, type: 'maj', beats: 4},
      {root: 9, type: 'm', mode: 'aeolian', variants: {'2': {ghostMode: 'lydian'}}, beats: 2},
      {root: 5, type: 'maj', beats: 4},
      {root: 7, type: 'maj', beats: 4}
    ]},
    {id: 'coro', name: 'Coro', chords: [{root: 2, type: 'm', beats: 4}]}
  ],
  arrangement: [
    {blockId: 'verso', repeat: 2},
    {blockId: 'coro', repeat: 1}
  ]
});

const clone = value => JSON.parse(JSON.stringify(value));

test('constantes y documento objetivo: la forma del mapa, la tonalidad ausente no se inventa', () => {
  assert.deepEqual(CHORD_FIELDS, ['root','rootNoteName','type','mode','ghostMode','variants','beats']);
  assert.equal(MAX_BLOCKS, 64);
  assert.equal(MAX_NAME_LENGTH, 40);
  assert.equal(MIN_REPEAT, 1);
  assert.equal(MAX_REPEAT, 8);
  assert.equal(MAX_CHORDS_PER_BLOCK, 4096, 'el techo de acordes por bloque es el de la progresión y la biblioteca');
  assert.equal(MAX_FLAT_ENTRIES, 32768, 'el techo de expansión es el de las secciones («Estructura demasiado larga»)');
  const vacio = createStructure({});
  assert.deepEqual(vacio, {blocks: [], arrangement: []});
  assert.equal('tonality' in vacio, false, 'sin tonalidad de canción el campo no existe: comportamiento v1');
  assert(isValidStructure(vacio));
});

test('copias frescas en ambas direcciones: lo importado y el documento no comparten referencias', () => {
  const input = {
    blocks: [{id: 'g', name: 'Guía', chords: [
      {root: 0, type: 'maj', beats: 4, variants: {'2': {ghostMode: 'lydian'}}}
    ]}],
    arrangement: [{blockId: 'g', repeat: 2}]
  };
  const doc = createStructure(input);
  input.blocks[0].name = 'Mutado';
  input.blocks[0].chords[0].variants['2'].ghostMode = 'phrygian';
  input.blocks[0].chords[0].beats = 9;
  input.arrangement[0].repeat = 6;
  assert.equal(doc.blocks[0].name, 'Guía');
  assert.equal(doc.blocks[0].chords[0].beats, 4);
  assert.equal(doc.blocks[0].chords[0].variants['2'].ghostMode, 'lydian', 'la copia profunda llega hasta las variantes por vuelta (lección T-20)');
  assert.equal(doc.arrangement[0].repeat, 2);
  doc.blocks[0].name = 'Editado';
  doc.blocks[0].chords[0].type = 'm';
  assert.equal(input.blocks[0].name, 'Mutado');
  assert.equal(input.blocks[0].chords[0].type, 'maj');
  // y una entrada del aplanado tampoco pisa el documento: lo que la edición
  // del documento escribió ('m') sigue en pie y no se vuelve 'dim' (tipos
  // válidos de chordTypes: el documento corrompido ya no es válido, la
  // devolución QA-MOD-01 lo rechaza en voz alta)
  const entrada = flattenArrangement(doc)[1];
  entrada.chord.type = 'dim';
  entrada.chord.variants = 'basura';
  assert.equal(createStructure(doc).blocks[0].chords[0].type, 'm', 'la entrada del aplanado no pisa el documento');
  assert.equal(flattenArrangement(doc)[1].chord.variants['2'].ghostMode, 'lydian');
});

test('rechazos en voz alta: campos, ids, nombres, acordes, referencias y repeticiones', () => {
  assert.throws(() => createStructure(null), /debe ser un objeto/);
  assert.throws(() => createStructure('x'), /debe ser un objeto/);
  assert.throws(() => createStructure({blocks: [], extra: 1}), /campo desconocido: extra/);
  assert.throws(() => createStructure({blocks: 'no'}), /lista/);
  assert.throws(() => createStructure({arrangement: 'no'}), /lista/);
  assert.throws(() => createStructure({blocks: [42]}), /no es un objeto/);
  assert.throws(() => createStructure({blocks: [{id: 'b', name: 'B', chords: [], raro: 1}]}), /campo desconocido: raro/);
  assert.throws(() => createStructure({blocks: [{name: 'B', chords: [{root: 0, type: 'maj'}]}]}), /id propio/);
  assert.throws(() => createStructure({blocks: [{id: '  ', name: 'B', chords: [{root: 0, type: 'maj'}]}]}), /id propio/);
  assert.throws(() => createStructure({blocks: [
    {id: 'x', name: 'A', chords: [{root: 0, type: 'maj'}]},
    {id: 'x', name: 'B', chords: [{root: 0, type: 'maj'}]}
  ]}), /ids de los bloques son únicos/);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: '', chords: [{root: 0, type: 'maj'}]}]}), /nombre no vacío/);
  const largo = 'x'.repeat(MAX_NAME_LENGTH + 1);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: largo, chords: [{root: 0, type: 'maj'}]}]}), /supera 40/);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: 'B', chords: []}]}), /no trae acordes/);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: 'B', chords: [null]}]}), /no válido/);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: 'B', chords: [{root: 12, type: 'maj'}]}]}), /12 del cómputo/);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: 'B', chords: [{root: 2.5, id: 'x'}]}]}),);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: 'B', chords: [{type: 'maj'}]}]}), /raíz/);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: 'B', chords: [{root: 0}]}]}), /tipo/);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: 'B', chords: [{root: 0, type: 'maj', raro: 1}]}]}), /Acorde con campo desconocido: raro/);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: 'B', chords: [{root: 0, type: 'maj', mode: 7}]}]}), /no es de texto/);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: 'B', chords: [{root: 0, type: 'maj', beats: 2.5}]}]}), /entero positivo/);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: 'B', chords: [{root: 0, type: 'maj', beats: 0}]}]}), /entero positivo/);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: 'B', chords: [{root: 0, type: 'maj', variants: '2'}]}]}), /variantes por vuelta deben ser un objeto/);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: 'B', chords: [{root: 0, type: 'maj', variants: {'2': 7}}]}]}), /debe ser un objeto/);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: 'B', chords: [{root: 0, type: 'maj'}]}], arrangement: [{blockId: 'fantasma', repeat: 1}]}), /no existe/);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: 'B', chords: [{root: 0, type: 'maj'}]}], arrangement: [{blockId: 'x', repeat: 0}]}), /1 a 8/);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: 'B', chords: [{root: 0, type: 'maj'}]}], arrangement: [{blockId: 'x', repeat: 9}]}), /1 a 8/);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: 'B', chords: [{root: 0, type: 'maj'}]}], arrangement: [{blockId: 'x', repeat: '2'}]}), /1 a 8/);
  assert.throws(() => createStructure({blocks: [{id: 'x', name: 'B', chords: [{root: 0, type: 'maj'}]}], arrangement: [{blockId: 'x', repeat: 1, raro: 1}]}), /campo desconocido: raro/);
  // y sin mutar la entrada
  const antes = clone(BASE);
  for(const rompe of [
    () => setArrangementRepeat(BASE, 9, 2),
    () => setArrangementRepeat(BASE, 0, 0),
    () => appendArrangement(BASE, 'fantasma', 1),
    () => appendArrangement(BASE, 'verso', 0),
    () => updateBlock(BASE, 'fantasma', {name: 'X'}),
    () => updateBlock(BASE, 'verso', {}),
    () => updateBlock(BASE, 'verso', {extra: 1}),
    () => removeBlock(BASE, 'fantasma'),
    () => duplicateBlock(BASE, 'fantasma'),
    () => moveArrangementEntry(BASE, 0, 9),
    () => removeArrangementEntry(BASE, 9)
  ]) assert.throws(rompe);
  assert.deepEqual(BASE, antes);
});

test('tipo de acorde: solo los valores que la app conoce — repro de la devolución QA-MOD-01', () => {
  // El repro exacto de QA: el documento puro no debe aceptar un tipo que la
  // biblioteca rechaza (song-library-ui.js) y que la carga de la app descarta
  // (app.js). Hoy `isValidStructure` responde true: esa es la roja.
  const malo = {blocks: [{id: 'x', name: 'X', chords: [{root: 0, type: 'no-existe'}]}], arrangement: [{blockId: 'x', repeat: 1}]};
  assert.equal(isValidStructure(malo), false, 'el repro de QA: el tipo desconocido se rechaza');
  assert.throws(() => createStructure(malo), /tipo/i);
  // y sin mutar la entrada: el rechazo no deja manos en el dato
  const antes = clone(malo);
  assert.throws(() => createStructure(malo));
  assert.deepEqual(malo, antes);
  // cada valor vigente de chordTypes pasa uno por uno
  for (const type of CHORD_TYPES) {
    const doc = {blocks: [{id: 'x', name: 'X', chords: [{root: 0, type}]}], arrangement: [{blockId: 'x', repeat: 1}]};
    assert.equal(isValidStructure(doc), true, `el tipo ${type} de chordTypes es válido para el modelo`);
  }
  // y todas las puertas validan: la edición también pasa por createStructure
  assert.throws(() => updateBlock(BASE, 'verso', {chords: [{root: 0, type: 'no-existe'}]}), /tipo/i);
  assert.throws(() => addBlock(BASE, {name: 'Raro', chords: [{root: 0, type: 'no-existe'}]}), /tipo/i);
});

test('modos del acorde: mode y ghostMode se validan contra modes — segunda devolución QA-MOD-01', () => {
  // El repro exacto de QA (2026-10-23, sobre cbf88e9): el documento puro no
  // debe aceptar un modo ajeno a la lista modes de la app — la biblioteca
  // (song-library-ui.js:25-26) los busca con Object.hasOwn(modes,…) y app.js
  // los consume para indexar modes al pintar. Hoy isValidStructure responde
  // true: esa es la roja de la corrección.
  const base = clone({
    blocks: [{id: 'x', name: 'X', chords: [{root: 0, type: 'maj'}]}],
    arrangement: [{blockId: 'x', repeat: 1}]
  });
  for (const field of ['mode', 'ghostMode']) {
    const doc = clone(base);
    doc.blocks[0].chords[0][field] = 'no-existe';
    assert.equal(isValidStructure(doc), false, `el ${field} desconocido se rechaza`);
    assert.throws(() => createStructure(doc), /modes/i);
    // y sin mutar la entrada: el rechazo no deja manos en el dato
    const antes = clone(doc);
    assert.throws(() => createStructure(doc));
    assert.deepEqual(doc, antes);
  }
  // cada modo vigente de modes pasa, como modo principal y como fantasma
  for (const modo of MODES) {
    const doc = clone(base);
    doc.blocks[0].chords[0].mode = modo;
    doc.blocks[0].chords[0].ghostMode = modo;
    assert.equal(isValidStructure(doc), true, `el modo ${modo} de modes es válido para el modelo`);
  }
  // un ghostMode vacío sigue significando «sin fantasma» (la biblioteca:
  // chord.ghostMode && …); un mode definido que no es clave de modes no
  // viaja, igual que en la biblioteca (chord.mode!==undefined && …)
  const sinFantasma = clone(base);
  sinFantasma.blocks[0].chords[0].ghostMode = '';
  assert.equal(isValidStructure(sinFantasma), true, 'el ghostMode vacío es «sin fantasma»');
  const modeVacio = clone(base);
  modeVacio.blocks[0].chords[0].mode = '';
  assert.equal(isValidStructure(modeVacio), false, 'un mode definido que no es clave de modes no viaja');
  // y todas las puertas validan: la edición también pasa por createStructure
  assert.throws(() => updateBlock(BASE, 'verso', {chords: [{root: 0, type: 'maj', mode: 'no-existe'}]}), /modes/i);
  assert.throws(() => addBlock(BASE, {name: 'Raro', chords: [{root: 0, type: 'maj', ghostMode: 'no-existe'}]}), /modes/i);
});

test('guarda de fuente única: los modos del modelo son las claves vigentes de modes en la app', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const m = appJs.match(/const modes = \{[\s\S]*?\n\};/);
  assert(m, 'app.js sigue declarando el objeto modes');
  const enApp = [...m[0].matchAll(/^  ([A-Za-z]+?):\s*\{/gm)].map(x => x[1]);
  assert(enApp.length, 'la lista de claves de app.js no se leyó vacía');
  assert.deepEqual(MODES, enApp, 'si app.js gana o pierde un modo, la lista del modelo exige la misma ronda');
  const libJs = fs.readFileSync(path.join(__dirname, '..', 'song-library-ui.js'), 'utf8');
  assert(libJs.includes('(chord.mode!==undefined && !Object.hasOwn(modes,chord.mode))') &&
    libJs.includes('(chord.ghostMode && !Object.hasOwn(modes,chord.ghostMode))'), 'la fuente que el modelo refleja sigue siendo la validación de la biblioteca');
});

test('alta de bloques: id autogenerado opaco, determinista y que no pisa los existentes', () => {
  let doc = addBlock(BASE, {name: 'Puente', chords: [{root: 2, type: 'm', beats: 4}]});
  assert.equal(doc.blocks[2].id, 'b1');
  doc = addBlock(doc, {name: 'Salida', chords: [{root: 9, type: 'm', beats: 2}]});
  assert.equal(doc.blocks[3].id, 'b2');
  doc = addBlock(doc, {id: 'b3', name: 'Coda', chords: [{root: 0, type: 'maj', beats: 4}]});
  doc = addBlock(doc, {name: 'Después', chords: [{root: 0, type: 'maj', beats: 4}]});
  assert.equal(doc.blocks[5].id, 'b4', 'la serie salta los ids que ya existen');
  assert.throws(() => addBlock(doc, {id: 'verso', name: 'Repetido', chords: [{root: 0, type: 'maj', beats: 4}]}), /únicos/);
  assert.throws(() => addBlock(doc, {name: 'Sin acordes'}), /trae acordes/);
  assert.throws(() => addBlock(doc, {raro: 1, name: 'X', chords: [{root: 0, type: 'maj'}]}), /campo desconocido: raro/);
});

test('referencia repetida: editar el bloque alcanza todas sus apariciones', () => {
  const doc = createStructure(BASE);
  const changed = updateBlock(doc, 'verso', {
    chords: [{root: 11, type: 'dim', beats: 1}, {root: 11, type: 'dim', beats: 1}]
  });
  const flat = flattenArrangement(changed);
  assert.equal(flat.length, 2 * 2 + 1, 'dos vueltas del Verso (2 acordes) más el Coro (1)');
  assert.deepEqual(flat.map(e => e.chord.type), ['dim','dim','dim','dim','m'], 'las dos referencias muestran la edición');
  // el nombre también alcanza a las vueltas
  const conNombre = updateBlock(changed, 'verso', {name: 'Verso A'});
  assert.equal(flattenArrangement(conNombre)[0].label.startsWith('Verso A'), true);
  // y sin la edición, la ronda previa queda tal como estaba
  assert.deepEqual(flattenArrangement(doc).map(e => e.chord.type), ['maj','m','maj','maj','maj','m','maj','maj','m']);
});

test('duplicado independiente: id nuevo, copia profunda y edición que no toca al original', () => {
  const doc = createStructure(BASE);
  const dup = duplicateBlock(doc, 'verso');
  assert.equal(dup.blocks.length, 3);
  const copy = dup.blocks[2];
  assert.notEqual(copy.id, 'verso');
  assert.equal(copy.name, 'Verso');
  assert.deepEqual(copy.chords[1].variants, {'2': {ghostMode: 'lydian'}}, 'la variante por vuelta viaja en la copia');
  const edited = updateBlock(dup, copy.id, {name: 'Verso final'});
  assert.equal(edited.blocks[2].name, 'Verso final');
  assert.equal(edited.blocks[0].name, 'Verso', 'el original no se entera');
  // el arreglo queda tal cual: duplicar no refiere solo, es la decisión del autor la que lo agrega
  assert.deepEqual(dup.arrangement, BASE.arrangement);
  // las dos expansiones de la misma referencia del aplanado tampoco comparten cadetes
  const flat = flattenArrangement(dup);
  flat[1].chord.variants = 'tocado';
  assert.deepEqual(flat[5].chord.variants, {'2': {ghostMode: 'lydian'}}, 'el mismo acorde, vuelta 1 y vuelta 2, no comparten la copia');
});

test('reordenar mueve entradas del arreglo y no reescribe el contenido de los bloques', () => {
  const moved = moveArrangementEntry(BASE, 1, 0);
  assert.deepEqual(moved.blocks.map(b => b.name), ['Verso', 'Coro'], 'los bloques quedan tal cual');
  assert.deepEqual(moved.arrangement, [{blockId: 'coro', repeat: 1}, {blockId: 'verso', repeat: 2}]);
  assert.deepEqual(flattenArrangement(moved).map(e => e.blockId), ['coro','verso','verso','verso','verso','verso','verso','verso','verso']);
  const same = moveArrangementEntry(moved, 0, 0);
  assert.deepEqual(same.arrangement, moved.arrangement, 'mover a la misma posición es un no-op razonable');
});

test('aplanado determinista: dos llamadas iguales, metadata de procedencia precisa y sin mutable compartido', () => {
  const flat1 = flattenArrangement(BASE);
  const flat2 = flattenArrangement(BASE);
  assert.deepEqual(flat1, flat2, 'el aplanado es determinista');
  flat1[4].chord.type = 'ZZZ';
  assert.equal(createStructure(BASE).blocks[0].chords[0].type, 'maj', 'tocar una entrada no pisa el documento');
  const [primera, quinta, coro] = [flat1[0], flat1[4], flat1[8]];
  assert.deepEqual([primera.pass, primera.entryIndex, primera.blockId, primera.occurrence, primera.chordIndex], [1, 0, 'verso', 1, 0]);
  assert.deepEqual([quinta.pass, quinta.entryIndex, quinta.blockId, quinta.occurrence, quinta.chordIndex], [5, 0, 'verso', 2, 0]);
  assert.deepEqual([coro.pass, coro.entryIndex, coro.blockId, coro.occurrence, coro.chordIndex], [9, 1, 'coro', 1, 0], 'el passe cuenta global (como la vuelta del motor en T-20)');
  assert.equal(primera.label, 'Verso · repetición 1/2');
  assert.equal(coro.label, 'Coro · repetición 1/1');
  assert.equal(flatSize(BASE), 9);
  assert.equal(flatSize(BASE), flattenArrangement(BASE).length);
});

test('quitar bloque suelta sus referencias; quitar una entrada deja las otras', () => {
  let doc = removeBlock(BASE, 'verso');
  assert.deepEqual(doc.blocks.map(b => b.id), ['coro']);
  assert.deepEqual(doc.arrangement, [{blockId: 'coro', repeat: 1}]);
  assert.equal(flatSize(doc), 1);
  doc = removeArrangementEntry(doc, 0);
  assert.deepEqual(doc.arrangement, []);
  assert(isValidStructure(doc), 'el arreglo vacío es válida: queda la música definida sin reproducir');
  doc = appendArrangement(doc, 'coro', 2);
  assert.deepEqual(doc.arrangement, [{blockId: 'coro', repeat: 2}]);
  assert.throws(() => appendArrangement(doc, 'no-es', 1), /no existe/, 'los bloqueos no se inventan implicitamente');
});

test('límites: 64 bloques y el techo de expansión exacto pasa, de más se rechaza', () => {
  let doc = BASE;
  for(let i = 0; i < 62; i++){
    doc = addBlock(doc, {name: `X${i}`, chords: [{root: 0, type: 'maj', beats: 4}]});
  }
  assert.equal(doc.blocks.length, MAX_BLOCKS, '64 bloques permitidos');
  assert.throws(() => addBlock(doc, {name: 'X65', chords: [{root: 0, type: 'maj', beats: 4}]}), /supera el límite/);
  const grande = {id: 'g', name: "N", chords: Array.from({length: MAX_CHORDS_PER_BLOCK}, () => ({root: 0, type: 'maj', beats: 4}))};
  const docGrande = createStructure({blocks: [grande], arrangement: [{blockId: 'g', repeat: MAX_REPEAT}]});
  assert.equal(flatSize(docGrande), MAX_FLAT_ENTRIES, 'el techo exacto (4096 × 8) está permitido');
  assert.throws(() => appendArrangement(docGrande, 'g', 1), /demasiado larga/, 'una entrada más empuja el mismo techo arriba');
  assert.throws(() => createStructure({blocks: [{...grande, name: 'M'}, {id: 'h', name: "H", chords: [1]}], arrangement: [{blockId: 'g', repeat: 1}]}),);
});

test('tonalidad: la forma del contrato T-44, opcional y sin campos inventados', () => {
  const con = createStructure({...BASE, tonality: {key: 'C', scale: 'major'}});
  assert.deepEqual(con.tonality, {key: 'C', scale: 'major'});
  assert.throws(() => createStructure({...BASE, tonality: null}), /debe ser la forma del contrato tonal/);
  for(const malo of ['C', {}, {key: 'C'}, {scale: 'major'}, {key: 'C', scale: 'minor'}, {key: 'C', scale: 'major', vueltas: 1}])
    assert.throws(() => createStructure({...BASE, tonality: malo}), /tonalidad/i, `rechaza ${JSON.stringify(malo)}`);
});

test('cruce de tónicas con el contrato tonal: el modelo acepta exactamente lo que T-44 sabe inférer', () => {
  const ticas = ['C','G','D','A','E','B','F#','C#','F','Bb','Eb','Ab','Db','Gb','Cb','H','','Do','6','#','bb','Cb'];
  for(const t of ticas){
    const acepta = isValidStructure({blocks: [{id: 'b1', name: 'B', chords: [{root: 0, type: 'maj'}]}], arrangement: [{blockId: 'b1', repeat: 1}], tonality: {key: t, scale: 'major'}});
    assert.equal(acepta, TonalContext.parsePitchClass(t) !== null, `la tónica ${JSON.stringify(t)} vale igual para el modelo y el contrato`);
  }
  const ton = createStructure({blocks: [{id: 'b1', name: 'B', chords: [{root: 2, type: 'm'}]}], arrangement: [], tonality: {key: 'C', scale: 'major'}}).tonality;
  assert.deepEqual(ton, {key: 'C', scale: 'major'});
  assert.equal(TonalContext.inferTonalContext({root: 2, type: 'm'}, ton), 'dorian', 'la forma que sale del modelo alimenta la inferencia de T-44');
});

test('guarda de fuente única: la whitelist del modelo es la lista que el guardado de la app escribe', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const m = appJs.match(/JSON\.stringify\(progression\.map\(item=>\(\{([\s\S]*?)\}\)\)\)/);
  assert(m, 'app.js sigue guardando «Mi progresión» con un objeto de acorde literal');
  const enApp = [...m[1].matchAll(/^\s*([a-zA-Z]+):/gm)].map(x => x[1]).sort();
  assert.deepEqual([...CHORD_FIELDS].sort(), enApp, 'si app.js gana o pierde un campo de acorde, la whitelist del modelo exige la misma ronda');
});

test('guarda de fuente única: los tipos del modelo son la lista chordTypes vigente de la app', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const m = appJs.match(/const chordTypes = \[([\s\S]*?)\n\];/);
  assert(m, 'app.js sigue declarando chordTypes');
  const enApp = [...m[1].matchAll(/value:\s*'([^']+)'/g)].map(x => x[1]);
  assert(enApp.length, 'la lista de app.js no se leyó vacía');
  assert.deepEqual(CHORD_TYPES, enApp, 'si app.js gana o pierde un tipo de acorde, la lista del modelo exige la misma ronda');
  const libJs = fs.readFileSync(path.join(__dirname, '..', 'song-library-ui.js'), 'utf8');
  assert(libJs.includes('chordTypes.some(type=>type.value===chord.type)'), 'la fuente que el modelo refleja sigue siendo la validación de la biblioteca');
});

test('el módulo es puro: sin pantallla, sin almacenamiento, sin dependencias y sin mutar nada', () => {
  const fuente = fs.readFileSync(path.join(__dirname, '..', 'song-structure.js'), 'utf8');
  assert(!fuente.match(/document\.|querySelector|addEventListener|localStorage|getElementById|require\(/), 'el modelo no toca la interface ni depende de la app');
  assert.deepEqual(clone(BASE), BASE); // guardia barata del texto anterior
  const antes = clone(BASE);
  setArrangementRepeat(BASE, 0, 5);
  duplicateBlock(BASE, 'verso');
  updateBlock(BASE, 'verso', {name: 'Z'});
  moveArrangementEntry(BASE, 1, 0);
  flattenArrangement(BASE);
  assert.deepEqual(BASE, antes, 'ninguna operación muta el documento que recibe');
});
