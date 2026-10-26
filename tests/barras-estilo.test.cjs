// T-52 · A-19 (2026-10-25).
//
// Desde T-48/T-50 cada columna resuelve su contenido en su propio viewport y el
// documento vuelve a scrollear, así que las barras del sistema quedaron a la
// vista con su dibujo genérico. El autor pidió que acompañen lo visual de la
// página: riel fino y redondeado, pista tenue, tirador más marcado y el acento
// al pasar, en claro y oscuro.
//
// Estas pruebas leen el CSS como texto y fijan la forma que hace posible ese
// pedido: la paleta por tema, los dos dialectos (WebKit y el estándar) y que la
// ronda no toque `overflow` ni medidas. Que la barra se vea es revisión de
// navegador: npm test no mide estilos (PACTO.md §5).

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

// El bloque de la ronda, desde su comentario de cabecera hasta el comienzo del
// bloque siguiente (T-54). Así sigue siendo el tramo que T-52 agregó y permite
// afirmar qué tocó —y qué no— esa ronda, aunque el archivo crezca después.
const marca = css.indexOf('/* T-52');
const siguiente = css.indexOf('/* T-54', Math.max(marca, 0));
const bloque = marca === -1 ? '' : css.slice(marca, siguiente === -1 ? css.length : siguiente);

function rulesIn(source) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector.trim(),
    body,
  }));
}

const has = (body, property, value) =>
  new RegExp('(^|;)\\s*' + property + '\\s*:\\s*' + value + '\\s*(;|$)', 'i').test(body);

function regla(selectorExacto) {
  const encontrada = rulesIn(bloque).find(rule => rule.selector === selectorExacto);
  assert.ok(encontrada, `falta la regla ${selectorExacto} en el bloque T-52`);
  return encontrada.body;
}

// La lista de cajas es una sola, escrita con :where() para no sumar
// especificidad. Se compara por pertenencia, no por texto literal: el orden de
// la lista puede cambiar sin que cambie lo que cubre.
function selectorWebkit(sufijo) {
  const exacta = new RegExp('::-webkit-scrollbar' + sufijo + '$');
  const encontrada = rulesIn(bloque).find(
    rule => exacta.test(rule.selector) && rule.selector.includes(':where('),
  );
  assert.ok(encontrada, `falta la regla de ::-webkit-scrollbar${sufijo} en el bloque T-52`);
  return encontrada;
}

test('la paleta de las barras sigue el tema claro y el oscuro', () => {
  const declaraciones = [];
  for (const rule of rulesIn(bloque)) {
    for (const [, , property, value] of rule.body.matchAll(/(^|;)\s*(--[a-z-]+)\s*:\s*([^;]+)/g)) {
      declaraciones.push({selector: rule.selector, property, value: value.trim()});
    }
  }

  const claro = declaraciones.filter(d => d.property === '--scroll-track' || d.property === '--scroll-thumb');
  const oscuro = claro.filter(d => /\[data-theme="dark"\]/.test(d.selector));

  assert.ok(claro.some(d => d.property === '--scroll-track') &&
    claro.some(d => d.property === '--scroll-thumb'),
    'la ronda define la pista y el tirador como variables propias');

  for (const propiedad of ['--scroll-track', '--scroll-thumb']) {
    const enClaro = claro.find(d => d.property === propiedad && !/\[data-theme="dark"\]/.test(d.selector));
    const enOscuro = oscuro.find(d => d.property === propiedad);
    assert.ok(enClaro, `${propiedad} tiene valor en el tema claro`);
    assert.ok(enOscuro, `${propiedad} tiene valor en el tema oscuro`);
    assert.notEqual(enClaro.value, enOscuro.value,
      `${propiedad} cambia con el tema: una sola paleta no sirve para los dos`);
  }
});

test('riel con el grosor nativo y tirador fino y redondeado (WebKit)', () => {
  const riel = selectorWebkit('');
  for (const caja of ['html', '.control-panel', '.fretboard-section', '.legend-panel',
    '.progression', '#section-list', '#variants-editor', '#midi-preview', '#video-marks']) {
    assert.ok(riel.selector.includes(caja), `la barra del documento y las cajas con scroll cubren ${caja}`);
  }
  assert.ok(!riel.selector.includes('.fretboard-wrap'),
    'el wrap del mástil queda fuera: en 320 su riel clásico aplastaría la franja de 10 px');

  // El riel conserva los 15 px nativos de Chromium/Linux: cambiar su grosor
  // ensancharía cada columna y movería el layout, que es lo que la ficha
  // prohíbe. La finura sale del borde transparente del tirador.
  const ancho = riel.body.match(/(?:^|;)\s*width\s*:\s*([^;]+)/);
  assert.ok(ancho, 'el riel declara su grosor');
  const grosorRiel = parseFloat(ancho[1]);
  assert.equal(grosorRiel, 15, `el riel conserva el grosor nativo (${ancho[1].trim()})`);
  assert.ok(has(riel.body, 'height', '[^;]+'), 'el riel declara también el grosor horizontal');

  const pista = selectorWebkit('-track');
  assert.ok(has(pista.body, 'background-color', 'var\\(--scroll-track\\)'),
    'la pista usa su variable de tema');
  assert.ok(has(pista.body, 'border-radius', '[^;]+'),
    'la pista se redondea como el resto de la página');

  const tirador = selectorWebkit('-thumb');
  assert.ok(has(tirador.body, 'background-color', 'var\\(--scroll-thumb\\)'),
    'el tirador es más marcado que la pista');
  assert.ok(has(tirador.body, 'border-radius', '[^;]+'), 'el tirador se redondea');
  assert.ok(has(tirador.body, 'background-clip', 'padding-box'),
    'el tirador pinta solo el relleno, no su borde transparente');

  const borde = tirador.body.match(/(?:^|;)\s*border\s*:\s*(\d+)px\s+solid\s+transparent/);
  assert.ok(borde, 'el tirador se afina con un borde transparente');
  const visible = grosorRiel - 2 * Number(borde[1]);
  assert.ok(visible > 0 && visible <= 10,
    `el tirador visible mide ${visible} px: fino, no el grosor genérico del sistema`);

  const acento = rulesIn(bloque).find(rule => /::-webkit-scrollbar-thumb:hover/.test(rule.selector));
  assert.ok(acento, 'el tirador tiene estado de mano al pasar');
  assert.ok(has(acento.body, 'background-color', 'var\\(--rust\\)'),
    'al pasar, el tirador toma el acento de la página');
});

test('el estándar cubre a los navegadores sin las pseudoclases WebKit', () => {
  const soporte = bloque.match(/@supports\s+not\s+selector\(::-webkit-scrollbar\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(soporte, 'hay un bloque estándar para quien no entiende ::-webkit-scrollbar');
  assert.match(soporte[1], /scrollbar-width\s*:\s*thin/,
    'el grosor estándar también es fino');
  assert.match(soporte[1], /scrollbar-color\s*:\s*var\(--scroll-thumb\)\s+var\(--scroll-track\)/,
    'el color estándar usa la misma paleta: tirador sobre pista');
  for (const caja of ['html', '.control-panel', '.fretboard-section', '.legend-panel']) {
    assert.ok(soporte[1].includes(caja), `el estándar cubre ${caja}`);
  }
});

test('la ronda no toca overflow ni medidas: solo pinta la barra', () => {
  assert.ok(bloque, 'el bloque T-52 está presente');
  // Las pseudoclases de la barra sí declaran su grosor; lo que no puede
  // aparecer es una medida o un overflow sobre una caja de la página.
  const deCajas = rulesIn(bloque).filter(rule => !rule.selector.includes('::-webkit-scrollbar'));
  assert.ok(deCajas.length, 'el bloque declara al menos la paleta de tema');
  for (const rule of deCajas) {
    assert.doesNotMatch(rule.body, /(^|[;{\s])overflow(-[xy])?\s*:/,
      `T-52 no declara overflow (${rule.selector}): el desplazamiento queda como estaba en su ronda`);
    assert.doesNotMatch(rule.body, /(^|[;{\s])(width|height|max-height|min-height|grid-template-columns)\s*:/,
      `T-52 no declara medidas de caja (${rule.selector}): nada de layout se mueve`);
  }

  // Y el régimen de columnas que T-52 daba por vigente lo reescribió T-54
  // (A-26): los laterales ya no se desplazan y solo la central conserva la
  // barra. Lo mide tests/paneles-tarjetas.test.cjs; acá se vela que T-52 no lo
  // haya dejado escrito al revés.
  const columnas = rulesIn(css).filter(
    rule => rule.selector === '.control-panel, .fretboard-section, .legend-panel',
  );
  assert.ok(!columnas.some(rule => /overflow-y\s*:\s*auto/.test(rule.body)),
    'ninguna regla devuelve el scroll a las tres columnas: T-54 dejó el desplazamiento solo en la central');
});
