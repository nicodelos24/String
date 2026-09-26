const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const {NotePreview,previewClipCurve}=require('../note-preview.js');

// Doble de AudioContext que registra la automatización de cada parámetro y a
// dónde se conecta cada nodo, para poder comprobar las rampas y el bus.
function audioContext({currentTime=0}={}){
  const parameter=(name)=>{
    const events=[];
    return {name,events,value:0,
      setValueAtTime(v,t){events.push(['set',name,v,t]);this.value=v;return this;},
      linearRampToValueAtTime(v,t){events.push(['linear',name,v,t]);this.value=v;return this;},
      exponentialRampToValueAtTime(v,t){events.push(['exp',name,v,t]);return this;},
      cancelScheduledValues(t){events.push(['cancel',name,t]);return this;},
      setTargetAtTime(v,t,c){events.push(['target',name,v,t,c]);this.value=v;return this;}};
  };
  const nodes=[];
  const wire=(node)=>{
    node.connectedTo=[];
    node.connect=target=>{node.connectedTo.push(target);return target;};
    node.disconnect=()=>{};
    nodes.push(node);
    return node;
  };
  const ctx={currentTime,
    resume:async()=>{},
    destination:wire({name:'destination'}),
    createGain(){return wire({name:'gain',gain:parameter('gain')});},
    createWaveShaper(){return wire({name:'clip',curve:null,oversample:'none'});},
    createOscillator(){return wire({name:'osc',frequency:{value:0},start(t){this.startTime=t;},stop(t){this.stopTime=t;}});}};
  ctx.nodes=nodes;
  ctx.oscillators=()=>nodes.filter(n=>n.startTime!==undefined);
  // La ganancia de la voz es la primera que recibe envolvente; la del bus se
  // crea sin automating.
  ctx.voiceGain=()=>nodes.find(n=>n.name==='gain'&&n.gain.events.length>0);
  return ctx;
}

test('muted and invalid preview volume never starts an audio context',async()=>{
  const preview=new NotePreview(()=>{throw new Error('Unexpected audio');});
  for(const volume of [0,-1,NaN,Infinity])await preview.play(60,volume);
});
test('string previews use harmonic voices and stop every partial when switching back to piano',async()=>{
  const ctx=audioContext();
  const preview=new NotePreview(()=>ctx);
  await preview.play(69,0.35,'guitar');
  let osc=ctx.oscillators();
  assert.equal(osc.length,6);assert(osc.every(o=>o.type==='sine' && o.frequency.value%440===0));
  await preview.play(45,0.35,'bass');
  osc=ctx.oscillators();
  assert(osc.slice(0,6).every(o=>o.stopTime===0.04),'la voz anterior se corta tras la caída');
  assert.equal(osc.length,14);assert.equal(osc.at(-1).frequency.value,110);
  await preview.play(69);
  osc=ctx.oscillators();
  assert(osc.slice(6,14).every(o=>o.stopTime===0.04));
  assert.equal(osc.at(-1).type,'triangle');assert.equal(osc.at(-1).frequency.value,440);
});
test('note preview uses exact MIDI pitch and releases the previous voice',async()=>{
  const ctx=audioContext();
  const preview=new NotePreview(()=>ctx);
  await preview.play(69);
  let osc=ctx.oscillators();
  assert.equal(osc[0].frequency.value,440);
  await preview.play(57);
  osc=ctx.oscillators();
  assert.equal(osc[0].stopTime,0.04);assert.equal(osc[1].frequency.value,220);
  await preview.play(-1);
  assert.equal(ctx.oscillators().length,2);
});
test('stop cancels a preview waiting for audio permission',async()=>{
  let resume;const ctx={resume:()=>new Promise(resolve=>resume=resolve),createOscillator(){throw new Error('Unexpected audio');}};
  const preview=new NotePreview(()=>ctx),pending=preview.play(60);preview.stop();resume();await pending;
});

test('la primera nota arranca con la ganancia a cero y las fuentes en el futuro',async()=>{
  const ctx=audioContext({currentTime:5});
  const preview=new NotePreview(()=>ctx);
  await preview.play(60,0.5,'piano');
  const voice=ctx.voiceGain();
  // El nodo se pone a cero en el acto, sin depender de la automatización: así no
  // hay ni un instante en el que suene a 1.0, que es el valor por defecto. Por
  // eso el pico no dependía del volumen.
  assert.equal(voice.gain.events[0][0],'set');
  assert.equal(voice.gain.events[0][2],0,'la envolvente arranca en cero');
  assert.equal(voice.gain.events[0][3],5.006,'y en el futuro, con el margen');
  const peak=Math.max(...voice.gain.events.filter(e=>e[0]==='linear').map(e=>e[2]));
  assert.equal(peak,0.5*0.32,'el pico de la envolvente es el nivel justo para el piano');
  const first=ctx.oscillators()[0];
  assert.equal(first.startTime,5.006,'la fuente tampoco arranca en el instante actual');
  assert.ok(first.startTime>ctx.currentTime);
});

test('la nota termina en cero exacto y el bus tiene techo',async()=>{
  const ctx=audioContext();
  const preview=new NotePreview(()=>ctx);
  await preview.play(60,0.5,'piano');
  const voice=ctx.voiceGain();
  assert.deepEqual(voice.gain.events.at(-1),['linear','gain',0,0.706],
    'la ganancia llega a 0 antes de cortar el oscilador');
  // El sonido sale por el bus con el techo suave, no directo al destino.
  const clip=ctx.nodes.find(n=>n.name==='clip');
  assert.ok(clip,'hay un techo suave en el bus');
  assert.equal(clip.curve.length,2048);
  assert.equal(clip.oversample,'none','sin sobremuestrear, que es lo transparente');
  assert.ok(clip.connectedTo.includes(ctx.destination),'el techo va al destino');
  assert.ok(!voice.connectedTo.includes(ctx.destination),'la voz ya no va directa al destino');
  assert.ok(voice.connectedTo.some(n=>n.name==='gain'),'la voz entra a la ganancia del bus');
});

test('el techo suave es transparente por debajo del tope y nunca pasa de 1',()=>{
  const curve=previewClipCurve();
  assert.equal(curve.length,2048);
  // Identidad exacta por debajo del techo: una nota normal no cambia.
  for(let i=0;i<curve.length;i++){
    const x=(i/(curve.length-1))*2-1;
    if(Math.abs(x)<=0.7)assert.ok(Math.abs(curve[i]-x)<1e-6,`transparente en ${x.toFixed(3)}`);
  }
  // Creciente y contenido: nunca hay picos por encima de 1.
  for(let i=1;i<curve.length;i++)assert.ok(curve[i]>=curve[i-1],'la curva no baja');
  assert.ok(Math.max(...curve)<=1,'nunca por encima de 1');
  assert.ok(Math.min(...curve)>=-1,'nunca por debajo de −1');
  // Y el techo de verdad: una señal a tope sale por debajo de 0 dBFS.
  assert.ok(curve.at(-1)<1,'la entrada máxima sale por debajo de 1');
  assert.equal(curve[curve.length-1],-curve[0],'la curva es simétrica');
});

test('liberar la voz anterior la baja a cero antes de cortar el oscilador',async()=>{
  const ctx=audioContext({currentTime:2});
  const preview=new NotePreview(()=>ctx);
  await preview.play(60,0.5,'piano');
  const first=ctx.oscillators()[0];
  const voice=ctx.voiceGain();
  preview.stop();
  const ramp=voice.gain.events.filter(e=>e[0]==='linear').at(-1);
  assert.deepEqual(ramp,['linear','gain',0,2.03],'cae a cero en 30 ms');
  assert.ok(Math.abs(first.stopTime-2.04)<1e-9,'el oscilador se corta después de la caída, no antes');
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
  },createWaveShaper:()=>({curve:null,oversample:'none',connect(){},disconnect(){}})};
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
