const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function setup() {
  const elements=new Map();
  function element(key) {
    if(!elements.has(key))elements.set(key,{
      handlers:{},value:'',disabled:false,_hidden:key==='#tempo-tap-label',text:'',
      addEventListener(name,fn){this.handlers[name]=fn;},
      set textContent(text){this.text=String(text);},
      get textContent(){return this.text;},
      set hidden(value){this._hidden=!!value;},
      get hidden(){return this._hidden;},
    });
    return elements.get(key);
  }
  const clock={now:0};
  const ctx=vm.createContext({
    document:{querySelector:element},
    performance:{now:()=>clock.now},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../tempo-tap.js'),'utf8'),ctx);
  return {element,clock};
}

test('tempo tap: two clicks estimate the BPM and write accompaniment and video tempo',()=>{
  const {element,clock}=setup();
  const button=element('#tempo-tap'),label=element('#tempo-tap-label');
  const playerBpm=element('#player-bpm'),videoBpm=element('#video-bpm');
  clock.now=0;button.handlers.click();
  assert.equal(label.hidden,true);
  assert.equal(playerBpm.value,'');
  clock.now=500;button.handlers.click();
  assert.equal(playerBpm.value,120);
  assert.equal(videoBpm.value,120);
  assert.equal(label.hidden,false);
  assert.equal(label.textContent,'120 BPM');
});

test('tempo tap: far-apart taps restart the estimation and manual edit hides the readout',()=>{
  const {element,clock}=setup();
  const button=element('#tempo-tap'),label=element('#tempo-tap-label');
  const playerBpm=element('#player-bpm');
  clock.now=0;button.handlers.click();
  clock.now=400;button.handlers.click();
  assert.equal(playerBpm.value,150);
  clock.now=10400;button.handlers.click();
  clock.now=10900;button.handlers.click();
  assert.equal(playerBpm.value,120);
  playerBpm.handlers.input();
  assert.equal(label.hidden,true);
});