const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

test('la tarjeta ocupa el lateral compartido por la banda y el transporte', () => {
  const shell = html.match(/<main class="shell">([\s\S]*?)<\/main>/)?.[1];
  const cardsBand = shell?.match(/<div class="cards-band">([\s\S]*?)<\/div>/)?.[1];
  const readouts = [...html.matchAll(/<div class="chord-readout">/g)];
  const desktopGrid = css.match(/\.shell\s*\{(?=[^}]*grid-template-areas)([^}]*)\}/)?.[1];
  const readoutRule = css.match(/\.shell > \.chord-readout\s*\{([^}]*)\}/)?.[1];
  const transportRule = css.match(/\.shell > \.panel-strip\s*\{([^}]*)\}/)?.[1];
  const transportScript = fs.readFileSync(path.join(__dirname, '..', 'transport-pill.js'), 'utf8');

  assert.ok(shell, 'la app conserva su contenedor principal');
  assert.ok(cardsBand, 'existe la banda superior de tarjetas');
  assert.equal(readouts.length, 1, 'el acorde seleccionado tiene una única tarjeta');
  assert.doesNotMatch(cardsBand, /class="chord-readout"/,
    'la tarjeta no fuerza una fila exclusiva encima del transporte');
  assert.ok(shell.indexOf('class="cards-band"') < shell.indexOf('class="chord-readout"'),
    'la tarjeta conserva el orden de lectura después de las tarjetas de progresión');
  assert.match(desktopGrid || '', /"cards readout"\s*"transport readout"/,
    'la banda y el transporte comparten la columna principal y liberan el lateral');
  assert.match(readoutRule || '', /grid-row:\s*2\s*\/\s*-1/,
    'la tarjeta abarca la fila de tarjetas y la fila real del transporte');
  assert.match(readoutRule || '', /top:\s*6px/,
    'el readout queda más cerca de la barra en la vista inicial con dos acordes');
  assert.match(readoutRule || '', /margin:\s*4px\s*0\s*0/,
    'la separación vertical del readout se reduce sin cambiar el ancho ni el cierre');
  assert.match(transportRule || '', /grid-area:\s*transport/,
    'la caja completa del transporte ocupa la columna acortada');
  assert.match(transportScript, /function ubicarLectura\(escritorio\)/,
    'el mismo nodo vuelve a la banda sticky en móvil');
  assert.match(transportScript, /banda\.appendChild\(lectura\)/,
    'la tarjeta conserva el sticky móvil sin duplicar ids');
});
