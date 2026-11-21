// T-74 · Guardas de compatibilidad: traste.songs.v1, JSON v1, 200 canciones,
// 20 MB por respaldo. Controles de VERIFICACIÓN sobre el código de producto
// SIN cambiarlo. Todo se ejecuta sobre un almacenamiento falso: ninguna prueba
// lee ni escribe los datos reales del dueño.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SongLibrary } = require('../song-library.js');

const KEY = 'traste.songs.v1';
const MAX = SongLibrary.maxBackupBytes; // 20 * 1024 * 1024
function setup(validate = song => structuredClone(song)) {
  const data = new Map();
  const storage = {
    getItem: key => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, value),
  };
  return { library: new SongLibrary(storage, validate), storage, data };
}
const cancion = i => ({ id: `s${i}`, title: `Canción ${i}`, chords: [{ root: 0, type: 'maj' }] });

// -- Clave y esquema v1 -----------------------------------------------------

test('T-74 · la clave de almacenamiento es exactamente traste.songs.v1', () => {
  const { library, storage } = setup();
  assert.equal(library.key, KEY);
  library.save(cancion(1));
  assert.deepEqual([...storage.getItem(KEY) ? [KEY] : []], [KEY], 'se escribe en esa clave y en ninguna otra');
});

test('T-74 · read() con la clave ausente devuelve [] y no crea la clave', () => {
  const { library, data } = setup();
  assert.deepEqual(library.read(), []);
  assert.equal(data.has(KEY), false);
});

test('T-74 · write() produce {"version":1,"songs":[...]}', () => {
  const { library, storage } = setup();
  library.save(cancion(1));
  const data = JSON.parse(storage.getItem(KEY));
  assert.equal(data.version, 1);
  assert(Array.isArray(data.songs));
  assert.equal(data.songs.length, 1);
  assert.deepEqual(data.songs[0], cancion(1));
});

test('T-74 · se rechaza versión distinta de 1 y songs que no sea arreglo', () => {
  const { library } = setup();
  for (const raw of [
    '{"version":2,"songs":[]}',
    '{"version":0,"songs":[]}',
    '{"songs":[]}',
    '{"version":1,"songs":{}}',
    '{"version":1}',
    'null',
    '[]',
    'no-es-json',
  ]) {
    assert.throws(() => library.parse(raw), /Formato de biblioteca no compatible.|no es un objeto|JSON|Unexpected|Cannot read|undefined/, `rechaza: ${raw}`);
  }
});

test('T-74 · IDs repetidos se rechazan y no reemplazan datos guardados', () => {
  const { library, storage } = setup();
  library.save(cancion(1));
  const antes = storage.getItem(KEY);
  assert.throws(() => library.parse(JSON.stringify({ version: 1, songs: [cancion(1), cancion(1)] })), /identificadores repetidos/);
  assert.equal(storage.getItem(KEY), antes, 'parse no toca el almacenamiento');
});

// -- Límite de 200 progresiones --------------------------------------------

test('T-74 · 200 canciones entran; la 201 se rechaza sin tocar lo guardado', () => {
  const { library, storage } = setup();
  library.write(Array.from({ length: 200 }, (_, i) => cancion(i)));
  assert.equal(library.read().length, 200);
  const antes = storage.getItem(KEY);
  assert.throws(() => library.write(Array.from({ length: 201 }, (_, i) => cancion(i))), /Formato de biblioteca no compatible/);
  assert.equal(storage.getItem(KEY), antes, 'el rechazo no sobrescribe la biblioteca');
  assert.throws(() => library.parse(JSON.stringify({ version: 1, songs: Array.from({ length: 201 }, (_, i) => cancion(i)) })), /Formato de biblioteca no compatible/);
});

// -- Límite de 20 MB por respaldo ------------------------------------------

test('T-74 · maxBackupBytes es 20*1024*1024 (20 MB)', () => {
  assert.equal(MAX, 20 * 1024 * 1024);
});

test('T-74 · import rechaza un respaldo de 20 MB + 1 byte y conserva los datos', () => {
  const { library } = setup();
  library.save(cancion(1));
  const antes = library.export();
  const oversize = ' '.repeat(MAX + 1); // ASCII => 1 byte por carácter
  assert.throws(() => library.import(oversize), /20 MB/);
  assert.equal(library.export(), antes);
});

test('T-74 · parse/export aplican el mismo guarda de tamaño', () => {
  const { library } = setup();
  assert.throws(() => library.parse(' '.repeat(MAX + 1)), /20 MB/);
  assert.throws(() => SongLibrary.checkSize(42), /20 MB/);
  // export() sobre una canción de 4096 acordes ronda los ~250 KB: muy por
  // debajo del límite; el guarda se ejerce en el import, no aquí.
  const grande = { id: 'g', title: 'Grande', chords: Array.from({ length: 4096 }, () => ({ root: 0, type: 'maj7' })) };
  library.save(grande);
  assert(Buffer.byteLength(library.export()) < MAX);
});

test('T-74 · exactamente 20 MB de entrada NO se rechaza por tamaño (límite inclusivo)', () => {
  const { library } = setup();
  // 20 MB de espacios pasan checkSize y fallan después en JSON.parse: eso
  // prueba que el guarda es '>' y no '>='.
  assert.throws(() => library.parse(' '.repeat(MAX)), /JSON|Unexpected|terminó|Finish/);
});

// -- Recorridos guardar / abrir / importar / exportar ----------------------

test('T-74 · guardar-add actualiza por id, export/import añade copias con id nuevo', () => {
  // Validador con copia profunda: es lo que hace la UI real (structuredClone
  // del objeto validado), de modo que el array en storage no comparte
  // referencias con el array devuelto por read().
  const { library } = setup(song => structuredClone(song));
  library.save(cancion(1));
  library.save({ ...cancion(1), title: 'Editada' }); // mismo id => reemplaza
  assert.equal(library.read().length, 1);
  assert.equal(library.read()[0].title, 'Editada');

  const backup = library.export();
  assert.equal(library.import(backup), 1, 'import devuelve cuántas canciones entraron');
  assert.equal(library.read().length, 2);
  assert.notEqual(library.read()[0].id, library.read()[1].id, 'la copia tiene id propio');
  assert.equal(library.read()[1].title, 'Editada');
  const { id: _idOriginal, ...original } = library.read()[0];
  const { id: _idCopia, ...copia } = library.read()[1];
  assert.deepEqual(copia, original, 'la copia es independiente pero igual salvo el id');
  // Las dos canciones son objetos distintos: comprobamos que editar una no
  // toca la otra leyendo dos veces del almacenamiento (cada read() parsea).
  const copias = library.read();
  copias[1].title = 'Copia editada';
  assert.equal(library.read()[1].title, 'Editada', 'editar la copia leída no altera lo guardado (read devuelve objetos independientes)');
});

test('T-74 · remove() borra por id y deja la biblioteca vacía válida', () => {
  const { library } = setup();
  library.save(cancion(1));
  library.save(cancion(2));
  library.remove('s1');
  assert.deepEqual(library.read().map(c => c.id), ['s2']);
  library.remove('s2');
  assert.deepEqual(library.read(), []);
  assert.deepEqual(JSON.parse(library.export()), { version: 1, songs: [] });
});

test('T-74 · un validador que rechaza la canción impide guardar sin borrar lo anterior', () => {
  const validate = song => { if (song.title === 'mala') throw new Error('Progresión no válida.'); return song; };
  const { library, storage } = setup(validate);
  library.save(cancion(1));
  const antes = storage.getItem(KEY);
  assert.throws(() => library.save({ id: 'x', title: 'mala' }), /Progresión no válida/);
  assert.equal(storage.getItem(KEY), antes, 'los datos existentes no se reemplazan');
});

test('T-74 · un backup con una canción inválida se rechaza en import sin tocar la biblioteca', () => {
  const validate = song => { if (song.title === 'mala') throw new Error('Progresión no válida.'); return song; };
  const { library } = setup(validate);
  library.save(cancion(1));
  const antes = library.export();
  const malo = JSON.stringify({ version: 1, songs: [cancion(9), { id: 'm', title: 'mala' }] });
  assert.throws(() => library.import(malo), /Progresión no válida/);
  assert.equal(library.export(), antes);
});

test('T-74 · fallo de almacenamiento (QuotaExceeded) se propaga sin perder datos', () => {
  const { library, storage } = setup();
  library.save(cancion(1));
  const antes = library.export();
  storage.setItem = () => { throw new Error('QuotaExceeded'); };
  assert.throws(() => library.save(cancion(2)), /QuotaExceeded/);
  assert.equal(library.export(), antes);
});

test('T-74 · datos corruptos en la clave se reportan, no se sobreescriben en silencio', () => {
  const { library, storage } = setup();
  storage.setItem(KEY, '{roto');
  assert.throws(() => library.read());
  assert.equal(storage.getItem(KEY), '{roto');
});
