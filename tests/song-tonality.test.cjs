// T-45 · QA-TONAL-02: integrar el contrato T-44 en la página.
// Prueba roja primero: los casos nacen sin contrato en la página (setSongTonality
// no existe), luego el arreglo. El default (sin tonalidad fija) es hoy: va como
// regresión nacida verde.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup() {
  const elements = new Map();
  function element(key) {
    if (!elements.has(key)) elements.set(key, {
      options: [], selectedIndex: 0, handlers: {}, style: {setProperty() {}},
      set innerHTML(html) {
        this.html = html;
        this.options = [...html.matchAll(/<option value="([^"]*)"(?: data-note="([^"]*)")?/g)].map(m => ({value:m[1], dataset:{note:m[2]}}));
      },
      get innerHTML() { return this.html || ''; },
      set value(value) { this.currentValue = String(value); const i = this.options.findIndex(o => o.value === String(value)); if (i >= 0) this.selectedIndex = i; },
      get value() { return this.currentValue; },
      addEventListener(name, fn) { this.handlers[name] = fn; },
      querySelectorAll() { return []; },
      querySelector(selector) { return element(key + selector); },
      attrs: {},
      setAttribute(name, value) { this.attrs[name] = String(value); },
      dispatchEvent(event) { if (this.handlers[event.type]) this.handlers[event.type]({target: this}); return true; },
    });
    return elements.get(key);
  }
  class FakeEvent { constructor(type, init) { this.type = type; Object.assign(this, init); } }
  // `window` como en la página: el else del módulo deja el atajo; y el const
  // top-level comparte el léxico global del contexto, igual que en el navegador,
  // así que app.js ve `TonalContext` sin puente extra.
  const windowStub = {};
  const ctx = vm.createContext({document:{querySelector:element,querySelectorAll:()=>[]},Event:FakeEvent,window:windowStub});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../progression-duration.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../tonal-context.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),ctx);
  const run = code => vm.runInContext(code,ctx);
  const change = (key,value) => element(key).handlers.change({target:{value}});
  // Posiciones del mástil por clase de paso: [{midi, style, html}].
  const positions = (el, pc) =>
    [...el.innerHTML.matchAll(/data-midi="(\d+)"[^>]*style="([^"]*)"[^>]*/g)]
      .map(m => ({midi: Number(m[1]), style: m[2], html: m[0]}))
      .filter(pos => pos.midi % 12 === pc);
  const runCard = (root, type, mode='ionian') => run(
    `root=${root};chordType=chordTypes.find(t=>t.value==='${type}');` +
    `quality=${type==='maj'?"'major'":type==='m'?"'minor'":"'major'"};` +
    `selectedMode='${mode}';displayModeIndex=1;updateView()`);
  return {run,change,element,positions,runCard,
    setSong:(key)=>run(`songTonality=tonalities.find(t=>t.key===${JSON.stringify(key)})`||'null')};
}

test('con tonalidad fija, colores y grados salen de la tonalidad y no cambian al cambiar de tarjeta',()=>{
  const {run,runCard,element,positions}=setup();
  run("setSongTonality('C')");
  runCard(7,'maj','mixolydian'); // tarjeta Sol mayor
  const sol=positions(element('#fretboard'),2); // Nota Re
  assert(sol.length>0,'la nota Re aparece en el mástil');
  for(const pos of sol){
    assert(pos.style.includes('#00BCD4'),`Re (grado ii de la tonalidad) lleva el color 2ª mayor, no el de la tarjeta: ${pos.html}`);
    assert.match(pos.html,/data-interval="2ª mayor \/ 9ª mayor"/);
  }
  runCard(2,'m','dorian'); // tarjeta Re menor
  for(const pos of positions(element('#fretboard'),2)){
    assert(pos.style.includes('#00BCD4'),'cambiar de tarjeta no mueve el color de Re');
    assert.match(pos.html,/data-interval="2ª mayor \/ 9ª mayor"/);
  }
  // Y el intervalo del acorde sigue midiendo posiciones desde la raíz de la tarjeta:
  // el subdominante F de la tonalidad sigue colored al ser 3ª menor del acorde Re menor.
  for(const pos of positions(element('#fretboard'),5)){
    assert(pos.style.includes('#00897B'),'F (ii del acorde, IV de la tonalidad) sigue resaltado con el color de 4ª');
    assert.match(pos.html,/data-interval="4ª justa \/ 11ª"/,'el grado reasignado: 4ª de la tonalidad, no 3ª menor del acorde');
  }
});

test('sin tonalidad fija, el color sale de la tarjeta tal como siempre (regresión)',()=>{
  const {runCard,element,positions}=setup();
  runCard(2,'maj');
  for(const pos of positions(element('#fretboard'),2)){
    assert(pos.style.includes('#E53935'),'sin tonalidad fija, Re de una tarjeta Re es Raíz');
    assert.match(pos.html,/data-interval="Raíz"/);
  }
});

test('diatónico: la escala dibujada es la de la tonalidad (el modo inferido es el mismo)',()=>{
  const {run,runCard,element,positions}=setup();
  run("setSongTonality('C')");
  runCard(2,'m','dorian'); // Re menor: II de Do, dórico → la escala de Do
  for(const pos of positions(element('#fretboard'),6)){ // Fa♯ no pertenece a Do
    assert(pos.style.includes('background-color: transparent;'),'Fa♯ queda fuera de la escala de la tonalidad');
  }
  for(const pos of positions(element('#fretboard'),5)){ // Fa natural sí
    assert(!pos.style.includes('background-color: transparent;'),'Fa está en la escala de la tonalidad');
  }
});

test('prestado: la tarjeta conserva su modo explícito, sin conversión silenciosa',()=>{
  const {run,runCard,element,positions}=setup();
  run("setSongTonality('C')");
  runCard(2,'maj'); // Re MAYOR en Do: prestado (QA-TONAL-01, null)
  const fis=positions(element('#fretboard'),6); // Fa♯, propia de su modo
  assert(fis.length>0);
  for(const pos of fis){
    assert(!pos.style.includes('background-color: transparent;'),'sin transparencia: la nota del modo prestado se distingue, no desaparece');
    assert(pos.style.includes('#C9A227'),'con tonalidad fija, Fa♯ lleva el color de su grado en la tonalidad (♭5)');
  }
});

test('con tonalidad fija, la armadura mostrada no cambia al cambiar de tarjeta',()=>{
  const {run,runCard,element}=setup();
  run("setSongTonality('G')");
  runCard(9,'m','aeolian'); // tarjeta La menor: armadura de tarjeta sería 3 sostenidos
  assert.equal(element('#key-signature-display').textContent,'G Mayor · 1 sostenidos');
  runCard(2,'maj'); // tarjeta Re mayor: 2 sostenidos si recalcula
  assert.equal(element('#key-signature-display').textContent,'G Mayor · 1 sostenidos','la tonalidad de canción queda estable al cambiar de tarjeta');
});

test('tonalidad fija en una tonalidad con bemoles: los grados mantienen su tabla',()=>{
  const {run,runCard,element,positions}=setup();
  run("setSongTonality('Bb')");
  runCard(7,'maj');
  const fb=positions(element('#fretboard'),2); // Re sobre Do bem: 3ª mayor de la tonalidad
  for(const pos of fb){
    assert.match(pos.html,/data-interval="3ª mayor"/);
    assert(pos.style.includes('#4CAF50'));
  }
});
