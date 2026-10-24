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

// Re-entrega T-31 (devolución QA de revision-t31-eb10203-2026-10-24):
// abierto, el panel de variantes se salía de su propia caja. El aside de la
// leyenda deja ~103px de contenido útil y .variants-rows pedía columnas
// mínimas de 150px: la fila pasaba el borde interior 48px a 1366×768 (38px
// del borde exterior) y 49,5px a 320, con los selects sobre el fondo de la
// página y la ayuda aplastada en una columna de ~100px — en claro y oscuro.
// La salida es un popover fijo arriba a la derecha cuando [open]: sale del
// aside del todo y su ancho no depende de él. position: fixed es estable
// acá porque la suite ya vela que .workspace no retiene tras su animación
// rise ningún transform (la misma base que el video flotante).
test('el panel de variantes abierto es un popover fijo fuera del aside', () => {
  const decls = declarationsFor(selector => selector.includes('#variants-editor[open]'));
  assert.ok(decls.length > 0, 'no hay regla #variants-editor[open]: abierto, el panel sigue clavado al aside de 123px y desborda');
  const posicion = decls.filter(d => d.property === 'position');
  assert.ok(posicion.some(d => d.value === 'fixed'), 'sin position: fixed el panel abierto no sale del aside y la fila de 150px desborda el borde');
  const ancho = decls.filter(d => d.property === 'width');
  assert.ok(ancho.some(d => /\bmin\(\s*320px\s*,\s*calc\(100vw\s*-\s*24px\)\)/.test(d.value)),
    'sin ancho acotado al viewport (min con 100vw) el panel puede pasarse del ancho de una ventana chica a 320');
  const tope = decls.filter(d => d.property === 'max-height');
  assert.ok(tope.some(d => /calc\(100vh\s*-\s*24px\)/.test(d.value)), 'sin tope de alto, el panel abierto puede crecer más que el pliegue');
  const scroll = decls.filter(d => d.property === 'overflow-y');
  assert.ok(scroll.some(d => d.value === 'auto'), 'el tope de alto sin scroll propio tira las vueltas fuera de la ventana');
});

test('la grilla de vueltas usa columnas mínimas que caben en el panel', () => {
  const cols = declarationsFor(s => s.includes('.variants-rows'))
    .filter(d => d.property === 'grid-template-columns');
  assert.ok(cols.length > 0, 'no hay grilla .variants-rows: los selects quedan sin caja');
  const valor = cols.map(d => d.value).join('; ');
  assert.match(valor, /minmax\(\s*120px\s*,\s*1fr\s*\)/,
    'las columnas mínimas deben caber en ~143px que reparte un panel de 320px: con mínimas de 150px la fila desborda la caja');
  assert.doesNotMatch(valor, /150px/, 'la columna mínima de 150px que desbordaba la caja (48px a 1366) sigue en el CSS');
});

test('el badge de variantes ya no declara un font-size letra muerta', () => {
  // Acotación QA: .variants-badge (0,1,0) pierde por especificidad contra
  // .progression-card button (0,1,1) que declara font-size: 14px, así que el
  // 9px no se aplicó nunca (el badge computó 14px siempre). Se acepta el 14px
  // (igual que la ×, cero cambio visual) y la declaración muerta se quita.
  const decls = declarationsFor(s => s.includes('.variants-badge'));
  assert.ok(decls.some(d => d.property === 'margin-right'), 'la regla del badge desapareció del CSS');
  const tamano = decls.filter(d => d.property === 'font-size');
  assert.deepEqual(tamano, [], '.variants-badge pierde (0,1,0) contra .progression-card button (0,1,1) con font-size: 14px: la declaración de 9px no se aplicaba nunca; si algún día se quiere otro tamaño, se gana la especificidad, no se deja letra muerta');
});

// Encargo T-46 (A-11 del autor, corregido por A-12): a 1366×650 —el pliegue real de su
// equipo— el héroe de marketing medía 254px (sonda CDP: intro 78→332) y el mástil
// arrancaba en y=887: 237px debajo del pliegue. La página abría en texto de presentación
// y el instrumento quedaba fuera de la primera vista (evidencia agenteCoo/pliegue-real-1366x650.png).
// La ficha da dos salidas y la banda nueva las hace las dos: título de una línea y el
// texto de presentación detrás de un «?». Además la barra superior cede alto: sin las
// dos reducciones el mástil sube a y≈650 exacto —sin margen— y el reparto no alcanza.
test('el título del encabezado es de una línea y el texto de presentación queda detrás del «?»', () => {
  const intro = html.match(/<section class="intro">([\s\S]*?)<\/section>/);
  assert.ok(intro, 'la sección .intro debe seguir existiendo en index.html');
  const banda = intro[1];
  assert.doesNotMatch(banda, /<br/, 'el <br> del título obliga dos líneas de héroe (254px de banda): el mástil queda en y=887 a 1366×650, detrás del pliegue');
  const ayuda = banda.match(/<details[^>]*\binline-help\b[\s\S]*?<\/details>/);
  assert.ok(ayuda, 'el texto de presentación debe quedar detrás de un «?» en la banda: sin él, el subtítulo y el eyebrow vuelven a comer el pliegue');
  assert.match(ayuda[0], /GUITARRA \/ MAPA ARMÓNICO/, 'el eyebrow de la banda desapareció sin recogerse dentro de la burbuja del «?»');
  assert.match(ayuda[0], /Elige un acorde, prueba una escala/, 'el subtítulo de la banda desapareció sin recogerse dentro de la burbuja del «?»');
  assert.doesNotMatch(banda, /<p class="eyebrow"/, 'el eyebrow fuera del «?» mete otra línea (~31px) en la banda: el mástil vuelve a caer bajo el pliegue');
  assert.doesNotMatch(banda, /<p class="intro-copy"/, 'el subtítulo fuera del «?» mete ~72px en la banda: el mástil vuelve a caer bajo el pliegue');
});

test('el héroe recupera presencia antes de la zona de tocar', () => {
  // A-16 acotó el presupuesto: la primera pantalla vuelve a presentar la app;
  // el viewport fijo empieza recién en .workspace. El título no debe volver a
  // caer al techo técnico de 33px de T-46.
  const display = declarationsFor(selector => /(^|,)\s*\.intro\s*$/.test(selector.trim()))
    .filter(d => d.property === 'display');
  assert.ok(display.some(d => d.value === 'grid'),
    'el hero necesita su propia composición antes de la zona de tocar, no la fila mínima de T-46');
  const tacos = declarationsFor(selector => /(^|,)\s*\.intro h1/.test(selector.trim()))
    .filter(d => d.property === 'font-size')
    .map(d => d.value);
  assert.ok(tacos.some(value => /clamp\(\s*38px\s*,/.test(value)),
    'el título debe recuperar una escala expresiva desde 38px; el clamp técnico de T-46 le quitaba presencia');
});

test('la barra superior cede alto para que el mástil arranque al pliegue real', () => {
  // Presupuesto medido (sonda CDP a 1366×650): con título de una línea (~48px) el
  // mástil quedaba en y≈650 justo; la barra de 78px es el único bloque que puede
  // ceder alto sin tocar la zona de progresión (de eso otra ronda: T-47/T-48).
  const match = css.match(/\.topbar\s*\{([^}]*)\}/);
  assert.ok(match, 'regla .topbar presente');
  const alto = match[1].match(/height\s*:\s*(\d+)px/);
  assert.ok(alto, 'la barra declara height');
  assert.ok(Number(alto[1]) <= 50,
    '.topbar de ' + alto[1] + 'px: con la banda de título mínima el mástil quedaba pegado al borde del pliegue; la barra cede alto (46px) para dejar margen');
});

// Devolución QA (revision-t46-2602d82-2026-10-24, corrección de T-46): con la banda y la
// topbar ya aprobadas, la grilla que se toca —#fretboard, no su contenedor .fretboard-wrap—
// arrancaba en y=659,4 a 1366×650: 9,4 px debajo del pliegue real del autor, en los dos temas
// (sonda CDP del dev reproduciendo la de QA: wrap 628,4, números 633,4–655,4, exceso 9,4).
// QA señalizó tres palancas que no tocan lo aprobado: el aire de la toolbar
// (.board-toolbar margin-bottom), el padding-top del wrap y la fila de números (pista de 26
// para 22 de contenido). Presupuesto, computable del CSS como texto: lo que hay que achicar
// entre fila de vista y grilla es máx(margin-bottom de toolbar, margin-top de
// .board-view-row) + padding-top del wrap + pista de números; con los valores de base mide
// 12 + 5 + 26 = 43 (mezcla de colapsos + contenidos, medida en la sonda: gap 12, gap 6,
// padding 5, pista 26). Hacen falta ≥ 10 px: el hueco abajo hasta 8 (el piso lo pone
// margin-top 8 de la fila: declarar menos no gana, medido), el padding-top a 0 y la pista a
// 22. 13 ≥ 10: la grilla queda ~3,6 px dentro del pliegue; sin los cortes vuelve el defecto.
test('la grilla #fretboard (la que se toca) entra al pliegue real de 1366×650', () => {
  const le = (re, prop) => declarationsFor(sel => re.test(sel.trim()))
    .filter(d => d.property === prop).map(d => d.value);
  const numero = v => parseFloat(v);
  const filaMargin = le(/^\.board-view-row$/, 'margin');
  const tbMargin = le(/^\.board-toolbar$/, 'margin-bottom');
  const wrapPadding = le(/(^|,)\s*\.fretboard-wrap\s*$/, 'padding');
  const filas = le(/(^|,)\s*\.fretboard-layout\s*$/, 'grid-template-rows');
  const numerosMb = le(/(^|,)\s*\.fret-numbers\s*$/, 'margin-bottom');
  assert.ok(filaMargin.length === 1 && !Number.isNaN(numero(filaMargin[0].split(/\s+/)[0])),
    '.board-view-row debe declarar su margin (es el piso del hueco toolbar→fila, colapso medido en la sonda)');
  assert.ok(tbMargin.length === 1 && !Number.isNaN(numero(tbMargin[0])),
    '.board-toolbar debe declarar margin-bottom (la primera palanca que señalizó QA)');
  assert.ok(wrapPadding.length >= 1 && !wrapPadding.some(v => Number.isNaN(numero(v.trim().split(/\s+/)[0]))),
    'el padding de .fretboard-wrap declara su reparto (la segunda palanca)');
  assert.ok(filas.length >= 1 && filas.every(v => !Number.isNaN(numero(v.trim().split(/\s+/)[0]))),
    '.fretboard-layout declara grid-template-rows (la pista de la fila de números)');
  assert.ok(numerosMb.length === 1 && !Number.isNaN(numero(numerosMb[0])),
    '.fret-numbers declara su margin-bottom');

  const huecoToolbar = Math.max(numero(tbMargin[0]), numero(filaMargin[0].split(/\s+/)[0]));
  const ptWrap = numero(wrapPadding[0].trim().split(/\s+/)[0]);
  const pistaNumeros = filas.map(v => numero(v.trim().split(/\s+/)[0]));
  assert.ok(huecoToolbar <= 8,
    'hueco toolbar→fila de ' + huecoToolbar + 'px (medido 12 en 2602d82): el piso es margin-top 8px de .board-view-row; dejarlo en 12 come 4px del presupuesto del pliegue');
  assert.ok(ptWrap <= 0,
    'padding-top de .fretboard-wrap de ' + ptWrap + 'px: los 5px de la base (2602d82) separan los números del techo del wrap y empujan #fretboard bajo el pliegue');
  assert.ok(pistaNumeros.length >= 1 && !pistaNumeros.some(Number.isNaN) && Math.max(...pistaNumeros) <= 22,
    'algún .fretboard-layout declara la pista de la fila de números por encima de 22px: la fila pasa de 26px (2602d82) a su contenido limpio de 22 — la tercera palanca');
  assert.ok(numero(numerosMb[0]) === 0,
    'el margin-bottom de 4px de .fret-numbers quedaba colgado de una pista que ya no existe: sin la pista de 26px es margen muerto sobre el diapasón');
  const recorte = (12 - huecoToolbar) + (5 - ptWrap) + (26 - numero(filas[0].trim().split(/\s+/)[0]));
  assert.ok(recorte >= 10,
    'cortes de ' + recorte + 'px < 10: QA midió 9,4px de exceso de #fretboard sobre el pliegue (y=659,4 a 1366×650); sin ellos la grilla sortable vuelve a quedar debajo');
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
