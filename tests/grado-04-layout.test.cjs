const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('el acorde seleccionado vive en la banda superior, no en el panel inferior', () => {
  const cardsBand = html.match(/<div class="cards-band">([\s\S]*?)<section class="workspace"/)?.[1];
  const legendPanel = html.match(/<aside class="legend-panel">([\s\S]*?)<\/aside>/)?.[1];
  const readouts = [...html.matchAll(/<div class="chord-readout">/g)];

  assert.ok(cardsBand, 'existe la banda superior de tarjetas');
  assert.ok(legendPanel, 'existe el panel lateral de la leyenda');
  assert.equal(readouts.length, 1, 'el acorde seleccionado tiene una única tarjeta');
  assert.match(cardsBand, /class="chord-readout"/,
    'la tarjeta está junto a las tarjetas de progresión, arriba de los controles');
  assert.doesNotMatch(legendPanel, /class="chord-readout"/,
    'el panel inferior no conserva un duplicado de la tarjeta');
});
