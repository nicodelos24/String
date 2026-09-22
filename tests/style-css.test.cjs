const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');

test('el .workspace no retiene transform tras su animación (protege position: fixed)', () => {
  // Un transform en un ancestro -aunque sea la matriz identidad, como deja un
  // fill-mode «both»/«forwards» de la animación rise- convierte a los
  // descendientes position:fixed (video flotante de YouTube, ghost de arrastre)
  // en absolutos respecto de ese contenedor: el flotante quedaba abajo en la
  // página, fuera del viewport. El fill-mode debe volver a none al terminar.
  const match = css.match(/\.workspace\s*\{([^}]*)\}/);
  assert.ok(match, 'regla .workspace presente');
  const animation = match[1].match(/animation\s*:\s*([^;]+);?/);
  assert.ok(animation, 'animation definida en .workspace');
  const last = animation[1].trim().split(/\s+/).pop();
  assert.ok(last !== 'both' && last !== 'forwards', `.workspace animación termina en «${last}» y rompería position:fixed`);
});