// T-01 · paso 1 (medición) y paso 2 (modelo musical fuera de app.js).
// La prueba nace roja sobre `8b34dc4`: allí no existe `music-model.js` y app.js
// todavía declara las tablas. Después del paso 2 queda verde y vigila dos cosas:
// que el modelo siga siendo una sola fuente y que ningún script de la página
// declare dos veces un mismo nombre global.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const leer = file => fs.readFileSync(path.join(root, file), 'utf8');
// En la base `8b34dc4` el archivo no existe: el require no debe tumbar el
// archivo entero, sino hacer fallar cada prueba con el motivo a la vista.
const modelo = (() => {
  try { return require('../music-model.js'); } catch { return null; }
})();
const exigirModelo = () => assert.ok(modelo, 'music-model.js existe y exporta el modelo (paso 2 de T-01)');

// Nombres que el paso 2 sacó de app.js. La lista es el contrato de la mudanza:
// si uno vuelve a app.js o deja de existir en el modelo, el test lo dice.
const MOVIDOS = [
  'notes', 'noteLabels', 'instruments', 'tonalities', 'scales', 'modes',
  'chordTypes', 'qualities', 'intervalColors', 'alteredIntervalColors',
  'sharpToFlat', 'flatToSharp', 'noteToIndex', 'noteName', 'getModeNotes',
  'getAvailableModes', 'chordQualityOf', 'findClosestMode', 'validGhostMode',
  'validVariants', 'calculateKeySignature',
];

function declaracionesDelTexto(source) {
  const nombres = new Set();
  for (const line of source.split('\n')) {
    const match = line.match(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/);
    if (match) nombres.add(match[1]);
  }
  return nombres;
}

function scriptsDeLaPagina() {
  const html = leer('index.html').replace(/<!--[\s\S]*?-->/g, '');
  return [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
}

test('las tablas musicales conservan la forma que consume la aplicación', () => {
  exigirModelo();
  assert.equal(modelo.notes.length, 12, 'doce clases de paso');
  assert.equal(new Set(modelo.notes).size, 12, 'sin clases repetidas');
  for (const [sostenido, bemol] of Object.entries(modelo.noteLabels)) {
    assert(modelo.notes.includes(sostenido), `la etiqueta ${sostenido} tiene su nota`);
    assert.equal(modelo.noteToIndex(bemol), modelo.noteToIndex(sostenido), `${bemol} y ${sostenido} son la misma clase de paso`);
  }

  assert.deepEqual(modelo.instruments.guitar.strings, [40, 45, 50, 55, 59, 64], 'afinación de guitarra intacta');
  assert.deepEqual(modelo.instruments.bass.strings, [28, 33, 38, 43], 'afinación de bajo intacta');

  assert.equal(modelo.tonalities.length, 30, 'quince tonalidades mayores y sus relativas menores naturales');
  for (const ton of modelo.tonalities) {
    const intervals = ton.scale === 'minor' ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
    const esperadas = intervals.map(intervalo => (modelo.noteToIndex(ton.key) + intervalo) % 12);
    assert.deepEqual(ton.scaleNotes, esperadas, `la escala ${ton.scale} de ${ton.key} sale de su tónica`);
  }
  const mayores = modelo.tonalities.filter(ton => ton.scale === 'major');
  const menores = modelo.tonalities.filter(ton => ton.scale === 'minor');
  assert.equal(mayores.length, 15);
  assert.equal(menores.length, 15);
  assert.equal(new Set(modelo.tonalities.map(modelo.tonalityId)).size, 30, 'cada selector/persistencia tiene una identidad única');
  for (const minor of menores) {
    const relative = mayores.find(major => major.sharps === minor.sharps && major.flats === minor.flats);
    assert(relative, `${minor.id} comparte armadura con su relativa mayor`);
    assert.equal((modelo.noteToIndex(minor.key) + 3) % 12, modelo.noteToIndex(relative.key), `${minor.id} es la relativa menor correcta`);
  }

  assert.equal(modelo.chordTypes.length, 23, 'los veintitrés tipos de acorde');
  for (const tipo of modelo.chordTypes) {
    assert.equal(tipo.intervals[0], 0, `${tipo.value} parte de la raíz`);
    assert.equal(new Set(tipo.intervals).size, tipo.intervals.length, `${tipo.value} no repite intervalos`);
    assert(tipo.intervals.every(intervalo => Number.isInteger(intervalo) && intervalo >= 0 && intervalo < 12),
      `${tipo.value} solo usa clases de paso`);
  }
  assert.equal(new Set(modelo.chordTypes.map(tipo => tipo.value)).size, 23, 'sin valores de acorde repetidos');

  for (const [calidad, datos] of Object.entries(modelo.qualities)) {
    assert(modelo.modes[datos.defaultMode], `${calidad} tiene su modo por defecto en el modelo`);
    for (const modo of datos.modes) assert(modelo.modes[modo], `${calidad} solo ofrece modos conocidos (${modo})`);
  }

  assert.deepEqual(Object.keys(modelo.intervalColors).map(Number).sort((a, b) => a - b), [...Array(12).keys()], 'doce intervalos cromáticos');
  for (const intervalo of [...Object.values(modelo.intervalColors), ...Object.values(modelo.alteredIntervalColors)]) {
    assert.match(intervalo.color, /^#[0-9a-f]{6}$/i, `${intervalo.name} tiene color de seis dígitos`);
    const pares = intervalo.color.match(/[a-f0-9]{2}/gi).map(valor => parseInt(valor, 16));
    assert.deepEqual(intervalo.rgb, pares, `${intervalo.name} trae su rgb calculado del mismo color`);
  }
});

test('las funciones puras del modelo conservan el contrato que usaba app.js', () => {
  exigirModelo();
  assert.equal(modelo.noteName(12), 'C', 'la clase de paso da la vuelta');
  assert.equal(modelo.noteToIndex('Db'), 1, 'el bemol entra por la etiqueta');
  assert.equal(modelo.noteToIndex('Cb'), 11, 'la enarmonía extendida sigue resuelta');

  assert.deepEqual(modelo.getModeNotes('ionian', 0), [0, 2, 4, 5, 7, 9, 11], 'jónico desde Do');
  assert.deepEqual(modelo.getModeNotes('dorian', 2), [0, 2, 4, 5, 7, 9, 11], 'dórico es el ii de Do');
  assert.deepEqual(modelo.getModeNotes('minorPentatonic', 9), [9, 0, 2, 4, 7], 'pentatónica menor desde La');
  assert.deepEqual(modelo.getModeNotes('modo-inventado', 0), [], 'un modo desconocido no revienta');

  assert.deepEqual(modelo.getAvailableModes('major'), ['ionian', 'lydian', 'mixolydian', 'majorPentatonic', 'minorPentatonic']);
  assert.deepEqual(modelo.getAvailableModes('inventada'), [], 'una calidad desconocida no revienta');

  assert.equal(modelo.chordQualityOf({ type: 'maj' }), 'major');
  assert.equal(modelo.chordQualityOf({ type: 'm7' }), 'minor');
  assert.equal(modelo.chordQualityOf({ type: 'm7b5' }), 'diminished');
  assert.equal(modelo.chordQualityOf({ type: 'desconocido' }), 'major', 'el tipo raro cae al primero, como antes');

  assert.equal(modelo.validGhostMode('dorian'), 'dorian');
  assert.equal(modelo.validGhostMode('inventado'), '', 'solo modos conocidos');
  assert.deepEqual(modelo.validVariants({ '1': { ghostMode: 'dorian' }, '9': { ghostMode: 'lydian' }, '02': { ghostMode: 'lydian' } }),
    { 1: { ghostMode: 'dorian' }, 2: { ghostMode: 'lydian' } }, 'solo vueltas 1–8 y modos conocidos, con la clave normalizada a número');
  assert.deepEqual(modelo.validVariants({ '3': { ghostMode: 'dorian' }, '4': 'no-es-objeto' }), { 3: { ghostMode: 'dorian' } });
  assert.equal(modelo.validVariants({}), undefined, 'sin variantes válidas no hay clave');
  assert.equal(modelo.validVariants([]), undefined, 'una lista no es un mapa de variantes');

  assert.equal(modelo.calculateKeySignature('ionian', 0, 'C').key, 'C');
  assert.equal(modelo.calculateKeySignature('ionian', 1, 'Db').key, 'Db', 'la grafía bemol manda');
  assert.equal(modelo.calculateKeySignature('ionian', 1, 'C#').key, 'C#', 'la grafía sostenido manda');
  assert.equal(modelo.calculateKeySignature('minorPentatonic', 9, 'A').key, 'C', 'la pentatónica menor usa su relativa mayor');
  assert.equal(modelo.calculateKeySignature('minorPentatonic', 0, 'C').key, 'Eb');
  assert.equal(modelo.calculateKeySignature('inventado', 0, 'C').key, 'C', 'un modo desconocido vuelve a Do sin armadura');
});

test('la armadura modal usa mayores aunque la tabla incluya menores enarmónicas', () => {
  exigirModelo();
  const casos = [
    ['ionian', 3, 'D#', { sharps: 0, flats: 3, key: 'Eb' }],
    ['ionian', 8, 'G#', { sharps: 0, flats: 4, key: 'Ab' }],
    ['ionian', 10, 'A#', { sharps: 0, flats: 2, key: 'Bb' }],
    ['dorian', 10, 'A#', { sharps: 0, flats: 4, key: 'Ab' }],
    ['minorPentatonic', 8, 'G#', { sharps: 5, flats: 0, key: 'B' }],
    ['minorPentatonic', 8, 'Ab', { sharps: 0, flats: 7, key: 'Cb' }],
    ['ionian', 1, 'C#', { sharps: 7, flats: 0, key: 'C#' }],
    ['ionian', 1, 'Db', { sharps: 0, flats: 5, key: 'Db' }],
  ];
  for (const [modo, raiz, grafia, esperada] of casos) {
    assert.deepEqual(modelo.calculateKeySignature(modo, raiz, grafia), esperada,
      `${modo} de ${grafia} conserva su armadura mayor de referencia`);
  }
});

test('el modelo es una sola fuente: vive en music-model.js y ya no en app.js', () => {
  exigirModelo();
  const app = leer('app.js');
  const modeloFuente = leer('music-model.js');
  for (const nombre of MOVIDOS) {
    const declaracion = new RegExp('^(?:const|let|var|function|class)\\s+' + nombre + '\\b', 'm');
    assert(!declaracion.test(app), `${nombre} ya no se declara en app.js`);
    assert(declaracion.test(modeloFuente), `${nombre} vive en music-model.js`);
  }
  // El modelo puro no toca la página ni el almacenamiento: si lo hiciera,
  // volvería a mezclar modelo y render en otro archivo.
  assert.doesNotMatch(modeloFuente, /document\.|querySelector|addEventListener|localStorage|getElementById|require\(/,
    'music-model.js no toca DOM, almacenamiento ni dependencias');
});

test('index.html carga el modelo una sola vez y antes de app.js', () => {
  exigirModelo();
  const scripts = scriptsDeLaPagina();
  assert.equal(scripts.filter(script => script === 'music-model.js').length, 1, 'el modelo se carga una sola vez');
  assert(scripts.includes('app.js'), 'app.js sigue en la página');
  assert(scripts.indexOf('music-model.js') < scripts.indexOf('app.js'), 'el modelo se carga antes que app.js');
  assert.equal(scripts.filter(script => script === 'app.js').length, 1, 'app.js no se carga dos veces');
});

test('inventario de globales: ningún script declara dos veces el mismo nombre', () => {
  exigirModelo();
  const scripts = scriptsDeLaPagina();
  const duenios = new Map();
  for (const script of scripts) {
    const fuente = leer(script);
    for (const nombre of declaracionesDelTexto(fuente)) {
      if (!duenios.has(nombre)) duenios.set(nombre, []);
      duenios.get(nombre).push(script);
    }
  }
  const choques = [...duenios].filter(([, archivos]) => archivos.length > 1);
  assert.deepEqual(choques, [], 'los scripts clásicos comparten el ámbito global: un nombre declarado dos veces se pisa');
  // El inventario medido el 2026-10-25 (script en el expediente de la ronda):
  // app.js suelta las 21 declaraciones del modelo. No se fija el total exacto
  // (crecerá con las rondas siguientes); sí se fija que el modelo no volvió a
  // engordar app.js.
  assert(duenios.has('chordTypes') && duenios.get('chordTypes').length === 1, 'chordTypes tiene un único dueño');
  assert.deepEqual(duenios.get('chordTypes'), ['music-model.js'], 'chordTypes se declara solo en el modelo');
  assert.deepEqual(duenios.get('modes'), ['music-model.js'], 'modes se declara solo en el modelo');
});
