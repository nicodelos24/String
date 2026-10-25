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

test('el documento vuelve a desplazarse antes de la zona de tocar', () => {
  const document = rule('html, body');
  const workspace = rule('.workspace');

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
  const contents = rule('.sections-panel-content');

  assert.ok(has(panel, 'position', 'relative'),
    'el botón de ampliar se ancla a la cabecera sin convertir el contenido de details en una columna lateral');
  assert.ok(has(summary, 'min-height', '29px'),
    'el summary reserva una primera fila compacta, del alto de sus controles');
  assert.ok(has(summary, 'margin', '0'), 'el summary no agrega una fila vacía sobre el contenido');
  assert.ok(has(maximize, 'position', 'absolute'),
    '«Ampliar secciones» se mantiene en esa primera fila sin afectar el flujo del contenido');
  assert.ok(has(maximize, 'margin', '0'), '«Ampliar secciones» deja de abrir una fila propia');
  assert.match(html, /class="sections-panel-content"/,
    'el contenido del panel se agrupa debajo de la cabecera compacta');
  assert.ok(has(contents, 'display', 'block'),
    'el editor, la vista y la lista vuelven al flujo de ancho completo debajo de la cabecera');
});
