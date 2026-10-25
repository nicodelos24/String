// T-54 · A-26 (2026-10-25, noche).
//
// Palabra del autor: «los paneles laterales no tengan scroll, que queden como
// antes, sólo la parte central donde está todo lo principal que mantenga ese
// scroll», la barra del medio con una estética más linda y las tarjetas de la
// banda fija «sin fondo, como si estuviesen flotando en el fondo… cada una con
// su sombrita».
//
// Estas pruebas leen HTML y CSS como texto y fijan la forma que sostiene esa
// reversión: los laterales sin desplazamiento propio (overflow visible), la
// central con su caja acotada y su barra, la banda con la textura de la página
// y las tarjetas transparentes con sombra propia. El alto real, la textura y
// la lectura se verifican en Chromium: npm test no mide estilos (PACTO §5).

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function rulesIn(source) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector.trim(),
    body,
  }));
}

const has = (body, property, value) =>
  new RegExp('(^|;)\\s*' + property + '\\s*:\\s*' + value + '\\s*(;|$)', 'i').test(body);

// Bloques @media completos, con su condición y su cuerpo, contando llaves.
function mediaBlocks(source) {
  const blocks = [];
  const open = /@media([^{]*)\{/g;
  let match;
  while ((match = open.exec(source))) {
    let depth = 1;
    let i = open.lastIndex;
    for (; i < source.length && depth > 0; i += 1) {
      if (source[i] === '{') depth += 1;
      else if (source[i] === '}') depth -= 1;
    }
    blocks.push({condition: match[1].trim(), body: source.slice(open.lastIndex, i - 1)});
    open.lastIndex = i;
  }
  return blocks;
}

const bajo = () => mediaBlocks(css).filter(block =>
  /min-width\s*:\s*1101px/.test(block.condition) && /max-height\s*:\s*900px/.test(block.condition));

// El tramo de la ronda, desde su comentario de cabecera hasta el final del
// archivo: permite afirmar qué pinta la ronda y qué no toca.
const marca = css.indexOf('/* T-54');
const bloque = marca === -1 ? '' : css.slice(marca);

test('los paneles laterales no desplazan su contenido y la central conserva el scroll', () => {
  const bloques = bajo();
  assert.equal(bloques.length, 1,
    'debe haber un único @media de escritorio bajo (min-width 1101px + max-height 900px) para la zona de tocar');
  const reglas = rulesIn(bloques[0].body);
  const find = selector => reglas.find(rule => rule.selector === selector);

  const laterales = find('.control-panel, .legend-panel');
  assert.ok(laterales, 'la ronda declara el régimen de los dos paneles laterales');
  assert.ok(has(laterales.body, 'overflow-y', 'visible'),
    'los laterales no tienen barra propia: su contenido se ve entero y la página es la que desplaza');
  assert.ok(has(laterales.body, 'min-height', '0'), 'los laterales sueltan el mínimo que los estiraba');

  const central = find('.fretboard-section');
  assert.ok(central, 'la columna central conserva su propio desplazamiento');
  assert.ok(has(central.body, 'overflow-y', 'auto'), 'la central sí scrollea por dentro');
  assert.ok(has(central.body, 'position', 'sticky'), 'la central queda pegada bajo la banda fija mientras se recorren los laterales');
  assert.match(central.body, /top\s*:\s*var\(--banda-alto/,
    'su tope es el alto real de la banda (variable publicada por el módulo), no un número escrito a mano');
  assert.match(central.body, /height\s*:\s*calc\(100dvh\s*-\s*58px\s*-\s*var\(--banda-alto/,
    'su caja es el viewport que queda entre la banda y los 58 px del pie');

  const workspace = find('.workspace');
  assert.ok(workspace && has(workspace.body, 'height', 'auto'),
    'el workspace ya no se ancla a un viewport: crece con los laterales (régimen de antes)');
  assert.ok(!has(workspace.body, 'height', '100vh'), 'el alto de viewport del shell de T-48 queda revertido');

  // La regla de la página: el documento conserva su scroll y el pie sigue vivo.
  const capturado = rulesIn(css).find(rule => rule.selector === 'html, body' && has(rule.body, 'overflow', 'hidden'));
  assert.ok(!capturado, 'nadie captura el scroll del documento: hero, paneles completos y pie son alcanzables');
});

test('el alto real de la banda se publica para el tope de la central', () => {
  assert.match(html, /<script src="band-offset\.js"><\/script>/,
    'la página carga el módulo que mide la banda');
  const modulo = fs.readFileSync(path.join(root, 'band-offset.js'), 'utf8');
  assert.match(modulo, /ResizeObserver/, 'el módulo sigue el alto de la banda cuando cambia');
  assert.match(modulo, /--banda-alto/, 'publica el alto medido como --banda-alto del workspace');
  assert.match(modulo, /\.cards-band/, 'mide la banda de tarjetas');
  assert.ok(!/document\.write|innerHTML/.test(modulo), 'solo mide y publica: no pinta ni reescribe la página');
});

test('la banda de tarjetas se lee como una abertura de la página, con los puntos del fondo', () => {
  const banda = rulesIn(bloque).find(rule => rule.selector === '.cards-band');
  assert.ok(banda, 'la ronda pinta la banda');
  assert.ok(has(banda.body, 'background-image', 'radial-gradient\\([^;]+\\)'),
    'la banda lleva la textura de puntos del fondo de la página');
  assert.ok(has(banda.body, 'background-size', '7px 7px'),
    'los puntos miden lo mismo que body::before: 7 px');
  assert.ok(has(banda.body, 'background-attachment', 'fixed'),
    'la textura se ancla al viewport, así no se corre al desplazar ni se corta contra la del fondo');
  assert.ok(has(banda.body, 'box-shadow', 'none'),
    'la franja pierde su sombra propia: el peso visual pasa a cada tarjeta');
  assert.ok(has(banda.body, 'border-bottom-color', 'transparent'),
    'tampoco deja una línea que la separe del fondo');
  assert.match(String(css.match(/body::before\s*\{([^}]*)\}/)?.[1]), /radial-gradient/,
    'la textura de la banda es la misma receta del fondo de la página');
});

test('las tarjetas flotan sin relleno y cada una lleva su sombra', () => {
  const tarjetas = rulesIn(bloque).filter(rule => rule.selector.includes('.progression-card') && !rule.selector.includes('drag-'));
  const reposo = tarjetas.find(rule => rule.selector.startsWith('.progression-card,'));
  assert.ok(reposo, 'la ronda declara la tarjeta en reposo para el tema claro y el oscuro');
  assert.ok(has(reposo.body, 'background-color', 'transparent'),
    'la tarjeta pierde el relleno: el fondo punteado se ve detrás');
  assert.match(reposo.body, /box-shadow\s*:\s*0\s+2px\s+6px[^;]*,\s*0\s+1px\s+2px/,
    'cada tarjeta lleva su sombra propia de dos capas, no la sombra de la banda');

  const activa = rulesIn(bloque).find(rule => rule.selector.trim().startsWith('.progression-card.active,'));
  assert.ok(activa, 'el estado activo se repinta sin volver al relleno');
  assert.ok(has(activa.body, 'background-color', 'transparent'),
    'la tarjeta activa no recupera el fondo blanco de antes');
  assert.match(activa.body, /inset\s+0\s+-3px\s+0\s+var\(--rust\)/,
    'el estado activo se marca con el borde y la barra del acento, sin relleno');

  const sonando = rulesIn(bloque).find(rule => rule.selector.trim().startsWith('.progression-card.playing,'));
  assert.ok(sonando && has(sonando.body, 'background-color', 'transparent'),
    'la tarjeta que suena tampoco vuelve al relleno: su marca es la barra interior');

  const fantasma = rulesIn(bloque).find(rule => rule.selector.trim().startsWith('.progression-card.drag-ghost,'));
  assert.ok(fantasma && has(fantasma.body, 'background-color', 'var\\(--paper-light\\)'),
    'el fantasma del arrastre conserva relleno: mientras vuela tiene que leerse como tarjeta');
});

test('la barra central y las de adentro tienen la estética nueva, más fina y del tema', () => {
  const declaraciones = [];
  for (const rule of rulesIn(bloque)) {
    for (const [, , property, value] of rule.body.matchAll(/(^|;)\s*(--[a-z-]+)\s*:\s*([^;]+)/g)) {
      declaraciones.push({selector: rule.selector, property, value: value.trim()});
    }
  }
  const claro = declaraciones.find(d => d.property === '--scroll-thumb-fuerte' && !/dark/.test(d.selector));
  const oscuro = declaraciones.find(d => d.property === '--scroll-thumb-fuerte' && /dark/.test(d.selector));
  assert.ok(claro, 'la ronda define el tirador fuerte del tema claro');
  assert.ok(oscuro && oscuro.value !== claro.value, 'el oscuro tiene su propio tirador: una sola tinta no sirve para los dos temas');

  const tirador = rulesIn(bloque).find(rule => /::-webkit-scrollbar-thumb$/.test(rule.selector) && rule.selector.includes(':where('));
  assert.ok(tirador, 'la ronda pinta el tirador de las barras de la zona de tocar');
  for (const caja of ['.fretboard-section', '.progression', '#section-list']) {
    assert.ok(tirador.selector.includes(caja), 'la barra nueva cubre ' + caja);
  }
  const borde = tirador.body.match(/(?:^|;)\s*border\s*:\s*(\d+)px\s+solid\s+transparent/);
  assert.ok(borde, 'el tirador se afina con un borde transparente sobre el riel nativo');
  const visible = 15 - 2 * Number(borde[1]);
  assert.ok(visible > 0 && visible <= 6,
    `el tirador visible mide ${visible} px: más fino que el de T-52 sin mover el layout`);

  const acento = rulesIn(bloque).find(rule => /::-webkit-scrollbar-thumb:hover/.test(rule.selector));
  assert.ok(acento && /var\(--rust\)/.test(acento.body), 'al pasar, el tirador toma el acento de la página');
});
