// FS-PERF-02: la coordenada de recorte cambia en cada scroll. No debe
// invalidar por herencia todo el contenido del panel, sólo su borde propio.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

test('FS-PERF: el recorte es una longitud local, no una variable heredada por el panel entero', () => {
  const registration = css.match(/@property\s+--panel-recorte\s*\{([^}]+)\}/)?.[1];
  assert.ok(registration, 'falta registrar --panel-recorte');
  assert.match(registration, /syntax:\s*["']<length>["']/);
  assert.match(registration, /inherits:\s*false\s*;/);
  assert.match(registration, /initial-value:\s*0px\s*;/);
});

test('FS-PERF: el borde recibe explícitamente el recorte y el panel conserva clip y hit-test', () => {
  const border = css.match(/html\.ventana \.panel-scroll\.is-panel-recortado::before\s*\{([^}]+)\}/)?.[1];
  assert.match(border, /--panel-recorte:\s*inherit\s*;/);
  assert.match(border, /top:\s*var\(--panel-recorte,\s*0px\)/);
  assert.match(css, /clip-path:\s*inset\(var\(--panel-recorte,\s*0px\) -40px -40px\)/);
});
