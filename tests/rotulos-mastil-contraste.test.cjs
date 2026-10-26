// T-36, línea 2: el contraste del rótulo del mástil (grado/nota que se pinta en
// cada posición). Nació roja sobre `main` `bd04529`: los 84 rótulos visibles del
// arranque daban 1,64 (5ª sobre `#e6b800`), 2,44 (3ª mayor), 2,99 (nota de la
// escala sin resaltar, `#666` sobre `#bbb`) y 3,71 (raíz), y el tintado del
// micrófono repetía la tinta clara sobre la raíz.
//
// El instrumento de esta guarda NO usa `note-ink.js`: calcula el ratio WCAG con
// su propia aritmética, para no validar el módulo con el módulo.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

// WCAG 2.1: luminancia relativa y ratio, sobre colores hex de 3 o 6 dígitos.
function channels(hex) {
  const value = String(hex).trim();
  const match = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const full = match[1].length === 3 ? match[1].split('').map(c => c + c).join('') : match[1];
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
}
function luminance(hex) {
  const rgb = channels(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(channel => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const first = luminance(a), second = luminance(b);
  if (first === null || second === null) return null;
  const [light, dark] = first > second ? [first, second] : [second, first];
  return (light + 0.05) / (dark + 0.05);
}

// Sandbox mínimo, el mismo camino que usa la app: los scripts se cargan en el
// orden de index.html y comparten el ámbito global.
function setup() {
  const elements = new Map();
  function element(key) {
    if (!elements.has(key)) elements.set(key, {
      options: [], selectedIndex: 0, handlers: {}, style: { setProperty() {} },
      set innerHTML(html) { this.html = html; },
      get innerHTML() { return this.html || ''; },
      addEventListener(name, fn) { this.handlers[name] = fn; },
      querySelectorAll() { return []; },
      querySelector(selector) { return element(key + selector); },
      attrs: {},
      setAttribute(name, value) { this.attrs[name] = String(value); },
      dispatchEvent() { return true; },
    });
    return elements.get(key);
  }
  class FakeEvent { constructor(type, init) { this.type = type; Object.assign(this, init); } }
  const ctx = vm.createContext({ document: { querySelector: element, querySelectorAll: () => [] }, Event: FakeEvent });
  const load = file => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
  load('music-model.js');
  load('progression-duration.js');
  load('tonal-context.js');
  // En la base no existe: la guarda tiene que medir el defecto, no romperse por
  // un archivo que todavía no está.
  if (fs.existsSync(path.join(root, 'note-ink.js'))) load('note-ink.js');
  load('app-state.js');
  load('app.js');
  return { run: code => vm.runInContext(code, ctx), element };
}

// Cada posición rotulada: relleno y tinta tal como quedaron escritos en línea.
function labels(html) {
  const found = [];
  const spans = html.matchAll(/<span class="([^"]*)"([^>]*)style="([^"]*)"[^>]*>([^<]*)<\/span>/g);
  for (const [, className, , style, text] of spans) {
    if (!text.trim()) continue;
    const declarations = {};
    for (const part of style.split(';')) {
      const [property, ...rest] = part.split(':');
      if (property && rest.length) declarations[property.trim()] = rest.join(':').trim();
    }
    found.push({ className, text: text.trim(), fill: declarations['background-color'], ink: declarations['color'] });
  }
  return found;
}

// Los rótulos con relleno sólido. Quedan fuera, y se dice en el documento de la
// ronda: la nota fantasma (tinta semitransparente, identidad del modo fantasma)
// y la nota fuera de escala sobre la madera (fondo con degradado, que el propio
// instrumento de medición marca como no concluyente).
function solidLabels(html) {
  return labels(html).filter(label => label.fill && label.fill.startsWith('#') && !/ghost-note/.test(label.className));
}

function assertReadable(list, where) {
  const failures = list
    .map(label => ({ ...label, ratio: contrast(label.ink, label.fill) }))
    .filter(label => label.ratio === null || label.ratio < 4.5)
    .map(label => `${label.text} ${label.ink} sobre ${label.fill} = ${label.ratio === null ? 'sin medir' : label.ratio.toFixed(2)}`);
  assert.deepEqual(failures, [], `${where}: rótulos bajo AA (4,5)`);
}

test('el arranque del mástil rotula con tinta legible sobre cada relleno', () => {
  const { element } = setup();
  const html = element('#fretboard').innerHTML + element('#open-strings').innerHTML;
  const list = solidLabels(html);
  assert.ok(list.length >= 80, `la guarda tiene que ver los rótulos (vio ${list.length}), no pasar por vacío`);
  assertReadable(list, 'arranque (Do mayor, tríada, grados)');
});

test('todo tipo de acorde y modo de vista conserva la tinta legible', () => {
  const { run, element } = setup();
  const seen = new Set();
  let measured = 0;
  const failures = [];
  const types = run('chordTypes.map(t => t.value)');
  const modes = run('Object.keys(modes)');
  for (const instrument of ['guitar', 'bass']) {
    for (const type of types) {
      for (const mode of modes) {
        for (const displayMode of [0, 1, 3]) {
          run(`instrument=${JSON.stringify(instrument)};root=0;selectedMode=${JSON.stringify(mode)};`
            + `chordType=chordTypes.find(t=>t.value===${JSON.stringify(type)});displayModeIndex=${displayMode};updateView()`);
          const html = element('#fretboard').innerHTML + element('#open-strings').innerHTML;
          for (const label of solidLabels(html)) {
            measured++;
            seen.add(label.fill.toUpperCase());
            const ratio = contrast(label.ink, label.fill);
            if (ratio === null || ratio < 4.5) {
              failures.push(`${instrument}/${type}/${mode}/${displayMode}: ${label.text} ${label.ink} sobre ${label.fill} = ${ratio === null ? 'sin medir' : ratio.toFixed(2)}`);
            }
          }
        }
      }
    }
  }
  assert.deepEqual(failures.slice(0, 12), [], `${failures.length} rótulos bajo AA en el barrido`);
  assert.ok(measured > 5000, `el barrido tiene que medir de verdad (midió ${measured})`);
  assert.ok(seen.size >= 8, `el barrido tiene que pasar por varios rellenos (vio ${seen.size})`);
});

test('cada relleno de la tabla de intervalos tiene tinta que llega a AA', () => {
  // Fuente única: los colores salen del propio `music-model.js`, así que un intervalo
  // nuevo entra en la guarda sin que nadie se acuerde de anotarlo acá.
  const source = fs.readFileSync(path.join(root, 'music-model.js'), 'utf8');
  const fills = [...new Set([...source.matchAll(/color:\s*'(#[0-9a-fA-F]{3,6})'/g)].map(match => match[1].toUpperCase()))];
  assert.ok(fills.length >= 14, `la tabla de intervalos tiene que estar completa (se leyeron ${fills.length} colores)`);
  const noteInk = require('../note-ink.js');
  const failures = fills
    .map(fill => ({ fill, ink: noteInk.inkOverFill(fill), ratio: contrast(noteInk.inkOverFill(fill), fill) }))
    .filter(item => item.ratio === null || item.ratio < 4.5)
    .map(item => `${item.fill} con ${item.ink} = ${item.ratio === null ? 'sin medir' : item.ratio.toFixed(2)}`);
  assert.deepEqual(failures, [], 'rellenos sin tinta AA');
});

test('el tintado del micrófono escribe la misma tinta legible que el mástil', () => {
  // T-21 escribe el par relleno/tinta mientras la nota suena. Si eligiera su
  // propia tinta, el micrófono devolvería el defecto que esta ronda corrige.
  const { micFretColor } = require('../microphone-ui.js');
  const source = fs.readFileSync(path.join(root, 'music-model.js'), 'utf8');
  const fills = [...new Set([...source.matchAll(/color:\s*'(#[0-9a-fA-F]{3,6})'/g)].map(match => match[1]))];
  const failures = [];
  for (const fill of fills) {
    for (const className of ['fret-note root-note scale-note', 'fret-note chord-note scale-note', 'fret-note scale-note']) {
      const tint = micFretColor({ color: fill, className });
      const ratio = contrast(tint.ink, tint.color);
      if (ratio === null || ratio < 4.5) failures.push(`${fill} (${className}) con ${tint.ink} = ${ratio === null ? 'sin medir' : ratio.toFixed(2)}`);
    }
  }
  assert.deepEqual(failures, [], 'el tintado del micrófono deja rótulos bajo AA');
});

test('la tinta del rótulo sale de una sola autoridad y no de literales por rama', () => {
  const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  // Las cuatro ramas con relleno sólido de cada render (raíz, nota del acorde,
  // nota de escala resaltada y nota de escala sin resaltar) eligen por la misma
  // función; si quedara un literal de tinta, el defecto vuelve por ahí.
  assert.equal((source.match(/textColor = NoteInk\.inkOverFill\(/g) || []).length, 8,
    'las ocho ramas con relleno sólido (dos renders × cuatro) tienen que elegir la tinta por NoteInk');
  assert.doesNotMatch(source, /textColor = '#(f3f0e8|666)'/i, 'quedó una tinta literal de las que fallaban');
});
