// T-56 · A-30 (2026-10-26). Palabra del autor: la fila del transporte
// («Silencio, play, tempo…») le encanta como quedó, pero al desplazarse quiere
// que se siga viendo, convertida en una píldora flotante más compacta, con el
// único fondo claro en su rectángulo redondeado y sin el recuadro contenedor
// que hoy la envuelve; con una animación simple en el paso.
//
// La ronda tiene dos estados y esta prueba fija los dos: (1) el reposo queda
// idéntico a hoy —la caja de T-47 conserva borde, radio y papel—, y (2) el
// estado de scroll sólo existe con la clase que pone el observador, con la
// píldora fija, compacta, animada y con el hueco de reposo sostenido para que
// el cambio no corra el contenido. Que se vea lindo y que no desborde se mide
// en Chromium (PACTO.md §5): npm test no mide estilos.

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const cssCrudo = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const css = cssCrudo.replace(/\/\*[\s\S]*?\*\//g, '');
const modulo = path.join(root, 'transport-pill.js');

// El bloque de la ronda, desde su comentario de cabecera hasta el final del
// archivo: es el tramo que T-56 agrega y permite afirmar qué tocó —y qué no—.
const marca = cssCrudo.indexOf('/* T-56');
const bloque = marca === -1 ? '' : cssCrudo.slice(marca).replace(/\/\*[\s\S]*?\*\//g, '');

function reglas(fuente) {
  return [...fuente.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, cuerpo]) => ({
    selector: selector.trim(),
    cuerpo: cuerpo.replace(/\s+/g, ' '),
  }));
}

function reglaEn(fuente, selectorExacto, donde) {
  const encontrada = reglas(fuente).find(regla => regla.selector === selectorExacto);
  assert.ok(encontrada, `falta la regla ${selectorExacto} en ${donde}`);
  return encontrada.cuerpo;
}

const tiene = (cuerpo, propiedad, valor) =>
  new RegExp('(^|;)\\s*' + propiedad + '\\s*:\\s*' + valor + '\\s*(;|$)', 'i').test(cuerpo);
const declara = (cuerpo, propiedad) =>
  new RegExp('(^|;)\\s*' + propiedad + '\\s*:', 'i').test(cuerpo);
const valor = (cuerpo, propiedad) => {
  const m = cuerpo.match(new RegExp('(?:^|;)\\s*' + propiedad + '\\s*:\\s*([^;]+)', 'i'));
  return m ? m[1].trim() : null;
};

// Contenido interior del <div> que abre con `apertura` exacta, contando
// anidamientos: sirve para aislar la fila y la píldora del HTML plano.
function bloqueDiv(fuente, apertura) {
  const inicio = fuente.indexOf(apertura);
  assert.notEqual(inicio, -1, `falta el bloque ${apertura}`);
  const desde = inicio + apertura.length;
  const etiquetas = /<div\b|<\/div>/g;
  etiquetas.lastIndex = desde;
  let profundidad = 1;
  for (let m = etiquetas.exec(fuente); m; m = etiquetas.exec(fuente)) {
    profundidad += m[0] === '</div>' ? -1 : 1;
    if (profundidad === 0) return fuente.slice(desde, m.index);
  }
  assert.fail(`el bloque ${apertura} no cierra`);
}

test('en reposo nada cambia: la caja de T-47 conserva borde, radio y papel', () => {
  const caja = reglaEn(css, '.progression-view-controls', 'style.css');
  assert.ok(tiene(caja, 'border', '1px solid var\\(--line\\)'),
    'la caja común del reposo conserva su línea: el recuadro sólo cae en el estado de scroll');
  assert.ok(tiene(caja, 'border-radius', '10px'), 'el radio del reposo no cambia');
  assert.ok(tiene(caja, 'background', 'var\\(--paper-light\\)'), 'el papel del reposo no cambia');

  // La píldora hereda el reparto exacto de la fila actual (flex, envolver,
  // centrado y el mismo hueco), para que arriba de la página no se mueva nada.
  const pill = reglaEn(bloque, '.transport-pill', 'el bloque T-56');
  assert.ok(tiene(pill, 'display', 'flex'), 'la píldora reparte sus controles como la fila de hoy');
  assert.ok(tiene(pill, 'flex-wrap', 'wrap'), 'y puede envolver en pantallas angostas');
  assert.ok(tiene(pill, 'align-items', 'center'), 'con el mismo centrado vertical');
  assert.equal(valor(pill, 'gap'), '6px 14px', 'el hueco del reposo es el de la fila de T-47');

  // El estado de scroll no puede existir sin la clase del observador.
  for (const regla of reglas(bloque)) {
    if (!declara(regla.cuerpo, 'position') || !tiene(regla.cuerpo, 'position', 'fixed')) continue;
    assert.match(regla.selector, /\.is-floating/,
      `la posición fija sólo vale con la clase de estado: ${regla.selector}`);
  }
  const filaBase = reglas(bloque).filter(regla => regla.selector === '.transport-row');
  for (const regla of filaBase) {
    assert.ok(!tiene(regla.cuerpo, 'position', 'fixed'),
      'la fila del reposo no se fija: sólo la píldora vuela');
  }
});

test('el recuadro contenedor desaparece sólo en el estado de scroll', () => {
  const contenedor = reglaEn(bloque, '.progression-view-controls.is-transport-floating', 'el bloque T-56');
  assert.ok(tiene(contenedor, 'background', 'transparent'),
    'en scroll la caja deja de pintar su papel: el único fondo claro es el de la píldora');
  assert.ok(tiene(contenedor, 'border-color', 'transparent'),
    'y su línea desaparece: la barrita flota sin recuadro, como las tarjetas');
});

test('la píldora del scroll es fija, redondeada, con sombra y anclada debajo de la banda', () => {
  const pill = reglaEn(bloque, '.transport-row.is-floating .transport-pill', 'el bloque T-56');
  assert.ok(tiene(pill, 'position', 'fixed'), 'en scroll la barrita queda clavada a la vista');
  assert.match(valor(pill, 'top') || '', /^var\(--transporte-top/,
    'el tope lo publica el observador: la píldora se ancla debajo de la banda sticky');
  assert.match(valor(pill, 'left') || '', /^var\(--transporte-left/,
    'la píldora arranca donde arrancaba la barrita, alineada con la caja');
  assert.ok(tiene(pill, 'background', 'var\\(--paper-light\\)'), 'su rectángulo es el único con fondo claro');
  assert.ok(tiene(pill, 'border-radius', '999px'), 'con el borde redondeado de píldora');
  assert.ok(declara(pill, 'box-shadow'), 'y una sombra que la despega del fondo, como las tarjetas');
  assert.ok(tiene(pill, 'width', 'max-content'), 'se ajusta a su contenido: es una píldora, no una franja');
  assert.ok(tiene(pill, 'z-index', '7'),
    'queda por encima de la banda sticky (6) para que su ayuda no quede tapada');
  assert.match(valor(pill, 'animation') || '', /^transporte-pildora/,
    'entra con la animación simple de la ronda');
});

test('el estado de scroll compacta la barrita sin perder sus controles', () => {
  const base = reglaEn(bloque, '.transport-pill', 'el bloque T-56');
  const pill = reglaEn(bloque, '.transport-row.is-floating .transport-pill', 'el bloque T-56');
  const [baseAlto, baseAncho] = valor(base, 'gap').split(/\s+/).map(parseFloat);
  const [pillAlto, pillAncho] = valor(pill, 'gap').split(/\s+/).map(parseFloat);
  assert.ok(pillAncho < baseAncho && pillAlto <= baseAlto,
    'el hueco entre controles se recorta en scroll');
  assert.ok(declara(pill, 'padding'), 'la píldora declara su relleno compacto');

  const tempo = reglaEn(bloque, '.transport-row.is-floating .transport-pill .tempo-tap', 'el bloque T-56');
  const altoTempo = parseFloat(valor(tempo, 'min-height'));
  assert.ok(altoTempo < 40, 'el botón del Tempo baja del min-height de 40 px del reposo');
  const switchFuente = reglaEn(bloque, '.transport-row.is-floating .transport-pill .source-switch', 'el bloque T-56');
  assert.ok(parseFloat(valor(switchFuente, 'padding')) < 3,
    'la cápsula del Play también recorta su relleno');

  // Ningún control se va: la píldora es la misma barrita, más chica.
  const transporte = bloqueDiv(html, '<div class="progression-controls-row transport-row"');
  const pildora = bloqueDiv(transporte, '<div class="transport-pill">');
  for (const marca of ['id="progression-view"', 'id="accompaniment-mute"', 'id="tempo-play-stand"',
    'class="progression-tempo"', 'aria-label="Ayuda de las tarjetas"']) {
    assert.ok(pildora.includes(marca), `la píldora conserva ${marca}`);
  }
});

test('la fila conserva su hueco: el paso al scroll no corre el contenido', () => {
  const fila = reglaEn(bloque, '.transport-row.is-floating', 'el bloque T-56');
  assert.match(valor(fila, 'height') || '', /^var\(--transporte-alto/,
    'la fila se queda con el alto de reposo mientras la píldora vuela');
  assert.match(valor(fila, 'width') || '', /^var\(--transporte-ancho/,
    'y con su ancho: en escritorio las dos filas de T-47 comparten línea');
});

test('la animación es sutil y se apaga con movimiento reducido', () => {
  assert.match(bloque, /@keyframes\s+transporte-pildora\s*\{[\s\S]*?translateY\(/,
    'el paso reposo → scroll se anima con un desplazamiento corto');
  assert.match(bloque, /@keyframes\s+transporte-pildora\s*\{[\s\S]*?scale\(/,
    'y una escala leve: reducir altura y aire, sin nada llamativo');

  // Bloques @media completos, contando llaves: el de movimiento reducido no
  // tiene por qué ser el último del archivo.
  const medios = [];
  const apertura = /@media([^{]*)\{/g;
  let m;
  while ((m = apertura.exec(bloque))) {
    let profundidad = 1;
    let i = apertura.lastIndex;
    for (; i < bloque.length && profundidad > 0; i += 1) {
      if (bloque[i] === '{') profundidad += 1;
      else if (bloque[i] === '}') profundidad -= 1;
    }
    medios.push({condicion: m[1].trim(), cuerpo: bloque.slice(apertura.lastIndex, i - 1)});
    apertura.lastIndex = i;
  }
  const reduce = medios.find(bloqueMedio => /prefers-reduced-motion\s*:\s*reduce/.test(bloqueMedio.condicion));
  assert.ok(reduce, 'la ronda declara su bloque de movimiento reducido');
  assert.match(reduce.cuerpo, /\.transport-row\.is-floating\s+\.transport-pill\s*\{[^}]*animation:\s*none/,
    'con movimiento reducido la píldora aparece sin animación');
});

test('el observador es chico, publica el estado y no toca nada más', () => {
  assert.ok(fs.existsSync(modulo), 'falta el módulo transport-pill.js del observador');
  const js = fs.readFileSync(modulo, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const cargas = (html.match(/<script[^>]+src="transport-pill\.js"/g) || []).length;
  assert.equal(cargas, 1, 'index.html carga transport-pill.js una sola vez');

  for (const contrato of ['is-floating', 'is-transport-floating', '--transporte-top',
    '--transporte-alto', '--transporte-ancho', '--transporte-left']) {
    assert.ok(js.includes(contrato), `el observador publica ${contrato}`);
  }
  assert.match(js, /addEventListener\(\s*'scroll'/, 'escucha el scroll de la página');
  assert.match(js, /addEventListener\(\s*'resize'/, 'y el cambio de tamaño: la píldora se re-mide');
  assert.match(js, /requestAnimationFrame/, 'agrupa las lecturas por cuadro, sin trabajo por evento');
  assert.match(js, /\.cards-band/, 'toma el borde de la banda sticky como tope');
  assert.match(js, /getBoundingClientRect/, 'mide posiciones reales, no constantes');

  for (const ajeno of ['localStorage', 'traste.songs', 'AudioContext', 'AppState', 'saveSong']) {
    assert.ok(!js.includes(ajeno), `el observador no toca ${ajeno}: sólo forma`);
  }
});

test('en pantallas angostas la píldora pasa a dos líneas sin dejar la ayuda sola', () => {
  // A 320–414 px los controles no entran en una línea. El observador marca
  // `is-pill-wrapped` y la píldora pasa a rectángulo redondeado, se acota al
  // ancho de sus dos líneas y le da la segunda al Tempo junto a la ayuda.
  const pildora = reglaEn(bloque, '.transport-row.is-floating .transport-pill.is-pill-wrapped', 'el bloque T-56');
  assert.ok(tiene(pildora, 'border-radius', '20px'),
    'con dos líneas los extremos de media luna dejan de tener sentido');
  assert.match(valor(pildora, 'max-width') || '', /^min\(/,
    'y el ancho se acota para no dejar un hueco muerto entre el BPM y la ayuda');

  const tempo = reglaEn(bloque,
    '.transport-row.is-floating .transport-pill.is-pill-wrapped .progression-tempo', 'el bloque T-56');
  assert.ok(declara(tempo, 'flex'), 'el Tempo se lleva la segunda línea');
  assert.ok(declara(tempo, 'min-width'), 'sin recortar su contenido si el ancho se estrecha');

  const js = fs.readFileSync(modulo, 'utf8');
  assert.match(js, /is-pill-wrapped/, 'el observador marca el estado de dos líneas');
  assert.match(js, /requestAnimationFrame/, 'y lo vuelve a medir en cada cuadro del scroll');
});

test('el HTML conserva la fila de T-47 y envuelve sus controles sin ids nuevos', () => {
  const transporte = bloqueDiv(html, '<div class="progression-controls-row transport-row"');
  assert.match(transporte, /role="group" aria-label="Transporte del acompañamiento"/,
    'la fila conserva su grupo y su nombre accesible');
  const pildora = bloqueDiv(transporte, '<div class="transport-pill">');
  for (const id of ['progression-view', 'accompaniment-mute', 'tempo-play-stand', 'tempo-play',
    'tempo-tap', 'tempo-tap-bpm', 'tempo-tap-discard']) {
    const cuantas = (transporte.match(new RegExp(`id="${id}"`, 'g')) || []).length;
    assert.equal(cuantas, 1, `#${id} aparece una sola vez en la fila`);
    assert.ok(pildora.includes(`id="${id}"`), `#${id} queda dentro de la píldora`);
  }
});
