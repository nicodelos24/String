// T-05 (cierre) · bloque del interruptor de tema · 2026-10-25.
//
// El interruptor de tema pinta ♭ y ♯ sobre la pista de 46×26 y los mueve con
// `transform`: en claro el ♯ queda a 26px; en oscuro el ♭ queda a 10px. Antes
// de esta consolidación ese mismo par de desplazamientos estaba escrito cuatro
// veces —en `.theme-symbol-glyph`, en `.theme-sharp` y en las dos reglas
// oscuras—, así que mover la pista obligaba a acordarse de los cuatro lugares.
// Ahora el corrimiento vive en una sola variable por tema y cada símbolo dice
// únicamente qué se ve: su color y su opacidad.
//
// Estas pruebas leen el CSS como texto y fijan la forma que evita la deriva.
// La equivalencia visual antes/después se midió en Chromium con la sonda de la
// ronda: npm test no mide estilos (PACTO.md §5).

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

function rulesIn(source) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body], indice) => ({
    selector: selector.trim(),
    body,
    indice,
  }));
}

const rules = rulesIn(css);

const escapar = texto => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const has = (body, property, value) =>
  new RegExp('(^|;)\\s*' + escapar(property) + '\\s*:\\s*' + escapar(value) + '\\s*(;|$)', 'i').test(body);

const declara = (body, property) =>
  new RegExp('(^|;)\\s*' + escapar(property) + '\\s*:', 'i').test(body);

const lista = selector => selector.split(',').map(parte => parte.trim());

function reglaExacta(selector) {
  const encontradas = rules.filter(rule => rule.selector === selector);
  assert.equal(encontradas.length, 1, `debe haber una sola regla «${selector}» (hay ${encontradas.length})`);
  return encontradas[0];
}

// Todas las reglas del interruptor: las que nombran una clase `theme-`.
const delInterruptor = rules.filter(rule => lista(rule.selector).some(selector => selector.includes('theme-')));

test('el corrimiento del símbolo se declara una sola vez y en un solo lugar', () => {
  const conTransform = delInterruptor.filter(rule => declara(rule.body, 'transform'));
  assert.equal(
    conTransform.length,
    1,
    `el desplazamiento debe estar en una sola regla del interruptor (está en ${conTransform.length}: ${conTransform.map(r => r.selector).join(' · ')})`,
  );
  const regla = conTransform[0];
  assert.equal(regla.selector, '.theme-symbol-glyph', 'el desplazamiento vive en la regla de los dos símbolos, no copiado por selector');
  assert.ok(
    has(regla.body, 'transform', 'translate(var(--simbolo-x), -50%)'),
    'el desplazamiento usa la variable del tema en vez de un literal repetido',
  );
});

test('cada tema lleva el símbolo a su posición medida', () => {
  const claro = reglaExacta('.theme-symbol-glyph');
  assert.ok(has(claro.body, '--simbolo-x', '26px'), 'en claro el símbolo se corre 26px: el ♯ entra por la derecha de la pista de 46px');

  const oscuro = reglaExacta('html[data-theme="dark"] .theme-symbol-glyph');
  assert.ok(has(oscuro.body, '--simbolo-x', '10px'), 'en oscuro el símbolo se corre 10px: el ♭ entra por la izquierda');

  const definen = rules.filter(rule => declara(rule.body, '--simbolo-x'));
  assert.equal(definen.length, 2, `la variable debe definirse una vez por tema (hay ${definen.length} definiciones)`);
});

test('cada símbolo conserva solo lo suyo: color y visibilidad, sin repetir el corrimiento', () => {
  const plano = reglaExacta('.theme-flat');
  assert.ok(has(plano.body, 'color', '#f1f0e8'), 'el ♭ conserva su tinta clara');
  const agudo = reglaExacta('.theme-sharp');
  assert.ok(has(agudo.body, 'opacity', '1'), 'en claro se ve el ♯');
  assert.ok(has(agudo.body, 'color', '#d9952a'), 'el ♯ conserva su tinta ámbar');

  const oscuroPlano = reglaExacta('html[data-theme="dark"] .theme-flat');
  assert.ok(has(oscuroPlano.body, 'opacity', '1'), 'en oscuro se ve el ♭');
  const oscuroAgudo = reglaExacta('html[data-theme="dark"] .theme-sharp');
  assert.ok(has(oscuroAgudo.body, 'opacity', '0'), 'en oscuro se oculta el ♯');

  for (const [nombre, regla] of [['el ♭', plano], ['el ♯', agudo], ['el ♭ oscuro', oscuroPlano], ['el ♯ oscuro', oscuroAgudo]]) {
    assert.ok(!declara(regla.body, 'transform'), `${nombre} no debe repetir el corrimiento: vive en la regla de los dos símbolos`);
  }
});

test('la pista y la tipografía del símbolo no cambian', () => {
  const pista = reglaExacta('.theme-sky');
  for (const [propiedad, valor] of [
    ['position', 'relative'],
    ['width', '46px'],
    ['height', '26px'],
    ['box-sizing', 'border-box'],
    ['overflow', 'hidden'],
    ['border', '1px solid var(--line)'],
    ['border-radius', '999px'],
    ['background', 'var(--paper-light)'],
  ]) {
    assert.ok(has(pista.body, propiedad, valor), `la pista conserva ${propiedad}: ${valor}`);
  }

  const glifo = reglaExacta('.theme-symbol-glyph');
  for (const [propiedad, valor] of [
    ['position', 'absolute'],
    ['top', '50%'],
    ['left', '0'],
    ['font', '700 12px/1 var(--sans)'],
    ['opacity', '0'],
    ['transition', 'opacity .28s ease, transform .28s cubic-bezier(.2,.8,.2,1)'],
  ]) {
    assert.ok(has(glifo.body, propiedad, valor), `el símbolo conserva ${propiedad}: ${valor}`);
  }
});

test('movimiento reducido sigue apagando la transición del interruptor', () => {
  const reducido = rules.filter(rule => {
    const selectores = lista(rule.selector);
    return selectores.includes('.theme-sky') && selectores.includes('.theme-symbol-glyph');
  });
  assert.equal(reducido.length, 1, `debe haber una sola regla que cubra pista y símbolo (hay ${reducido.length})`);
  assert.ok(has(reducido[0].body, 'transition', 'none'), 'con movimiento reducido no hay transición que animar');
});
