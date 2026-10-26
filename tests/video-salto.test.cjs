// T-09 · Saltar al video desde la tarjeta o la sección.
//
// La ficha del 20-10 acota el pedido al SALTO: las marcas de tiempo, la
// generación por BPM y el seguimiento ya existen. Esta prueba nace roja sobre
// `c0815fd` y fija el contrato completo del salto:
//   1. una sola autoridad elige la marca de una tarjeta (`markTimeFor`),
//   2. el minuto se escribe `m:ss` (el rótulo del chip),
//   3. la tarjeta marcada pinta su minuto y la que no tiene marca no pinta nada,
//   4. la fila de la sección salta a su PRIMER acorde marcado y se refresca
//      cuando cambian las marcas,
//   5. el reproductor ejecuta el `seekTo` y, sin video, lo dice en vez de callar.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

// ---------------------------------------------------------------- módulo puro

test('la marca de una tarjeta es la primera que la nombra, o null si no tiene',()=>{
  const {markTimeFor,formatVideoTime}=require('../video-sync.js');
  const la={root:0},sol={root:7};
  const marks=[{time:12.5,source:sol},{time:3,source:la},{time:40,source:sol}];
  assert.equal(markTimeFor(marks,la),3,'con la tarjeta repetida en el tiempo manda la primera aparición');
  assert.equal(markTimeFor(marks,sol),12.5,'la marca es la del acorde, no la del último tiempo');
  assert.equal(markTimeFor(marks,{root:5}),null,'un acorde sin marca no tiene destino de salto');
  assert.equal(markTimeFor([],la),null);
  assert.equal(formatVideoTime(0),'0:00');
  assert.equal(formatVideoTime(83.6),'1:23','el segundo se trunca, no se redondea hacia arriba');
  assert.equal(formatVideoTime(600),'10:00');
});

// ------------------------------------------------------------------- tarjetas

// Mini-DOM de tests/progression.test.cjs: lo mínimo que consume app.js al
// pintar las tarjetas. `#progression` guarda el HTML y el resto son cajas.
function setupApp(){
  const elements=new Map();
  function element(key){
    if(!elements.has(key))elements.set(key,{
      options:[],selectedIndex:0,handlers:{},style:{setProperty(){}},
      set innerHTML(html){this.html=html;},
      get innerHTML(){return this.html||'';},
      set value(value){this.currentValue=String(value);},
      get value(){return this.currentValue;},
      addEventListener(name,fn){this.handlers[name]=fn;},
      querySelectorAll(){return[];},
      querySelector(selector){return element(key+selector);},
      attrs:{},
      setAttribute(name,value){this.attrs[name]=String(value);},
      dispatchEvent(event){if(this.handlers[event.type])this.handlers[event.type]({target:this});return true;},
    });
    return elements.get(key);
  }
  class FakeEvent{constructor(type,init){this.type=type;Object.assign(this,init);}}
  const ctx=vm.createContext({document:{querySelector:element,querySelectorAll:()=>[]},Event:FakeEvent});
  for(const file of ['music-model.js','progression-duration.js','tonal-context.js','note-ink.js','app-state.js','fretboard-render.js','app.js']){
    vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx);
  }
  return {run:code=>vm.runInContext(code,ctx),element};
}

test('la tarjeta con marca muestra su minuto y la que no tiene marca no pinta el botón',()=>{
  const t=setupApp();
  t.run("progression=[{root:0,type:'maj',beats:4},{root:5,type:'maj',beats:4}];activeProgression=-1");
  t.run("globalThis.StringVideoSync={labelFor:index=>index===1?'1:23':null,jump:()=>{}}");
  t.run('renderProgression()');
  const html=t.element('#progression').innerHTML;
  const chips=[...html.matchAll(/<button[^>]*class="video-jump"[^>]*>([^<]*)<\/button>/g)];
  assert.equal(chips.length,1,'solo la tarjeta marcada tiene botón de salto');
  assert.equal(chips[0][1],'1:23','el botón dice el minuto al que salta');
  assert.match(html,/class="video-jump" data-video-jump="1"/,'el chip apunta al índice de su tarjeta');
  assert.match(html,/aria-label="Salta el video a 1:23 \(acorde 2\)"/,'el nombre accesible dice a dónde salta');
  const cards=html.split('class="progression-card').slice(1);
  assert.doesNotMatch(cards[0],/video-jump/,'la tarjeta sin marca no ofrece un destino que no existe');
});

test('sin video sincronizado ninguna tarjeta pinta el chip',()=>{
  const t=setupApp();
  t.run("progression=[{root:0,type:'maj',beats:4}];activeProgression=-1;delete globalThis.StringVideoSync");
  t.run('renderProgression()');
  assert.doesNotMatch(t.element('#progression').innerHTML,/video-jump/);
});

// ------------------------------------------------------------------- secciones

// Mini-DOM de tests/sections-composer.test.cjs, con `window` que despacha los
// eventos que usa video-sync para avisar que cambiaron las marcas.
function setupSections(){
  const root=[];
  function make(tag){
    const el={tag,dataset:{},attrs:{},handlers:{},onclick:null,disabled:false,open:false,type:'',value:'',textContent:'',className:''};
    el.children=[];
    el.append=(...kids)=>{kids.forEach(k=>{if(!k)return;el.children.push(k);k.parent=el;});};
    el.replaceChildren=(...kids)=>{el.children=[];el.append(...kids);};
    el.querySelectorAll=()=>[];
    el.closest=selector=>{
      let node=el;
      while(node){
        const cls=(node.attrs.class||'').split(' ').filter(Boolean);
        if((selector.startsWith('.')&&cls.includes(selector.slice(1)))||(selector==='[data-section]'&&node.dataset.section!==undefined))return node;
        node=node.parent;
      }
      return null;
    };
    el.setAttribute=(name,value)=>{if(name==='class')el.className=String(value);else el.attrs[name]=String(value);};
    el.removeAttribute=name=>{delete el.attrs[name];};
    el.addEventListener=(name,fn)=>{(el.handlers[name]=el.handlers[name]||[]).push(fn);};
    el.setPointerCapture=()=>{};el.hasPointerCapture=()=>false;el.releasePointerCapture=()=>{};
    el.classList={
      add(c){el.className=[...new Set(el.className.split(' ').filter(Boolean).concat([c]))].join(' ');},
      remove(c){el.className=el.className.split(' ').filter(x=>x!==c).join(' ');},
      toggle(c,on){const has=el.className.split(' ').includes(c);const value=on===undefined?!has:Boolean(on);
        if(value&&!has)el.classList.add(c);if(!value&&has)el.classList.remove(c);return value;},
      contains(c){return el.className.split(' ').includes(c);},
    };
    return el;
  }
  const byId=new Map();
  const id=key=>{if(!byId.has(key))byId.set(key,make(key));return byId.get(key);};
  const progression=[
    {root:0,type:'maj',mode:'ionian',ghostMode:''},
    {root:2,type:'min',mode:'dorian',ghostMode:''},
    {root:4,type:'maj',mode:'ionian',ghostMode:''},
    {root:5,type:'maj',mode:'ionian',ghostMode:''},
  ];
  const jumps=[];
  const window={handlers:{},addEventListener(n,f){this.handlers[n]=f;},dispatchEvent(){},StringSections:null};
  const ctx=vm.createContext({
    document:{querySelector:selector=>id(selector),getElementById:id,createElement:tag=>make(tag),addEventListener(){}},
    matchMedia:()=>({matches:true}),
    Event:class Event{constructor(type){this.type=type;}},
    MutationObserver:class MutationObserver{constructor(callback){this.callback=callback;}observe(){}},
    window,
    progression,
    noteName:i=>['C','D','E','F','G','A','B'][(i%7+7)%7],
    chordTypes:[{value:'maj',suffix:''},{value:'min',suffix:'m'}],
    modes:{ionian:{name:'Jónico'},dorian:{name:'Dórico'},phrygian:{name:'Frigio'}},
    defaultChordMode:()=>'ionian',
    selectProgressionChord:()=>{},
    renderProgression:()=>{},
    draggingProgressionItem:false,
  });
  ctx.globalThis=ctx;
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../sections.js'),'utf8'),ctx);
  const run=code=>vm.runInContext(code,ctx);
  const load=value=>run(`window.StringSections.load(${JSON.stringify(value)})`);
  const rows=()=>id('section-list').children;
  return {run,load,rows,window,jumps,progression};
}

test('la sección salta al minuto de su primer acorde marcado',()=>{
  const t=setupSections();
  const labels={0:'0:07',1:'0:15',2:null,3:null};
  t.window.StringVideoSync={labelFor:index=>labels[index]??null,jump:index=>{t.jumps.push(index);return true;}};
  t.load([{name:'Verso',repeat:2,indices:[0,1]}]);
  const chip=t.rows()[0].children.find(node=>node.className==='section-video');
  assert.ok(chip,'la fila de la sección tiene su control de video');
  assert.equal(chip.textContent,'0:07','muestra el minuto de la sección');
  assert.equal(chip.attrs['aria-label'],'Salta el video al inicio de Verso (0:07)');
  chip.onclick();
  assert.deepEqual(t.jumps,[0],'salta al primer acorde de la sección');
});

test('si el primer acorde no tiene marca, la sección salta al primero que sí',()=>{
  const t=setupSections();
  const labels={0:null,1:null,2:'2:04',3:null};
  t.window.StringVideoSync={labelFor:index=>labels[index]??null,jump:index=>{t.jumps.push(index);return true;}};
  t.load([{name:'Puente',repeat:1,indices:[0,2]}]);
  const chip=t.rows()[0].children.find(node=>node.className==='section-video');
  assert.ok(chip);
  assert.equal(chip.textContent,'2:04');
  chip.onclick();
  assert.deepEqual(t.jumps,[2]);
});

test('una sección sin marcas no ofrece el salto',()=>{
  const t=setupSections();
  t.window.StringVideoSync={labelFor:()=>null,jump:()=>true};
  t.load([{name:'Sin video',repeat:1,indices:[0,1]}]);
  assert.equal(t.rows()[0].children.find(node=>node.className==='section-video'),undefined);
});

test('cuando cambian las marcas, la fila de la sección se repinta sin recargar',()=>{
  const t=setupSections();
  let labels={0:null,1:null};
  t.window.StringVideoSync={labelFor:index=>labels[index]??null,jump:()=>true};
  t.load([{name:'Verso',repeat:1,indices:[0,1]}]);
  assert.equal(t.rows()[0].children.find(node=>node.className==='section-video'),undefined,'al cargar no había marca');
  labels={0:'0:30',1:null};
  assert.equal(typeof t.window.StringSections.refresh,'function','sections.js expone el repintado que pide video-sync');
  t.window.StringSections.refresh();
  const chip=t.rows()[0].children.find(node=>node.className==='section-video');
  assert.ok(chip,'el aviso repinta la fila y el chip aparece');
  assert.equal(chip.textContent,'0:30');
});

// ---------------------------------------------------------------- reproductor

// DOM mínimo de youtube-player.js para probar el cableado del salto sin red:
// el reproductor es un doble que anota cada `seekTo`.
function setupPlayer(){
  const byId=new Map();
  function make(tag){
    const el={tag,attrs:{},handlers:{},children:[],className:'',style:{removeProperty(){},setProperty(){}},
      hidden:false,disabled:false,value:'',max:'',textContent:'',innerHTML:'',inert:false,checked:false,clientWidth:0,
      getAttribute(name){return this.attrs[name]??null;},
      setAttribute(name,value){this.attrs[name]=String(value);},
      addEventListener(name,fn){(this.handlers[name]=this.handlers[name]||[]).push(fn);},
      append(...kids){this.children.push(...kids);},
      replaceChildren(...kids){this.children=[...kids];},
      after(){},remove(){},focus(){},
      getBoundingClientRect(){return{left:0,top:0,width:200,height:112,right:200,bottom:112};},
      classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    };
    return el;
  }
  const id=key=>{if(!byId.has(key))byId.set(key,make(key));return byId.get(key);};
  const seeks=[];
  class FakePlayer{
    // YouTube avisa `onReady` después de construir el reproductor: el doble lo
    // imita con una microtarea, porque `player` se asigna al volver del constructor.
    constructor(host,options){this.options=options;this.time=0;this.state=2;this.seeks=seeks;Promise.resolve().then(()=>options.events.onReady());}
    setSize(){}destroy(){}getCurrentTime(){return this.time;}getDuration(){return 300;}getPlayerState(){return this.state;}
    seekTo(time,allow){seeks.push([time,allow]);this.time=time;}playVideo(){this.state=1;}pauseVideo(){this.state=2;}
  }
  const window={handlers:{},addEventListener(n,f){this.handlers[n]=f;},dispatchEvent(event){
    const handler=this.handlers[event.type];if(handler)handler(event);return true;}};
  window.YT={Player:FakePlayer};
  const ctx=vm.createContext({
    document:{getElementById:id,createElement:tag=>make(tag),activeElement:null,body:make('body'),head:make('head')},
    window,YT:window.YT,URL,
    location:{protocol:'http:',origin:'http://127.0.0.1:8000'},
    CustomEvent:class CustomEvent{constructor(type,init){this.type=type;Object.assign(this,init);}},
    setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},
  });
  ctx.globalThis=ctx;
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../youtube-url.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../youtube-player.js'),'utf8'),ctx);
  return {window,id,seeks};
}

test('sin video cargado el salto avisa en vez de quedarse callado',()=>{
  const t=setupPlayer();
  t.window.dispatchEvent({type:'string:video-seek',detail:{time:12}});
  assert.equal(t.id('youtube-status').textContent,'Carga un video para saltar a un punto.');
  assert.equal(t.seeks.length,0,'sin reproductor no hay nada que mover');
});

test('el salto pide al reproductor ir al punto de la marca y actualiza el tiempo visible',async()=>{
  const t=setupPlayer();
  t.window.dispatchEvent({type:'traste:load-video',detail:'https://www.youtube.com/watch?v=abcdefghijk'});
  await new Promise(resolve=>setImmediate(resolve));
  t.window.dispatchEvent({type:'string:video-seek',detail:{time:83.5}});
  assert.deepEqual(t.seeks,[[83.5,true]],'seekTo con el segundo exacto de la marca y permitiendo buscar');
  assert.equal(t.id('youtube-time').textContent,'1:23 / 5:00','la etiqueta del video queda en el punto del salto');
  assert.equal(t.id('youtube-seek').value,'83.5','la barra de posición acompaña el salto');
});

test('un pedido de salto inválido no mueve el video',async()=>{
  const t=setupPlayer();
  t.window.dispatchEvent({type:'traste:load-video',detail:'https://www.youtube.com/watch?v=abcdefghijk'});
  await new Promise(resolve=>setImmediate(resolve));
  t.window.dispatchEvent({type:'string:video-seek',detail:{time:NaN}});
  t.window.dispatchEvent({type:'string:video-seek',detail:{}});
  t.window.dispatchEvent({type:'string:video-seek',detail:{time:-4}});
  assert.equal(t.seeks.length,0);
});
