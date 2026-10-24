// T-50 · A-16 (2026-10-24).
//
// El pliegue de T-48 redujo todo el documento a una sola pantalla: el autor
// pidió conservar el hero y aplicar el presupuesto solo después de llegar a
// la zona de tocar. Además, «Todos los acordes» se leía dos veces al abrir
// Secciones del tema y el control para ampliarlas quedaba en otra fila.

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...css.matchAll(new RegExp(escaped + '\\s*\\{([^{}]*)\\}', 'g'))];
  assert.ok(matches.length, `falta la regla ${selector}`);
  return matches.at(-1)[1].replace(/\s+/g, ' ');
}

function has(body, property, value) {
  return new RegExp('(^|;)\\s*' + property + '\\s*:\\s*' + value + '\\s*(;|$)', 'i').test(body);
}

test('el hero recupera presencia y el documento vuelve a desplazarse antes de la zona de tocar', () => {
  const intro = rule('.intro');
  const title = rule('.intro h1');
  const document = rule('html, body');
  const workspace = rule('.workspace');

  assert.ok(/padding:\s*(?:[5-9]\d|[1-9]\d{2})px 0 (?:[4-9]\d|[1-9]\d{2})px/.test(intro),
    'el hero necesita aire vertical otra vez; 6px/8px lo dejaba reducido a una línea técnica');
  assert.match(title, /font-size:\s*clamp\((?:3[89]|[4-9]\d)px,/,
    'el título recupera la escala expresiva de la primera pantalla');
  assert.ok(!/overflow:\s*hidden/.test(document),
    'el documento debe volver a scrollear: el presupuesto no puede borrar el hero');
  assert.ok(has(workspace, 'height', '100vh') && has(workspace, 'min-height', '0'),
    'al llegar al workspace, la zona de tocar ocupa un viewport y sus columnas pueden resolver su propio scroll');
});

test('Secciones del tema no duplica la vista activa y deja su ampliación en la fila del resumen', () => {
  assert.match(html, /id="section-view-label"[^>]*class="sr-only"/,
    'la etiqueta de estado se mantiene para lectores de pantalla, pero no repite visualmente «Todos los acordes»');

  const panel = rule('.sections-panel');
  const summary = rule('.sections-panel > summary');
  const maximize = rule('#sections-maximize');
  const contents = rule('.sections-panel > :not(summary, #sections-maximize)');

  assert.match(panel, /display:\s*grid/, 'el panel usa una grilla compacta para compartir la cabecera');
  assert.match(panel, /grid-template-columns:\s*minmax\(0, ?1fr\) auto/,
    'el summary y el botón de ampliar ocupan la misma fila');
  assert.ok(has(summary, 'margin', '0'), 'el summary no agrega una fila vacía sobre el contenido');
  assert.ok(has(maximize, 'margin', '0'), '«Ampliar secciones» deja de abrir una fila propia');
  assert.match(contents, /grid-column:\s*1 \/ -1/,
    'el editor, la vista y la lista siguen debajo de la única fila de cabecera');
});
