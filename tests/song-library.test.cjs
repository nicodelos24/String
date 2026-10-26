const {test}=require('node:test');
const assert=require('node:assert/strict');
const {SongLibrary}=require('../song-library.js');
function setup() {
  const data=new Map();
  const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
  const validate=song=>{if(!song?.id || !song.title) throw new Error('Invalid');return structuredClone(song);};
  return {library:new SongLibrary(storage,validate),storage};
}
test('backups larger than 2 MB round-trip and oversize input preserves stored data',()=>{
  const {library}=setup();
  for(let i=0;i<10;i++)library.save({id:String(i),title:'Práctica',chords:Array.from({length:4096},()=>({root:0,type:'maj7',rootNoteName:'C',mode:'ionian',ghostMode:''}))});
  const raw=library.export();assert(Buffer.byteLength(raw)>2*1024*1024);
  const other=setup().library;assert.equal(other.import(raw),10);assert.equal(other.read()[0].chords.length,4096);
  const before=other.export();assert.throws(()=>other.import(' '.repeat(SongLibrary.maxBackupBytes+1)),/20 MB/);assert.equal(other.export(),before);
});
test('songs persist across instances, update by id and preserve saved copies',()=>{
  const {library,storage}=setup(); const song={id:'one',title:'Blues',chords:[{root:0}]};
  library.save(song);song.chords[0].root=5;
  assert.equal(new SongLibrary(storage,library.validate).read()[0].chords[0].root,0);
  library.save({...song,title:'Blues editado'});assert.equal(library.read().length,1);
  library.remove('one');assert.deepEqual(library.read(),[]);
});
test('export/import adds independent copies and rejects invalid backups without data loss',()=>{
  const {library}=setup();library.save({id:'one',title:'Blues',structure:{version:1,blocks:[],arrangement:[]}});
  const backup=library.export();assert.equal(library.import(backup),1);
  assert.equal(library.read().length,2);assert.notEqual(library.read()[0].id,library.read()[1].id);
  assert.deepEqual(library.read()[1].structure,{version:1,blocks:[],arrangement:[]},'el campo opcional estructura viaja en el respaldo');
  const before=library.export();
  for(const raw of ['invalid','{"version":2,"songs":[]}','{"version":1,"songs":[{}]}']) assert.throws(()=>library.import(raw));
  assert.equal(library.export(),before);
});
test('storage failures and corrupt data are reported without silently overwriting',()=>{
  const {library,storage}=setup();library.save({id:'one',title:'Blues'});
  const before=library.export();storage.setItem=()=>{throw new Error('QuotaExceeded');};
  assert.throws(()=>library.save({id:'two',title:'Jazz'}),/QuotaExceeded/);assert.equal(library.export(),before);
  storage.getItem=()=>'{broken';assert.throws(()=>library.save({id:'three',title:'Rock'}));
});

// T-20: la biblioteca (traste.songs.v1) también lleva las variantes por vuelta
// del modo fantasma. Se prueba el whitelist real de song-library-ui.js cargado
// en sandbox: guardar una canción con variantes, releer el JSON guardado y
// reabrirla en la progresión.
const {test:sandboxTest}=require('node:test');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function setupUi() {
  // Elementos con la misma forma que usa el sandbox de progression.test.cjs.
  // app.js carga entero y aporta sus validadores reales (validVariants, modes,
  // chordTypes); song-library-ui.js se monta encima como en la página real.
  const elements=new Map();
  const element=id=>{
    if(!elements.has(id)) elements.set(id,{id,handlers:{},options:[],selectedIndex:0,hidden:false,textContent:'',href:'',disabled:false,currentValue:'',
      style:{setProperty(){}},attrs:{},checked:false,
      set innerHTML(html){this.html=html;this.options=[...html.matchAll(/<option value="([^"]*)"(?: data-note="([^"]*)")?/g)].map(m=>({value:m[1],dataset:{note:m[2]}}));},
      get innerHTML(){return this.html||'';},
      set value(value){this.currentValue=String(value);const i=this.options.findIndex(o=>o.value===String(value));if(i>=0)this.selectedIndex=i;},
      get value(){return this.currentValue;},
      addEventListener(name,fn){this.handlers[name]=fn;},
      dispatchEvent(event){if(this.handlers[event.type])this.handlers[event.type]({target:this});return true;},
      removeAttribute(name){delete this.attrs[name];},
      setAttribute(name,value){this.attrs[name]=String(value);},
      querySelectorAll(){return[];},reportValidity(){return true;},replaceChildren(){},
      // `list.replaceChildren` es no-op y `add` solo reúne las opciones: el
      // `refresh` de la biblioteca llama a los dos y el stub antes les botaba.
      add(child){(this.children??=[]).push(child);},
      querySelector(selector){return element(id+selector);}});
    return elements.get(id);
  };
  for(const [id,props] of Object.entries({
    '#player-bpm':{tagName:'INPUT',type:'number',min:'30',max:'300',value:120},
    '#player-style':{tagName:'SELECT',options:[{value:'none'},{value:'rock'}],value:'none'},
    '#player-percussion':{type:'checkbox',checked:true},
    '#player-loop':{type:'checkbox',checked:true},
    '#player-volume':{tagName:'INPUT',type:'number',min:'0',max:'1',value:1},
    '#player-drum-volume':{tagName:'INPUT',type:'number',min:'0',max:'1',value:1},
  })) Object.assign(element(id),props);
  const storage=new Map();
  const sandbox={
    document:{getElementById:id=>element(`#${id}`),querySelector:id=>element(id),querySelectorAll:()=>[],addEventListener(){}},
    window:{addEventListener(){},dispatchEvent(){},
      StringSections:{serialize(){return[];},load(){}},
      StringVideoSync:{save(){return[];},load(){}}},
    localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},
    Option:class Option{constructor(label,value){this.label=label;this.value=value;}},
    Event:class Event{constructor(type){this.type=type;}},
    TextEncoder, validateSections:()=>[],
    crypto:{randomUUID:()=>crypto.randomUUID()},
    location:{protocol:'http:'},
    youtubeVideoId:()=>null, validateVideoMarks:()=>[],
    draggingProgressionItem:null,
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../progression-duration.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../tonal-context.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../note-ink.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../music-model.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),sandbox);
  // T-40: el orden replica el de la página (index.html): la clase de
  // biblioteca, el modelo de bloques y su adaptador, y encima la UI — su
  // primer consumidor. La clase SongLibrary también vive en el realm del
  // sandbox (en la página real hay un solo realm): con la clase del realm
  // del anfitrión, su JSON.parse fabricaba objetos forasteros que el modelo
  // rechaza como «no es un objeto».
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../song-library.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../song-structure.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../song-structure-adapter.js'),'utf8'),sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../song-library-ui.js'),'utf8'),sandbox);
  return {sandbox,element,storage};
}
sandboxTest('la biblioteca guarda y reabre las variantes por vuelta del fantasma',()=>{
  const {sandbox,element,storage}=setupUi();
  const progression=[
    {root:0,rootNoteName:'C',type:'maj',mode:'ionian',ghostMode:'',variants:{'2':{ghostMode:'majorPentatonic'},'9':{ghostMode:'lydian'},'3':{ghostMode:'modo-inventado'},'4':'no-es-objeto'},beats:4},
    {root:5,rootNoteName:'F',type:'maj',mode:'ionian',ghostMode:'minorPentatonic',beats:2},
  ];
  vm.runInContext(`progression=${JSON.stringify(progression)}`,sandbox);
  element('#song-title').value='Cielito';
  vm.runInContext("document.getElementById('song-save').handlers.click()",sandbox);
  const saved=JSON.parse(storage.get('traste.songs.v1'));
  assert.equal(saved.version,1,'El formato sigue siendo v1: las variantes son un campo opcional más');
  const chord=saved.songs[0].chords[0];
  assert.deepEqual(chord.variants,{'2':{ghostMode:'majorPentatonic'}},'Solo quedan vueltas de 1 a 8 con un modo que la app conoce');
  assert.equal(saved.songs[0].chords[1].variants,undefined,'Un acorde sin variantes no estrena la clave');
  element('#song-list').value=saved.songs[0].id;
  vm.runInContext("document.getElementById('song-open').handlers.click()",sandbox);
  const restored=JSON.parse(JSON.stringify(vm.runInContext('progression.map(item=>({ghostMode:item.ghostMode,variants:item.variants}))',sandbox)));
  assert.deepEqual(restored[0],{ghostMode:'',variants:{'2':{ghostMode:'majorPentatonic'}}},'La canción reabierta trae la variante de la vuelta 2');
  assert.equal(restored[1].variants,undefined);
  assert.equal(restored[1].ghostMode,'minorPentatonic','La escala fantasma por acorde ya viajaba y sigue viajando');
});

// T-45 · QA-TONAL-02: la tonalidad de canción viaja como campo opcional de la
// canción v1 (mismo patrón que sections y variants: sin el campo, nada cambia).
sandboxTest('la biblioteca guarda y reabre la tonalidad de canción y rechaza una clave inválida',()=>{
  const {sandbox,element,storage}=setupUi();
  const progression=[{root:7,rootNoteName:'G',type:'maj',mode:'ionian',ghostMode:'',beats:4}];
  vm.runInContext(`progression=${JSON.stringify(progression)}`,sandbox);
  vm.runInContext("songTonality=tonalities.find(t=>t.key==='G')",sandbox);
  element('#song-title').value='Cumbia en Sol';
  vm.runInContext("document.getElementById('song-save').handlers.click()",sandbox);
  const saved=JSON.parse(storage.get('traste.songs.v1'));
  assert.equal(saved.songs[0].tonality,'G','la tonalidad elegida queda en la canción');
  element('#song-list').value=saved.songs[0].id;
  vm.runInContext("document.getElementById('song-open').handlers.click()",sandbox);
  assert.equal(element('#song-tonality').currentValue,'G','al abrir, el selector vuelve a la tonalidad guardada');
  assert.equal(String(vm.runInContext("songTonality===null?'sin':songTonality.key",sandbox)),'G');
  // Clave inválida: no se guarda nada (el whitelist la rechaza por completo).
  vm.runInContext("songTonality={key:'Do mayor!!'}",sandbox);
  storage.set('traste.songs.v1','{"version":1,"songs":[]}');
  element('#song-title').value='mala';
  vm.runInContext("document.getElementById('song-save').handlers.click()",sandbox);
  assert.deepEqual(JSON.parse(storage.get('traste.songs.v1')).songs,[],'una tonalidad que la app no conoce no entra al guardado');
});

sandboxTest('canción v1 sin tonalidad: guarda y abre exactamente como antes (byte a byte compatible)',()=>{
  const {sandbox,element,storage}=setupUi();
  const progression=[{root:0,rootNoteName:'G',type:'maj',mode:'ionian',ghostMode:'',beats:4}];
  vm.runInContext(`progression=${JSON.stringify(progression)}`,sandbox);
  element('#song-title').value='Sin tonalidad';
  vm.runInContext("document.getElementById('song-save').handlers.click()",sandbox);
  const raw=storage.get('traste.songs.v1');
  assert(!raw.includes('"tonality"'),'una canción sin tonalidad elegida no estrena la clave');
  element('#song-list').value=JSON.parse(raw).songs[0].id;
  vm.runInContext("document.getElementById('song-open').handlers.click()",sandbox);
  assert.equal(element('#song-tonality').currentValue,'');
  assert.equal(String(vm.runInContext('songTonality===null',sandbox)),'true','sin el campo guardado, la app conserva el comportamiento actual');
});

// T-40 · QA-MOD-02: la estructura de bloques viaja como campo opcional de la
// canción v1 (el mismo patrón que sections y tonality). El sobre versionado
// lo valida el adaptador; el whitelist de la biblioteca lo valida antes de
// reemplazar algo. Sin el campo: byte a byte como hoy. Con el campo: abre por
// el adaptador y al guardar deriva la estructura del estado de trabajo.
function cancionConEstructura(structure,tonality) {
  return {id:'compo1',title:'Composición de bloques',video:'',videoMarks:[],chordUrl:'',
    chords:[{root:0,type:'maj',ghostMode:''},{root:5,type:'maj',ghostMode:''},{root:7,type:'maj',ghostMode:''}],
    settings:{'player-bpm':120,'player-style':'none','player-percussion':true,'player-loop':true,'player-volume':1,'player-drum-volume':1},
    ...(tonality!==undefined?{tonality}:{}),...(structure!==undefined?{structure}:{})};
}
const arregloVersoEstribillo={
  blocks:[
    {id:'b1',name:'Verso',chords:[{root:0,type:'maj'},{root:5,type:'maj'}]},
    {id:'b2',name:'Estribillo',chords:[{root:7,type:'maj'}]},
  ],
  arrangement:[{blockId:'b1',repeat:2},{blockId:'b2',repeat:1},{blockId:'b1',repeat:1}],
};
function abrirComposicion(sandbox,element,storage,structure,tonality) {
  vm.runInContext("window.StringSections={sections:[],load(s){this.sections=s},serialize(){return this.sections}}",sandbox);
  const song=cancionConEstructura(structure,tonality);
  const raw=JSON.stringify({version:1,songs:[song]});
  storage.set('traste.songs.v1',raw);
  element('#song-list').value='compo1';
  vm.runInContext("document.getElementById('song-open').handlers.click()",sandbox);
  return {song,raw,element,storage};
}
sandboxTest('la biblioteca abre una composición por el adaptador y al guardar la deriva del estado igual',()=>{
  const {sandbox,element,storage}=setupUi();
  abrirComposicion(sandbox,element,storage,{version:1,...arregloVersoEstribillo});
  // El estado de trabajo sale del arreglo: tres acordes y una sección legada
  // por entrada — V×2, E×1 y la vuelta única del Verso en su orden. Las
  // comparaciones que cruzan del realm del sandbox al del host pasan por una
  // vuelta de JSON (como el test de variantes de T-20): assert/strict también
  // compara prototipos y el Array del sandbox tiene otro prototipo.
  const raices=JSON.parse(JSON.stringify(vm.runInContext('progression.map(c=>c.root)',sandbox)));
  assert.deepEqual(raices,[0,5,7]);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.StringSections.sections)),[
    {name:'Verso',repeat:2,indices:[0,1]},
    {name:'Estribillo',repeat:1,indices:[2]},
    {name:'Verso',repeat:1,indices:[0,1]},
  ],'el orden de las secciones es el de las entradas del arreglo');
  assert.equal(element('#song-tonality').currentValue,'','sin autoridad tonal inventada, el selector queda sin tonalidad');
  // Actualizar no reinventa la composición: la inversa del adaptador deriva
  // la estructura del estado de trabajo y sale igual que la que entró.
  vm.runInContext("document.getElementById('song-update').handlers.click()",sandbox);
  const saved=JSON.parse(storage.get('traste.songs.v1')).songs.find(item=>item.id==='compo1');
  assert.deepEqual(saved.structure,{version:1,...arregloVersoEstribillo},'la estructura viaja en el guardado de salida');
  vm.runInContext("document.getElementById('song-update').handlers.click()",sandbox);
  const savedOtra=JSON.parse(storage.get('traste.songs.v1')).songs.find(item=>item.id==='compo1');
  assert.equal(JSON.stringify(savedOtra.structure),JSON.stringify(saved.structure),'dos guardados consecutivos: la derivación es determinista');
});
sandboxTest('abrir una composición toma la tonalidad de la estructura cuando la canción no trae',()=>{
  const {sandbox,element,storage}=setupUi();
  abrirComposicion(sandbox,element,storage,{version:1,...arregloVersoEstribillo,tonality:{key:'G',scale:'major'}});
  assert.equal(element('#song-tonality').currentValue,'G','la tonalidad de la estructura es la efectiva');
  assert.equal(vm.runInContext("songTonality===null?'sin':songTonality.key",sandbox),'G');
  vm.runInContext("document.getElementById('song-update').handlers.click()",sandbox);
  const saved=JSON.parse(storage.get('traste.songs.v1')).songs.find(item=>item.id==='compo1');
  assert.equal(saved.tonality,'G','el selector alimenta el tono de la canción al guardar');
  assert.deepEqual(saved.structure.tonality,{key:'G',scale:'major'},'la estructura conserva la forma del contrato tonal');
});
sandboxTest('una estructura inválida rechaza la canción completa sin reemplazar nada',()=>{
  const {sandbox,element,storage}=setupUi();
  const {raw}=abrirComposicion(sandbox,element,storage,{version:99,blocks:[],arrangement:[]});
  assert.match(element('#song-status').textContent,/no es compatible con esta app/,'la versión futura se rechaza en voz alta');
  assert.notEqual(element('#song-title').currentValue,'Composición de bloques','la canción no abre');
  assert.equal(storage.get('traste.songs.v1'),raw,'los datos existentes no se reemplazan');
});
sandboxTest('canción y estructura con tonalidades distintas: la canción se rechaza, dos autoridades no se contradicen',()=>{
  const {sandbox,element,storage}=setupUi();
  const {raw}=abrirComposicion(sandbox,element,storage,{version:1,...arregloVersoEstribillo,tonality:{key:'G',scale:'major'}},'C');
  assert.match(element('#song-status').textContent,/dos tonalidades distintas/);
  assert.notEqual(element('#song-title').currentValue,'Composición de bloques');
  assert.equal(storage.get('traste.songs.v1'),raw);
});
sandboxTest('canción v1 sin estructura: abrir legado y actualizar no estrena la clave (y reinicia la autoridad)',()=>{
  const {sandbox,element,storage}=setupUi();
  const estructura={version:1,...arregloVersoEstribillo};
  abrirComposicion(sandbox,element,storage,estructura);
  // Una segunda canción legada, sin estructura, entra a la biblioteca al lado.
  const legado={...cancionConEstructura(undefined,'G'),id:'legado1',title:'Legado'};
  const conDos={version:1,songs:[JSON.parse(storage.get('traste.songs.v1')).songs[0],legado]};
  storage.set('traste.songs.v1',JSON.stringify(conDos));
  // Abrir la legada DEBE reiniciar la autoridad: al actualizar ya no se
  // estrena estructura, ni tampoco se toca la composición vecina.
  element('#song-list').value='legado1';
  vm.runInContext("document.getElementById('song-open').handlers.click()",sandbox);
  vm.runInContext("document.getElementById('song-update').handlers.click()",sandbox);
  const ronda=JSON.parse(storage.get('traste.songs.v1'));
  const legadaGuardada=ronda.songs.find(item=>item.id==='legado1');
  assert(!JSON.stringify(legadaGuardada).includes('"structure"'),'una canción v1 abierta no estrena el campo al guardar');
  assert.equal(legadaGuardada.tonality,'G','el tono legado queda como siempre');
  assert.deepEqual(ronda.songs.find(item=>item.id==='compo1').structure,estructura,'la composición vecina no la toca el guardado legado');
});
sandboxTest('reabrir y editar vuelve a derivar la estructura desde el estado de trabajo',()=>{
  const {sandbox,element,storage}=setupUi();
  const estructura={version:1,...arregloVersoEstribillo};
  abrirComposicion(sandbox,element,storage,estructura);
  vm.runInContext("document.getElementById('song-update').handlers.click()",sandbox);
  const ronda1=JSON.parse(storage.get('traste.songs.v1')).songs.find(item=>item.id==='compo1');
  assert.deepEqual(ronda1.structure,estructura,'el primer guardado trae la estructura equivalente');
  // Reabrir la canción guardada (la estructura vuelve por el adaptador) y
  // editar una tarjeta en el estado de trabajo: ninguna copia vieja congelada
  // interviene, el próximo guardado deriva la estructura del estado editado.
  element('#song-list').value='compo1';
  vm.runInContext("document.getElementById('song-open').handlers.click()",sandbox);
  vm.runInContext('progression[2].root=9',sandbox);
  vm.runInContext("document.getElementById('song-update').handlers.click()",sandbox);
  const ronda2=JSON.parse(storage.get('traste.songs.v1')).songs.find(item=>item.id==='compo1');
  assert.deepEqual(ronda2.structure,{version:1,blocks:[
    {id:'b1',name:'Verso',chords:[{root:0,type:'maj'},{root:5,type:'maj'}]},
    {id:'b2',name:'Estribillo',chords:[{root:9,type:'maj'}]},
  ],arrangement:[{blockId:'b1',repeat:2},{blockId:'b2',repeat:1},{blockId:'b1',repeat:1}]},'la edición del working state se refleja en la estructura derivada');
  assert.deepEqual(ronda2.structure.arrangement,ronda1.structure.arrangement,'el arreglo queda igual entre guardados');
});
