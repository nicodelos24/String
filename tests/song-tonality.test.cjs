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
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../music-model.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../progression-duration.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../tonal-context.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../note-ink.js'),'utf8'),ctx);
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

// Devolución QA-TONAL-02 (2026-10-23): el contrato T-44 estaba cargado y sin
// usar. El modo que gobierna el mástil con tonalidad fijada lo decide el
// contrato; el modo guardado de la tarjeta queda intacto. Prueba roja primero:
// hoy el mástil dibuja Re eólico (escala de Fa: Si natural fuera de escala) y
// muestra «Eólico (vi)», donde debe dibujar el ii grado de Do (dórico).
test('corrección: Dm guardado como eólico en Do, el mástil se dibuja dórico (ii grado), no eólico',()=>{
  const {run,element,positions}=setup();
  run(`setSongTonality('C')`);
  // La ruta real del repro: seleccionar la tarjeta con su modo guardado.
  run(`showProgressionChord({root:2, rootNoteName:'D', type:'m', mode:'aeolian'}, 0)`);
  assert.equal(element('#mode-display').textContent,'Dórico (ii)',
    'con tonalidad fijada, el modo mostrado sale del contrato T-44, no del modo guardado');
  assert.equal(run('selectedMode'),'aeolian',
    'el modo explícito de la tarjeta no se pisa: queda para su guardado');
  // La escala dibujada es la de la tonalidad (Re dórico = notas de C): Si
  // natural pertenece a la escala y Bb queda fuera. Con el modo guardado
  // dibujado (Re eólico = escala de Fa) pasa al revés.
  for(const pos of positions(element('#fretboard'),11))
    assert(!pos.style.includes('background-color: transparent;'),`Si debería estar en la escala: ${pos.html}`);
  for(const pos of positions(element('#fretboard'),10))
    assert(pos.style.includes('background-color: transparent;'),`Bb es ajena a la escala de C: ${pos.html}`);
});

test('prestado con modo explícito: el modo mostrado sigue siendo el de la tarjeta (D mayor en Do no infiere)',()=>{
  const {run,runCard,element}=setup();
  run(`setSongTonality('C')`);
  runCard(2,'maj','lydian'); // Re MAYOR en Do: prestado → null → modo explícito
  assert.equal(element('#mode-display').textContent,'Lidio (IV)',
    'sin inferencia (null), el mástil conserva el modo explícito de la tarjeta');
});

test('cambiar la tonalidad de la canción reinfiere el modo del mástil',()=>{
  const {run,element,positions}=setup();
  run(`setSongTonality('C')`);
  run(`showProgressionChord({root:2, rootNoteName:'D', type:'m', mode:'aeolian'}, 0)`);
  assert.equal(element('#mode-display').textContent,'Dórico (ii)');
  // La misma tarjeta diatónica también en Bb mayor: Dm pasa a ser el iii → frigio.
  // (En G, en cambio, el Fa natural de Dm es prestado: ahí el contrato da null
  // y queda eólico, que es la regresión de «prestado conserva el modo».)
  run(`setSongTonality('Bb')`);
  assert.equal(element('#mode-display').textContent,'Frigio (iii)',
    'Re menor en Bb es el iii grado: el modo mostrado es frigio');
  // La escala dibujada se mueve con la tonalidad: Bb entra (escala de Bb) y Fa# queda fuera.
  for(const pos of positions(element('#fretboard'),10))
    assert(!pos.style.includes('background-color: transparent;'),`Bb está en la escala de Bb mayor: ${pos.html}`);
  for(const pos of positions(element('#fretboard'),6))
    assert(pos.style.includes('background-color: transparent;'),`Fa# no está en la escala de Bb mayor: ${pos.html}`);
});

test('sin tonalidad fija, el modo mostrado y la escala siguen la tarjeta de siempre (regresión)',()=>{
  const {run,element,positions}=setup();
  run(`showProgressionChord({root:2, rootNoteName:'D', type:'m', mode:'aeolian'}, 0)`);
  assert.equal(element('#mode-display').textContent,'Eólico (vi)',
    'sin tonalidad, la tarjeta manda como siempre');
  for(const pos of positions(element('#fretboard'),10))
    assert(!pos.style.includes('background-color: transparent;'),`Bb pertenece a la escala de Re eólico: ${pos.html}`);
  for(const pos of positions(element('#fretboard'),11))
    assert(pos.style.includes('background-color: transparent;'),`Si natural no está en la escala de Re eólico: ${pos.html}`);
});
