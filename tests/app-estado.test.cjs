// T-01 · paso 3: el estado de la aplicación en un objeto central.
//
// La prueba nace roja sobre `f7dd9f8`: allí no existe `app-state.js` y el estado
// son veinte `let` sueltos en el ámbito global de `app.js`. Después del paso 3
// vigila tres cosas: que el estado se declare una sola vez, que cada nombre
// siga funcionando como global de lectura y escritura, y que ningún otro script
// de la página se crea dueño de un dato del estado.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const leer = file => fs.readFileSync(path.join(root, file), 'utf8');
const estado = (() => {
  try { return require('../app-state.js'); } catch { return null; }
})();
const exigirEstado = () => assert.ok(estado, 'app-state.js existe y exporta AppState (paso 3 de T-01)');

// El contrato de la mudanza: estos nombres dejan de ser `let` de `app.js` y
// pasan a `AppState`. Si uno vuelve a app.js como declaración propia, el test lo
// dice; si aparece uno nuevo, hay que agregarlo acá en la misma ronda.
const ESTADO = [
  'activeProgression', 'chordType', 'displayModeIndex', 'draggingProgressionItem',
  'ghostMode', 'instrument', 'mastilScope', 'pentatonicView', 'pianoUseFlats',
  'playingProgressionItem', 'progression', 'progressionEdited', 'quality', 'root',
  'rootNoteName', 'selectedFretMidi', 'selectedMode', 'selectedTonality',
  'songTonality', 'verLevel',
];

function declaracionesDelTexto(source) {
  const nombres = new Set();
  for (const line of source.split('\n')) {
    const match = line.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/);
    if (match) nombres.add(match[1]);
  }
  return nombres;
}

function scriptsDeLaPagina() {
  const html = leer('index.html').replace(/<!--[\s\S]*?-->/g, '');
  return [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
}

// Sandbox mínimo: el estado no toca el DOM, así que alcanza con el contexto
// vacío. Se usa `vm` porque es el mismo mecanismo con el que los demás tests
// montan `app.js`.
function sandbox() {
  const ctx = vm.createContext({});
  vm.runInContext(leer('app-state.js'), ctx);
  return { ctx, run: code => vm.runInContext(code, ctx) };
}

test('app-state.js declara, lee y escribe el estado una sola vez', () => {
  exigirEstado();
  // La API exportada es el mismo código que usa la página; se prueba sobre una
  // instancia limpia para no mezclar los nombres de la carga real.
  const sonda = (() => {
    const ctx = vm.createContext({});
    vm.runInContext(leer('app-state.js'), ctx);
    return { ctx, run: code => vm.runInContext(code, ctx) };
  })();
  const api = sonda.run('AppState');
  assert.equal(typeof api.define, 'function');
  api.define('sonda', 1);
  assert.equal(api.get('sonda'), 1);
  assert.equal(api.set('sonda', 2), 2);
  assert.equal(api.get('sonda'), 2);
  assert.equal(api.has('sonda'), true);
  assert.deepEqual([...api.names()], ['sonda']);
  assert.throws(() => api.define('sonda', 3), /ya está declarado/);
  assert.throws(() => api.get('no-existe'), /no está declarado/);
  assert.throws(() => api.set('no-existe', 1), /no está declarado/);
});

test('cada nombre del estado se publica como global con getter y setter', () => {
  exigirEstado();
  const { ctx, run } = sandbox();
  run(`declareAppState('root', 0); declareAppState('progression', [{ root: 0 }]);`);
  const descriptor = Object.getOwnPropertyDescriptor(ctx, 'root');
  assert.equal(typeof descriptor.get, 'function', 'root se lee a través de AppState');
  assert.equal(typeof descriptor.set, 'function', 'root se escribe a través de AppState');
  // Leer el global y escribir el global, que es lo que hacen los otros scripts.
  assert.equal(run('root'), 0);
  run('root = 7');
  assert.equal(run('AppState.get("root")'), 7, 'escribir el global escribe el estado central');
  run('AppState.set("root", 9)');
  assert.equal(run('root'), 9, 'escribir el estado central se ve al leer el global');
  // La lista también se comparte por referencia, como antes: no hay copia.
  run('progression.push({ root: 5 })');
  assert.equal(run('AppState.get("progression").length'), 2);
});

test('app.js no vuelve a declarar el estado y lo declara una vez por nombre', () => {
  const app = leer('app.js');
  const declaradas = declaracionesDelTexto(app);
  for (const nombre of ESTADO) {
    assert(!declaradas.has(nombre), `app.js no declara ${nombre}: vive en AppState`);
    const llamadas = [...app.matchAll(new RegExp(`^declareAppState\\('${nombre}'`, 'gm'))];
    assert.equal(llamadas.length, 1, `app.js declara ${nombre} exactamente una vez`);
  }
  assert.equal(declaradas.has('AppState'), false, 'app.js no redefine el objeto central');
  assert.equal(declaradas.has('declareAppState'), false, 'la publicación vive en app-state.js');
});

test('ningún otro script de la página declara un nombre del estado', () => {
  const ajenos = scriptsDeLaPagina().filter(file => file !== 'app.js' && file !== 'app-state.js');
  for (const file of ajenos) {
    const declaradas = declaracionesDelTexto(leer(file));
    for (const nombre of ESTADO) {
      assert(!declaradas.has(nombre), `${file} no declara ${nombre}: el dueño es AppState`);
    }
  }
});

test('la página carga app-state.js una vez y antes que app.js', () => {
  const scripts = scriptsDeLaPagina();
  assert.equal(scripts.filter(file => file === 'app-state.js').length, 1, 'app-state.js se carga una sola vez');
  const posicion = scripts.indexOf('app-state.js');
  assert(posicion !== -1, 'index.html carga app-state.js');
  assert(posicion < scripts.indexOf('app.js'), 'app-state.js se carga antes que app.js');
  assert(posicion > scripts.indexOf('music-model.js'), 'el modelo musical se carga antes que el estado');
});

test('app-state.js no toca el DOM ni la persistencia: solo guarda valores', () => {
  exigirEstado();
  const source = leer('app-state.js').replace(/\/\/[^\n]*/g, '');
  assert(!/document\./.test(source), 'el estado no consulta el DOM');
  assert(!/localStorage/.test(source), 'el estado no guarda: eso es de app.js');
  assert(!/render[A-Z]|updateView/.test(source), 'los setters no repintan: el repintado sigue explícito');
});
