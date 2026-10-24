// T-48 · Presupuesto de alto (A-11/A-12, 2026-10-24).
//
// A 1366×650 la página de la base mide 1550 px y el mástil tocable queda en
// y=687,4: 37,4 px bajo el pliegue real del autor. La ficha pide que la vista de
// tocar quepa sin scroll y que lo que no se usa mientras suena (YouTube,
// Metrónomo, Mis progresiones) arranque plegado, a un clic.
//
// Estas pruebas leen HTML y CSS como texto: fijan la forma mínima que hace
// posible ese presupuesto (shell de viewport en escritorio bajo, columnas con
// scroll propio, metrónomo cerrado y franja de YouTube colapsada). El alto real
// y la apertura de cada panel se verifican en Chromium: npm test no mide
// estilos (PACTO.md §5).

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// Las reglas de un texto CSS, sin comentarios: {selector, cuerpo}. Dentro de un
// @media no hay llaves anidadas más allá de cada regla, así que el par de llaves
// alcanza para separarlas.
function rulesIn(source) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector.trim(),
    body,
  }));
}

// Bloques @media completos, con su condición y su cuerpo, contando llaves para
// no cortar en la primera regla interna.
function mediaBlocks() {
  const blocks = [];
  const open = /@media([^{]*)\{/g;
  let match;
  while ((match = open.exec(css))) {
    let depth = 1;
    let i = open.lastIndex;
    for (; i < css.length && depth > 0; i += 1) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') depth -= 1;
    }
    blocks.push({condition: match[1].trim(), body: css.slice(open.lastIndex, i - 1)});
    open.lastIndex = i;
  }
  return blocks;
}

const has = (body, property, value) =>
  new RegExp('(^|;)\\s*' + property + '\\s*:\\s*' + value + '\\s*(;|$)', 'i').test(body);

test('en escritorio bajo la zona de tocar ocupa un viewport sin capturar el scroll del documento', () => {
  // A-16 corrigió el alcance: el hero vuelve a formar parte de la primera
  // pantalla. El presupuesto de T-48 se conserva dentro de .workspace, que
  // ocupa un viewport cuando se llega a ella; el documento no se ancla ni se
  // oculta antes de ese punto.
  const shells = mediaBlocks().filter(block =>
    /min-width\s*:\s*1101px/.test(block.condition) && /max-height\s*:\s*\d+px/.test(block.condition));
  assert.equal(shells.length, 1,
    'debe haber un único @media de escritorio bajo (min-width 1101px + max-height) que ancle la vista al pliegue');
  const alto = Number(shells[0].condition.match(/max-height\s*:\s*(\d+)px/)[1]);
  assert.ok(alto >= 650 && alto <= 900,
    'el tope de alto del shell es ' + alto + 'px: tiene que cubrir los 650 del pliegue real sin invadir pantallas grandes');

  const rules = rulesIn(shells[0].body);
  const find = selector => rules.find(rule => rule.selector === selector);
  const workspace = find('.workspace');
  assert.ok(workspace && has(workspace.body, 'height', '100vh') && has(workspace.body, 'min-height', '0'),
    '.workspace ocupa un viewport al llegar a tocar y suelta el mínimo de 550 px');

  const documento = find('html, body');
  assert.ok(!documento || !has(documento.body, 'overflow', 'hidden'),
    'el documento no puede capturar el scroll: el hero y el pie siguen siendo alcanzables');

  const shell = find('.shell');
  assert.ok(!shell || !has(shell.body, 'display', 'flex'),
    '.shell no reparte todo el documento como viewport: el presupuesto empieza en la zona de tocar');

  const columnas = rules.find(rule => /\.control-panel/.test(rule.selector) && /\.fretboard-section/.test(rule.selector) && /\.legend-panel/.test(rule.selector));
  assert.ok(columnas && has(columnas.body, 'overflow-y', 'auto') && has(columnas.body, 'min-height', '0'),
    'las tres columnas scrollean por dentro (overflow-y:auto, min-height:0): el vacío muerto de la columna izquierda desaparece');

  const pie = rules.find(rule => /(^|,)\s*footer\s*$/.test(rule.selector));
  assert.ok(!pie || !has(pie.body, 'display', 'none'),
    'el pie se conserva en el documento y aparece al seguir desplazándose después de la zona de tocar');

  const estado = find('.progression-playback');
  assert.ok(estado && has(estado.body, 'min-height', '0') && has(estado.body, 'margin', '0'),
    'la línea «Detenido» se compacta en el shell: su min-height de 26 px y sus márgenes son el aire que empuja el mástil bajo 650');
});

test('el metrónomo arranca plegado y conserva todos sus controles', () => {
  const tag = html.match(/<details[^>]*\bclass="metronome"[^>]*>/);
  assert.ok(tag, 'el metrónomo debe ser un <details class="metronome"> para plegarse sin JS');
  assert.doesNotMatch(tag[0], /\sopen(\s|=|>)/,
    'el metrónomo arranca cerrado: en la base ocupa 81 px abierto y empuja el resto del contenido');

  const ids = ['metronome-toggle', 'metronome-bpm', 'metronome-beats', 'metronome-accent',
    'metronome-volume', 'metronome-pulses', 'metronome-status'];
  for (const id of ids) {
    assert.match(html, new RegExp('id="' + id + '"'),
      'el id #' + id + ' no se pierde al plegar: metronome.js y preferences.js lo buscan directo');
  }

  const cuerpo = html.match(/<details[^>]*\bclass="metronome"[^>]*>([\s\S]*?)<\/details>/);
  assert.ok(cuerpo && /<summary\b/.test(cuerpo[1]), 'el <details> lleva su <summary> como tirador de un clic');
  assert.ok(cuerpo && /<div class="metronome-body">/.test(cuerpo[1]),
    'los controles viven en .metronome-body, hermana del summary: el <details> cerrado no los muestra');

  const summary = rulesIn(css).find(rule => /\.metronome\s*>\s*summary/.test(rule.selector));
  assert.ok(summary && /cursor\s*:\s*pointer/.test(summary.body),
    '.metronome > summary declara cursor:pointer: el tirador se ve y se siente clickeable');
  const body = rulesIn(css).find(rule => /\.metronome-body\s*$/.test(rule.selector));
  assert.ok(body && /display\s*:\s*flex/.test(body.body),
    '.metronome-body reparte sus controles en flex (la forma que tenía el panel abierto)');
});

test('el panel de YouTube colapsado deja una sola franja y no un panel de 114 px', () => {
  // La divulgación de YouTube ya existía (#youtube-disclosure + .is-collapsed),
  // pero el transporte, el estado y el enlace externo seguían visibles: el panel
  // cerrado medía 114,5 px. En la base no hay ninguna regla que los recoja.
  const reglas = rulesIn(css).filter(rule =>
    rule.selector.includes('youtube-disclosure[aria-expanded="false"]'));
  assert.ok(reglas.length >= 1,
    'debe haber una regla que compacte el panel cuando #youtube-disclosure está cerrado (aria-expanded="false")');
  const selector = reglas.map(rule => rule.selector).join(', ');
  for (const pieza of ['.video-transport', '#youtube-status', '#youtube-external']) {
    assert.ok(selector.includes(pieza),
      pieza + ' queda fuera de la franja plegada: visible sigue sumando alto al panel cerrado');
  }
  for (const rule of reglas) {
    assert.match(rule.body, /display\s*:\s*none/,
      'la regla de ' + rule.selector + ' debe ocultar la pieza plegada');
  }
});
