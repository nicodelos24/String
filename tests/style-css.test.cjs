// T-28 · El proyecto no tiene ni un test de CSS.
//
// Qué sí se puede afirmar sin navegador y qué no, está escrito en PACTO.md §5:
// «npm test no mide estilos». Estas pruebas leen el CSS como texto y afirman sobre
// reglas concretas. Lo que no se puede, y no se promete: colores reales, contraste
// medido, tamaños en píxeles, que algo no se desborde, ni que algo se vea bien.
//
// Cada prueba nace de una rotura real del proyecto. Una prueba que no se sabe qué
// fallo habría atrapado no sirve y después estorba.
//
// El primer test viene de la rama feature/video-flotante-arrastrable (commit
// 2fc936b), que el Coordinador dio por muerta. No estaba muerto el test: estaba mal
// medida la rama. Agente QA lo recuperó y lo verificó contra el CSS de main.

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// Las reglas de style.css, sin comentarios, como pares {selector, cuerpo}. Se
// recorren también las de dentro de @media: una anulación dentro de una condición
// sigue siendo una anulación cuando la condición se cumple, que es cuando el
// defecto aparece.
function rules(source) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector.trim(),
    body,
  }));
}

const cssRules = rules(css);

function declarationsFor(match) {
  const out = [];
  for (const rule of cssRules) {
    if (match(rule.selector)) {
      // Ojo con el índice: el grupo 1 es el (^|;) que ancla la declaración, así
      // que la propiedad es el grupo 2 y el valor el 3. Si se descomprime
      // [, property, value] la propiedad nunca es «display» y la prueba pasa
      // siempre: verde sin comprobar nada.
      for (const match of rule.body.matchAll(/(^|;)\s*([a-z-]+)\s*:\s*([^;]+)/g)) {
        out.push({selector: rule.selector, property: match[2], value: match[3].trim()});
      }
    }
  }
  return out;
}

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
  assert.ok(last !== 'both' && last !== 'forwards', '.workspace animación termina en «' + last + '» y rompería position:fixed');
});

test('todo elemento hidden con display de autor tiene su regla de display:none', () => {
  // Rotura real: #mic-live-chord se veía con el micrófono apagado (IA_GUIDE.md:495).
  // El navegador aplica [hidden] { display: none } en su hoja de usuario, pero
  // cualquier display de autor -flex, grid, block- le gana por origen. El switch
  // «Escala en vivo» es un flex, así que sin su .live-chord-switch[hidden]
  // aparecía siempre.
  //
  // Se recorre el HTML en vez de fijar una lista de ids a mano: si mañana alguien
  // añade un panel nuevo con display propio y lo esconde con hidden, esta prueba
  // lo detecta sin que nadie tenga que acordarse de añadirlo.
  // (?<![\w-]) para que «aria-hidden» no cuente como el atributo hidden: es
  // otra cosa, y sin ese cuidado la prueba accuse al logo y a los galones de
  // los desplegables, que llevan aria-hidden y no se esconden nunca.
  const hidden = [...html.matchAll(/<([a-z]+)\s([^>]*\b(?<![\w-])hidden(?=[\s=/>])[^>]*)>/gi)];
  assert.ok(hidden.length > 0, 'el HTML tiene elementos hidden');

  const sinEscape = [];
  for (const [, tag, attrs] of hidden) {
    const id = (attrs.match(/\bid="([^"]+)"/) || [])[1];
    const classes = ((attrs.match(/\bclass="([^"]+)"/) || [])[1] || '').split(/\s+/).filter(Boolean);
    if (!id && !classes.length) continue;

    // Una regla le aplica al elemento si lo nombra por su id o por una clase suya
    // exacta. Dos cosas importan aquí:
    //
    // - El selector tiene que ser un compuesto único. Si lleva combinador
    //   -«.fret-lock .spelling-track»- la regla depende de un ancestro que hay
    //   que comprobar en el árbol, y eso ya no es una prueba de CSS. El
    //   display:flex de #mic-live-chord viene de «.live-chord-switch», que sí.
    // - Las clases se comparan enteras, no por prefijo: si no,
    //   «.keyboard-panel-head» contaría como «.keyboard-panel» y acusaría a
    //   #keyboard-section, que es otra cosa. Los pseudoelementos se descartan
    //   porque no visten al elemento, sino a su ::before o su ::after.
    const coincide = selector => selector.split(',')
      .map(part => part.trim())
      .filter(part => !part.includes('::') && !/[\s>+~]/.test(part))
      .map(part => part.replace(/::?[a-z-]+(\([^)]*\))?/gi, ''))
      .some(part => {
        const subjectId = (part.match(/#([\w-]+)/) || [])[1];
        const subjectClasses = [...part.matchAll(/\.([\w-]+)/g)].map(m => m[1]);
        return (id && subjectId === id) || classes.some(cls => subjectClasses.includes(cls));
      });

    const declarations = declarationsFor(coincide);
    const display = declarations.filter(d => d.property === 'display' && d.value !== 'none');
    if (!display.length) continue; // sin display de autor, el hidden del navegador gana

    // Dos formas aceptadas de esconderse: la regla [hidden] explícita, o el
    // display puesto detrás de :not([hidden]), que es lo que hace #midi-transport.
    const tieneEscape = declarations.some(d =>
      d.selector.includes('[hidden]') && d.property === 'display' && d.value === 'none');
    const displayYaCondicionado = display.every(d => d.selector.includes(':not([hidden])'));
    if (tieneEscape || displayYaCondicionado) continue;

    sinEscape.push(tag + (id ? '#' + id : '.' + classes.join('.')) +
      ' -> ' + display.map(d => d.selector.trim()).join(' | '));
  }

  assert.deepEqual(sinEscape, [],
    'elementos hidden con display de autor y sin regla que los esconda:\n  ' + sinEscape.join('\n  '));
});

test('el diapasón recorta el resplandor de las notas resaltadas', () => {
  // Sin esto, el halo de .live / .keyboard-live / .is-picked y su anillo animado
  // salían del borde del diapasón y aparecían barras de desplazamiento
  // (IA_GUIDE.md:300). El scroll horizontal real lo aporta .fretboard-wrap, que
  // está en otro elemento y aquí no se toca.
  const selectors = ['.fretboard', '.fretboard-layout > .open-strings'];
  for (const selector of selectors) {
    const found = cssRules.some(rule =>
      rule.selector.split(',').map(s => s.trim()).includes(selector) &&
      /overflow\s*:\s*(hidden|clip)\b/.test(rule.body));
    assert.ok(found, selector + ' no recorta el desbordamiento y las notas resaltadas abren barras de desplazamiento');
  }
});

test('los controles del compositor de secciones se reparten media tarjeta', () => {
  // Devolución QA (revision-t41-31e3a7b): en la tarjeta medida de 114.5px la
  // fila de botones reparte 6 columnas; le tocaba ~15px a cada control y los
  // rótulos «Repetir»/«Duplicar» miden 34/38px: caja chata, rótulo cruzado con
  // el del vecino. Que cada .section-composer abarque tres columnas (media
  // tarjeta) es lo que da caja real de ~ mitad de tarjeta a los dos controles:
  // sin grid-column el defecto vuelve.
  const decls = declarationsFor(selector => selector.includes('.section-composer'));
  const span = decls.find(d => d.property === 'grid-column' && /span\s*3/.test(d.value));
  assert.ok(span,
    '.section-composer debe declarar grid-column: span 3 para que «Repetir» (34px) y «Duplicar» (38px) quepan en su caja: declaraciones: ' +
    decls.map(d => d.property + ': ' + d.value).join('; '));
});
