// T-05 (cierre) · bloque «Silencio» · 2026-10-25.
//
// Silencio y Tempo son los dos botones del transporte que comparten cuerpo.
// En DEF-02 se comprobó por qué eso importa: estaban escritos como gemelos
// separados, uno se quedó sin `font: inherit` y el botón cayó en Arial sin que
// nadie lo notara. Este bloque consolida las reglas de Silencio: lo que los dos
// botones tienen igual se declara una sola vez —cuerpo, icono, hover y active—
// y cada uno conserva únicamente lo suyo. La pareja `min-height`/`font-size`
// de Tempo queda en la regla de Tempo: la decisión `D-5` (11px vs 13px) es
// palabra del autor y sigue siendo un cambio de una línea.
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

// Regla única que cubre las dos variantes exactas (el orden de la lista no
// importa). Si hay más de una, la consolidación se deshizo.
function reglaCompartida(a, b) {
  const encontradas = rules.filter(rule => {
    const selectores = lista(rule.selector);
    return selectores.includes(a) && selectores.includes(b);
  });
  assert.equal(encontradas.length, 1, `debe haber una sola regla que cubra «${a}» y «${b}» (hay ${encontradas.length})`);
  return encontradas[0];
}

function reglaExacta(selector) {
  const encontradas = rules.filter(rule => rule.selector === selector);
  assert.equal(encontradas.length, 1, `debe haber una sola regla «${selector}» (hay ${encontradas.length})`);
  return encontradas[0];
}

// Lo que Silencio y Tempo comparten y por lo tanto vive en una sola regla.
const CUERPO = [
  ['display', 'inline-flex'],
  ['align-items', 'center'],
  ['gap', '5px'],
  ['padding', '0 10px'],
  ['border', '1px solid var(--line)'],
  ['border-radius', '8px'],
  ['background', 'var(--paper)'],
  ['color', 'var(--muted)'],
  ['font', 'inherit'],
  ['cursor', 'pointer'],
];

const ICONO = [
  ['width', '15px'],
  ['height', '15px'],
  ['fill', 'none'],
  ['stroke', 'currentColor'],
  ['stroke-width', '1.6'],
  ['stroke-linecap', 'round'],
  ['stroke-linejoin', 'round'],
];

const PROPIAS_DEL_CUERPO = ['display', 'align-items', 'gap', 'padding', 'border', 'border-radius', 'background', 'color', 'font', 'cursor'];

test('el cuerpo de los dos botones gemelos se declara una sola vez', () => {
  const regla = reglaCompartida('.tempo-tap', '.mute-toggle');
  for (const [propiedad, valor] of CUERPO) {
    assert.ok(has(regla.body, propiedad, valor), `la regla compartida debe declarar ${propiedad}: ${valor}`);
  }
});

test('el icono de los dos botones gemelos se declara una sola vez', () => {
  const regla = reglaCompartida('.tempo-tap svg', '.mute-toggle svg');
  for (const [propiedad, valor] of ICONO) {
    assert.ok(has(regla.body, propiedad, valor), `la regla compartida del icono debe declarar ${propiedad}: ${valor}`);
  }
});

test('hover y active también son compartidos, no copias', () => {
  const hover = reglaCompartida('.tempo-tap:hover', '.mute-toggle:hover');
  assert.ok(has(hover.body, 'border-color', 'var(--rust)'), 'el hover compartido marca el borde en rust');
  assert.ok(has(hover.body, 'color', 'var(--rust)'), 'el hover compartido marca el texto en rust');

  const active = reglaCompartida('.tempo-tap:active', '.mute-toggle:active');
  assert.ok(has(active.body, 'transform', 'scale(.97)'), 'el active compartido conserva el hundido de .97');
});

test('cada botón conserva solo lo suyo: altura y, en Tempo, la letra de D-5', () => {
  const silencio = reglaExacta('.mute-toggle');
  assert.ok(has(silencio.body, 'min-height', '28px'), 'Silencio conserva su altura de 28px');
  for (const propiedad of PROPIAS_DEL_CUERPO) {
    assert.ok(!declara(silencio.body, propiedad), `Silencio no debe repetir ${propiedad}: eso vive en la regla compartida`);
  }

  const tempo = reglaExacta('.tempo-tap');
  assert.ok(has(tempo.body, 'min-height', '40px'), 'Tempo conserva su altura de 40px');
  assert.ok(has(tempo.body, 'font-size', '13px'), 'Tempo conserva el 13px de DEF-02 mientras D-5 siga sin palabra');
  for (const propiedad of PROPIAS_DEL_CUERPO) {
    assert.ok(!declara(tempo.body, propiedad), `Tempo no debe repetir ${propiedad}: eso vive en la regla compartida`);
  }
});

test('el estado pulsado de Silencio conserva su contrato', () => {
  const primera = reglaExacta('.mute-toggle svg path:first-child');
  assert.ok(has(primera.body, 'fill', 'currentColor'), 'el altavoz va relleno con la tinta del botón');
  assert.ok(has(primera.body, 'stroke', 'none'), 'el altavoz relleno no lleva trazo');

  const tachado = reglaExacta('.mute-toggle .mute-slash');
  assert.ok(has(tachado.body, 'display', 'none'), 'apagado, el tachado no se ve');

  const pulsado = reglaExacta(".mute-toggle[aria-pressed='true']");
  assert.ok(has(pulsado.body, 'border-color', 'var(--rust)'), 'pulsado, el borde toma el acento');
  assert.ok(has(pulsado.body, 'background', 'var(--rust)'), 'pulsado, el fondo toma el acento');
  assert.ok(has(pulsado.body, 'color', 'var(--paper-light)'), 'pulsado, el icono y el texto pasan a papel claro');

  const ondas = reglaExacta(".mute-toggle[aria-pressed='true'] .mute-wave");
  assert.ok(has(ondas.body, 'display', 'none'), 'pulsado, las ondas se apagan');
  const slash = reglaExacta(".mute-toggle[aria-pressed='true'] .mute-slash");
  assert.ok(has(slash.body, 'display', 'block'), 'pulsado, aparece el tachado');
});

test('el hover compartido queda antes del pulsado para que la cascada no lo pise', () => {
  const hover = reglaCompartida('.tempo-tap:hover', '.mute-toggle:hover');
  const pulsado = reglaExacta(".mute-toggle[aria-pressed='true']");
  assert.ok(
    hover.indice < pulsado.indice,
    'el pulsado debe seguir al hover compartido: misma especificidad, gana el último',
  );
});
