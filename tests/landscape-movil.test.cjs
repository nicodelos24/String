// landscape-movil · versión horizontal del teléfono (21-nov-2026).
//
// Guarda de estructura, no de píxeles: npm test no mide estilos (PACTO.md §5).
// Lo que sí afirma: la condición de régimen compacto es ÚNICA y la comparten
// CSS y JS; la hoja de horizontal es propia y no reescribe los tips H-02/H-02c;
// la barra de pestañas y los objetivos táctiles están declarados; el panel
// «Más» tiene su tope de 60dvh. El hit-test real se mide en el navegador.

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const css = read('style.css').replace(/\/\*[\s\S]*?\*\//g, '');
const landscape = read('landscape.css').replace(/\/\*[\s\S]*?\*\//g, '');
const html = read('index.html');
const jsTabs = read('mobile-tabs.js');
const jsTransport = read('transport-pill.js');
const jsCompact = read('compact-mode.js');

const COND = '(max-width: 800px), (orientation: landscape) and (max-height: 500px)';
const norm = s => s.replace(/\s+/g, '');

test('la condición compacta es una sola y la comparten CSS y JS', () => {
  assert.ok(jsCompact.includes(COND),
    'compact-mode.js debe ser la única fuente de la condición de régimen compacto');
  assert.ok(norm(jsTabs).includes(norm(COND)) || jsTabs.includes('pStringCompact'),
    'mobile-tabs.js debe usar la condición compartida, no un 800px propio');
  assert.ok(jsTransport.includes('pStringCompact'),
    'transport-pill.js debe consultar el régimen compartido (no duplicar el umbral)');
  assert.ok(css.includes(COND),
    'los bloques compactos de style.css deben usar la misma condición');
  assert.ok(landscape.includes('(orientation: landscape) and (max-height: 500px)'),
    'landscape.css debe regirse por el breakpoint de altura independiente');
});

test('la hoja de horizontal es propia y se carga después de style.css', () => {
  assert.ok(html.includes('href="landscape.css"'), 'index.html debe enlazar landscape.css');
  assert.ok(html.indexOf('href="landscape.css"') > html.indexOf('href="style.css"'),
    'landscape.css debe ir después de style.css para poder especializar sus tokens');
  assert.ok(html.includes('src="compact-mode.js"'), 'index.html debe cargar compact-mode.js');
  assert.ok(html.indexOf('src="compact-mode.js"') < html.indexOf('src="mobile-tabs.js"'),
    'compact-mode.js debe cargarse antes que mobile-tabs.js');
  assert.ok(html.indexOf('src="compact-mode.js"') < html.indexOf('src="transport-pill.js"'),
    'compact-mode.js debe cargarse antes que transport-pill.js');
});

test('el horizontal no reescribe el Tempo ni el pie: respeta H-02/H-02c', () => {
  assert.ok(!landscape.includes('is-tempo-sobre-barra'),
    'H-02 (Tempo sobre la barra) vive en style.css, no se duplica en landscape.css');
  assert.ok(!/footer\s*\{[^}]*z-index/.test(landscape),
    'H-02c (footer z-index:0) no se toca en horizontal: se hereda de style.css');
  assert.ok(css.includes('footer { z-index: 0; }'),
    'la regla H-02c del pie sigue presente en style.css');
  assert.ok(css.includes('.transport-row.is-tempo-sobre-barra:not(.is-floating)'),
    'la regla H-02 del tramo no flotante sigue presente en style.css');
});

test('intro oculta, topbar compacta, 44px y panel Más con tope 60dvh', () => {
  assert.ok(/\.intro\s*\{\s*display:\s*none/.test(landscape), 'la intro se oculta en horizontal');
  assert.ok(landscape.includes('--ls-topbar-h'), 'la topbar tiene token propio de altura');
  assert.ok(landscape.includes('--ls-tap: 44px'), 'el objetivo táctil mínimo es 44px');
  assert.ok(landscape.includes('--ls-mas-max: 60dvh'), 'el panel «Más» topa en 60dvh');
  assert.ok(landscape.includes('body[data-mobile-tab="mas"] .workspace'),
    'el panel «Más» se ancla y limita solo en su pestaña');
  assert.ok(landscape.includes('overflow-y: auto') && landscape.includes('max-height: var(--ls-mas-max)'),
    'el panel «Más» scrollea si el contenido no cabe');
});
