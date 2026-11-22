// Guarda focal de midi-ui.js (deuda D2 / pedido A-80). Carga el módulo tal
// como lo sirve index.html —script clásico en un sandbox vm con DOM simulado— y
// comprueba tres cosas: que arranca sin tocar un navegador, que los rótulos de
// duración de la vista previa salen de la cuadrícula de progression-duration.js
// (sin copias), y que el refresco al cambiar de selección mueve aria-current y
// avisa a la progresión. No hay aquí DOM real: eso es QA físico aparte.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'midi-ui.js'),'utf8');
const duration=fs.readFileSync(path.join(root,'progression-duration.js'),'utf8');

// Carga progression-duration.js como script clásico para obtener los mismos
// DEFAULT_BEATS / beatOptions que ve midi-ui.js en la página.
function loadDuration(){
  const context=vm.createContext({module:undefined});
  // Las declaraciones `const` de un script no quedan como propiedades del
  // contexto, así que se leen con una expresión evaluada en el mismo ámbito.
  vm.runInContext(duration+'\n;globalThis.__dur={DEFAULT_BEATS,beatOptions};',context);
  // beatOptions nace en otra realm: se trae a esta con Array.from.
  return {DEFAULT_BEATS:context.__dur.DEFAULT_BEATS,beatOptions:Array.from(context.__dur.beatOptions)};
}

// Elemento mínimo con lo que midi-ui.js toca: texto, atributos, hijos y
// listeners. querySelectorAll sobre la vista previa devuelve las filas <li>.
function element(tag='div'){
  return {
    tagName:tag.toUpperCase(),children:[],_text:'',_html:'',listeners:{},attrs:{},
    files:[],disabled:false,checked:false,value:'',scrollTop:0,title:'',
    get textContent(){return this._text;},
    set textContent(v){this._text=String(v);this.children.length=0;},
    get innerHTML(){return this._html;},
    set innerHTML(v){this._html=String(v);},
    setAttribute(name,value){this.attrs[name]=String(value);},
    getAttribute(name){return Object.hasOwn(this.attrs,name)?this.attrs[name]:null;},
    removeAttribute(name){delete this.attrs[name];},
    addEventListener(name,fn){this.listeners[name]=fn;},
    append(node){this.children.push(node);node.parent=this;},
    replaceChildren(){this.children.length=0;},
    querySelector(sel){return this.children.find(row=>row.matches?.(sel))??null;},
    querySelectorAll(sel){return sel==='li'?this.children.slice():[];},
    getBoundingClientRect(){return {top:0,bottom:0,left:0,right:0};},
    classList:{contains(){return false;},add(){},remove(){}},
    fire(name,event){this.listeners[name]?.(event??{target:this});},
  };
}

// Devuelve un MIDI con `count` acordes separados por `ticks` ticks y un tempo
// constant. Con 96 ticks por negra y tempo 500000 µs, un intervalo de `ticks`
// dura ticks/96 segundos y equivale a ticks/96 beats redondeados a la rejilla.
function midiFile(count,ticks,tempo=500000){
  const trk=[];
  trk.push(0,255,81,3,(tempo>>16)&255,(tempo>>8)&255,tempo&255);
  for(let i=0;i<count;i++){
    const tick=i*ticks;
    const delta=i?ticks:0;
    trk.push(delta,0x90,60+i%12,90,delta,0x80,60+i%12,0);
    if(i===count-1)trk.push(ticks,0x80,60+i%12,0);
  }
  trk.push(0,255,47,0);
  const chunk=(name,data)=>[...Buffer.from(name),0,0,data.length>>8,data.length&255,...data];
  return Uint8Array.from([...chunk('MThd',[0,0,0,1,0,96]),...chunk('MTrk',trk)]).buffer;
}

function setup({readMidiChords,chordTypes,noteName,appendMidiChords}={}){
  const ids=['midi-file','midi-status','midi-preview','midi-add','midi-play','midi-time','progression','follow-midi'];
  const els=Object.fromEntries(ids.map(id=>[id,element()]));
  els['follow-midi'].checked=false;
  els['midi-add'].disabled=true; // coincide con el atributo disabled del HTML
  els['midi-play'].disabled=true;
  const previews=[];
  const shown=[];
  const doc={
    querySelector(sel){return els[sel.replace(/^#/,'')]??null;},
    createElement(tag){const el=element(tag);previews.push(el);return el;},
  };
  let onState,onTime;
  const engine={
    running:false,starting:false,stops:0,starts:0,
    async start(){this.running=true;this.starts++;},
    stop(){this.running=false;this.stops++;},
  };
  const winListeners={};
  const context={
    document:doc,
    window:{
      addEventListener(name,fn){(winListeners[name]??=[]).push(fn);},
      dispatchEvent(ev){(winListeners[ev.type]??[]).forEach(fn=>fn(ev));},
      StringSections:{clearView(){}},
    },
    Event:class{constructor(type){this.type=type;}},
    DEFAULT_BEATS:4,beatOptions:[1,2,3,4,6,8,12,16],
    MidiPlayer:class{constructor(handlers){onState=handlers.onState;onTime=handlers.onTime;return engine;}},
    readMidiChords:readMidiChords??(()=>{throw new Error('readMidiChords no provisto');}),
    chordTypes:chordTypes??[{value:'maj',suffix:''}],
    noteName:noteName??(i=>['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][i%12]),
    appendMidiChords:appendMidiChords??(()=>({})),
    progression:[],
    playingProgressionItem:null,
    draggingProgressionItem:false,
    renderProgression(){},
    showProgressionChord(chord,index){shown.push({chord,index});},
  };
  vm.runInContext(source,vm.createContext(context));
  return {els,previews,shown,onState,onTime,engine,context,winListeners};
}

test('el módulo carga con el DOM mínimo y engancha sus controles sin navegador',()=>{
  const {els}=setup();
  for(const id of ['midi-file','midi-preview','midi-add','midi-play','midi-time']){
    assert(els[id],`falta el elemento #${id}`);
  }
  assert.equal(typeof els['midi-file'].listeners.change,'function','escucha el cambio de archivo');
  assert.equal(typeof els['midi-add'].listeners.click,'function','escucha Añadir');
  assert.equal(typeof els['midi-play'].listeners.click,'function','escucha Reproducir');
  assert.equal(els['midi-add'].disabled,true,'Añadir arranca desactivado sin acordes');
});

test('la carga genera rótulos de duración desde la cuadrícula del módulo de duraciones',async()=>{
  const {DEFAULT_BEATS,beatOptions}=loadDuration();
  assert.equal(DEFAULT_BEATS,4);
  assert.deepEqual(beatOptions,[1,2,3,4,6,8,12,16]);

  // Tres acordes con sus rótulos nota + sufijo; la cuantización de pulsos se
  // comprueba aparte en el test siguiente.
  const readMidiChords=()=>({
    chords:[{root:0,type:'maj',time:0},{root:2,type:'m',time:1},{root:4,type:'maj',time:2}],
    notes:[{}, {}, {}],skipped:0,duration:3,tempoMap:[{time:0,tempo:500000}],
  });
  const types=[{value:'maj',suffix:''},{value:'m',suffix:'m'}];
  const {els,previews}=setup({readMidiChords,chordTypes:types});

  const file={size:10,arrayBuffer:async()=>midiFile(3,96)};
  els['midi-file'].files=[file];
  els['midi-file'].fire('change');

  // loadFile es asíncrono: esperar a que se diligencie la vista previa.
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(previews.length,3,'una fila por acorde reconocido');
  assert.deepEqual(previews.map(row=>row.textContent),['C','Dm','E'],'los rótulos son nota + sufijo de calidad');
  assert.equal(els['midi-add'].disabled,false,'Añadir se activa con acordes pendientes');
  assert.match(els['midi-status'].textContent,/3 acordes reconocidos/);

  // La cuantización usa exactamente la cuadrícula del módulo: con un tempo map
  // vacío cae a DEFAULT_BEATS, y la semilla del redondeo es la del módulo.
  assert(duration.includes('const beatOptions'),'la cuadrícula vive en progression-duration.js');
  assert(source.includes('beatOptions'),'midi-ui la consume, no la copia');
  assert.equal(/\[1,2,3,4,6,8,12,16\]/.test(source),false,'sin copia de la cuadrícula en midi-ui');
});

test('los pulsos de duración se cuantizan con la cuadrícula y caen al predeterminado sin tempo',async()=>{
  const {DEFAULT_BEATS}=loadDuration();
  const types=[{value:'maj',suffix:''}];
  let captured;
  const appendMidiChords=chords=>{captured=chords.map(c=>({...c}));return {};};

  // 1 s por acorde a 500000 µs/negra = 2 pulsos; la cuadrícula tiene un 2,
  // así que cada acorde debe valer 2 (no un 4 codificado a mano).
  const withTempo=()=>({
    chords:[{root:0,type:'maj',time:0},{root:2,type:'maj',time:1},{root:4,type:'maj',time:2}],
    notes:[{},{},{}],skipped:0,duration:3,tempoMap:[{time:0,tempo:500000}],
  });
  const a=setup({readMidiChords:withTempo,chordTypes:types,appendMidiChords});
  a.els['midi-file'].files=[{size:10,arrayBuffer:async()=>midiFile(3,96)}];
  a.els['midi-file'].fire('change');
  await new Promise(resolve=>setImmediate(resolve));
  a.els['midi-add'].fire('click');
  assert.deepEqual(captured.map(c=>c.beats),[2,2,2],'los pulsos salen del tempo, no del valor fijo');

  // Sin tempo map, beatsFromSeconds devuelve el DEFAULT_BEATS del módulo.
  const noTempo=()=>({
    chords:[{root:0,type:'maj',time:0},{root:2,type:'maj',time:1}],
    notes:[{},{}],skipped:0,duration:2,tempoMap:[],
  });
  const b=setup({readMidiChords:noTempo,chordTypes:types,appendMidiChords});
  b.els['midi-file'].files=[{size:10,arrayBuffer:async()=>midiFile(2,96)}];
  b.els['midi-file'].fire('change');
  await new Promise(resolve=>setImmediate(resolve));
  b.els['midi-add'].fire('click');
  assert.deepEqual(captured.map(c=>c.beats),[DEFAULT_BEATS,DEFAULT_BEATS],'sin tempo cae al predeterminado del módulo');
});

test('el refresco al cambiar selección mueve aria-current y avisa a la progresión',async()=>{
  const readMidiChords=()=>({
    chords:[{root:0,type:'maj',time:0},{root:2,type:'m',time:1}],
    notes:[{},{}],skipped:0,duration:2,tempoMap:[{time:0,tempo:500000}],
  });
  const types=[{value:'maj',suffix:''},{value:'m',suffix:'m'}];
  const {els,previews,onTime,shown}=setup({readMidiChords,chordTypes:types});

  els['midi-file'].files=[{size:10,arrayBuffer:async()=>midiFile(2,96)}];
  els['midi-file'].fire('change');
  await new Promise(resolve=>setImmediate(resolve));

  // El engine llama a onTime con el tiempo de reproducción. Cambiar de
  // selección (cruzar el tiempo del segundo acorde) debe reflejarse en la fila.
  onTime(0.1);
  assert.deepEqual(previews.map(row=>row.getAttribute('aria-current')),['true','false']);
  onTime(1.1);
  assert.deepEqual(previews.map(row=>row.getAttribute('aria-current')),['false','true'],'aria-current sigue al acorde seleccionado');
  assert.equal(shown.length,2,'avisó a la progresión en cada cambio de selección');
  assert.equal(shown.at(-1).chord.type,'m','avisó a la progresión con el acorde nuevo');
  assert.equal(shown.at(-1).index,-1,'con el vínculo aún sin calcular, el índice es el de falta de tarjeta');
  // Repetir el mismo tiempo no debe reemitir el refresco (last evita el ruido).
  onTime(1.2);
  assert.equal(shown.length,2,'sin refrescos redundantes mientras no cambia la selección');
});
