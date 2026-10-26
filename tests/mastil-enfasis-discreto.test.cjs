// T-55 ronda 3 (A-33) · El énfasis de las notas del acorde, más discreto.
//
// Palabra del autor: «si observas el tamaño de las notas del acorde se ven
// resaltadas como en "negritas"… eso rompe mucho la vista… quizá hacerlo más
// discreto, con algún color más grisáceo de fuentes y no un negro tan
// disruptivo o la fuente un poquito más fina no tan borrosa y gruesa».
//
// La ficha deja tres cosas medidas: peso de la raíz 700 → 500 y de la nota del
// acorde 600 → 500; tinta grisácea que NO cede lectura (AA 4,5 sobre cada
// relleno, rótulo por rótulo); y render limpio en reposo (sin halo difuso).
// El resaltado sigue existiendo por tamaño y opacidad, y la señal de «esto
// suena» sigue en el aro dorado y el pulso (`DEF-01`).
//
// Se lee el CSS como texto (PACTO §5: `npm test` no mide estilos) y el render
// se mide en el mismo sandbox que `rotulos-mastil-contraste.test.cjs`. El gris
// esperado lo calcula esta guarda con su propia aritmética WCAG: no se valida
// la tinta con el módulo de la tinta.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

// Holgura del cálculo propio contra la implementación: los dos redondean el
// contraste, y la tinta de la app deja un margen de seguridad sobre 4,5 para
// que el AA no baile con la aritmética de quien lo mida.
const TOLERANCE = 8;

// --- WCAG 2.1, aritmética propia (no se usa note-ink.js para medir) ----------
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
function grayHex(value) {
  return '#' + [value, value, value].map(v => v.toString(16).padStart(2, '0')).join('');
}
// El gris más suave que todavía llega a AA sobre ese relleno, del lado de tinta
// que la tabla ya usa (oscura en los rellenos claros, clara en los oscuros).
function softestInk(fill) {
  const darkSide = contrast('#000000', fill) >= contrast('#ffffff', fill);
  let chosen = darkSide ? 0 : 255;
  for (let value = 0; value < 256; value++) {
    const ratio = contrast(grayHex(value), fill);
    if (ratio === null || ratio < 4.5) continue;
    chosen = value;
    if (darkSide) continue; // sigue subiendo: queremos el gris más claro que pase
    break;                  // del lado claro, el primero que pasa es el más oscuro
  }
  return grayHex(chosen);
}
function distanceToSoftest(ink, fill) {
  const actual = channels(ink);
  const expected = channels(softestInk(fill));
  if (!actual || !expected) return null;
  // Solo tiene sentido comparar dentro de la misma polaridad.
  if (actual[0] !== actual[1] || actual[1] !== actual[2]) return null;
  return Math.abs(actual[0] - expected[0]);
}

// --- CSS: las reglas del énfasis, sin comentarios ---------------------------
function rules(source) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector.trim(),
    body,
  }));
}
function declarations(rule) {
  return [...rule.body.matchAll(/(^|;)\s*([a-z-]+)\s*:\s*([^;]+)/g)].map(([, , property, value]) => ({
    property,
    value: value.trim(),
  }));
}
const cssRules = rules(css);
function emphasisRule(className) {
  const rule = cssRules.find(candidate => candidate.selector === `.fret-note.${className}`);
  assert.ok(rule, `falta la regla .fret-note.${className} en style.css`);
  return declarations(rule);
}
function declared(list, property) {
  const found = list.filter(declaration => declaration.property === property);
  return found.length ? found[found.length - 1].value : null;
}

test('la raíz y la nota del acorde bajan a peso 500, sin perder el resaltado', () => {
  // Roja sobre la base: hoy la raíz trae 700 y la nota del acorde, 600.
  for (const className of ['root-note', 'chord-note']) {
    const rule = emphasisRule(className);
    assert.equal(declared(rule, 'font-weight'), '500',
      `.fret-note.${className} tiene que susurrar el resaltado con peso 500 (A-33)`);
    // El resaltado no se va: sigue más grande que la nota base y opaco.
    assert.equal(declared(rule, 'font-size'), '11px',
      `.fret-note.${className} conserva su tamaño de 11 px`);
    assert.equal(declared(rule, 'opacity'), '1',
      `.fret-note.${className} conserva la opacidad plena`);
  }
});

test('la tinta del énfasis es el gris más suave que siga alcanzando AA', () => {
  // Roja sobre la base: `inkOverFill` no conoce el modo suave y devuelve el
  // extremo (`#000000` / `#ffffff`), que es el «negro disruptivo» del autor.
  const noteInk = require('../note-ink.js');
  const source = fs.readFileSync(path.join(root, 'music-model.js'), 'utf8');
  const fills = [...new Set([...source.matchAll(/color:\s*'(#[0-9a-fA-F]{3,6})'/g)].map(match => match[1]))];
  assert.ok(fills.length >= 14, `la tabla de intervalos tiene que estar completa (se leyeron ${fills.length})`);

  const failures = [];
  let softer = 0;
  for (const fill of fills) {
    const soft = noteInk.inkOverFill(fill, { soft: true });
    const ratio = contrast(soft, fill);
    if (ratio === null || ratio < 4.5) {
      failures.push(`${fill}: ${soft} = ${ratio === null ? 'sin medir' : ratio.toFixed(2)}`);
      continue;
    }
    const distance = distanceToSoftest(soft, fill);
    if (distance === null || distance > TOLERANCE) {
      failures.push(`${fill}: ${soft} se aparta ${distance === null ? 'sin gris' : distance} pasos de ${softestInk(fill)}`);
      continue;
    }
    const base = channels(noteInk.inkOverFill(fill));
    const extreme = base.every(channel => channel === 0) ? 0 : base.every(channel => channel === 255) ? 255 : null;
    if (extreme !== null && channels(soft)[0] !== extreme) softer++;
  }
  assert.deepEqual(failures, [], 'la tinta del énfasis no es el gris más suave que pasa AA');
  assert.ok(softer >= 12,
    `la tinta suave tiene que ser de verdad más gris en casi toda la tabla (fue en ${softer} de ${fills.length})`);
});

// --- Sandbox: el mismo camino que la página --------------------------------
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
  load('note-ink.js');
  load('app-state.js');
  load('fretboard-render.js');
  load('app.js');
  return { run: code => vm.runInContext(code, ctx), element };
}

function labels(html) {
  const found = [];
  const spans = html.matchAll(/<span class="([^"]*)"([^>]*)style="([^"]*)"[^>]*>([^<]*)<\/span>/g);
  for (const [, className, , style, text] of spans) {
    if (!text.trim()) continue;
    const declarationsMap = {};
    for (const part of style.split(';')) {
      const [property, ...rest] = part.split(':');
      if (property && rest.length) declarationsMap[property.trim()] = rest.join(':').trim();
    }
    found.push({ className, text: text.trim(), fill: declarationsMap['background-color'], ink: declarationsMap['color'] });
  }
  return found;
}

test('el mástil pinta raíz y acorde con la tinta suave, y el resto como estaba', () => {
  // Roja sobre la base: las cuatro ramas de raíz/acorde de los dos renders piden
  // la tinta extrema, así que el gris del autor no llega a la pantalla.
  const { element } = setup();
  const list = labels(element('#fretboard').innerHTML + element('#open-strings').innerHTML);
  assert.ok(list.length >= 80, `la guarda tiene que ver los rótulos (vio ${list.length})`);

  const emphasized = list.filter(label => /(^|\s)(root-note|chord-note)(\s|$)/.test(label.className)
    && label.fill && label.fill.startsWith('#'));
  assert.ok(emphasized.length >= 8, `tienen que verse raíz y acorde (vio ${emphasized.length})`);
  const failures = emphasized
    .map(label => ({ ...label, distance: distanceToSoftest(label.ink, label.fill), ratio: contrast(label.ink, label.fill) }))
    .filter(label => label.ratio === null || label.ratio < 4.5
      || label.distance === null || label.distance > TOLERANCE)
    .map(label => `${label.text} pinta ${label.ink} (${label.ratio === null ? 'sin medir' : label.ratio.toFixed(2)}, ${label.distance} pasos) sobre ${label.fill}`);
  assert.deepEqual(failures, [], 'raíz/acorde con la tinta extrema en vez de la suave');

  // El resto de los rótulos conserva su tinta de siempre: el gris es del énfasis,
  // no de toda la escala.
  const noteInk = require('../note-ink.js');
  const changed = list
    .filter(label => !/(^|\s)(root-note|chord-note)(\s|$)/.test(label.className) && label.fill && label.fill.startsWith('#'))
    .filter(label => !/ghost-note/.test(label.className))
    .filter(label => label.ink.toUpperCase() !== String(noteInk.inkOverFill(label.fill)).toUpperCase())
    .map(label => `${label.text} ${label.ink} sobre ${label.fill}`);
  assert.deepEqual(changed, [], 'la tinta suave se salió del énfasis');
});

test('la polaridad del halo sigue a la tinta suave, no a los hex de siempre', () => {
  // El halo de T-36 r2 va al revés de la tinta. Si la tinta deja de ser `#000000`
  // y nadie recalcula la clase, la nota que suena pierde su halo.
  const { element } = setup();
  const list = labels(element('#fretboard').innerHTML + element('#open-strings').innerHTML);
  const emphasized = list.filter(label => /(^|\s)(root-note|chord-note)(\s|$)/.test(label.className)
    && label.fill && label.fill.startsWith('#'));
  assert.ok(emphasized.length > 0, 'la guarda tiene que ver raíz/acorde');

  const missing = emphasized
    .filter(label => {
      const light = luminance(label.ink) > luminance(label.fill);
      return !(light ? /ink-light/.test(label.className) : /ink-dark/.test(label.className));
    })
    .map(label => `${label.text} ${label.ink} sobre ${label.fill} (${label.className})`);
  assert.deepEqual(missing, [], 'raíz/acorde sin la clase de halo que les toca');
});

test('el micrófono escribe la misma tinta suave que el reposo', () => {
  // Roja sobre la base: `micFretColor` devuelve el extremo para raíz/acorde, así
  // que el rótulo saltaría de gris a negro justo mientras suena.
  const noteInk = require('../note-ink.js');
  const { micFretColor } = require('../microphone-ui.js');
  const cases = [
    ['#E53935', 'fret-note root-note scale-note'],
    ['#4CAF50', 'fret-note chord-note scale-note'],
  ];
  for (const [fill, className] of cases) {
    const tint = micFretColor({ color: fill, className });
    const distance = distanceToSoftest(tint.ink, fill);
    assert.ok(distance !== null && distance <= TOLERANCE,
      `el tintado del micrófono tiene que seguir la tinta suave del mástil (${className}: ${tint.ink}, ${distance} pasos)`);
    assert.ok(contrast(tint.ink, fill) >= 4.5, 'la tinta del micrófono sigue en AA');
  }
  // Las notas que no son el énfasis del autor no cambian.
  const plain = micFretColor({ color: '#00BCD4', className: 'fret-note scale-note' });
  assert.equal(plain.ink.toUpperCase(), String(noteInk.inkOverFill('#00BCD4')).toUpperCase());
});

test('en reposo el rótulo no lleva halo difuso', () => {
  // El halo de T-36 r2 solo existe para la nota que suena; en reposo, el render
  // que mira el autor es limpio. Si alguien mueve un `text-shadow` fuera de las
  // reglas `.live`, el look «borroso» vuelve por la puerta de atrás.
  const NOTE_SELECTOR = /\.(?:fret-note|open-string-note)/;
  const offenders = cssRules
    .filter(rule => NOTE_SELECTOR.test(rule.selector))
    .filter(rule => declarations(rule).some(({ property }) => property === 'text-shadow'))
    .filter(rule => !/\.live(?![\w-])/.test(rule.selector))
    .map(rule => rule.selector);
  assert.deepEqual(offenders, [], 'el halo difuso se sale de la nota viva');
});
