// T-01 · paso 4: el render de la escala y del mástil en su propio archivo.
//
// La prueba nace roja sobre `636ab15`: allí el dibujo del mástil y sus rótulos
// viven en `app.js` y no existe `fretboard-render.js`. Después del paso 4 vigila
// la mudanza: el módulo existe, declara lo que se movió, `app.js` ya no lo
// declara, la página lo carga una sola vez antes de `app.js` y el módulo se
// puede cargar sin DOM (no pinta nada al cargarse).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const leer = file => fs.readFileSync(path.join(root, file), 'utf8');
const existe = () => fs.existsSync(path.join(root, 'fretboard-render.js'));

// El contrato de la mudanza: estos nombres dejan de declararse en `app.js` y
// pasan a `fretboard-render.js`. Si uno vuelve a `app.js`, el test lo dice.
const RENDER = [
  'displayNote', 'displayNoteSpelled', 'getDegreeLabel', 'getIntervalClass',
  'shouldHighlightInterval', 'getFretLabel', 'renderFretboard', 'renderOpenStrings',
  'paintFretLabelButtons',
];
// Las listas de rótulos de los dos botones de zona y su armador viajan con la
// pintura que las usa.
const ROTULOS = [
  'VER_LABELS', 'MASTIL_LABELS', 'VER_PREFIX', 'MASTIL_PREFIX', 'VER_SPOKEN',
  'MASTIL_SPOKEN', 'VER_HELP', 'MASTIL_HELP', 'fretLabel',
];

function scriptsDeLaPagina() {
  const html = leer('index.html').replace(/<!--[\s\S]*?-->/g, '');
  return [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
}

function declaraciones(source) {
  const nombres = new Set();
  for (const line of source.split('\n')) {
    const match = line.match(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/);
    if (match) nombres.add(match[1]);
    // `const A = 1, B = 2` declara dos nombres en la misma línea.
    const lista = line.match(/^(?:const|let|var)\s+(.+)$/);
    if (lista) {
      for (const parte of lista[1].split(',')) {
        const otro = parte.trim().match(/^([A-Za-z_$][\w$]*)\s*=/);
        if (otro) nombres.add(otro[1]);
      }
    }
  }
  return nombres;
}

test('fretboard-render.js existe y declara el render que salió de app.js', () => {
  assert.ok(existe(), 'existe fretboard-render.js (paso 4 de T-01)');
  const declaradas = declaraciones(leer('fretboard-render.js'));
  for (const nombre of [...RENDER, ...ROTULOS]) {
    assert(declaradas.has(nombre), `fretboard-render.js declara ${nombre}`);
  }
  const app = declaraciones(leer('app.js'));
  for (const nombre of [...RENDER, ...ROTULOS]) {
    assert(!app.has(nombre), `app.js ya no declara ${nombre}: vive en fretboard-render.js`);
  }
});

test('el render no se lleva estado, persistencia ni listeners', () => {
  assert.ok(existe(), 'existe fretboard-render.js');
  const modulo = leer('fretboard-render.js').replace(/\/\/[^\n]*/g, '');
  assert(!/declareAppState/.test(modulo), 'el estado se declara en app.js, no en el render');
  assert(!/localStorage/.test(modulo), 'el render no guarda: eso es de app.js');
  assert(!/addEventListener/.test(modulo), 'los listeners se quedan en app.js: el render solo pinta');
});

test('el módulo se carga sin DOM: al cargarse no pinta nada', () => {
  assert.ok(existe(), 'existe fretboard-render.js');
  // Un contexto sin `document` ni `window`: si el archivo tocara el DOM al
  // cargarse, esto explota. Las funciones sí lo tocan cuando se las llama.
  const ctx = vm.createContext({});
  assert.doesNotThrow(() => vm.runInContext(leer('fretboard-render.js'), ctx),
    'fretboard-render.js se carga sin DOM');
  assert.equal(vm.runInContext('typeof renderFretboard', ctx), 'function');
  assert.equal(vm.runInContext('typeof renderOpenStrings', ctx), 'function');
});

test('index.html carga el render una sola vez, después del modelo y antes de app.js', () => {
  assert.ok(existe(), 'existe fretboard-render.js');
  const scripts = scriptsDeLaPagina();
  assert.equal(scripts.filter(script => script === 'fretboard-render.js').length, 1,
    'fretboard-render.js se carga una sola vez');
  const posicion = scripts.indexOf('fretboard-render.js');
  assert(posicion > scripts.indexOf('app-state.js'), 'se carga después del estado');
  assert(posicion > scripts.indexOf('note-ink.js'), 'se carga después de note-ink.js, que usa al pintar');
  assert(posicion < scripts.indexOf('app.js'), 'se carga antes de app.js, que lo llama al arrancar');
});
