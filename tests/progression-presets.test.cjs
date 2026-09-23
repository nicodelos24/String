const {test}=require('node:test');const assert=require('node:assert/strict');const {progressionPresets}=require('../progression-presets.js');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
function domSetup(){
  const elements=new Map();
  function element(key){
    if(!elements.has(key))elements.set(key,{value:'',textContent:'',handlers:{},addEventListener(name,fn){this.handlers[name]=fn;}});
    return elements.get(key);
  }
  const store=new Map();
  const localStorage={getItem(k){return store.has(k)?store.get(k):null;},setItem(k,v){store.set(k,String(v));}};
  const state={selected:-1};
  const ctx=vm.createContext({
    document:{querySelector:element},
    Event:class{constructor(type){this.type=type;}},
    window:{dispatchEvent(){}},
    draggingProgressionItem:null,
    progressionEdited:false,
    playingProgressionItem:null,
    progression:[{root:0,type:'maj'},{root:5,type:'m7'},{root:7,type:'7'},{root:0,type:'maj'}],
    selectProgressionChord(index){state.selected=index;},
    customProgressionKey:'traste.customProgression.v1',
    localStorage,
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../progression-presets.js'),'utf8'),ctx);
  const apply=()=>element('#apply-preset').handlers.click();
  return {apply,ctx,state,localStorage,runs:code=>vm.runInContext(code,ctx)};
}
test('templates contain the intended jazz changes and twelve-bar dominant blues',()=>{
  assert.deepEqual(progressionPresets.jazz.chords.map(c=>[c.root,c.type]),[[2,'m7'],[7,'7'],[0,'maj7'],[0,'maj7']]);
  assert.deepEqual(progressionPresets.blues.chords.map(c=>c.root),[9,9,9,9,2,2,9,9,4,2,9,4]);
  assert(progressionPresets.blues.chords.every(c=>c.type==='7'));
  assert.deepEqual(progressionPresets.turnaround.chords.map(c=>c.root),[0,9,2,7]);
});

test('guide examples: twelve-bar blues in F with turnaround and Autumn Leaves',()=>{
  assert.deepEqual(progressionPresets.bluesF.chords.map(c=>c.root),[5,5,5,5,10,10,5,5,7,10,5,7,5]);
  assert.equal(progressionPresets.bluesF.chords.reduce((sum,c)=>sum+(c.beats||4),0),48);
  assert.deepEqual(progressionPresets.bluesF.chords.slice(-2).map(c=>[c.root,c.beats]),[[7,2],[5,2]]);
  assert.equal(progressionPresets.autumnLeaves.chords.length,26);
  assert.equal(progressionPresets.autumnLeaves.chords.reduce((sum,c)=>sum+(c.beats||4),0),96);
});

test('mi progresión: sin guardado previo restaura la progresión actual y puede volver a elegirse',()=>{
  const {apply,runs,state}=domSetup();
  runs("document.querySelector('#progression-preset').value='custom'");
  apply();
  assert.equal(runs('JSON.stringify(progression.map(c=>[c.root,c.type]))'),JSON.stringify([[0,'maj'],[5,'m7'],[7,'7'],[0,'maj']]));
  assert.equal(state.selected,0);
});

test('mi progresión: aplica el slot guardado aunque la progresión actual difiera',()=>{
  const {apply,runs,localStorage,state}=domSetup();
  localStorage.setItem('traste.customProgression.v1',JSON.stringify([{root:2,type:'maj',beats:4},{root:7,type:'m7',beats:2}]));
  runs("document.querySelector('#progression-preset').value='custom'");
  apply();
  assert.equal(runs('JSON.stringify(progression.map(c=>[c.root,c.type,c.beats]))'),JSON.stringify([[2,'maj',4],[7,'m7',2]]));
  assert.equal(state.selected,0);
  assert.match(runs("document.querySelector('#preset-status').textContent"),/Mi progresión/);
});

test('mi progresión: las plantillas no sobrescriben el slot guardado',()=>{
  const {apply,runs,localStorage}=domSetup();
  localStorage.setItem('traste.customProgression.v1',JSON.stringify([{root:0,type:'maj',beats:4}]));
  runs("document.querySelector('#progression-preset').value='jazz'");
  apply();
  assert.equal(localStorage.getItem('traste.customProgression.v1'),JSON.stringify([{root:0,type:'maj',beats:4}]));
  assert.equal(runs('progression.length'),4);
});
