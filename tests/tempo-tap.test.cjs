const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function setup() {
  const elements=new Map();
  function element(key) {
    if(!elements.has(key))elements.set(key,{
      handlers:{},_value:'100',
      get value(){return this._value;},
      set value(value){this._value=String(value);},
      addEventListener(name,fn){this.handlers[name]=fn;},
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

test('tempo tap: two clicks estimate the BPM and write the editable field, accompaniment and video',()=>{
  const {element,clock}=setup();
  const button=element('#tempo-tap'),bpmInput=element('#tempo-tap-bpm');
  const playerBpm=element('#player-bpm'),videoBpm=element('#video-bpm');
  assert.equal(bpmInput.value,'100');
  clock.now=0;button.handlers.click();
  assert.equal(bpmInput.value,'100');
  clock.now=500;button.handlers.click();
  assert.equal(bpmInput.value,'120');
  assert.equal(playerBpm.value,'120');
  assert.equal(videoBpm.value,'120');
});

test('tempo tap: manual edits apply the BPM with limits and the accompaniment field stays in sync',()=>{
  const {element}=setup();
  const bpmInput=element('#tempo-tap-bpm'),playerBpm=element('#player-bpm'),videoBpm=element('#video-bpm');
  bpmInput.value='90';bpmInput.handlers.change();
  assert.equal(playerBpm.value,'90');
  assert.equal(videoBpm.value,'90');
  bpmInput.value='999';bpmInput.handlers.change();
  assert.equal(bpmInput.value,'240');
  assert.equal(playerBpm.value,'240');
  bpmInput.value='5';bpmInput.handlers.change();
  assert.equal(bpmInput.value,'30');
  playerBpm.value='140';playerBpm.handlers.input();
  assert.equal(bpmInput.value,'140');
});

test('tempo tap: far-apart taps restart the estimation window',()=>{
  const {element,clock}=setup();
  const button=element('#tempo-tap'),bpmInput=element('#tempo-tap-bpm');
  clock.now=0;button.handlers.click();
  clock.now=400;button.handlers.click();
  assert.equal(bpmInput.value,'150');
  clock.now=10400;button.handlers.click();
  clock.now=10900;button.handlers.click();
  assert.equal(bpmInput.value,'120');
});