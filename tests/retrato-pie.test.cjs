// T-49 · Retrato sin vacío colgante y pie legible (A-11, 2026-10-24).
//
// A 768×1366 el contenido de la pestaña Mástil terminaba cerca de y=910 y el
// footer en y=971, mientras la barra fija empezaba en y=1307: quedaban unos
// 336px de página muerta. El shell móvil debe ocupar lo que resta del viewport
// para que el panel y el pie lleguen a la barra; el navegador mide la geometría
// final, y estas guardas conservan la estructura que la hace posible.

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function mediaBlock(condition) {
  const start = css.indexOf(condition);
  assert.notEqual(start, -1, 'falta el bloque ' + condition);
  const opening = css.indexOf('{', start + condition.length);
  let depth = 1;
  let cursor = opening + 1;
  while (cursor < css.length && depth) {
    if (css[cursor] === '{') depth += 1;
    if (css[cursor] === '}') depth -= 1;
    cursor += 1;
  }
  return css.slice(opening + 1, cursor - 1);
}

function ruleIn(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(escaped + '\\s*\\{([^{}]*)\\}'));
  assert.ok(match, 'falta la regla ' + selector);
  return match[1];
}

function has(body, property, value) {
  return new RegExp('(^|;)\\s*' + property + '\\s*:\\s*' + value + '\\s*(;|$)', 'i').test(body);
}

test('en retrato el shell de pestañas llena el viewport hasta la barra inferior', () => {
  const mobile = mediaBlock('@media (max-width: 800px)');
  const body = ruleIn(mobile, 'body');
  const shell = ruleIn(mobile, '.shell');
  const workspace = ruleIn(mobile, '.workspace');
  const fretboard = ruleIn(mobile, 'body[data-mobile-tab] .fretboard-section');

  assert.ok(has(body, 'min-height', '100vh') && has(body, 'display', 'flex') && has(body, 'flex-direction', 'column'),
    'sin body mínimo en columna flex, el contenido termina antes de la barra fija y deja el vacío colgante de retrato');
  assert.ok(has(shell, 'flex', '1 1 auto') && has(shell, 'min-height', '0'),
    'sin .shell flexible, no recibe el alto libre entre topbar, footer y pestañas');
  assert.ok(has(workspace, 'flex', '1 1 auto') && has(workspace, 'min-height', '0'),
    'sin .workspace flexible, el contenedor de la pestaña no llega junto al footer y la barra inferior');
  assert.ok(has(fretboard, 'flex', '1 1 auto') && has(fretboard, 'min-height', '0'),
    'sin estirar el panel activo, .workspace llega abajo pero deja una franja blanca separada del contenido de la pestaña');
});

test('el pie separa la firma del explorador y su propósito con el punto medio', () => {
  const footer = html.match(/<footer>([\s\S]*?)<\/footer>/i);
  assert.ok(footer, 'el pie de página debe seguir presente');
  assert.match(footer[1], /explorador armónico<\/span>\s*<span>\s*·\s*hecho para estudiar, tocar y descubrir\./i,
    'el punto medio entre «EXPLORADOR ARMÓNICO» y «HECHO PARA ESTUDIAR…» evita que las dos frases queden pegadas en retrato');
});
