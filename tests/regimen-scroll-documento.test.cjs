// T-55 · A-28 (2026-10-26). Palabra del autor: «que todo vuelva a verse…
// justo como estaba antes de que implementemos el scroll», con las tarjetas, la
// banda bajo el encabezado, la caja empezando en el transporte y el encabezado
// de T-51 conservados tal como están. Solo forma: motor, audio, guardado y
// traste.songs.v1 no cambian.
//
// El régimen que cae es el de T-48/T-50/T-54 r1 en su parte visual: el
// documento vuelve a desplazarse entero y ninguna columna resuelve su contenido
// en una caja propia, ni queda clavada. Las guardas que medían ese régimen se
// reescriben acá al régimen nuevo, nacidas rojas contra el CSS de la entrega
// anterior (`1e6f2d6`) y verdes con el cambio.
//
// Lo que NO se mueve, y esta prueba lo vigila: la banda sticky de T-53, la
// textura y las tarjetas de T-54 r2, la caja empezando en el transporte. El
// alto real y el desplazamiento se miden en Chromium (PACTO §5); acá se fija la
// forma que los sostiene.

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const modulo = path.join(root, 'band-offset.js');

function reglas(fuente) {
  return [...fuente.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, cuerpo]) => ({
    selector: selector.trim(),
    cuerpo: cuerpo.replace(/\s+/g, ' '),
  }));
}

// Todos los bloques @media completos, con su condición y su cuerpo.
function bloquesMedia(fuente) {
  const salida = [];
  const apertura = /@media([^{]*)\{/g;
  let m;
  while ((m = apertura.exec(fuente))) {
    let profundidad = 1;
    let i = apertura.lastIndex;
    for (; i < fuente.length && profundidad > 0; i += 1) {
      if (fuente[i] === '{') profundidad += 1;
      else if (fuente[i] === '}') profundidad -= 1;
    }
    salida.push({condicion: m[1].trim(), cuerpo: fuente.slice(apertura.lastIndex, i - 1)});
    apertura.lastIndex = i;
  }
  return salida;
}

// Reglas de todos los bloques cuya condición cumpla el filtro; un mismo ancho
// puede aparecer en más de un @media porque el archivo creció por rondas.
function reglasDe(condicion) {
  return bloquesMedia(css)
    .filter(bloque => condicion.test(bloque.condicion))
    .flatMap(bloque => reglas(bloque.cuerpo));
}

const tiene = (cuerpo, propiedad, valor) =>
  new RegExp('(^|;)\\s*' + propiedad + '\\s*:\\s*' + valor + '\\s*(;|$)', 'i').test(cuerpo);
const declara = (cuerpo, propiedad) =>
  new RegExp('(^|;)\\s*' + propiedad + '\\s*:', 'i').test(cuerpo);

const escritorioBajo = bloquesMedia(css).filter(bloque =>
  /min-width\s*:\s*1101px/.test(bloque.condicion) && /max-height\s*:\s*\d+px/.test(bloque.condicion));

function reglaDeEscritorioBajo(selector) {
  assert.equal(escritorioBajo.length, 1,
    'debe haber un único @media de escritorio bajo (min-width 1101px + max-height) para la zona de tocar');
  return reglas(escritorioBajo[0].cuerpo).find(regla => regla.selector === selector);
}

test('el documento vuelve a desplazarse entero: ninguna columna queda clavada ni con caja propia', () => {
  const central = reglaDeEscritorioBajo('.fretboard-section');
  assert.ok(central, 'la zona de tocar conserva una regla propia en el shell de escritorio bajo');
  assert.ok(declara(central.cuerpo, 'min-height') && tiene(central.cuerpo, 'min-height', '0'),
    'la central suelta el mínimo heredado, pero crece con su contenido');
  assert.ok(!tiene(central.cuerpo, 'position', 'sticky'),
    'la central ya no queda pegada bajo la banda: sin columna clavada (A-28)');
  assert.ok(!declara(central.cuerpo, 'height'),
    'la central no se acota al viewport: su alto es el de su contenido');
  assert.ok(!tiene(central.cuerpo, 'overflow-y', 'auto'),
    'la central ya no desplaza por dentro: desplaza el documento');
  assert.ok(!tiene(central.cuerpo, 'overflow-y', 'scroll'),
    'ninguna caja de la central conserva barra propia');

  const laterales = reglaDeEscritorioBajo('.control-panel, .legend-panel');
  assert.ok(laterales && tiene(laterales.cuerpo, 'overflow-y', 'visible'),
    'los laterales siguen sin barra propia: su contenido se ve entero');

  const workspace = reglaDeEscritorioBajo('.workspace');
  assert.ok(workspace && tiene(workspace.cuerpo, 'height', 'auto'),
    'la caja crece con el contenido: no se ancla a un viewport');
  assert.ok(!tiene(workspace.cuerpo, 'height', '100vh'), 'el alto de viewport de T-48 no vuelve');

  const capturado = reglas(css).find(regla => regla.selector === 'html, body' && tiene(regla.cuerpo, 'overflow', 'hidden'));
  assert.ok(!capturado, 'nadie captura el scroll del documento: hero, paneles completos y pie son alcanzables');
});

test('en retrato la caja crece con su contenido: sin alto de viewport que recorte la pestaña', () => {
  const movil = reglasDe(/max-width\s*:\s*800px/);
  const caja = movil.filter(regla => regla.selector === '.workspace');
  assert.ok(caja.length, 'el shell móvil declara su caja');
  for (const regla of caja) {
    assert.ok(!tiene(regla.cuerpo, 'height', '100vh'),
      'el workspace móvil ya no se fija al viewport: el documento desplaza y la pestaña no se recorta');
  }
  // T-49 no es del régimen de scroll: el shell flexible que llena el viewport
  // en retrato se conserva (A-28 solo revierte la disposición de las capas).
  const cuerpo = movil.find(regla => regla.selector === 'body');
  const shell = movil.find(regla => regla.selector === '.shell');
  assert.ok(cuerpo && tiene(cuerpo.cuerpo, 'min-height', '100vh'),
    'el body sigue llenando el viewport en retrato (T-49)');
  assert.ok(shell && tiene(shell.cuerpo, 'flex', '1 1 auto'),
    'el shell conserva su reparto flexible: no vuelve el vacío colgante de retrato');
});

test('la banda de T-53 sigue fija y su franja ya no lleva relleno muerto abajo', () => {
  const escritorio = reglasDe(/min-width\s*:\s*801px/);
  const fija = escritorio.find(regla => regla.selector === '.cards-band');
  assert.ok(fija && tiene(fija.cuerpo, 'position', 'sticky') && tiene(fija.cuerpo, 'top', '0'),
    'la banda sigue a la vista al desplazar: guarda de T-53 en pie');

  const tarjetas = escritorio.find(regla => regla.selector === '.cards-band .progression');
  assert.ok(tarjetas, 'la franja limita el alto de las tarjetas');
  assert.ok(tiene(tarjetas.cuerpo, 'margin-bottom', '0'),
    'el margen del bloc de tarjetas deja de sumar relleno muerto dentro de la franja (A-28)');
  assert.ok(tiene(tarjetas.cuerpo, 'padding-bottom', '0px') || tiene(tarjetas.cuerpo, 'padding-bottom', '0'),
    'el aire de abajo de las tarjetas no se duplica dentro de la franja (A-28)');

  // La franja conserva la textura y las tarjetas su fondo y su sombra (T-54 r2).
  const banda = reglas(css).filter(regla => regla.selector === '.cards-band' &&
    /radial-gradient/.test(regla.cuerpo));
  assert.ok(banda.length, 'la banda mantiene la textura de puntos del fondo');
  const tarjeta = reglas(css).find(regla =>
    regla.selector.trim().startsWith('.cards-band .progression-card,'));
  assert.ok(tarjeta && tiene(tarjeta.cuerpo, 'background-color', 'var\\(--paper-light\\)'),
    'las tarjetas aceptadas por el autor conservan su fondo claro');
  assert.ok(tiene(tarjeta.cuerpo, 'border-color', 'transparent'),
    'y siguen sin dibujar contorno');
});

test('la banda ya no publica su alto: el módulo que lo medía se retira con el régimen', () => {
  assert.doesNotMatch(html, /band-offset\.js/,
    'la página no carga el módulo de la columna clavada');
  assert.ok(!fs.existsSync(modulo),
    'band-offset.js se retira: sin columna sticky no tiene consumidor');
  assert.doesNotMatch(css, /--banda-alto/,
    'ninguna regla espera el alto publicado de la banda');
});
