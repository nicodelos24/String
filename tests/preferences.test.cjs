const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const SRC=fs.readFileSync(path.join(__dirname,'../preferences.js'),'utf8');

const NOTES=['notas','escala','todas'];
const DEGREES=['grados: no','grados: escala','grados: todos'];
const DISPLAY=['grados','tríada','7ma','Acorde','Acorde 7ma'];

function build(seed){
  const byId=new Map();const allNodes=[];const clicked=[];
  let noteIndex=1,degreeIndex=0,displayIndex=1;
  function make(id,cfg={}){
    const n={
      id, tag:cfg.tag||null, type:cfg.type||null, name:cfg.name||null,
      value:cfg.value!==undefined?cfg.value:'', checked:!!cfg.checked, textContent:cfg.text||'',
      children:cfg.children||[], options:cfg.options||null, selectedIndex:cfg.selectedIndex||0,
      attrs:Object.assign({},cfg.attrs||{}), dataset:Object.assign({},cfg.dataset||{}),
      classes:new Set(cfg.classes||[]), handlers:{}, events:[], clicked:null,
      onClick:cfg.onClick||null,
    };
    n.classList={contains:c=>n.classes.has(c),add:(...cs)=>cs.forEach(c=>n.classes.add(c)),
      remove:(...cs)=>cs.forEach(c=>n.classes.delete(c)),toggle:c=>n.classes.has(c)?(n.classes.delete(c),false):(n.classes.add(c),true)};
    n.addEventListener=(t,fn)=>{n.handlers[t]=fn;};
    n.getAttribute=name=>{
      if(name==='name'&&n.name)return n.name;
      return Object.prototype.hasOwnProperty.call(n.attrs,name)?n.attrs[name]:null;
    };
    n.setAttribute=(name,value)=>{
      const v=String(value);n.attrs[name]=v;
      if(name.startsWith('data-'))n.dataset[name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;
    };
    n.click=()=>{
      n.clicked=(n.clicked||0)+1;clicked.push(n);
      if(n.onClick)n.onClick(n);
      if(n.handlers.click)n.handlers.click();
    };
    n.dispatchEvent=ev=>{
      n.events.push(ev.type);
      if(n.handlers[ev.type])n.handlers[ev.type](ev);
      if(ev.bubbles!==false&&document.handlers[ev.type])document.handlers[ev.type](ev);
    };
    if(id)byId.set(id,n);allNodes.push(n);
    return n;
  }
  const checkbox=(id,checked)=>make(id,{tag:'input',type:'checkbox',checked});
  const select=(id,options)=>make(id,{tag:'select',options,value:options[0].value});
  const range=(id,value)=>make(id,{tag:'input',type:'range',value});
  const span=(id,text)=>make(id,{tag:'span',text});

  const notesLabel=span(null,'escala');const degreeLabel=span(null,'grados: no');
  const displayLabel=span('display-label','tríada');
  const notesBtn=make('toggle-notes',{tag:'button',children:[notesLabel],onClick:()=>{noteIndex=(noteIndex+1)%3;notesLabel.textContent=NOTES[noteIndex];}});
  make('toggle-degrees',{tag:'button',children:[degreeLabel],onClick:()=>{degreeIndex=(degreeIndex+1)%3;degreeLabel.textContent=DEGREES[degreeIndex];}});
  make('toggle-display',{tag:'button',children:[displayLabel],onClick:()=>{displayIndex=(displayIndex+1)%DISPLAY.length;displayLabel.textContent=DISPLAY[displayIndex];}});

  const picker=make('instrument-picker',{tag:'div'});
  [['guitar',true],['bass',false]].forEach(([v,c])=>{
    picker.children.push(make(null,{tag:'input',type:'radio',name:'string-instrument',value:v,checked:c}));
  });
  const qualityRoot=make('quality-select',{tag:'div'});
  [['major',true],['minor',false],['diminished',false]].forEach(([v,c])=>{
    qualityRoot.children.push(make(null,{tag:'input',type:'radio',name:'quality',value:v,checked:c}));
  });
  const modeRoot=make('mode-selector',{tag:'div'});
  [['ionian',true],['aeolian',false],['majorPentatonic',false],['minorPentatonic',false]].forEach(([v,c])=>{
    modeRoot.children.push(make(null,{tag:'input',type:'radio',name:'mode',value:v,checked:c}));
  });
  const piano=make('root-piano',{tag:'div'});
  for(let p=0;p<12;p++){
    piano.children.push(make(null,{tag:'button',classes:['piano-key'],attrs:{'data-pitch':String(p),'aria-pressed':p===0?'true':'false'},dataset:{pitch:String(p)}}));
  }
  ['progression','midi','metronome'].forEach((s,i)=>{
    make(null,{tag:'button',attrs:{'data-source':s,'aria-pressed':i===0?'true':'false'},dataset:{source:s}});
  });
  ['pulse','restart'].forEach((m,i)=>{
    make(null,{tag:'button',attrs:{'data-card-mode':m,'aria-pressed':i===0?'true':'false'},dataset:{cardMode:m}});
  });
  const kbdModes=make('keyboard-modes',{tag:'div'});
  ['mastil','teclado','ambos'].forEach((m,i)=>{
    kbdModes.children.push(make(null,{tag:'button',attrs:{'data-keyboard-mode':m,'aria-pressed':i===0?'true':'false'},dataset:{keyboardMode:m}}));
  });
  const liveRoot=make('keyboard-live-chord',{tag:'div'});
  ['off','note','chord'].forEach((m,i)=>{
    liveRoot.children.push(make(null,{tag:'button',attrs:{'data-live-mode':m,'aria-pressed':i===0?'true':'false'},dataset:{liveMode:m}}));
  });
  const micRoot=make('mic-live-chord',{tag:'div'});
  ['off','note','chord'].forEach((m,i)=>{
    micRoot.children.push(make(null,{tag:'button',attrs:{'data-mic-live-mode':m,'aria-pressed':i===1?'true':'false'},dataset:{micLiveMode:m}}));
  });

  select('instrument-select',[{value:'guitar'},{value:'bass'}]);
  select('root-select',[{value:'0',dataset:{note:'C'}},{value:'1',dataset:{note:'Db'}}]);
  make('ghost-mode-select',{tag:'select',options:[{value:''}],value:''});
  make('player-style',{tag:'select',options:[{value:'pop'},{value:'rock'},{value:'ballad'}],value:'pop'});
  make('keyboard-timbre',{tag:'select',options:[{value:'piano'},{value:'organ'},{value:'guitar'},{value:'bass'}],value:'piano'});

  make('root-spelling',{tag:'input',type:'checkbox'});
  make('pentatonic-view',{tag:'input',type:'checkbox'});
  checkbox('follow-midi',true);
  checkbox('fret-scale-lock',false);
  checkbox('youtube-float',true);
  checkbox('player-loop',false);
  checkbox('player-percussion',false);
  checkbox('player-card-start',true);
  checkbox('metronome-accent',true);
  checkbox('keyboard-delay',false);
  checkbox('keyboard-reverb',false);

  make('player-bpm',{tag:'input',type:'number',value:'100'});
  make('tempo-tap-bpm',{tag:'input',type:'number',value:'100'});
  make('progression-view',{tag:'button'});
  make('progression',{classes:['progression']});

  make('metronome-bpm',{tag:'input',type:'number',value:'100'});
  make('metronome-beats',{tag:'input',type:'number',value:'4'});
  range('metronome-volume','50');
  range('player-volume','70');
  range('player-drum-volume','60');
  range('keyboard-volume','30');
  range('mastil-volume','30');

  const store=new Map();
  if(seed!==undefined)store.set('traste.preferences.v1',typeof seed==='string'?seed:JSON.stringify(seed));
  const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))};

  function parsePart(part){
    const spec={tag:null,classes:[],attrs:[]};let m;
    const tm=part.match(/^([A-Za-z]+)/);
    if(tm)spec.tag=tm[1].toLowerCase();
    const cr=/\.([\w-]+)/g;while((m=cr.exec(part)))spec.classes.push(m[1]);
    const ar=/\[([\w-]+)(?:="([^"]*)")?\]/g;while((m=ar.exec(part)))spec.attrs.push({name:m[1],value:m[2]!==undefined?m[2]:undefined});
    return spec;
  }
  function matches(node,spec){
    if(spec.tag&&node.tag!==spec.tag)return false;
    if(!spec.classes.every(c=>node.classes.has(c)))return false;
    return spec.attrs.every(a=>{
      const v=node.getAttribute(a.name);
      if(a.value===undefined)return v!==null&&v!==undefined;
      return v===a.value;
    });
  }
  function resolveAll(sel){
    const parts=sel.split(/\s+/).filter(Boolean);
    if(parts[0].startsWith('#')){
      const node=byId.get(parts[0].slice(1));
      let current=node?[node]:[];
      for(const part of parts.slice(1)){
        const spec=parsePart(part);const next=[];
        current.forEach(el=>el.children.forEach(child=>{if(matches(child,spec))next.push(child);}));
        current=next;
      }
      return current;
    }
    const spec=parsePart(parts.join(' '));
    return allNodes.filter(el=>matches(el,spec));
  }
  const document={
    querySelector:sel=>{const r=resolveAll(sel);return r[0]||null;},
    querySelectorAll:sel=>resolveAll(sel),
    handlers:{},
    addEventListener:(type,fn)=>{document.handlers[type]=fn;},
    dispatchEvent:ev=>{if(document.handlers[ev.type])document.handlers[ev.type](ev);},
  };
  const ctx=vm.createContext({document,localStorage,window:{},Event:class{constructor(type){this.type=type;this.bubbles=true;}},clicked});
  vm.runInContext(SRC,ctx);
  return {
    document,localStorage,ctx,clicked,
    runs:code=>vm.runInContext(code,ctx),
    q:sel=>ctx.document.querySelector(sel),
    qa:sel=>ctx.document.querySelectorAll(sel),
  };
}

test('preferencias: sin guardado previo no escribe nada al cargar',()=>{
  const{localStorage}=build();
  assert.equal(localStorage.getItem('traste.preferences.v1'),null);
});

test('preferencias: un cambio de cualquier control visible guarda el snapshot',()=>{
  const{localStorage,runs,qa}=build();
  if(!qa('#instrument-picker input[name="string-instrument"]')[0].checked)throw new Error('mock');
  runs('document.querySelector("#metronome-volume").value="75";document.dispatchEvent(new Event("click"));');
  const snap=JSON.parse(localStorage.getItem('traste.preferences.v1'));
  assert.equal(snap.instrument,'guitar');
  assert.equal(snap.quality,'major');
  assert.equal(snap.mode,'ionian');
  assert.equal(snap.rootPitch,'0');
  assert.equal(snap.source,'progression');
  assert.equal(snap.keyboardMode,'mastil');
  assert.equal(snap.keyboardLive,'off');
  assert.equal(snap.micLive,'note');
  assert.equal(snap.metronomeVolume,'75');
  assert.equal(snap.playerBpm,'100');
  assert.equal(snap.synthVolume,'30');
  assert.equal(snap.pentatonicView,false);
  assert.equal(snap.showNotes,1);
  assert.equal(snap.degreeDisplay,0);
  assert.equal(snap.displayLabel,'tríada');
  assert.equal(snap.followMidi,true);
  assert.equal(snap.youtubeFloat,true);
});

test('preferencias: los radios y botones de fuente actualizan el snapshot',()=>{
  const{localStorage,runs,qa}=build();
  runs('document.querySelectorAll(\'#quality-select input[name="quality"]\').forEach((r,i)=>{r.checked=i===1;});document.querySelectorAll(\'#quality-select input[name="quality"]\')[1].dispatchEvent(new Event("change"));');
  runs('document.querySelectorAll(\'[data-source]\')[0].setAttribute("aria-pressed","false");document.querySelectorAll(\'[data-source]\')[2].setAttribute("aria-pressed","true");document.dispatchEvent(new Event("click"));');
  runs('document.querySelectorAll(\'[data-card-mode]\')[0].setAttribute("aria-pressed","false");document.querySelectorAll(\'[data-card-mode]\')[1].setAttribute("aria-pressed","true");document.dispatchEvent(new Event("click"));');
  const snap=JSON.parse(localStorage.getItem('traste.preferences.v1'));
  assert.equal(snap.quality,'minor');
  assert.equal(snap.source,'metronome');
  assert.equal(snap.cardMode,'restart');
});

test('preferencias: restaura los valores guardados disparando los eventos',()=>{
  const saved={
    instrument:'bass',rootPitch:5,useFlats:true,quality:'minor',mode:'aeolian',ghostMode:'',
    pentatonicView:false,showNotes:0,degreeDisplay:2,displayLabel:'7ma',
    source:'midi',keyboardMode:'teclado',keyboardLive:'chord',micLive:'off',
    rowView:true,followMidi:false,fretScaleLock:true,youtubeFloat:false,
    playerBpm:'120',playerStyle:'rock',playerLoop:true,playerPercussion:true,playerVolume:'80',playerDrumVolume:'60',
    playerCardStart:false,cardMode:'restart',
    metronomeBpm:'90',metronomeBeats:'6',metronomeAccent:false,metronomeVolume:'40',
    synthTimbre:'organ',synthDelay:true,synthReverb:false,synthVolume:'55',mastilVolume:'55'
  };
  const{q,qa,clicked}=build(saved);
  assert.equal(q('#instrument-select').value,'bass');
  assert.ok(q('#instrument-select').events.includes('change'));
  assert.equal(qa('#quality-select input[name="quality"]').find(r=>r.value==='minor').checked,true);
  assert.equal(qa('#mode-selector input[name="mode"]').find(r=>r.value==='aeolian').checked,true);
  assert.equal(q('#root-spelling').checked,true);
  assert.equal(qa('#root-piano .piano-key').find(k=>k.dataset.pitch==='5').clicked,1);
  assert.equal(q('#toggle-notes span').textContent,'notas');
  assert.equal(q('#toggle-degrees span').textContent,'grados: todos');
  assert.equal(q('#display-label').textContent,'7ma');
  assert.ok(clicked.some(n=>n.getAttribute('data-source')==='midi'));
  assert.ok(clicked.some(n=>n.getAttribute('data-card-mode')==='restart'));
  assert.ok(clicked.some(n=>n.getAttribute('data-keyboard-mode')==='teclado'));
  assert.ok(clicked.some(n=>n.getAttribute('data-live-mode')==='chord'));
  assert.ok(clicked.some(n=>n.getAttribute('data-mic-live-mode')==='off'));
  assert.ok(clicked.includes(q('#progression-view')));
  assert.equal(q('#metronome-bpm').value,'90');
  assert.equal(q('#metronome-beats').value,'6');
  assert.ok(q('#metronome-beats').events.includes('change'));
  assert.equal(q('#metronome-accent').checked,false);
  assert.equal(q('#metronome-volume').value,'40');
  assert.ok(q('#metronome-volume').events.includes('input'));
  assert.equal(q('#player-bpm').value,'120');
  assert.equal(q('#tempo-tap-bpm').value,'120');
  assert.equal(q('#player-style').value,'rock');
  assert.equal(q('#player-loop').checked,true);
  assert.equal(q('#player-percussion').checked,true);
  assert.equal(q('#player-card-start').checked,false);
  assert.equal(q('#player-volume').value,'80');
  assert.equal(q('#player-drum-volume').value,'60');
  assert.equal(q('#keyboard-timbre').value,'organ');
  assert.equal(q('#keyboard-delay').checked,true);
  assert.equal(q('#keyboard-reverb').checked,false);
  assert.equal(q('#keyboard-volume').value,'55');
  assert.equal(q('#mastil-volume').value,'55');
  assert.ok(q('#keyboard-volume').events.includes('input'));
  assert.equal(q('#follow-midi').checked,false);
  assert.equal(q('#fret-scale-lock').checked,true);
  assert.equal(q('#youtube-float').checked,false);
  assert.ok(q('#youtube-float').events.includes('change'));
});

test('preferencias: los guardados inválidos se ignoran sin romper la carga',()=>{
  const{q}=build('{no es json');
  assert.equal(q('#player-bpm').value,'100');
});