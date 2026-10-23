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
  const {library}=setup();library.save({id:'one',title:'Blues'});
  const backup=library.export();assert.equal(library.import(backup),1);
  assert.equal(library.read().length,2);assert.notEqual(library.read()[0].id,library.read()[1].id);
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
    SongLibrary, Option:class Option{constructor(label,value){this.label=label;this.value=value;}},
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
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),sandbox);
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
