const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function setup() {
  const elements=new Map();
  function element(key) {
    if(!elements.has(key)){
      const el={
        handlers:{},_value:'100',dataset:{},
        get value(){return this._value;},
        set value(value){this._value=String(value);},
        addEventListener(name,fn){this.handlers[name]=fn;},
      };
      if(key.startsWith('.tempo-tap-step')){const match=/"(-?\d+)"/.exec(key);if(match)el.dataset.step=match[1];}
      elements.set(key,el);
    }
    return elements.get(key);
  }
  const clock={now:0};
  const metronome={tempo:null,setTempo(value){this.tempo=Number(value);return this.tempo;}};
  const ctx=vm.createContext({
    document:{querySelector:element,querySelectorAll:sel=>['.tempo-tap-step[data-step="1"]','.tempo-tap-step[data-step="-1"]'].map(element)},
    performance:{now:()=>clock.now},
    StringMetronome:metronome,
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../tempo-tap.js'),'utf8'),ctx);
  return {element,clock,metronome};
}

test('tempo tap: two clicks estimate the BPM and write the editable field, accompaniment, video and metronome',()=>{
  const {element,clock,metronome}=setup();
  const button=element('#tempo-tap'),bpmInput=element('#tempo-tap-bpm');
  const playerBpm=element('#player-bpm'),videoBpm=element('#video-bpm'),metroBpm=element('#metronome-bpm');
  assert.equal(bpmInput.value,'100');
  clock.now=0;button.handlers.click();
  assert.equal(bpmInput.value,'100');
  clock.now=500;button.handlers.click();
  assert.equal(bpmInput.value,'120');
  assert.equal(playerBpm.value,'120');
  assert.equal(videoBpm.value,'120');
  assert.equal(metroBpm.value,'120');
  assert.equal(metronome.tempo,120,'El metrónomo recibe el tempo pulsado');
});

test('tempo tap: manual edits apply the BPM with limits and the accompaniment field stays in sync',()=>{
  const {element,metronome}=setup();
  const bpmInput=element('#tempo-tap-bpm'),playerBpm=element('#player-bpm'),videoBpm=element('#video-bpm'),metroBpm=element('#metronome-bpm');
  bpmInput.value='90';bpmInput.handlers.change();
  assert.equal(playerBpm.value,'90');
  assert.equal(videoBpm.value,'90');
  assert.equal(metroBpm.value,'90');
  assert.equal(metronome.tempo,90,'La edición manual también fija el metrónomo');
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

test('tempo tap: stepper arrows adjust the BPM by one with the same limits',()=>{
  const {element}=setup();
  const up=element('.tempo-tap-step[data-step="1"]'),down=element('.tempo-tap-step[data-step="-1"]');
  const bpmInput=element('#tempo-tap-bpm'),playerBpm=element('#player-bpm'),metroBpm=element('#metronome-bpm');
  bpmInput.value='90';up.handlers.click();
  assert.equal(bpmInput.value,'91');
  assert.equal(playerBpm.value,'91');
  assert.equal(metroBpm.value,'91');
  bpmInput.value='240';up.handlers.click();
  assert.equal(bpmInput.value,'240');
  bpmInput.value='30';down.handlers.click();
  assert.equal(bpmInput.value,'30');
  bpmInput.value='120';down.handlers.click();
  assert.equal(bpmInput.value,'119');
});