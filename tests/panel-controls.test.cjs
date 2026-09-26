const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function setup() {
  const store=new Map();
  function element(key) {
    if(!store.has(key))store.set(key,{
      value:'',checked:false,disabled:false,title:'',textContent:'',
      hidden:key==='midi-transport'||key==='quick-midi-time',
      listeners:{},_attrs:{'aria-pressed':'false','aria-label':''},
      get innerHTML(){return this._html||'';},
      set innerHTML(v){this._html=v;},
      getAttribute(name){return Object.hasOwn(this._attrs,name)?this._attrs[name]:null;},
      setAttribute(name,value){this._attrs[name]=String(value);},
      addEventListener(name,fn){this.listeners[name]=fn;},
      contains(){return false;},children:[],querySelector(){return null;},
    });
    return store.get(key);
  }
  const switchButtons=['progression','midi','metronome'].map(source=>({
    dataset:{source},handlers:{},_attrs:{},
    addEventListener(name,fn){this.handlers[name]=fn;},
    setAttribute(name,value){this._attrs[name]=String(value);},
    getAttribute(name){return this._attrs[name]??null;},
  }));
  const metronome={running:false,starting:false,started:0,stopped:0,
    async start(){this.running=true;this.started++;},stop(){this.running=false;this.stopped++;}};
  const windowStub={
    listeners:{},
    addEventListener(name,fn){this.listeners[name]=fn;},
    fire(name){this.listeners[name]?.();},
    dispatchEvent(){},
    StringMetronome:metronome,
    syncTempoToMetronome(){this.publishedTempo=true;},
  };
  const context={window:windowStub,
    document:{
      getElementById:element,querySelector:element,
      querySelectorAll(sel){return sel==='[data-source]'?switchButtons:[];},
    },
    MutationObserver:class{constructor(cb){this.cb=cb;} observe(){}},
    Event:class{constructor(type){this.type=type;}},
  };
  const vmContext=vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../panel-controls.js'),'utf8'),vmContext);
  return {element,switchButtons,metronome,windowStub,vmContext};
}

test('selecting Metrónomo routes quick-play to toggle the metronome independently of its panel',()=>{
  const {element,switchButtons,metronome,windowStub}=setup();
  assert.equal(element('progression-transport').hidden,false);
  assert.equal(element('midi-transport').hidden,true);
  assert.equal(element('player-status').hidden,false);
  switchButtons[2].handlers.click();
  assert.equal(element('progression-transport').hidden,true);
  assert.equal(element('midi-transport').hidden,true);
  assert.equal(element('player-status').hidden,true);
  assert.equal(element('quick-play').getAttribute('aria-label'),'Iniciar metrónomo');
  element('quick-play').listeners.click();
  assert.equal(metronome.started,1);
  element('metronome-toggle').setAttribute('aria-pressed','true');
  windowStub.fire('traste:metronome-state');
  assert.equal(element('quick-play').getAttribute('aria-pressed'),'true');
  assert.equal(element('quick-play').getAttribute('aria-label'),'Pausar metrónomo');
  assert(element('quick-play').innerHTML.includes('M6 6h12v12H6z'));
  element('quick-play').listeners.click();
  assert.equal(metronome.stopped,1);
  assert.equal(metronome.running,false);
});

test('leaving the Metrónomo source stops it; MIDI and Backtrack keep their own transport',()=>{
  const {element,switchButtons,metronome}=setup();
  switchButtons[2].handlers.click();
  element('quick-play').listeners.click();
  assert.equal(metronome.running,true);
  switchButtons[0].handlers.click();
  assert.equal(metronome.running,false);
  assert.equal(metronome.stopped,1);
  assert.equal(element('progression-transport').hidden,false);
  assert.equal(element('midi-transport').hidden,true);
});

test('pressing quick-play with Metrónomo selected publishes the tempo field into the metronome',()=>{
  const {element,switchButtons,windowStub}=setup();
  switchButtons[2].handlers.click();
  element('quick-play').listeners.click();
  assert.equal(windowStub.publishedTempo,true,'Al dar play se publica el tempo del campo en el metrónomo');
});

test('the active source is published so other modules can respect it',()=>{
  const {switchButtons,vmContext}=setup();
  const active=()=>vm.runInContext('globalThis.StringSources.active',vmContext);
  assert.equal(active(),'progression');
  switchButtons[1].handlers.click();
  assert.equal(active(),'midi');
  switchButtons[2].handlers.click();
  assert.equal(active(),'metronome');
});
