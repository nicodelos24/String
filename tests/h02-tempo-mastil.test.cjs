// H-02 · barra Mástil no tapa el Tempo a 390×600 (20-nov-2026).
//
// En móvil, `.mobile-tabs` es fixed abajo con z-index 40 y cubre los últimos
// ~59 px del viewport. La píldora flotante del transporte se coloca con
// `--transporte-top` calculado desde el tope de la banda de tarjetas; al
// desplazarse, ese tope puede caer dentro de la franja de la barra y el botón
// Tempo queda interceptado. El observador debe limitar el alto de la píldora
// para que no invada esa franja. El régimen de escritorio (html.ventana) es
// otro camino y no se toca. El hit-test real se mide en el navegador.

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'transport-pill.js'), 'utf8');
const cssCrudo = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const css = cssCrudo.replace(/\/\*[\s\S]*?\*\//g, '');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function reglas(fuente) {
  return [...fuente.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, cuerpo]) => ({
    selector: selector.trim(),
    cuerpo: cuerpo.replace(/\s+/g, ' '),
  }));
}

// Cuerpo de la regla con este selector exacto, dentro del bloque @media dado.
function reglaEnMedia(condicion, selectorExacto) {
  // Puede haber varios @media con la misma condición; recorrerlos todos.
  const buscado = condicion.replace('@media ', '').replace(/\s+/g, '');
  const aperturas = [...css.matchAll(/@media([^{]+)\{/g)];
  for (const m of aperturas) {
    if (m[1].replace(/\s+/g, '') !== buscado) continue;
    let profundidad = 1;
    let cursor = m.index + m[0].length;
    while (cursor < css.length && profundidad) {
      if (css[cursor] === '{') profundidad += 1;
      if (css[cursor] === '}') profundidad -= 1;
      cursor += 1;
    }
    const cuerpoMedia = css.slice(m.index + m[0].length, cursor - 1);
    const encontrada = reglas(cuerpoMedia).find(regla => regla.selector === selectorExacto);
    if (encontrada) return encontrada.cuerpo;
  }
  assert.fail(`falta la regla ${selectorExacto} en ${condicion}`);
}

function reglaEn(fuente, selectorExacto) {
  const encontrada = reglas(fuente).find(regla =>
    regla.selector === selectorExacto ||
    regla.selector.split(',').map(parte => parte.trim()).includes(selectorExacto));
  assert.ok(encontrada, `falta la regla ${selectorExacto}`);
  return encontrada.cuerpo;
}

const tiene = (cuerpo, propiedad, valor) =>
  new RegExp('(^|;)\\s*' + propiedad + '\\s*:\\s*' + valor + '\\s*(;|$)', 'i').test(cuerpo);

test('la barra de pestañas sigue fija abajo y por encima del transporte en móvil', () => {
  const tabs = reglaEnMedia('@media (max-width: 800px)', '.mobile-tabs');
  assert.ok(tiene(tabs, 'position', 'fixed'), 'la barra permanece fija');
  assert.ok(tiene(tabs, 'z-index', '40'), 'y por encima de la píldora (z-index 7)');

  const pill = reglaEn(css, '.transport-row.is-floating:not(.is-transport-minimized) .transport-pill');
  assert.ok(tiene(pill, 'z-index', '7'), 'el transporte sigue por debajo de la barra');
});

test('el observador limita el tope de la píldora a la franja de la barra fija', () => {
  const fn = js.slice(js.indexOf('function aplicarLegado'), js.indexOf('function claseVentana'));
  assert.ok(fn.length > 0, 'existe el camino del respaldo móvil');

  assert.match(fn, /querySelector\(\s*['"]\.mobile-tabs['"]\s*\)/,
    'mide la barra de pestañas, no una constante');
  assert.match(fn, /getBoundingClientRect\(\)\.top/,
    'toma el borde superior real de la barra');
  assert.match(fn, /Math\.min\(/,
    'el tope de la píldora se limita como máximo, sin moverla cuando sobra espacio');
  assert.match(fn, /getBoundingClientRect\(\)\.height/,
    'descuenta el alto real de la píldora, no un número fijo');
  assert.match(fn, /Math\.max\(\s*0/,
    'nunca publica un tope negativo si la barra ocupa casi todo el viewport');

  // El tope publicado sigue siendo el mismo que consume la CSS de la píldora.
  assert.match(fn, /setProperty\(\s*['"]--transporte-top['"]/,
    'sigue publicando --transporte-top');
  assert.ok(js.includes('function aplicarVentana'),
    'el régimen de escritorio (ventana) permanece en su función separada');
  const ventana = js.slice(js.indexOf('function aplicarVentana'), js.indexOf('function aplicarLegado'));
  assert.ok(!ventana.includes('.mobile-tabs'),
    'el ajuste de la barra no se aplica al régimen de escritorio');
});

test('el HTML conserva el Tempo dentro de la píldora y la barra de pestañas', () => {
  assert.equal((html.match(/id="tempo-tap"/g) || []).length, 1, 'un solo botón Tempo');
  assert.equal((html.match(/class="mobile-tabs"/g) || []).length, 1, 'una sola barra de pestañas');
  assert.ok(html.includes('data-mobile-tab="mastil"'), 'la pestaña Mástil existe');
});

test('H-02b: el tramo no-flotante saca el Tempo de debajo de la barra sin tocar el anclaje', () => {
  const fn = js.slice(js.indexOf('function aplicarLegado'), js.indexOf('function claseVentana'));

  // El clamping ya no queda encerrado en `if (flotar)`: se aplica también al
  // reposo (scroll ~20-79), donde el control caía bajo la barra fija.
  assert.match(fn, /if \(barra && barra\.getClientRects\(\)\.length > 0\)/,
    'el límite por la barra corre en ambos regímenes, no sólo al flotar');
  assert.ok(!/if \(flotar && barra/.test(fn), 'el tope ya no está dentro de if(flotar)');

  // Estado acotado al cruce: se mide la fila (sitios de flujo estables) y se
  // excluye el minimizado, para no mover el respaldo de la ronda 2.
  assert.match(fn, /!flotar && !minimizada && pildora/,
    'el estado de cruce excluye el régimen flotante y el minimizado');
  assert.match(fn, /filaRect\.bottom > barraTop/,
    'se mide la fila, que no se desplaza al pasar la píldora a fixed');
  assert.match(fn, /classList\.toggle\(\s*['"]is-tempo-sobre-barra['"]/,
    'publica el estado de cruce para la CSS');
  assert.match(fn, /classList\.remove\(\s*['"]is-floating['"]\s*,\s*['"]is-tempo-sobre-barra['"]/,
    'limpia el estado cuando el control deja de verse');

  // La CSS del estado de cruce: píldora fixed (sale del contexto z-index 1 de
  // main.shell), con el tope limitado, por debajo de la barra (z-index 7 < 40)
  // y con la fila reservando su alto para que el contenido no dé un salto.
  const reglaFila = reglaEn(css,
    '.transport-row.is-tempo-sobre-barra:not(.is-floating):not(.is-transport-minimized)');
  assert.ok(tiene(reglaFila, 'height', '80px'), 'la fila conserva su alto de reposo');

  const reglaPill = reglaEn(css,
    '.transport-row.is-tempo-sobre-barra:not(.is-floating):not(.is-transport-minimized) .transport-pill');
  assert.ok(tiene(reglaPill, 'position', 'fixed'), 'la píldora sale del contexto que la clavaba bajo la barra');
  assert.ok(tiene(reglaPill, 'top', 'var\\(--transporte-top, 8px\\)'), 'usa el tope limitado por la barra');
  assert.ok(tiene(reglaPill, 'left', 'var\\(--transporte-left, 8px\\)'), 'conserva su izquierda de reposo, sin salto horizontal');
  assert.ok(/width:\s*var\(--transporte-franja/.test(reglaPill), 'conserva su ancho de reposo');
  assert.ok(tiene(reglaPill, 'z-index', '7'), 'sigue por debajo de la barra de pestañas (40)');

  // Y el estado vive sólo en móvil: el escritorio (html.ventana) no lo consume.
  const media = css.slice(css.indexOf('@media (max-width: 800px)'));
  assert.ok(media.includes('.transport-row.is-tempo-sobre-barra'), 'el estado queda dentro del bloque móvil');
});
