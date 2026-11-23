// El globo de ayuda del «?» de Improvisar no se sale de la ventana.
//
// Antes de este arreglo la regla lo anclaba al borde derecho del «?» (right: 0)
// con 290 px fijos: cuando el «?» cae en el tramo izquierdo de la fila de
// captura (móvil con la pestaña Progresión, x=160; cápsula de escritorio entre
// 820 y 1220 px, x=182) el globo arrancaba en x=-106 / x=-84 y se cortaban el
// primer y el último renglón. Estas pruebas fijan la parte que decide el
// anclaje y el ancho; que quepa en cada ancho y en cada estado (reposo, barra
// clavada, minimizada, horizontal bajo) se mide en navegador.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const GLOBO = '.capture-row .improvisation-control .inline-help p';

// Última declaración ganadora de una propiedad dentro de las reglas cuyo
// selector incluye `selector` (ignora at-rules anidadas salvo que se pidan).
function declaracion(selector, propiedad) {
  const escapado = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|[{};,])\\s*${escapado}\\s*\\{([^{}]*)\\}`, 'g');
  let valor = null;
  for (let m = re.exec(css); m; m = re.exec(css)) {
    const d = m[1].match(new RegExp(`(?:^|;)\\s*${propiedad}\\s*:\\s*([^;}]+)`, 'g'));
    if (d) valor = d[d.length - 1].split(':').slice(1).join(':').trim();
  }
  return valor;
}

test('el globo de Improvisar se ancla al borde izquierdo del «?», no al derecho', () => {
  assert.equal(declaracion(GLOBO, 'left'), '0', 'el globo debe crecer hacia la derecha desde el «?»');
  assert.equal(declaracion(GLOBO, 'right'), 'auto', 'right: 0 era lo que lo sacaba por la izquierda');
  assert.equal(declaracion(GLOBO, 'transform'), 'none', 'sin centrado: el «?» ya está cerca del borde izquierdo');
});

test('el ancho del globo se acota a la ventana y no corta palabras largas', () => {
  const ancho = declaracion(GLOBO, 'width');
  assert.match(ancho, /min\(290px,\s*calc\(100vw\s*-\s*\d+px\)\)/,
    `un ancho fijo de 290 px no entra en una pantalla angosta (era «${ancho}»)`);
  assert.equal(declaracion(GLOBO, 'overflow-wrap'), 'anywhere',
    'sin overflow-wrap una palabra larga ensancha la caja más allá del ancho acotado');
});

test('en móvil el globo se centra sobre el «?» (la regla de la caja deja right: 0)', () => {
  const selector = '.progression-stack > .progression-view-controls .capture-row .improvisation-control .inline-help p';
  assert.equal(declaracion(selector, 'left'), '50%');
  assert.equal(declaracion(selector, 'right'), 'auto');
  assert.match(declaracion(selector, 'transform'), /translateX\(-50%\)/);
  // La regla genérica de la caja (media 700) sigue anclando con right: 0; es
  // la que pisaba este globo, así que la excepción tiene que seguir ahí.
  const caja = '.progression-stack > .progression-view-controls .inline-help p';
  assert.equal(declaracion(caja, 'right'), '0', 'si esa regla cambia, revisar la excepción de Improvisar');
});

test('con la barra clavada arriba el globo se abre hacia abajo, para no salir por el techo', () => {
  const clavado = 'html.ventana .transport-row.is-floating:not(.is-transport-minimized) .capture-row .improvisation-control .inline-help p';
  assert.match(declaracion(clavado, 'top'), /calc\(100% \+ 8px\)/);
  assert.equal(declaracion(clavado, 'bottom'), 'auto');
});

test('con el transporte minimizado (fila en el tope del panel) también se abre hacia abajo', () => {
  const minimizado = 'html.ventana .panel-strip:has(.is-transport-minimized) .capture-row .improvisation-control .inline-help p';
  assert.match(declaracion(minimizado, 'top'), /calc\(100% \+ 8px\)/);
  assert.equal(declaracion(minimizado, 'bottom'), 'auto');
});

test('en reposo el globo se abre hacia arriba, lejos de los controles de la fila', () => {
  assert.match(declaracion(GLOBO, 'bottom'), /calc\(100% \+ 8px\)/);
  assert.equal(declaracion(GLOBO, 'top'), 'auto');
});
