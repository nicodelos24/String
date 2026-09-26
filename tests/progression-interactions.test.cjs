const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function setup() {
  const clock={now:0};
  const elements=new Map();
  const list={
    handlers:{},cards:[],
    addEventListener(name,fn){this.handlers[name]=fn;},
    querySelectorAll(){return this.cards;},
    getAnimations(){return [];},
    querySelector(){return {focus(){}};},
    getBoundingClientRect(){return {top:0,left:0,right:100,bottom:100,width:100,height:100};},
  };
  const card=index=>({dataset:{index:String(index)}});
  const target=index=>({
    detail:1,
    preventDefault(){},stopImmediatePropagation(){},
    target:{closest:selector=>selector==='.progression-card'?card(index):null},
  });
  const noop={addEventListener(){},getAnimations(){return [];},animate(){}};
  elements.set('#progression-view',noop);
  const duplicated=[];
  const ctx=vm.createContext({
    document:{querySelector:selector=>selector==='#progression'?list:(elements.get(selector)??noop)},
    window:{matchMedia:()=>({matches:false}),addEventListener(){}},
    performance:{now:()=>clock.now},
    progression:[{id:'a'},{id:'b'},{id:'c'}],
    draggingProgressionItem:null,
    duplicateProgressionChord(index){duplicated.push(index);},
    moveProgressionChord(){},removeProgressionChord(){},renderProgression(){},selectProgressionChord(){},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../progression-interactions.js'),'utf8'),ctx);
  const click=(index,at)=>{clock.now=at;list.handlers.click(target(index));};
  return {click,duplicated:()=>duplicated.slice()};
}

test('dos clics aislados y deliberados duplican la tarjeta',()=>{
  const {click,duplicated}=setup();
  click(1,1000);
  click(1,1150);
  assert.deepEqual(duplicated(),[1]);
});

test('marcar el tempo a golpes nunca duplica la tarjeta',()=>{
  const {click,duplicated}=setup();
  // 240 BPM es el tempo más alto que acepta la app: 250 ms entre golpes.
  let now=1000;
  for (const gap of [250, 300, 400, 500, 600, 800, 1000, 250, 300]) {
    click(1,now);
    now+=gap;
    click(1,now);
    now+=gap;
  }
  assert.deepEqual(duplicated(),[],'Ninguno de esos golpes duplica la tarjeta');
});

test('un golpe perdido en medio del ritmo tampoco duplica',()=>{
  const {click,duplicated}=setup();
  // Dos clics rapidísimos en pleno ritmo no son una intención de duplicar:
  // hace falta que el primero venga después de una pausa.
  click(1,0);
  click(1,400);
  click(1,630);
  assert.deepEqual(duplicated(),[]);
  click(1,1700);
  click(1,1800);
  assert.deepEqual(duplicated(),[],'En plena secuencia no se duplica');
  click(1,5000);
  click(1,5100);
  assert.deepEqual(duplicated(),[1],'Tras una pausa, dos clics seguidos sí duplican');
});

test('clics en tarjetas distintas nunca duplican',()=>{
  const {click,duplicated}=setup();
  click(0,0);
  click(1,50);
  click(2,100);
  assert.deepEqual(duplicated(),[]);
});
