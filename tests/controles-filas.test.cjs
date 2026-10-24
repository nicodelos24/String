// T-47 (A-11) · Los controles del plano central dejan la columna en cascada y
// pasan a dos filas alineadas por función: transporte (Silencio/Play/Tempo) y
// captura en vivo (Improvisar/Tempo con notas/Entrar al tocar/Seguir acorde MIDI).
//
// Nace roja contra 0012fce: allí los ocho controles son hijos sueltos de
// `.progression-view-controls`, en columna y alineados a la derecha (169,8 × 380
// px a 1366×650), y no existe ninguna fila ni caja común. Lo que estas pruebas
// afirman es la estructura y las reglas de CSS que la sostienen; que las filas
// no se solapen ni desborden se mide en navegador (PACTO.md §5), no acá.

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// Devuelve el contenido interior del <div> que abre con `apertura` exacta,
// contando anidamientos de <div>. Sirve para aislar una fila sin traer el DOM
// entero: el bloque de controles es HTML plano, sin scripts.
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

function cuerpo(selector) {
  const escapado = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regla = css.match(new RegExp(`(?:^|[},])\\s*${escapado}\\s*\\{([^}]*)\\}`));
  assert.ok(regla, `falta la regla ${selector} en style.css`);
  return regla[1].replace(/\s+/g, ' ');
}

test('los controles del plano central viven en dos filas: transporte y captura en vivo', () => {
  const controles = bloqueDiv(html, '<div class="progression-view-controls">');
  const transporte = bloqueDiv(controles, '<div class="progression-controls-row transport-row"');
  const captura = bloqueDiv(controles, '<div class="progression-controls-row capture-row"');

  assert.ok(controles.indexOf('transport-row') < controles.indexOf('capture-row'),
    'el transporte se lee antes que la captura en vivo, igual que en pantalla');

  // Transporte: ver/plegar, Silencio, Play y Tempo. La ayuda de las tarjetas
  // también queda en esta fila, al final, como estaba al pie de la columna.
  const transporteIds = ['id="progression-view"', 'id="accompaniment-mute"', 'id="tempo-play-stand"'];
  for (const id of transporteIds) assert.ok(transporte.includes(id), `falta ${id} en la fila de transporte`);
  assert.ok(transporte.includes('class="progression-tempo"'), 'falta el grupo del Tempo en la fila de transporte');
  assert.ok(transporte.includes('aria-label="Ayuda de las tarjetas"'), 'la ayuda de las tarjetas cierra la fila de transporte');

  // Captura en vivo: los dos bloques del micrófono y el interruptor de MIDI.
  for (const marca of ['class="improvisation-control"', 'class="mic-follow-control"', 'id="follow-midi"']) {
    assert.ok(captura.includes(marca), `falta ${marca} en la fila de captura en vivo`);
  }

  // Ningún control se duplica ni se queda fuera de las dos filas.
  for (const id of ['progression-view', 'accompaniment-mute', 'tempo-play-stand', 'tempo-play',
    'improvisation-toggle', 'tempo-tap-mic', 'enter-on-note', 'follow-midi']) {
    const cuantas = (controles.match(new RegExp(`id="${id}"`, 'g')) || []).length;
    assert.equal(cuantas, 1, `#${id} debe aparecer una sola vez dentro del bloque de controles`);
    assert.ok(transporte.includes(`id="${id}"`) || captura.includes(`id="${id}"`),
      `#${id} debe quedar dentro de una de las dos filas`);
  }

  // El orden DOM sigue al visual de cada fila (la ficha lo pide explícito).
  const orden = (bloque, marcas) => marcas.map(marca => {
    const posicion = bloque.indexOf(marca);
    assert.notEqual(posicion, -1, `falta ${marca}`);
    return posicion;
  });
  const transporteOrden = orden(transporte, ['id="progression-view"', 'id="accompaniment-mute"',
    'id="tempo-play-stand"', 'class="progression-tempo"', 'aria-label="Ayuda de las tarjetas"']);
  assert.deepEqual(transporteOrden, [...transporteOrden].sort((a, b) => a - b),
    'la fila de transporte se lee de izquierda a derecha en el orden del DOM');
  const capturaOrden = orden(captura, ['class="improvisation-control"', 'class="mic-follow-control"', 'id="follow-midi"']);
  assert.deepEqual(capturaOrden, [...capturaOrden].sort((a, b) => a - b),
    'la fila de captura en vivo se lee de izquierda a derecha en el orden del DOM');
});

test('la banda de controles es una caja común debajo de las tarjetas, no una columna a la derecha', () => {
  const stack = cuerpo('.progression-stack');
  assert.match(stack, /grid-template-columns: minmax\(0, ?1fr\);/,
    'las tarjetas y la banda comparten una sola columna: la cascada a la derecha se va');

  const banda = cuerpo('.progression-view-controls');
  assert.match(banda, /display: flex;/, 'la banda ordena sus filas');
  assert.match(banda, /flex-direction: column;/, 'las dos filas se apilan, no se ponen una al lado de otra');
  assert.match(banda, /align-items: stretch;/, 'las filas ocupan el ancho de la banda');
  assert.doesNotMatch(banda, /align-items: flex-end;/, 'ya no hay columna con los controles pegados a la derecha');
  assert.match(banda, /border: 1px solid var\(--line\);/, 'la banda tiene la caja común que pedía la ficha');
  assert.match(banda, /border-radius: 10px;/, 'y la caja sigue el lenguaje redondeado de la página');

  const filas = cuerpo('.progression-controls-row');
  assert.match(filas, /display: flex;/, 'cada fila alinea sus controles');
  assert.match(filas, /flex-wrap: wrap;/, 'y puede envolver en pantallas angostas sin desbordar');

  assert.match(cuerpo('.capture-row'), /align-items: flex-start;/, 'la captura alinea arriba su estado de dos líneas');
});

test('las piezas que se movieron conservan su forma dentro de las filas', () => {
  // El grupo del Tempo se movió bajo una fila: la regla ya no puede depender de
  // que sea hijo directo de .progression-view-controls.
  const tempo = cuerpo('.progression-view-controls .progression-tempo');
  assert.match(tempo, /display: flex;/);
  assert.match(tempo, /align-items: center;/);
  assert.match(tempo, /gap: 8px;/);

  // Improvisar y los dos controles del micrófono pasan a grilla: el interruptor
  // o el botón arriba, su estado en la línea de abajo, la ayuda al costado.
  assert.match(cuerpo('.capture-row .improvisation-control'), /display: grid;/);
  assert.match(cuerpo('.capture-row .improvisation-control'), /grid-template-columns: auto auto auto;/);
  assert.match(cuerpo('.capture-row .improvisation-status'), /grid-area: 2 \/ 1 \/ 3 \/ -1;/);
  assert.match(cuerpo('.capture-row .mic-follow-control'), /display: grid;/);
  assert.match(cuerpo('.capture-row .mic-follow-control'), /grid-template-columns: auto auto auto auto;/);
});

test('en móvil la banda sigue siendo dos filas apiladas, no vuelve a la fila única', () => {
  // Hay más de un bloque de 700 px en el archivo (uno de una línea en el motor
  // de acordes); interesa el que gobierna el plano central. Los bloques se
  // extraen contando llaves, no con una expresión perezosa que se corta antes.
  const bloques = [];
  const cabecera = /@media\s*\(\s*max-width:\s*700px\s*\)/g;
  for (let m = cabecera.exec(css); m; m = cabecera.exec(css)) {
    const abre = css.indexOf('{', m.index + m[0].length);
    let profundidad = 1, i = abre + 1;
    while (i < css.length && profundidad > 0) {
      if (css[i] === '{') profundidad++;
      else if (css[i] === '}') profundidad--;
      i++;
    }
    bloques.push(css.slice(abre + 1, i - 1));
  }
  const movil = bloques.find(bloque => bloque.includes('.progression-stack > .progression-view-controls'));
  assert.ok(movil, 'falta el bloque móvil de 700 px del plano central en style.css');
  const bandaEnMovil = movil.match(/\.progression-stack\s*>\s*\.progression-view-controls\s*\{([^}]*)\}/);
  if (bandaEnMovil) {
    assert.doesNotMatch(bandaEnMovil[1], /flex-direction: row;/,
      'en móvil no puede volver la fila única: las dos filas siguen apiladas');
  }
});
