// Firefox: al recargar o cerrar la pestaña después de tocar una nota, la consola
// mostraba «InvalidStateError: Navigated away from page». El chequeo del 23-nov
// lo reprodujo, y la medición del 23-nov encontró la causa: cuando la página ya
// se está yendo, `AudioContext.close()` NO lanza sincrónico —devuelve una
// promesa que RECHAZA—, así que un try/catch no la agarra y el rechazo queda sin
// dueño: la consola lo muestra en cada recarga.
//
// Estas pruebas montan los dos módulos en un sandbox con un AudioContext que,
// como el de Firefox, rechaza el cierre si la página ya se fue, y comprueban que
// el `pagehide` atiende ese rechazo (no ensucia la consola) sin dejar de cerrar
// el audio cuando el cierre sí es posible.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

// El AudioContext falso. `navigatedAway` finge el estado de la página: en cuanto
// empieza a irse, cerrar el contexto falla con el error exacto de Firefox.
//  · rechazo (por defecto): es lo medido en Firefox 158 —`close()` devuelve una
//    promesa rechazada—. El objeto devuelto es un thenable que anota si alguien
//    atendió el rechazo (`rechazoAtendido`): así la prueba ve si quedó sin dueño
//    sin depender de cuándo el runner mira los rechazos sueltos.
//  · lanzando: reproduce a los navegadores que sí tiran en el acto; el guard
//    tiene que cubrir también ese caso.
function firefoxAudioContext({ navigatedAway = false, lanzando = false } = {}) {
  const parameter = () => ({
    value: 1,
    setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {},
    setTargetAtTime() {}, cancelScheduledValues() {},
  });
  return {
    navigatedAway,
    lanzando,
    rechazoAtendido: null,   // null: no se intentó cerrar; false: quedó sin dueño
    currentTime: 0,
    sampleRate: 44100,
    state: 'running',
    destination: {},
    resume: async () => {},
    close() {
      if (this.navigatedAway) {
        const error = new Error('Navigated away from page');
        error.name = 'InvalidStateError';
        if (this.lanzando) throw error;
        const self = this;
        self.rechazoAtendido = false;
        return {
          then(onRejected) { self.rechazoAtendido = true; return Promise.resolve(onRejected ? onRejected(error) : undefined); },
          catch(onRejected) { self.rechazoAtendido = true; return Promise.resolve(onRejected ? onRejected(error) : undefined); },
        };
      }
      this.state = 'closed';
      return Promise.resolve();
    },
    createGain: () => ({ gain: parameter(), connect() {}, disconnect() {} }),
    createWaveShaper: () => ({ curve: null, oversample: 'none', connect() {}, disconnect() {} }),
    createOscillator: () => ({
      type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {}, disconnect() {},
    }),
    createBuffer: (channels, samples) => ({ getChannelData: () => new Float32Array(samples) }),
    createBufferSource: () => ({ connect() {}, start() {}, stop() {}, disconnect() {} }),
  };
}

// Sandbox mínimo para note-preview.js. El módulo guarda su NotePreview dentro
// del IIFE, así que se captura el clic delegado: es el único camino que abre el
// contexto, como cuando se toca una nota del mástil.
function notePreviewHarness(ctx) {
  const winListeners = {};
  const documentListeners = {};
  const context = vm.createContext({
    window: {
      AudioContext: function () { return ctx; },
      addEventListener(name, fn) { (winListeners[name] = winListeners[name] || []).push(fn); },
    },
    document: {
      addEventListener(name, fn) { (documentListeners[name] = documentListeners[name] || []).push(fn); },
      querySelector() { return { value: '50' }; },
    },
    instrument: 'piano',
    console,
    Promise,
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'note-preview.js'), 'utf8'), context);
  return {
    // Toca una tecla del piano raíz: abre el contexto y programa la voz.
    touchKey() {
      const key = { dataset: { pitch: '0' }, closest: selector => (selector === '[data-pitch]' ? key : null) };
      const event = { target: key };
      (documentListeners.click || []).forEach(fn => fn(event));
    },
    pagehide() { (winListeners.pagehide || []).forEach(fn => fn()); },
  };
}

test('Firefox · pagehide de note-preview atiende el rechazo del cierre: la consola queda limpia al recargar', () => {
  const ctx = firefoxAudioContext({ navigatedAway: true });
  const h = notePreviewHarness(ctx);
  h.touchKey();
  assert.equal(ctx.state, 'running', 'el contexto se abrió al tocar la nota');
  assert.doesNotThrow(() => h.pagehide(), 'recargar no debe tirar InvalidStateError desde pagehide');
  // El rechazo de la promesa es el defecto: si nadie lo atiende, la consola lo
  // muestra. `rechazoAtendido` lo distingue de un cierre que nunca se intentó.
  assert.equal(ctx.rechazoAtendido, true,
    'el rechazo de close() tiene que quedar atendido: si no, Firefox lo muestra en la consola');
  assert.equal(ctx.state, 'running', 'la página ya iba a soltar el audio: no se cierra a mano');
});

test('Firefox · pagehide de note-preview cierra el contexto cuando todavía se puede', () => {
  const ctx = firefoxAudioContext({ navigatedAway: false });
  const h = notePreviewHarness(ctx);
  h.touchKey();
  assert.doesNotThrow(() => h.pagehide());
  assert.equal(ctx.state, 'closed', 'el cierre real sigue ocurriendo donde no estorba');
});

test('Firefox · pagehide de note-preview cubre al navegador que lanza en el acto', () => {
  const ctx = firefoxAudioContext({ navigatedAway: true, lanzando: true });
  const h = notePreviewHarness(ctx);
  h.touchKey();
  assert.doesNotThrow(() => h.pagehide(), 'un cierre que lanza tampoco debe escapar del pagehide');
});

// keyboard-section.js registra el pagehide sin exportarlo: un `pagehide` que
// explote se ve como un error suelto en la consola de cada recarga. El sandbox
// levanta el módulo entero con un DOM falso, el mismo molde de
// tests/keyboard-section.test.cjs.
function keyboardPagehideHarness(ctx) {
  const winListeners = {};
  const element = () => ({
    hidden: false, textContent: '', value: '', checked: false, disabled: false,
    dataset: {}, children: [], style: { setProperty() {} }, _attrs: {},
    innerHTML: '',
    addEventListener() {}, click() {},
    getAttribute(name) { return Object.hasOwn(this._attrs, name) ? this._attrs[name] : null; },
    setAttribute(name, value) { this._attrs[name] = String(value); },
    querySelector() { return null; }, querySelectorAll() { return []; },
  });
  const context = vm.createContext({
    window: {
      AudioContext: function () { return ctx; },
      addEventListener(name, fn) { (winListeners[name] = winListeners[name] || []).push(fn); },
      dispatchEvent() {},
    },
    document: {
      getElementById: () => element(),
      addEventListener() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
    },
    MutationObserver: class { observe() {} },
    Event: class { constructor(type) { this.type = type; } },
    progression: [],
    instrument: 'piano',
    notes: ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'],
    noteName: pitch => 'nota-' + pitch,
    console,
    Promise,
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'keyboard-section.js'), 'utf8'), context);
  return {
    context,
    // El sintetizador vive dentro del IIFE del módulo, que lo crea sin contexto:
    // su `close()` normal no llega a cerrar nada. Se le pone el contexto falso
    // justo antes de cerrar, sin tocar el close() de producción, que es lo que
    // se quiere ejercitar (allOff + atención del rechazo). El camino que abriría
    // el contexto de verdad es un keydown sobre el panel entero: imposible de
    // armar acá sin inventar medio DOM, y no aporta a esta prueba.
    conContextoFalso() {
      vm.runInContext(`
        const cierreReal = KeySynth.prototype.close;
        KeySynth.prototype.close = function () {
          this.context = window.AudioContext();
          this.voices = new Map();
          return cierreReal.call(this);
        };
      `, context);
    },
    pagehide() { (winListeners.pagehide || []).forEach(fn => fn()); },
  };
}

test('Firefox · pagehide de keyboard-section atiende el rechazo del cierre: la consola queda limpia', () => {
  const ctx = firefoxAudioContext({ navigatedAway: true });
  const h = keyboardPagehideHarness(ctx);
  h.conContextoFalso();
  assert.doesNotThrow(() => h.pagehide(), 'recargar no debe tirar InvalidStateError desde pagehide');
  assert.equal(ctx.rechazoAtendido, true,
    'el rechazo de close() tiene que quedar atendido: si no, Firefox lo muestra en la consola');
});

test('Firefox · pagehide de keyboard-section no escapa aunque el cierre lance', () => {
  const ctx = firefoxAudioContext({ navigatedAway: true, lanzando: true });
  const h = keyboardPagehideHarness(ctx);
  h.conContextoFalso();
  assert.doesNotThrow(() => h.pagehide(), 'recargar no debe tirar InvalidStateError desde pagehide');
});

test('Firefox · pagehide de keyboard-section sigue cerrando el audio cuando se puede', () => {
  const ctx = firefoxAudioContext({ navigatedAway: false });
  const h = keyboardPagehideHarness(ctx);
  h.conContextoFalso();
  assert.doesNotThrow(() => h.pagehide());
  assert.equal(ctx.state, 'closed',
    'el guard no se come el cierre normal: el pagehide cierra el audio igual que antes');
});
