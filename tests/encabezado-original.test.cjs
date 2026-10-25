// T-51 · A-17 (2026-10-25).
//
// El autor pidió recuperar exactamente la composición del encabezado que
// precede a T-46. Esta guarda conserva su contenido y las medidas que lo
// separan de la versión compactada, sin invadir la zona de tocar posterior.

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

function baseRule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...css.matchAll(new RegExp(escaped + '\\s*\\{([^{}]*)\\}', 'g'))];
  assert.ok(matches.length, `falta la regla ${selector}`);
  return matches[0][1].replace(/\s+/g, ' ');
}

function has(body, property, value) {
  return new RegExp('(^|;)\\s*' + property + '\\s*:\\s*' + value + '\\s*(;|$)', 'i').test(body);
}

test('el encabezado recupera el contenido editorial exacto anterior a T-46', () => {
  const intro = html.match(/<section class="intro">([\s\S]*?)<\/section>/);
  assert.ok(intro, 'la sección de introducción debe seguir presente');

  assert.match(intro[1], /<p class="eyebrow">GUITARRA \/ MAPA ARMÓNICO<\/p>/,
    'la ceja editorial vuelve a ser visible, no una ayuda desplegable');
  assert.match(intro[1], /<h1>Encuentra tu próximo<br><em>camino<\/em> para improvisar\.<\/h1>/,
    'el salto de línea original recupera la composición del título');
  assert.match(intro[1], /<p class="intro-copy">Elige un acorde, prueba una escala y mira cómo respira sobre el mástil\.<\/p>/,
    'el texto descriptivo vuelve a acompañar el título');
  assert.doesNotMatch(intro[1], /class="inline-help intro-help"/,
    'la ayuda compactada no sustituye las tres piezas del encabezado original');
});

test('el encabezado conserva las medidas de referencia sin alterar el workspace', () => {
  const topbar = baseRule('.topbar');

  assert.ok(has(topbar, 'height', '78px'),
    'la barra superior vuelve a los 78 px de la referencia b47fa3c');
  assert.match(css, /\.intro\s*\{\s*padding-top:\s*28px;\s*padding-bottom:\s*28px;\s*\}/,
    'la cascada final recupera el aire de 28px de la referencia b47fa3c');
  assert.match(css, /\.intro h1\s*\{\s*font-size:\s*clamp\(30px,\s*4vw,\s*48px\);\s*\}/,
    'la cascada final recupera la escala de título de la referencia b47fa3c');
  assert.ok(!/\.intro\s*\{\s*display:\s*grid/.test(css),
    'el encabezado original no agrega la grilla ni el hueco de la composición de T-50');
});
