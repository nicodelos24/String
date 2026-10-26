// T-55 ronda 2 (A-29) · El refuerzo tipográfico de las notas vivas del mástil.
//
// Palabra del autor: «algunas de las notas principales del acorde se ven como con
// las fuentes más en negrita y no me gusta, quiero que este cambio reciente de esas
// fuentes de las notas se deshaga». El refuerzo vino de `b77564d` (T-04): peso 700
// a 10 px en `.fret-note.live` y 11 px extra en raíz/acorde vivas.
//
// La reversión es solo de peso y tamaño: la señal de «esto está sonando» sigue en
// el aro dorado y el pulso (`DEF-01`) y en el halo de tinta de `T-36` r2. Por eso
// la guarda tiene dos mitades: ninguna nota viva puede declarar su propia
// tipografía, y todo lo que sí marca la nota viva tiene que seguir ahí.
//
// Se lee el CSS como texto, como el resto de las guardas de estilo de este repo
// (PACTO.md §5: `npm test` no mide estilos).

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

// Las reglas de style.css, sin comentarios, como pares {selector, cuerpo}. Se
// recorren también las de dentro de @media: una anulación condicionada sigue
// siendo una anulación cuando la condición se cumple.
function rules(source) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector.trim(),
    body,
  }));
}

const cssRules = rules(css);

function declarations(rule) {
  // El grupo 1 es el (^|;) que ancla la declaración: sin él, la propiedad del
  // primer par sale pegada al selector y la prueba no mira lo que cree mirar.
  return [...rule.body.matchAll(/(^|;)\s*([a-z-]+)\s*:\s*([^;]+)/g)].map(([, , property, value]) => ({
    property,
    value: value.trim(),
  }));
}

// Nota viva del mástil. `live-fade` es otra clase y no entra; el `(?![\w-])`
// distingue `.live` de `.live-fade` y de cualquier `.live-algo` futuro.
const NOTE_LIVE = /\.(?:fret-note|open-string-note)\.live(?![\w-])/;

const liveRules = cssRules.filter((rule) => NOTE_LIVE.test(rule.selector));

test('ninguna nota viva del mástil declara su propio peso ni tamaño de letra', () => {
  // La reversión de A-29: el rótulo de una nota viva hereda la tipografía base de
  // `.fret-note` (9 px/peso 500), en vez de engordar al sonar. Si vuelve una regla
  // con font-weight/font-size/font en esta zona, el síntoma del autor regresa.
  assert.ok(liveRules.length > 0, 'no se encontró ninguna regla de nota viva en style.css');

  const offenders = [];
  for (const rule of liveRules) {
    for (const {property, value} of declarations(rule)) {
      if (property === 'font-weight' || property === 'font-size' || property === 'font') {
        offenders.push(`${rule.selector} · ${property}: ${value}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `las notas vivas no deben reforzar la tipografía (A-29):\n${offenders.join('\n')}`,
  );
});

test('la nota base del mástil sigue en 9 px y peso 500', () => {
  // Es la referencia a la que vuelven las notas vivas. Si la base se mueve, la
  // reversión se mide contra otro número y la guarda anterior deja de significar
  // lo mismo.
  const baseRules = cssRules.filter((rule) => rule.selector === '.fret-note');
  const base = baseRules.flatMap(declarations);

  assert.ok(
    base.some(({property, value}) => property === 'font-weight' && value === '500'),
    'la nota base del mástil debe conservar font-weight: 500',
  );
  assert.ok(
    base.some(
      ({property, value}) =>
        (property === 'font-size' && value === '9px') ||
        (property === 'font' && /^9px\b/.test(value)),
    ),
    'la nota base del mástil debe conservar 9 px de letra',
  );
});

test('la señal de la nota viva sigue en el aro dorado y el pulso', () => {
  // Quitar la negrita no puede llevarse la señal: sin el aro y el pulso, una nota
  // sonando no se distingue y la reversión tipográfica se vuelve una regresión.
  const liveBlock = liveRules.find((rule) => declarations(rule).some(({property}) => property === 'box-shadow'));
  assert.ok(liveBlock, 'falta el bloque de nota viva con su aro');

  const live = declarations(liveBlock);
  const shadow = live.find(({property}) => property === 'box-shadow');
  const animation = live.find(({property}) => property === 'animation');

  assert.match(shadow.value, /#ffc107/, 'el aro dorado de la nota viva debe seguir ahí');
  assert.match(animation.value, /live-bounce/, 'el pulso de la nota viva debe seguir ahí');

  const ring = cssRules.find(
    (rule) =>
      /\.(?:fret-note|open-string-note)\.live::after/.test(rule.selector) &&
      declarations(rule).some(({property, value}) => property === 'animation' && /live-ring/.test(value)),
  );
  assert.ok(ring, 'el anillo animado de la nota viva debe seguir ahí');
});

test('el halo de tinta de T-36 r2 no se toca al revertir la tipografía', () => {
  // La reversión es de peso y tamaño, no de tinta: `ink-dark`/`ink-light` siguen
  // eligiendo el halo al revés de la tinta que puso `note-ink.js`.
  for (const ink of ['ink-dark', 'ink-light']) {
    const rule = cssRules.find(
      (candidate) =>
        new RegExp(`\\.fret-note\\.live\\.${ink}`).test(candidate.selector) &&
        declarations(candidate).some(({property, value}) => property === 'text-shadow' && value.length > 0),
    );
    assert.ok(rule, `falta el halo de tinta .${ink} de la nota viva`);
  }
});
