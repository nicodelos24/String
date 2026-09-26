// Duplicación de tarjetas con doble clic: al volver a dejar el tempo solo en el
// botón Tempo, el doble clic recupera su reglas simple de siempre.
const {test}=require('node:test');
const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../progression-interactions.js'),'utf8');

function setup() {
  const progression=[{root:'C',type:'maj'},{root:'D',type:'min'},{root:'E',type:'maj'},{root:'F',type:'maj'}];
  const cards=progression.map((chord,index)=>({
    dataset:{index:String(index)},
    getBoundingClientRect(){return {left:0,top:0,width:100,height:80};},
    querySelector(selector){return selector.includes('beats')?{value:'1',addEventListener(){}}:null;},
    querySelectorAll(){return [];},
    closest(selector){return selector.includes('progression-card')?this:null;},
    setAttribute(){},classList:{add(){},remove(){},contains(){return false;}},
    focus(){},contains(){return false;},get textContent(){return '';},set textContent(value){},
  }));
  const list={
    querySelectorAll(){return cards;},
    querySelector(selector){
      const match=/data-index="(\d+)"/.exec(selector);
      return match?cards[Number(match[1])]:null;},
    addEventListener(name,fn){this.handlers[name]=fn;},handlers:{},
    getAnimations(){return [];},classList:{toggle(){return false;}},scrollTop:0,scrollLeft:0,
    getBoundingClientRect(){return {left:0,top:0,width:400,height:80};},
  };
  const viewButton={addEventListener(){},setAttribute(){},title:'',getAttribute(){return null;}};
  const document={
    querySelector:selector=>selector==='#progression'?list:selector==='#progression-view'?viewButton:null,
    querySelectorAll:()=>[],
    addEventListener(){},createElement:()=>({style:{},classList:{add(){},remove(){}},addEventListener(){},appendChild(){},setAttribute(){}}),
    documentElement:{style:{setProperty(){}}},body:{appendChild(){},classList:{add(){},remove(){}}},
  };
  const context=vm.createContext({
    document,window:{addEventListener(){},innerHeight:800,matchMedia:()=>({matches:false})},
    performance:{now:()=>0},setTimeout,clearTimeout,requestAnimationFrame:fn=>fn(),
  });
  context.globalThis=context;
  // Globales que `app.js` expone y este módulo consume.
  const log=[];
  context.progression=progression;
  context.selectProgressionChord=()=>{};
  context.duplicateProgressionChord=index=>{log.push(index);};
  const duplicated=()=>log.slice();
  vm.runInContext(source,context);
  const click=(index,now,detail=1)=>{
    context.performance.now=()=>now;
    const event={detail,target:cards[index],preventDefault(){},stopImmediatePropagation(){}};
    list.handlers.click(event);
  };
  return {click,duplicated};
}

test('dos clics seguidos duplican la tarjeta',()=>{
  const {click,duplicated}=setup();
  click(1,1000);
  click(1,1150);
  assert.deepEqual(duplicated(),[1]);
});

test('dos clics separados en el tiempo no duplican',()=>{
  const {click,duplicated}=setup();
  click(1,1000);
  click(1,1600);
  assert.deepEqual(duplicated(),[],'Con más de 250 ms entre clics es una selección normal');
  click(2,2000);
  click(2,2250);
  assert.deepEqual(duplicated(),[],'El par tiene que caber en menos de 250 ms');
});

test('un par de clics a 300 ms ya no duplica la tarjeta',()=>{
  const {click,duplicated}=setup();
  click(1,1000);
  click(1,1300);
  assert.deepEqual(duplicated(),[]);
  click(1,2000);
  click(1,2200);
  assert.deepEqual(duplicated(),[1],'Un par a 200 ms sigue duplicando');
});

test('clics en tarjetas distintas nunca duplican',()=>{
  const {click,duplicated}=setup();
  click(0,1000);
  click(1,1050);
  click(2,1100);
  assert.deepEqual(duplicated(),[]);
});

test('tras duplicar, el siguiente clic empieza de nuevo',()=>{
  const {click,duplicated}=setup();
  click(1,1000);
  click(1,1100);
  click(1,1200);
  assert.deepEqual(duplicated(),[1],'El tercer clic no duplica otra vez');
  click(1,1300);
  assert.deepEqual(duplicated(),[1,1]);
});

test('el clic con detalle 0 (sintético) no cuenta como doble clic',()=>{
  const {click,duplicated}=setup();
  click(1,1000,0);
  click(1,1050,0);
  assert.deepEqual(duplicated(),[]);
});
