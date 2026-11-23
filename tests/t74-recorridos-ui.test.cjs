// T-74 · Recorridos críticos guardar / abrir / importar / exportar sobre el
// manejador REAL de song-library-ui.js montado en un DOM simulado (mismo molde
// que tests/song-library.test.cjs). No se toca el producto ni los datos del
// dueño: todo el storage es un Map en memoria.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const KEY = 'traste.songs.v1';
const PRODUCT_FILES = [
  'progression-duration.js', 'tonal-context.js', 'note-ink.js', 'music-model.js',
  'app-state.js', 'fretboard-render.js', 'app.js', 'song-library.js',
  'song-structure.js', 'song-structure-adapter.js', 'song-library-ui.js',
];

function setupUi({ fileSize = null, fileText = null } = {}) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      id, handlers: {}, options: [], selectedIndex: 0, hidden: false, textContent: '', href: '',
      disabled: false, currentValue: '', style: { setProperty() {} }, attrs: {}, checked: false,
      set innerHTML(html) {
        this.html = html;
        this.options = [...html.matchAll(/<option value="([^"]*)"(?: data-note="([^"]*)")?/g)]
          .map(m => ({ value: m[1], dataset: { note: m[2] } }));
      },
      get innerHTML() { return this.html || ''; },
      set value(value) { this.currentValue = String(value); const i = this.options.findIndex(o => o.value === String(value)); if (i >= 0) this.selectedIndex = i; },
      get value() { return this.currentValue; },
      addEventListener(name, fn) { this.handlers[name] = fn; },
      dispatchEvent(event) { if (this.handlers[event.type]) this.handlers[event.type]({ target: this }); return true; },
      removeAttribute(name) { delete this.attrs[name]; },
      setAttribute(name, value) { this.attrs[name] = String(value); },
      querySelectorAll() { return []; },
      reportValidity() { return true; },
      replaceChildren() {},
      add(child) { (this.children ??= []).push(child); },
      querySelector(selector) { return element(id + selector); },
      click() { if (this.handlers.click) this.handlers.click({ target: this }); },
    });
    return elements.get(id);
  };
  for (const [id, props] of Object.entries({
    '#player-bpm': { tagName: 'INPUT', type: 'number', min: '30', max: '300', value: 120 },
    '#player-style': { tagName: 'SELECT', options: [{ value: 'none' }, { value: 'rock' }], value: 'none' },
    '#player-percussion': { type: 'checkbox', checked: true },
    '#player-loop': { type: 'checkbox', checked: true },
    '#player-volume': { tagName: 'INPUT', type: 'number', min: '0', max: '1', value: 1 },
    '#player-drum-volume': { tagName: 'INPUT', type: 'number', min: '0', max: '1', value: 1 },
  })) Object.assign(element(id), props);

  const storage = new Map();
  const links = [];
  const blobs = [];
  const sandbox = {
    document: {
      getElementById: id => element(`#${id}`),
      querySelector: id => element(id),
      querySelectorAll: () => [],
      addEventListener() {},
      createElement: () => {
        const link = { href: '', download: '', clicked: 0, click() { this.clicked++; } };
        links.push(link);
        return link;
      },
    },
    window: {
      addEventListener() {}, dispatchEvent() {},
      StringSections: { sections: [], serialize() { return this.sections; }, load(s) { this.sections = s; } },
      StringVideoSync: { save() { return []; }, load() {} },
    },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    Option: class Option { constructor(label, value) { this.label = label; this.value = value; } },
    Event: class Event { constructor(type) { this.type = type; } },
    CustomEvent: class CustomEvent { constructor(type, detail) { this.type = type; this.detail = detail; } },
    TextEncoder, URL: { createObjectURL: blob => { blobs.push(blob); return 'blob:t74/' + blobs.length; }, revokeObjectURL() {} },
    Blob,
    validateSections: () => [],
    validateVideoMarks: () => [],
    crypto: { randomUUID: () => crypto.randomUUID() },
    location: { protocol: 'http:' },
    youtubeVideoId: () => null,
    draggingProgressionItem: null,
    setTimeout,
  };
  vm.createContext(sandbox);
  for (const file of PRODUCT_FILES) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), sandbox, { filename: file });
  }

  const progression = [{ root: 7, rootNoteName: 'G', type: 'maj', mode: 'ionian', ghostMode: '', beats: 4 }];
  vm.runInContext(`progression=${JSON.stringify(progression)}`, sandbox);
  return { sandbox, element, storage, links, blobs };
}
const status = e => e('#song-status').textContent;
function guardar(e, s, title) {
  e('#song-title').value = title;
  vm.runInContext("document.getElementById('song-save').handlers.click()", s);
  return JSON.parse(vm.runInContext("localStorage.getItem('traste.songs.v1')", s));
}

// -- Guardar / abrir --------------------------------------------------------

test('T-74 · guardar nueva escribe v1 en traste.songs.v1 y abrir restaura título y tarjetas', () => {
  const { sandbox, element, storage } = setupUi();
  const saved = guardar(element, sandbox, 'Blues de prueba');
  assert.equal(saved.version, 1);
  assert.equal(saved.songs.length, 1);
  assert.equal(saved.songs[0].title, 'Blues de prueba');
  assert.match(status(element), /Guardado: Blues de prueba/);

  // Simulamos salir y volver: el state de trabajo se limpia y se reabre.
  vm.runInContext('progression=[]', sandbox);
  element('#song-title').value = '';
  element('#song-list').value = saved.songs[0].id;
  vm.runInContext("document.getElementById('song-open').handlers.click()", sandbox);
  assert.equal(element('#song-title').currentValue, 'Blues de prueba');
  assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext('progression.map(c=>c.root)', sandbox))), [7]);
  assert.match(status(element), /Abierta: Blues de prueba/);
  assert.equal(storage.get(KEY), JSON.stringify(saved), 'abrir no reescribe la biblioteca');
});

test('T-74 · Actualizar conserva el id y no duplica la canción; sin selección, Abrir avisa', () => {
  const { sandbox, element } = setupUi();
  const saved = guardar(element, sandbox, 'Original');
  const id = saved.songs[0].id;
  element('#song-title').value = 'Editada';
  vm.runInContext("document.getElementById('song-update').handlers.click()", sandbox);
  const after = JSON.parse(vm.runInContext("localStorage.getItem('traste.songs.v1')", sandbox));
  assert.equal(after.songs.length, 1);
  assert.equal(after.songs[0].id, id);
  assert.equal(after.songs[0].title, 'Editada');

  element('#song-list').value = '';
  vm.runInContext("document.getElementById('song-open').handlers.click()", sandbox);
  assert.match(status(element), /Selecciona una progresión guardada/, 'sin selección avisa y no inventa datos');
});

// -- Exportar ---------------------------------------------------------------

test('T-74 · Exportar prepara un Blob JSON descargable con el nombre string-progresiones.json', () => {
  const { sandbox, element, links, blobs } = setupUi();
  guardar(element, sandbox, 'Para respaldo');
  vm.runInContext("document.getElementById('song-export').handlers.click()", sandbox);
  assert.equal(links.length, 1);
  assert.equal(links[0].download, 'string-progresiones.json');
  assert.equal(links[0].clicked, 1);
  assert.equal(blobs[0].type, 'application/json');
  return blobs[0].text().then(raw => {
    const data = JSON.parse(raw);
    assert.equal(data.version, 1);
    assert.equal(data.songs[0].title, 'Para respaldo');
  });
});

// -- Importar ---------------------------------------------------------------

async function importar(sandbox, element, raw, size) {
  element('#song-import').handlers.change({
    target: { files: [{ size: size ?? Buffer.byteLength(raw), text: async () => raw }], value: 'x' },
  });
  // El handler es async: esperamos a que el microtask termine.
  await new Promise(resolve => setImmediate(resolve));
}

test('T-74 · Importar añade copias con id nuevo y respeta las canciones existentes', async () => {
  const { sandbox, element } = setupUi();
  const original = guardar(element, sandbox, 'Ya guardada');
  const backup = JSON.stringify(original);
  await importar(sandbox, element, backup);
  const after = JSON.parse(vm.runInContext("localStorage.getItem('traste.songs.v1')", sandbox));
  assert.equal(after.songs.length, 2);
  assert.notEqual(after.songs[0].id, after.songs[1].id);
  assert.equal(after.songs[0].title, 'Ya guardada');
  assert.match(status(element), /Se importaron 1 progresiones como copias/);
});

test('T-74 · Importar un archivo de más de 20 MB se rechaza sin tocar la biblioteca', async () => {
  const { sandbox, element } = setupUi();
  const original = guardar(element, sandbox, 'Intacta');
  const before = vm.runInContext("localStorage.getItem('traste.songs.v1')", sandbox);
  await importar(sandbox, element, JSON.stringify(original), SongLibraryMax() + 1);
  function SongLibraryMax() { return vm.runInContext('SongLibrary.maxBackupBytes', sandbox); }
  assert.equal(vm.runInContext("localStorage.getItem('traste.songs.v1')", sandbox), before);
  assert.match(status(element), /20 MB/, 'el avisó dice por qué se rechazó');
});

test('T-74 · Importar JSON inválido se rechaza con aviso y sin datos nuevos', async () => {
  const { sandbox, element } = setupUi();
  const original = guardar(element, sandbox, 'Intacta');
  const before = vm.runInContext("localStorage.getItem('traste.songs.v1')", sandbox);
  await importar(sandbox, element, '{"version":2,"songs":[]}');
  assert.equal(vm.runInContext("localStorage.getItem('traste.songs.v1')", sandbox), before);
  assert.match(status(element), /No se importó el archivo/);
});

test('T-74 · Importar un backup con 201 progresiones se rechaza y conserva la biblioteca', async () => {
  const { sandbox, element } = setupUi();
  guardar(element, sandbox, 'Intacta');
  const before = vm.runInContext("localStorage.getItem('traste.songs.v1')", sandbox);
  const songs = Array.from({ length: 201 }, (_, i) => ({
    id: `foranea${i}`, title: `Foránea ${i}`, video: '', chords: [{ root: 0, type: 'maj', mode: 'ionian', beats: 4 }],
    settings: { 'player-bpm': 120, 'player-style': 'none', 'player-percussion': true, 'player-loop': true, 'player-volume': 1, 'player-drum-volume': 1 },
  }));
  await importar(sandbox, element, JSON.stringify({ version: 1, songs }));
  assert.equal(vm.runInContext("localStorage.getItem('traste.songs.v1')", sandbox), before);
  assert.match(status(element), /No se importó el archivo/);
});
