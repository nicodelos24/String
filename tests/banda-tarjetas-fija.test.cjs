// T-53 · A-23 (2026-10-25).
//
// La banda de tarjetas sale de la columna central y pasa a la primera fila del
// workspace: nace donde termina el encabezado y queda a la vista cuando la
// página se detiene en la zona de tocar, mientras las columnas de abajo
// resuelven su propio scroll. Esta prueba fija la estructura y las reglas de
// CSS que la sostienen; el alto real, la posición y la visibilidad se miden en
// Chromium (PACTO.md §5). A 1366×650, con el documento en su tope, la banda
// queda en 1..241 y el mástil en 439..595 de un viewport de 650.

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// Contenido interior del <div> que abre con `apertura`, contando anidamientos.
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

function reglas(fuente) {
  return [...fuente.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, cuerpo]) => ({
    selector: selector.trim(),
    cuerpo: cuerpo.replace(/\s+/g, ' '),
  }));
}

function media(condicion) {
  const bloques = todosLosMedia(condicion);
  assert.ok(bloques.length, 'falta el bloque ' + condicion);
  return bloques[0];
}

// Un mismo ancho puede aparecer en más de un @media (el archivo creció por
// rondas); para buscar una regla se recorren todos los bloques con esa
// condición y se unen sus cuerpos. `reglas` ignora los selectores de @media
// porque solo mira pares selector { … }.
function todosLosMedia(condicion) {
  const cuerpos = [];
  let desde = 0;
  while (true) {
    const inicio = css.indexOf(condicion, desde);
    if (inicio === -1) break;
    const abre = css.indexOf('{', inicio + condicion.length);
    let profundidad = 1;
    let cursor = abre + 1;
    while (cursor < css.length && profundidad) {
      if (css[cursor] === '{') profundidad += 1;
      if (css[cursor] === '}') profundidad -= 1;
      cursor += 1;
    }
    cuerpos.push(css.slice(abre + 1, cursor - 1));
    desde = cursor;
  }
  return cuerpos;
}

const tiene = (cuerpo, propiedad, valor) =>
  new RegExp('(^|;)\\s*' + propiedad + '\\s*:\\s*' + valor + '\\s*(;|$)').test(cuerpo);

test('la banda de tarjetas vive fuera de la caja grande, antes de sus columnas', () => {
  const banda = bloqueDiv(html, '<div class="cards-band">');

  assert.ok(banda.includes('id="progression"'), 'la banda contiene las tarjetas');
  assert.ok(!banda.includes('class="progression-view-controls"'),
    'la banda no lleva los controles: la caja grande empieza en la fila del transporte (A-27)');
  assert.ok(!banda.includes('<div class="progression-workspace">'),
    'la banda ya no envuelve la cabecera del workspace');

  const inicioWorkspace = html.indexOf('<section class="workspace"');
  assert.ok(html.indexOf('<div class="cards-band">') < inicioWorkspace,
    'la banda se lee antes de la caja grande: queda separada de ella');
  const workspace = html.slice(inicioWorkspace);
  assert.ok(!workspace.includes('class="cards-band"'),
    'la caja grande no envuelve la banda: su borde superior no rodea las tarjetas');

  const maestil = bloqueDiv(html, '<div class="fretboard-section">');
  assert.ok(!maestil.includes('<div class="progression-workspace">'),
    'el mástil ya no envuelve la pila de tarjetas: su scroll no puede arrastrarla');
});

test('la caja grande empieza en la fila del transporte, no en las tarjetas', () => {
  const workspace = html.slice(html.indexOf('<section class="workspace"'));
  assert.ok(workspace.indexOf('<div class="progression-workspace">') < workspace.indexOf('<aside class="control-panel">'),
    'la cabecera del transporte abre la grilla de la caja grande');

  const cabecera = bloqueDiv(workspace, '<div class="progression-workspace">');
  assert.ok(cabecera.includes('class="progression-view-controls"'),
    'el transporte y la captura viven dentro de la caja grande');
  assert.ok(!cabecera.includes('id="progression"'), 'las tarjetas no entran en la caja');

  const regla = reglas(css).find(regla => regla.selector === '.workspace > .progression-workspace');
  assert.ok(regla, 'falta la regla que monta la cabecera como primera fila de la caja');
  assert.ok(tiene(regla.cuerpo, 'grid-column', '1 / -1'),
    'la cabecera cruza las tres columnas de la caja');
});

test('las secciones viven con el mástil y no hacen crecer la banda', () => {
  const banda = bloqueDiv(html, '<div class="cards-band">');
  const maestil = bloqueDiv(html, '<div class="fretboard-section">');

  assert.ok(!banda.includes('class="sections-panel"'),
    'abrir Secciones del tema no puede sumar alto a la banda fija');
  assert.ok(maestil.includes('<details class="sections-panel">'),
    'el panel de secciones sigue en la columna que scrollea, debajo de la banda');
  assert.ok(maestil.indexOf('<details class="sections-panel">') < maestil.indexOf('class="board-toolbar"'),
    'el panel abre la columna del mástil, donde estaba su cabecera');
});

test('la banda ocupa todo el ancho y se sostiene arriba mientras se desplaza la página', () => {
  const banda = reglas(css).find(regla => regla.selector === '.cards-band');
  assert.ok(banda, 'falta la regla base de .cards-band');
  assert.ok(tiene(banda.cuerpo, 'min-width', '0'), 'la banda no impone un ancho mínimo');
  assert.ok(!tiene(banda.cuerpo, 'grid-column', '1 / -1'),
    'la banda ya no es una fila de la grilla: vive fuera de la caja grande');

  const escritorio = reglas(media('@media (min-width: 801px)'));
  const fija = escritorio.find(regla => regla.selector === '.cards-band');
  assert.ok(fija, 'falta la banda de escritorio');
  assert.ok(tiene(fija.cuerpo, 'position', 'sticky') && tiene(fija.cuerpo, 'top', '0'),
    'en escritorio la banda se queda arriba cuando el documento termina de desplazarse');

  const tarjetas = escritorio.find(regla => regla.selector === '.cards-band .progression');
  assert.ok(tarjetas && tiene(tarjetas.cuerpo, 'max-height', '158px'),
    'la franja limita el alto de las tarjetas y el bloc scrollea por dentro');

  const angosto = todosLosMedia('@media (max-width: 800px)').flatMap(reglas);
  const oculta = angosto.filter(regla => /\.cards-band/.test(regla.selector) && /display/.test(regla.cuerpo));
  for (const pestana of ['mastil', 'acomp', 'mas']) {
    assert.ok(oculta.some(regla => regla.selector.includes(`[data-mobile-tab="${pestana}"]`)),
      `en la pestaña ${pestana} la banda no deja una franja vacía sobre el mástil`);
  }
  const propia = angosto.find(regla => regla.selector === 'body[data-mobile-tab="progresion"] .cards-band');
  assert.ok(propia && tiene(propia.cuerpo, 'position', 'sticky'),
    'en su pestaña móvil la banda sigue a la vista al llegar al pie');
});

test('la banda sigue fija sobre el workspace y el workspace crece con los laterales', () => {
  const bajo = reglas(media('@media (min-width: 1101px) and (max-height: 900px)'));
  const workspace = bajo.find(regla => regla.selector === '.workspace');
  assert.ok(workspace, 'falta la regla .workspace del shell de escritorio bajo');
  // T-54 (A-26) revirtió el alto de viewport: la banda y las columnas se
  // reparten en filas automáticas y el workspace crece con los laterales, que
  // ya no tienen barra propia. La banda conserva su sticky: sigue siempre a la
  // vista, que es la guarda de esta ronda.
  assert.ok(tiene(workspace.cuerpo, 'grid-template-rows', 'auto auto'),
    'la fila de la banda y la de las columnas crecen con su contenido');
  assert.ok(tiene(workspace.cuerpo, 'height', 'auto'),
    'el workspace ya no se ancla a un viewport: los paneles laterales muestran todo su contenido');
  assert.ok(!tiene(workspace.cuerpo, 'height', '100vh'),
    'el alto de viewport de T-50 quedó revertido por la palabra nueva del autor');
  assert.ok(tiene(workspace.cuerpo, 'min-height', '0'), 'las columnas pueden crecer sin mínimo heredado');

  const fija = reglas(media('@media (min-width: 801px)')).find(regla => regla.selector === '.cards-band');
  assert.ok(fija && tiene(fija.cuerpo, 'position', 'sticky') && tiene(fija.cuerpo, 'top', '0'),
    'la guarda de la banda de T-53 sigue en pie: en escritorio se queda arriba al desplazar');

  const compacta = reglas(media('@media (min-width: 1101px)'));
  const controles = compacta.find(regla => regla.selector === '.progression-workspace .progression-view-controls');
  assert.ok(controles && tiene(controles.cuerpo, 'flex-direction', 'row'),
    'con ancho de escritorio las dos filas de T-47 se leen en una sola línea y la cabecera entra en el pliegue');
  assert.ok(tiene(controles.cuerpo, 'flex-wrap', 'wrap'),
    'si el ancho no alcanza, los controles envuelven sin desbordar');
});
