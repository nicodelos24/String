// T-07 · Edición directa de nombre y repeticiones de sección.
// Hoy la única forma de corregir una sección es borrarla y crearla de nuevo; el
// control «Repetir» de T-41 suma de a una vuelta y no permite fijar una ×N
// concreta. Esta prueba nace roja sobre 28f7759: exige el control «Editar», un
// formulario en la propia fila con los valores actuales, y que guardar cambie
// el estado real (serializado y reproducción), con validación visible.
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');

// Mini-DOM: el mismo contrato que tests/sections-composer.test.cjs usa para
// sections.js. Acá los <input> guardan `value` y los botones su `onclick`; el
// formulario se busca por id dentro de la fila, porque se crea en cada render.
function setup(){
  const root=[];
  function make(tag){
    const el={tag,dataset:{},attrs:{},handlers:{},onclick:null,disabled:false,open:false,type:'',value:'',textContent:'',className:''};
    el.children=[];
    el.append=(...kids)=>{kids.forEach(k=>{if(!k)return;el.children.push(k);k.parent=el;});};
    el.replaceChildren=(...kids)=>{el.children=[];el.append(...kids);};
    el.querySelectorAll=selector=>[];
    el.closest=selector=>{
      let node=el;
      while(node){
        const cls=(node.attrs.class||'').split(' ').filter(Boolean);
        if((selector.startsWith('.')&&cls.includes(selector.slice(1)))||(selector==='[data-section]'&&node.dataset.section!==undefined))return node;
        node=node.parent;
      }
      return null;
    };
    el.setAttribute=(name,value)=>{
      if(name==='class')el.className=String(value);else el.attrs[name]=String(value);
    };
    el.removeAttribute=name=>{delete el.attrs[name];};
    el.getSelection=()=>[];
    el.addEventListener=(name,fn)=>{(el.handlers[name]=el.handlers[name]||[]).push(fn);};
    el.focus=()=>{el.focused=true;};
    el.setPointerCapture=()=>{};el.hasPointerCapture=()=>false;el.releasePointerCapture=()=>{};
    el.classList={
      add(c){el.className=[...new Set(el.className.split(' ').filter(Boolean).concat([c]))].join(' ');},
      remove(c){el.className=el.className.split(' ').filter(x=>x!==c).join(' ');},
      toggle(c,on){const has=el.className.split(' ').includes(c);const value=on===undefined?!has:Boolean(on);
        if(value&&!has)el.classList.add(c);if(!value&&has)el.classList.remove(c);return value;},
      contains(c){return el.className.split(' ').includes(c);},
    };
    return el;
  }
  const byId=new Map();
  const id=id=>{if(!byId.has(id))byId.set(id,make(id));return byId.get(id);};

  const progression=[
    {root:0,type:'maj',mode:'ionian',ghostMode:''},
    {root:2,type:'min',mode:'dorian',ghostMode:''},
    {root:4,type:'maj',mode:'ionian',ghostMode:''},
    {root:5,type:'maj',mode:'ionian',ghostMode:''},
  ];

  const ctx=vm.createContext({
    document:{
      querySelector:selector=>id(selector),
      getElementById:id,
      createElement:tag=>make(tag),
      addEventListener(){},
    },
    matchMedia:()=>({matches:true}),
    Event:class Event{constructor(type){this.type=type;}},
    MutationObserver:class MutationObserver{constructor(callback){this.callback=callback;}observe(){}},
    window:{handlers:{},addEventListener(n,f){this.handlers[n]=f;},dispatchEvent(){},StringSections:null},
    progression,
    noteName:i=>['C','D','E','F','G','A','B'][(i%7+7)%7],
    chordTypes:[{value:'maj',suffix:''},{value:'min',suffix:'m'}],
    modes:{ionian:{name:'Jónico'},dorian:{name:'Dórico'}},
    defaultChordMode:()=> 'ionian',
    selectProgressionChord:()=>{},
    renderProgression:()=>{},
    draggingProgressionItem:false,
  });
  ctx.globalThis=ctx;
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../sections.js'),'utf8'),ctx);

  const run=code=>JSON.parse(JSON.stringify(vm.runInContext(code,ctx)));
  const runRaw=code=>vm.runInContext(code,ctx);
  const serialize=()=>run('window.StringSections.serialize()');
  const load=value=>{runRaw(`window.StringSections.load(${JSON.stringify(value)})`);};
  const list=id('section-list');
  const rows=()=>list.children;
  const byText=(index,text)=>rows()[index].children.find(node=>node.textContent===text);
  function descendants(el,out=[]){
    for(const kid of el.children||[]){out.push(kid);descendants(kid,out);}
    return out;
  }
  const field=(index,fieldId)=>descendants(rows()[index]).find(node=>node.attrs.id===fieldId);
  const status=()=>id('section-status').textContent;
  return {ctx,run,runRaw,serialize,load,id,rows,byText,field,status,progression};
}

test('la fila ofrece «Editar» y el formulario abre con el nombre y las repeticiones actuales',()=>{
  const t=setup();
  t.load([{name:'Verso',repeat:2,indices:[0,1]}]);
  const open=t.byText(0,'Editar');
  assert.ok(open,'la fila de la sección tiene el control «Editar»');
  assert.equal(open.attrs['aria-label'],'Editar Verso','el control dice qué sección edita');
  open.onclick();
  const name=t.field(0,'section-edit-name'),repeat=t.field(0,'section-edit-repeat');
  assert.ok(name&&repeat,'el formulario de edición vive en la fila y trae los dos campos');
  assert.equal(name.value,'Verso','el nombre abre con el valor actual, no vacío');
  assert.equal(String(repeat.value),'2','las repeticiones abren con la ×N actual');
  assert.ok(t.field(0,'section-edit-save'),'hay un botón de guardar identificable');
  assert.ok(t.field(0,'section-edit-cancel'),'hay un botón de cancelar identificable');
});

test('guardar el nombre y la ×N cambia el estado serializado y la reproducción',()=>{
  const t=setup();
  t.load([{name:'Verso',repeat:2,indices:[0,1]}]);
  t.byText(0,'Editar').onclick();
  t.field(0,'section-edit-name').value='  Puente  ';
  t.field(0,'section-edit-repeat').value='5';
  t.field(0,'section-edit-save').onclick();
  const data=t.serialize();
  assert.equal(data[0].name,'Puente','el nombre se guarda recortado, sin espacios de sobra');
  assert.equal(data[0].repeat,5,'la ×N se fija en el valor pedido, no de a un incremento');
  assert.deepEqual(data[0].indices,[0,1],'editar nombre/repeticiones no toca el rango de tarjetas');
  assert.equal(t.run('window.StringSections.playback().length'),10,'la reproducción usa la ×5 nueva');
  assert.match(t.status(),/Puente/,'el estado visible confirma la edición');
  assert.equal(t.byText(0,'Editar')?.attrs['aria-label'],'Editar Puente','la fila re-renderizada ya lleva el nombre nuevo');
});

test('la vista activa muestra el nombre y la ×N editados',()=>{
  const t=setup();
  t.load([{name:'Verso',repeat:1,indices:[0,1]}]);
  t.rows()[0].children.find(node=>node.className==='section-select').onclick();
  assert.equal(t.id('section-view-label').textContent,'Verso · ×1');
  t.byText(0,'Editar').onclick();
  t.field(0,'section-edit-name').value='Puente';
  t.field(0,'section-edit-repeat').value='3';
  t.field(0,'section-edit-save').onclick();
  assert.equal(t.id('section-view-label').textContent,'Puente · ×3','la etiqueta de la vista sigue a la edición');
});

test('el formulario no deja guardar valores inválidos y lo dice en el estado visible',()=>{
  const t=setup();
  t.load([{name:'Verso',repeat:2,indices:[0,1]},{name:'Puente',repeat:1,indices:[2,3]}]);
  t.byText(0,'Editar').onclick();
  const save=t.field(0,'section-edit-save');
  for(const [name,repeat,expected] of [
    ['   ','2',/nombre/i],
    ['a'.repeat(41),'2',/40/],
    ['Verso','0',/1 a 8/],
    ['Verso','9',/1 a 8/],
    ['Verso','2.5',/1 a 8/],
    ['Puente','2',/Ya hay una sección/i],
  ]){
    t.field(0,'section-edit-name').value=name;
    t.field(0,'section-edit-repeat').value=repeat;
    save.onclick();
    assert.match(t.status(),expected,`«${name}» ×${repeat} se rechaza con un mensaje legible`);
    assert.equal(t.serialize()[0].name,'Verso',`el rechazo de «${name}» ×${repeat} no altera la sección`);
    assert.ok(t.field(0,'section-edit-name'),'el formulario sigue abierto para corregir');
  }
});

test('cancelar deja la sección como estaba',()=>{
  const t=setup();
  t.load([{name:'Verso',repeat:2,indices:[0,1]}]);
  t.byText(0,'Editar').onclick();
  t.field(0,'section-edit-name').value='Otro';
  t.field(0,'section-edit-repeat').value='7';
  t.field(0,'section-edit-cancel').onclick();
  const data=t.serialize();
  assert.equal(data[0].name,'Verso');
  assert.equal(data[0].repeat,2);
  assert.equal(t.field(0,'section-edit-name'),undefined,'el formulario se cierra al cancelar');
  assert.ok(t.byText(0,'Editar'),'la fila vuelve a ofrecer «Editar»');
});
