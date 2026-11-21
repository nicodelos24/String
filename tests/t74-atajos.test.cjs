// T-74 · Atajos: controles sobre los manejadores REALES de teclado, sin
// cambiar el producto. Se verifica que Ctrl/Meta/Alt no disparan el atajo de
// añadir acorde, que Espacio/Enter siguen las reglas T-37 (foco en transporte
// y captura en vivo), y que Supr/Ctrl+Supr borra la tarjeta enfocada salvo
// candlock o foco en control de escritura.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { keyTargetIsTyping, keyTargetOwnsChordAdd, isTransportPlayControl, transportSpaceCaptures } = require('../keyboard-section.js');

// -- Helpers puros (exportados por el producto) -----------------------------

function el(tagName, extra = {}) {
  return { tagName, type: undefined, attrs: {}, getAttribute(n) { return this.attrs[n] ?? null; }, ...extra };
}

test('T-74 · keyTargetIsTyping: escribir en campos no dispara atajos; botones y switches sí pueden', () => {
  assert.equal(keyTargetIsTyping(el('INPUT', { type: 'text' })), true);
  assert.equal(keyTargetIsTyping(el('INPUT', { type: 'number' })), true);
  assert.equal(keyTargetIsTyping(el('SELECT')), true);
  assert.equal(keyTargetIsTyping(el('TEXTAREA')), true);
  assert.equal(keyTargetIsTyping(el('INPUT', { type: 'checkbox' })), false);
  assert.equal(keyTargetIsTyping(el('BUTTON')), false);
  assert.equal(keyTargetIsTyping(el('BODY')), false);
  assert.equal(keyTargetIsTyping(null), false);
});

test('T-74 · keyTargetOwnsChordAdd respeta botones, enlaces y roles de control', () => {
  assert.equal(keyTargetOwnsChordAdd(el('BUTTON')), true);
  assert.equal(keyTargetOwnsChordAdd(el('A')), true);
  assert.equal(keyTargetOwnsChordAdd(el('SUMMARY')), true);
  assert.equal(keyTargetOwnsChordAdd(el('DIV', { attrs: { role: 'button' } })), true);
  assert.equal(keyTargetOwnsChordAdd(el('DIV')), false);
  assert.equal(keyTargetOwnsChordAdd(el('INPUT', { type: 'checkbox' })), true,
    'un INPUT (aunque no sea de escritura) conserva su tecla');
});

test('T-74 · T-37: transporte capture Espacio solo con captura en vivo', () => {
  for (const id of ['quick-play', 'tempo-play', 'player-toggle', 'midi-play', 'metronome-toggle']) {
    assert.equal(isTransportPlayControl({ id }), true, id);
    assert.equal(transportSpaceCaptures(true, true), true);
    assert.equal(transportSpaceCaptures(true, false), false);
  }
  assert.equal(isTransportPlayControl({ id: 'song-save' }), false);
  assert.equal(transportSpaceCaptures(false, true), false);
});

// -- Manejador real de keydown de keyboard-section.js ----------------------

function keyboardHarness() {
  const registry = new Map();
  const node = (id, tagName) => {
    if (!registry.has(id)) registry.set(id, {
      id, tagName, hidden: false, textContent: '', value: '', checked: false, disabled: false, title: '',
      dataset: {}, children: [], listeners: {}, style: { setProperty() {} },
      attrs: { 'aria-pressed': 'false' }, _html: '',
      get innerHTML() { return this._html; }, set innerHTML(v) { this._html = v; },
      addEventListener(n, f) { (this.listeners[n] = this.listeners[n] || []).push(f); },
      click() { [...(this.listeners.click || [])].forEach(f => f()); },
      getAttribute(n) { return Object.hasOwn(this.attrs, n) ? this.attrs[n] : null; },
      setAttribute(n, v) { this.attrs[n] = String(v); },
      querySelector() { return null; }, querySelectorAll() { return []; },
    });
    return registry.get(id);
  };
  const liveButtons = ['off', 'note', 'chord'].map(mode => ({
    dataset: { liveMode: mode }, listeners: {}, classList: { toggle() {} },
    addEventListener(n, f) { (this.listeners[n] = this.listeners[n] || []).push(f); },
    click() { [...(this.listeners.click || [])].forEach(f => f()); },
    _pressed: mode === 'chord' ? 'true' : 'false',
    getAttribute(n) { return n === 'aria-pressed' ? this._pressed : null; },
    setAttribute(n, v) { if (n === 'aria-pressed') this._pressed = String(v); },
  }));
  const known = {
    'keyboard-section': 'DIV', 'keyboard-keys': 'DIV', 'keyboard-live-chord': 'DIV',
    'quick-play': 'BUTTON', 'player-toggle': 'BUTTON', 'midi-play': 'BUTTON',
    'metronome-toggle': 'BUTTON', 'tempo-play': 'BUTTON',
  };
  for (const [id, tag] of Object.entries(known)) node(id, tag);
  node('keyboard-live-chord', 'DIV').querySelectorAll = sel => (sel === '[data-live-mode]' ? liveButtons : []);
  const gainParam = () => ({ value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
  const audio = {
    currentTime: 0, sampleRate: 44100, destination: {}, resume: async () => {},
    createGain: () => ({ gain: gainParam(), connect() {}, disconnect() {} }),
    createOscillator: () => ({ type: '', frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} }),
    createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }),
    createBufferSource: () => ({ connect() {}, start() {}, stop() {} }),
  };
  const win = { listeners: {}, addEventListener(n, f) { (this.listeners[n] = this.listeners[n] || []).push(f); }, dispatchEvent() {} };
  win.AudioContext = function () { return audio; };
  const context = vm.createContext({
    window: win,
    document: {
      getElementById: id => (Object.hasOwn(known, id) ? node(id, known[id]) : null),
      addEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
    },
    MutationObserver: class { observe() {} },
    Event: class { constructor(t) { this.type = t; } },
    progression: [], draggingProgressionItem: false,
    instrument: 'guitar', chordType: { value: 'maj' }, selectedMode: 'ionian',
    notes: ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'],
    noteName: p => 'nota-' + p, saveCustomProgression: () => {},
    addProgressionChord: () => { adds++; return true; },
    showProgressionChord: () => {},
  });
  let adds = 0;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'keyboard-section.js'), 'utf8'), context, { filename: 'keyboard-section.js' });
  function keydown(spec) {
    const event = {
      code: spec.code, key: spec.key ?? spec.code, repeat: Boolean(spec.repeat),
      altKey: Boolean(spec.altKey), ctrlKey: Boolean(spec.ctrlKey), metaKey: Boolean(spec.metaKey),
      target: spec.target, defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; }, stopPropagation() {},
    };
    [...(win.listeners.keydown || [])].forEach(fn => fn(event));
    return event;
  }
  return { node, keydown, adds: () => adds, win };
}

test('T-74 · Ctrl/Meta/Alt + Enter o Espacio NO agregan acorde (atajo no captura el navegador)', () => {
  const h = keyboardHarness();
  const target = { tagName: 'BODY' };
  for (const code of ['Enter', 'Space']) {
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
      h.keydown({ code, target, [modifier]: true });
      assert.equal(h.adds(), 0, `${modifier} + ${code} no dispara el atajo`);
    }
  }
  // Sin modificadores, el mismo atajo sí agrega (comprobación de que el
  // arnés está vivo y el guarda es el modificador, no otra cosa).
  h.keydown({ code: 'Enter', target });
  assert.equal(h.adds(), 1);
});

test('T-74 · Espacio sobre transporte sin captura no agrega (semántica nativa del botón)', () => {
  const h = keyboardHarness();
  h.keydown({ code: 'Space', target: h.node('quick-play', 'BUTTON') });
  assert.equal(h.adds(), 0, 'sin captura en vivo, el Espacio pertenece al botón de transporte');
});

test('T-74 · Enter sobre un botón no agrega: conserva la tecla del control enfocado', () => {
  const h = keyboardHarness();
  h.keydown({ code: 'Enter', target: h.node('song-save', 'BUTTON') });
  assert.equal(h.adds(), 0);
  h.keydown({ code: 'Enter', target: { tagName: 'INPUT', type: 'text' } });
  assert.equal(h.adds(), 0, 'tampoco dentro de un campo de escritura');
});

// -- Manejador real de Supr / Ctrl+Supr de progression-interactions.js ------

function cardsHarness({ lock = false } = {}) {
  const removed = [];
  const focused = [];
  const progression = [
    { root: 0, type: 'maj' }, { root: 5, type: 'maj' }, { root: 7, type: 'maj' },
  ];
  const cards = progression.map((_, index) => ({
    dataset: { index: String(index) },
    closest(sel) { return sel.includes('[data-index]') || sel.includes('progression-card') ? this : null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 80, right: 100, bottom: 80 }; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    getAnimations() { return []; }, focus() { focused.push(index); },
    setAttribute() {}, classList: { add() {}, remove() {}, contains() { return false; }, toggle() { return false; } },
    get textContent() { return ''; }, set textContent(v) {},
  }));
  const list = {
    handlers: {},
    querySelectorAll: () => cards,
    querySelector(selector) {
      const m = /data-index="(\d+)"/.exec(selector);
      return m ? cards[Number(m[1])] : null;
    },
    addEventListener(n, f) { this.handlers[n] = f; },
    getAnimations() { return []; }, getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 80 }; },
    classList: { toggle() { return false; }, contains() { return false; }, add() {}, remove() {} },
    scrollTop: 0, scrollLeft: 0, insertBefore() {},
  };
  const lockEl = { checked: lock, addEventListener() {} };
  const document = {
    querySelector: sel => (sel === '#progression' ? list : sel === '#progression-view' ? { addEventListener() {}, setAttribute() {} } : sel === '#fret-scale-lock' ? lockEl : null),
    querySelectorAll: () => [], addEventListener() {},
    createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, addEventListener() {}, appendChild() {}, setAttribute() {} }),
    documentElement: { style: { setProperty() {} } }, body: { appendChild() {}, classList: { add() {}, remove() {} } },
  };
  const context = vm.createContext({
    document, window: { addEventListener() {}, innerHeight: 800, matchMedia: () => ({ matches: false }) },
    performance: { now: () => 0 }, setTimeout, clearTimeout, requestAnimationFrame: fn => fn(),
    progression, draggingProgressionItem: false,
    selectProgressionChord: () => {}, duplicateProgressionChord: () => {},
    removeProgressionChord: i => { removed.push(i); progression.splice(i, 1); },
    moveProgressionChord: () => {}, renderProgression: () => {},
  });
  context.globalThis = context;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'progression-interactions.js'), 'utf8'), context, { filename: 'progression-interactions.js' });
  return {
    removed, focused, progression, cards,
    press(key, target = cards[0], ctrlKey = false) {
      list.handlers.keydown({ key, ctrlKey, target, preventDefault() {}, stopImmediatePropagation() {} });
    },
  };
}

test('T-74 · Supr y Ctrl+Supr borran la tarjeta enfocada (misma acción)', () => {
  for (const ctrl of [false, true]) {
    const h = cardsHarness();
    h.press('Delete', h.cards[1], ctrl);
    assert.deepEqual(h.removed, [1], `Supr${ctrl ? ' con Ctrl' : ''} borra la tarjeta enfocada`);
  }
});

test('T-74 · Supr no borra con el candlock activo ni desde un control de escritura', () => {
  const conLock = cardsHarness({ lock: true });
  conLock.press('Delete');
  assert.deepEqual(conLock.removed, [], 'el candlock de escala protege la tarjeta');

  const h = cardsHarness();
  const boton = {
    tagName: 'BUTTON', closest(sel) { return sel.includes('progression-card') ? null : this; },
  };
  h.press('Delete', boton);
  assert.deepEqual(h.removed, [], 'un botón enfocado conserva su Supr nativo');
});
