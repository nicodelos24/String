const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const {NotePreview}=require('../note-preview.js');
test('muted and invalid preview volume never starts an audio context',async()=>{
  const preview=new NotePreview(()=>{throw new Error('Unexpected audio');});
  for(const volume of [0,-1,NaN,Infinity])await preview.play(60,volume);
});
test('string previews use harmonic voices and stop every partial when switching back to piano',async()=>{
  const oscillators=[];
  const parameter=()=>({setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}});
  const ctx={currentTime:0,resume:async()=>{},createGain:()=>({gain:parameter(),connect(){},disconnect(){}}),createOscillator:()=>{
    const osc={frequency:{},connect(){},disconnect(){},start(){},stop(time){this.stopTime=time;}};oscillators.push(osc);return osc;
  }};
  const preview=new NotePreview(()=>ctx);
  await preview.play(69,0.35,'guitar');
  assert.equal(oscillators.length,6);assert(oscillators.every(o=>o.type==='sine' && o.frequency.value%440===0));
  await preview.play(45,0.35,'bass');
  assert(oscillators.slice(0,6).every(o=>o.stopTime===0.04));
  assert.equal(oscillators.length,14);assert.equal(oscillators.at(-1).frequency.value,110);
  await preview.play(69);
  assert(oscillators.slice(6,14).every(o=>o.stopTime===0.04));
  assert.equal(oscillators.at(-1).type,'triangle');assert.equal(oscillators.at(-1).frequency.value,440);
});
test('note preview uses exact MIDI pitch and releases the previous voice',async()=>{
  const oscillators=[];
  const parameter={setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}};
  const ctx={currentTime:0,resume:async()=>{},createGain:()=>({gain:parameter,connect(){},disconnect(){}}),createOscillator:()=>{
    const osc={frequency:{},connect(){},disconnect(){},start(){},stop(time){this.stopTime=time;}};oscillators.push(osc);return osc;
  }};
  const preview=new NotePreview(()=>ctx);await preview.play(69);assert.equal(oscillators[0].frequency.value,440);
  await preview.play(57);assert.equal(oscillators[0].stopTime,0.04);assert.equal(oscillators[1].frequency.value,220);
  await preview.play(-1);assert.equal(oscillators.length,2);
});
test('stop cancels a preview waiting for audio permission',async()=>{
  let resume;const ctx={resume:()=>new Promise(resolve=>resume=resolve),createOscillator(){throw new Error('Unexpected audio');}};
  const preview=new NotePreview(()=>ctx),pending=preview.play(60);preview.stop();resume();await pending;
});

// El delegado global de clic solo debe atender al piano raíz y al mástil, y lo
// hace por selectores del propio elemento. Se corre el archivo con un DOM
// simulado para ver a quién hace sonar y con qué timbre.

// Una cadena de contenedores. `closest()` acepta una lista de selectores y el
// candidato tiene que encajar con el final de la cadena, como en el navegador:
// un selector con jerarquía (`#root-piano .piano-key`) deja de coincidir en
// cuanto el nodo se desconecta del documento, uno simple (`.piano-key`) no.
const tokenMatches=(el,token)=>{
  if(token[0]==='#')return el.ids.indexOf(token.slice(1))>=0;
  if(token[0]==='.')return el.classes.indexOf(token.slice(1))>=0;
  if(token[0]==='[')return el.attrs.indexOf(token.slice(1,-1))>=0;
  return el.tags.indexOf(token)>=0;
};
const matchesChain=(chain,candidate)=>candidate.split(', ').some(part=>{
  const tokens=part.split(' '),start=chain.length-tokens.length;
  return start>=0&&tokens.every((token,index)=>tokenMatches(chain[start+index],token));
});
const node=(ids=[],classes=[],attrs=[])=>({ids,classes,attrs,tags:[],dataset:{},
  closest(candidate){return matchesChain([this],candidate)?this:null;}});
// Las cadenas reales de la página, del contenedor más externo al nodo que se pulsa.
const pianoKey=()=>[node(['root-piano']),node([],['piano-key'],['data-pitch'])];
const fretNote=()=>[node(['fretboard']),node([],['fretboard-layout']),node([],['fret']),
  node([],['fret-note'],['data-midi'])];
const openString=()=>[node(['open-strings']),node([],['open-string-row']),
  node([],['open-string-note'],['data-midi'])];
const keyboardKey=()=>[node(['keyboard-section']),node(['keyboard-keys']),
  node([],['kp-key'],['data-midi'])];

function delegate(instrument='guitar'){
  const started=[];
  const parameter={setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}};
  const ctx={currentTime:0,resume:async()=>{},createGain:()=>({gain:parameter,connect(){},disconnect(){}}),createOscillator:()=>{
    const osc={frequency:{value:0},connect(){},disconnect(){},start(){},stop(){}};
    started.push(osc);return osc;
  }};
  let handler;
  const documentStub={
    addEventListener(name,fn){if(name==='click')handler=fn;},
    querySelector(selector){return selector==='#player-volume'?{value:'35'}:null;},
  };
  const ctxVm=vm.createContext({document:documentStub,
    // `NotePreview` crea el AudioContext desde `window`, como en el navegador.
    window:{addEventListener(){},AudioContext:function(){return ctx;}},
    instrument,console,setTimeout,clearTimeout,Event:class{constructor(t){this.type=t;}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../note-preview.js'),'utf8'),ctxVm);
  // Pulsa el último nodo de la cadena. `detached:true` lo deja solo, sin
  // ancestros, como cuando la página repinta el piano durante la propagación.
  // `play` espera al permiso de audio antes de crear las voces: se deja un turno.
  const click=async (chain,dataset,detached=false)=>{
    const target=chain[chain.length-1];
    target.dataset=dataset;
    const path=detached?[target]:chain;
    target.closest=candidate=>matchesChain(path,candidate)?target:null;
    handler({target});
    await new Promise(resolve=>setTimeout(resolve,0));
  };
  return {click,started};
}

test('tocar una tecla del piano expandible no añade una segunda nota',async()=>{
  const {click,started}=delegate('guitar');
  await click(keyboardKey(),{midi:'64'});
  assert.equal(started.length,0,'El piano expandible ya suena con el sintetizador');
});

test('el mástil y el piano raíz siguen sonando con esta voz breve',async()=>{
  const {click,started}=delegate('guitar');
  // Las voces se crean del armónico más alto al fundamental, así que el
  // fundamental de cada acorde es el último oscilador de la voz.
  await click(fretNote(),{midi:'64'});
  assert.equal(started.length,6,'El mástil suena con las seis voces de la guitarra');
  assert.equal(started.at(-1).type,'sine','La guitarra usa cuerda pulsada');
  assert.equal(Math.round(started.at(-1).frequency.value*100)/100,329.63,'E4 en la guitarra');
  await click(openString(),{midi:'45'});
  assert.equal(Math.round(started.at(-1).frequency.value*100)/100,110,
    'La cuerda al aire suena en su octava real');
  await click(pianoKey(),{pitch:'7'});
  assert.equal(started.length,13);
  assert.equal(started.at(-1).type,'triangle','El piano raíz suena con la voz suave');
  assert.equal(Math.round(started.at(-1).frequency.value*100)/100,392,
    'El piano raíz arranca en Do4, no en el La3 del que salen las teclas del mástil');
});

test('el piano raíz sigue sonando aunque la página lo repinte durante el clic',async()=>{
  // `app.js` vuelve a pintar el piano raíz al pulsar una tecla, así que cuando el
  // delegado global mira el nodo, este ya está desconectado. Con un selector como
  // `#root-piano [data-pitch]` el piano raíz se quedaría mudo.
  const {click,started}=delegate('guitar');
  await click(pianoKey(),{pitch:'7'},true);
  assert.equal(started.length,1,'El piano raíz suena aunque el nodo esté desconectado');
  assert.equal(started.at(-1).type,'triangle');
});

test('el mástil sigue sonando aunque lo repinten durante el clic',async()=>{
  const {click,started}=delegate('guitar');
  await click(fretNote(),{midi:'64'},true);
  assert.equal(started.length,6,'El mástil suena aunque el nodo esté desconectado');
});

test('con bajo, el piano raíz arranca en su octava grave',async()=>{
  const {click,started}=delegate('bass');
  await click(pianoKey(),{pitch:'0'});
  assert.equal(Math.round(started[0].frequency.value*100)/100,65.41,'Do2 a 65.4 Hz');
});
