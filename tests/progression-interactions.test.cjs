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

// ---------------------------------------------------------------------------
// Flechas y foco en secciones (T-33 / QA-R02 y T-34 / QA-R03).
// El sandbox reproduce lo que hace renderProgression (app.js:977):
// con una sección activa, las tarjetas fuera de ella NO están en el DOM,
// así que `list.querySelector('[data-index=…]')` devuelve null para esas.
// Los ids 'C','D','E','F' marcan al acorde, no al índice: al borrar, los
// índices globales se corren y el foco se rastrea por lo que se le pone
// encima — como en el navegador real, que re-renderiza los nodos.
// ---------------------------------------------------------------------------
function setupKeyboard(options={}) {
  const full=[
    {id:'C',root:'C',type:'maj'},
    {id:'D',root:'D',type:'min'},
    {id:'E',root:'E',type:'maj'},
    {id:'F',root:'F',type:'maj'},
  ];
  const progression=options.count?full.slice(0,options.count):full;
  const salida={removeLog:[],focusLog:[],moveLog:[],selectLog:[],addFocus:false};
  let cards=[];
  function buildCard(chord){
    return {
      chord,
      dataset:{index:String(progression.indexOf(chord))},
      getBoundingClientRect(){return {left:0,top:0,width:100,height:80};},
      focus(){salida.focusLog.push(chord.id);},
      closest(selector){
        if(selector.includes('progression-card')||selector.includes('data-index'))return this;
        return null;
      },
      animate(){return {finished:Promise.resolve()};},
      querySelector(){return null;},
      querySelectorAll(){return [];},
      setAttribute(){},classList:{add(){},remove(){},contains(){return false;}},
      contains(){return false;},
    };
  }
  // La sección guarda referencias a los acordes, como sections.js: los índices
  // que sobreviven a un borrado son los del re-render, no los de antes.
  // OJO: sin sección es `null`, no `[]` (un arreglo vacío es truthy y mentiría).
  const activeItems=options.section!==undefined?options.section.map(i=>progression[i]):null;
  const visibleIndexes=()=>{
    const items=activeItems?activeItems.filter(item=>progression.includes(item)):progression;
    return items.map(item=>progression.indexOf(item));
  };
  const rebuild=()=>{cards=progression.map(buildCard);};
  rebuild();
  const list={
    querySelectorAll(selector){return selector==='.progression-card'?cards:[];},
    querySelector(selector){
      const match=/data-index="(-?\d+)"/.exec(selector);
      if(!match)return null;
      const target=Number(match[1]);
      return visibleIndexes().includes(target)?cards.find(card=>card.dataset.index===String(target)):null;
    },
    getAnimations(){return [];},classList:{toggle(){return false;}},
    scrollTop:0,scrollLeft:0,
    getBoundingClientRect(){return {left:0,top:0,width:400,height:80};},
    addEventListener(name,fn){
      if(options.overrides?.[name])return;
      this.handlers[name]=fn;
    },handlers:{},
  };
  const viewButton={addEventListener(){},setAttribute(){},title:'',getAttribute(){return null;}};
  const lock=options.lock?{checked:true}:null;
  const addBtn={focus(){salida.addFocus=true;},addEventListener(){}};
  const child={type:'button',closest(selector){return selector.includes('button')||selector.includes('select')||selector.includes('label')?child:null;}};
  const document={
    querySelector:selector=>selector==='#progression'?list
      :selector==='#progression-view'?viewButton
      :selector==='#fret-scale-lock'?lock
      :selector==='#legend-add-chord'?addBtn:null,
    querySelectorAll:()=>[],
    addEventListener(){},createElement:()=>({style:{},classList:{add(){},remove(){}},addEventListener(){},appendChild(){},setAttribute(){}}),
    documentElement:{style:{setProperty(){}}},body:{appendChild(){},classList:{add(){},remove(){}}},
  };
  const context=vm.createContext({
    document,
    window:{addEventListener(){},innerHeight:800,matchMedia:()=>({matches:false})},
    performance:{now:()=>0},setTimeout,clearTimeout,requestAnimationFrame:fn=>fn(),
  });
  context.globalThis=context;
  // Globales que `app.js` expone. El doble del borrado rebanca la lista y
  // re-renderiza las tarjetas, exactamente como hace removeProgressionChord.
  context.progression=progression;
  context.draggingProgressionItem=null;
  context.selectProgressionChord=index=>{salida.selectLog.push(index);};
  context.duplicateProgressionChord=()=>{};
  context.removeProgressionChord=index=>{
    if(!progression[index])return;
    salida.removeLog.push(index);
    progression.splice(index,1);
    rebuild();
  };
  // Sin sección, mover reordena la lista global, como app.js:1120; con sección,
  // el orden lo gobierna sections.js y el arreglo global queda igual.
  context.moveProgressionChord=(from,to)=>{
    salida.moveLog.push({from,to});
    if(!activeItems){const [item]=progression.splice(from,1);progression.splice(to,0,item);rebuild();}
  };
  if(activeItems)context.window.StringSections={visible:()=>activeItems.filter(item=>progression.includes(item)).map(item=>({item,index:progression.indexOf(item)})),
    adjacent(index,delta){const items=activeItems.filter(item=>progression.includes(item));return progression.indexOf(items[items.indexOf(progression[index])+delta]);},
    move(){return false;}};
  vm.runInContext(source,context);
  const key=(index,detail={})=>{
    const card=cards.find(card=>card.dataset.index===String(index));
    assert.ok(card,'preparación: la tarjeta enfocada tiene que estar en la vista');
    list.handlers.keydown({key:detail.key,altKey:!!detail.alt,ctrlKey:!!detail.ctrl,
      target:detail.target||card,preventDefault(){},stopImmediatePropagation(){}});
  };
  const menu=(index)=>{
    const card=cards.find(card=>card.dataset.index===String(index));
    list.handlers.contextmenu({target:card,preventDefault(){}});
  };
  return {key,menu,order:visibleIndexes,salida,child,
    focus:()=>salida.focusLog, remove:()=>salida.removeLog, select:()=>salida.selectLog, move:()=>salida.moveLog};
}

// ---- T-33 / QA-R02 · las flechas recorren el orden de la sección ----

test('sección salteada [0,2,3]: ↓ desde la primera pasa a la segunda de la sección',()=>{
  const k=setupKeyboard({section:[0,2,3]});
  k.key(0,{key:'ArrowDown'});
  assert.deepEqual(k.focus(),['E'],'El foco va a la posición visible siguiente, no al índice global +1');
});

test('sección reordenada [2,0]: ↓ desde el 2 pasa al 0',()=>{
  const k=setupKeyboard({section:[2,0]});
  k.key(2,{key:'ArrowDown'});
  assert.deepEqual(k.focus(),['C'],'`[0,2,3]` invertido: lo visible manda sobre la lista');
});

test('sección salteada: ↑ desde la segunda de la sección sube dentro de ella',()=>{
  const k=setupKeyboard({section:[0,2,3]});
  k.key(2,{key:'ArrowUp'});
  assert.deepEqual(k.focus(),['C']);
});

test('sin sección, ↓ y ↑ recorren la lista completa como siempre',()=>{
  const k=setupKeyboard();
  k.key(0,{key:'ArrowDown'});
  assert.deepEqual(k.focus(),['D']);
  k.key(2,{key:'ArrowUp'});
  assert.deepEqual(k.focus(),['D','D']);
});

test('↑ en la primera y ↓ en la última no mueven el foco ni seleccionan ni reordenan',()=>{
  const k=setupKeyboard({section:[0,2,3]});
  k.key(0,{key:'ArrowUp'});
  k.key(3,{key:'ArrowDown'});
  assert.deepEqual(k.focus(),[]);
  assert.deepEqual(k.select(),[]);
  assert.deepEqual(k.remove(),[]);
  assert.deepEqual(k.order(),[0,2,3],'Lo visible queda como estaba: las flechas solo enfocan');
});

test('los controles hijos conservan sus teclas',()=>{
  const k=setupKeyboard({section:[0,2,3]});
  k.key(0,{key:'ArrowDown',target:k.child});
  assert.deepEqual(k.focus(),[],'El manejador no interfiere con las teclas del control');
  k.key(0,{key:'Delete',target:k.child});
  assert.deepEqual(k.remove(),[],'Y el Supr de un control heredado tampoco borra');
});

test('Alt+→ sigue moviendo por el orden de la sección',()=>{
  const k=setupKeyboard({section:[0,2,3]});
  k.key(0,{key:'ArrowRight',alt:true});
  assert.deepEqual(k.move(),[{from:0,to:2}],'El destino lo decide StringSections.adjacent, no index+1');
  assert.deepEqual(k.focus(),['C'],'La tarjeta queda en la sección, no en la lista global');
});

test('Enter y Espacio siguen seleccionando la tarjeta enfocada',()=>{
  const k=setupKeyboard({section:[0,2,3]});
  k.key(2,{key:'Enter'});
  assert.deepEqual(k.select(),[2]);
  assert.deepEqual(k.focus(),['E']);
  k.key(2,{key:' '});
  assert.deepEqual(k.select(),[2,2]);
});

// ---- T-34 / QA-R03 · el foco sobrevive al borrado dentro de la sección ----

test('sección [0,2,3]: Supr sobre la primera enfoca la siguiente visible',()=>{
  const k=setupKeyboard({section:[0,2,3]});
  k.key(0,{key:'Delete'});
  assert.deepEqual(k.remove(),[0]);
  assert.deepEqual(k.focus(),['E'],'La siguiente tarjeta visible, con su índice del re-render');
});

test('sección [0,2,3]: Supr de la última visible enfoca la anterior',()=>{
  const k=setupKeyboard({section:[0,2,3]});
  k.key(3,{key:'Delete'});
  assert.deepEqual(k.remove(),[3]);
  assert.deepEqual(k.focus(),['E']);
});

test('lista completa: Supr conserva el foco como siempre',()=>{
  const k=setupKeyboard();
  k.key(1,{key:'Delete'});
  assert.deepEqual(k.remove(),[1]);
  assert.deepEqual(k.focus(),['E'],'El que sigue, que tras re-render es data-index 1');
  k.key(2,{key:'Delete'});
  assert.deepEqual(k.focus(),['E','E'],'Borrar la última: la anterior, que tras re-render es data-index 1');
});

test('Ctrl+Supr se comporta igual dentro de la sección',()=>{
  const k=setupKeyboard({section:[0,2,3]});
  k.key(0,{key:'Delete',ctrl:true});
  assert.deepEqual(k.remove(),[0]);
  assert.deepEqual(k.focus(),['E']);
});

test('clic derecho en sección también conserva el foco',()=>{
  const k=setupKeyboard({section:[0,2,3]});
  k.menu(0);
  assert.deepEqual(k.remove(),[0]);
  assert.deepEqual(k.focus(),['E'],'Mismo defecto por el otro camino de borrado');
});

test('el candado del mástil bloquea el borrado por teclado',()=>{
  const k=setupKeyboard({section:[0,2,3],lock:true});
  k.key(0,{key:'Delete'});
  assert.deepEqual(k.remove(),[]);
  assert.deepEqual(k.focus(),[]);
});

test('borrar el último acorde enfoca la acción de añadir',()=>{
  const k=setupKeyboard({count:1});
  k.key(0,{key:'Delete'});
  assert.deepEqual(k.remove(),[0]);
  assert.equal(k.salida.addFocus,true,'Sin vista que enfocar, la acción disponible es añadir');
});
