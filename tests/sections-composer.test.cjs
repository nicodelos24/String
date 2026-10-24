// T-41 · QA-MOD-03 · Compositor visual de bloques.
// El panel «Secciones del tema» es el compositor del estado de trabajo. Esta
// ronda le agrega los controles de interacción del plan: «Repetir» (incrementa
// la ×N de la referencia del arreglo) y «Duplicar bloque» (crea una copia
// independiente con acordes propios, viajan por la API real
// `duplicateProgressionChord` de app.js, clonada aquí con la misma línea que
// app.js:1235 usa). Prueba roja primero: los cuatro casos nacen fallando sin
// el cambio, como manda PACTO §5 para un caso de defecto/interacción nueva.
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');

// Mini-DOM: lo mínimo que consume sections.js al renderizar filas. Cada
// elemento guarda sus hijos, sus atributos y sus manejadores; el `<ol>` de la
// lista expone `children` en vivo para que el test pueda pulsar los botones.
function setup(){
  const root=[];
  function make(tag){
    const el={tag,dataset:{},attrs:{},handlers:{},onclick:null,disabled:false,open:false,type:'',value:'',textContent:'',className:''};
    el.children=[];
    el.append=(...kids)=>{kids.forEach(k=>{if(!k)return;el.children.push(k);k.parent=el;});};
    el.replaceChildren=(...kids)=>{el.children=[];el.append(...kids);};
    el.querySelectorAll=selector=>[];
    // closest 101: el asa del arrastre sube hasta la fila por clase o por id.
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
    // Cuando las cosas se clickan a mano, el `animate` del workspace no pasa:
    // reduced motion activo.
    matchMedia:()=>({matches:true}),
    Event:class Event{constructor(type){this.type=type;}},
    MutationObserver:class MutationObserver{constructor(callback){this.callback=callback;}observe(){}},
    window:{handlers:{},addEventListener(n,f){this.handlers[n]=f;},dispatchEvent(){},StringSections:null},
    Event2:null,
    // Globales de app.js que la vista consume.
    progression,
    noteName:i=>['C','D','E','F','G','A','B'][(i%7+7)%7],
    chordTypes:[{value:'maj',suffix:''},{value:'min',suffix:'m'}],
    modes:{ionian:{name:'Jónico'},dorian:{name:'Dórico'},phrygian:{name:'Frigio'}}
      ,defaultChordMode:()=> 'ionian',
    selectProgressionChord:()=>{},
    renderProgression:()=>{},
    draggingProgressionItem:false,
    renderTask:null,
  });
  ctx.globalThis=ctx;
  // La API existente de app.js:2337: clonar la tarjeta y meterla inmediatamente
  // después de la original, y avisar a StringSections con `include`. Es la
  // misma línea `progression.splice(index + 1, 0, {...progression[index]})`.
  vm.runInContext(`function duplicateProgressionChord(index){
    if(!Number.isInteger(index)||!progression[index]||progression.length>=4096||draggingProgressionItem)return;
    progression.splice(index+1,0,{...progression[index]});
    globalThis.StringSections&&globalThis.StringSections.include&&globalThis.StringSections.include(progression[index],progression[index+1]);
  }`,ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../sections.js'),'utf8'),ctx);

  // helpers del test
  const run=code=>JSON.parse(JSON.stringify(vm.runInContext(code,ctx)));
  const runRaw=code=>vm.runInContext(code,ctx);
  const serialize=()=>run('window.StringSections.serialize()');
  const load=value=>{runRaw(`window.StringSections.load(${JSON.stringify(value)})`);};
  const list=id('section-list');
  const rows=()=>list.children;
  const rowButtons=index=>{
    // [label, grip, ↑, ↓, ×, Repetir, Duplicar] en el orden del render.
    return rows()[index].children.filter(node=>node.tag==='button'||node.onclick);
  };
  const byText=(index,text)=>rows()[index].children.find(node=>node.textContent===text);
  const byLabel=partial=>rows()[index=undefined??0];
  return {ctx,run,runRaw,serialize,load,id,rows,rowButtons,byText,progression};
}

test('«Repetir» incrementa la ×N de la fila y respeta el techo 8',()=>{
  const t=setup();
  t.load([{name:'Verso',repeat:7,indices:[0,1]}]);
  let repeat=t.byText(0,'Repetir');
  assert.ok(repeat,'la fila tiene el control «Repetir» visible y con su texto');
  assert.equal(t.serialize()[0].repeat,7,'antes del clic la sección sigue con 7');
  repeat.onclick();
  assert.equal(t.serialize()[0].repeat,8,'la referencia del arreglo pasa de ×7 a ×8');
  // Cada click re-renderiza la fila: el control saturado es el botón nuevo.
  repeat=t.byText(0,'Repetir');
  assert.equal(repeat.disabled,true,'en el techo la ×N no puede crecer: control deshabilitado');
  repeat.onclick();
  assert.equal(t.serialize()[0].repeat,8,'el clic sobre el control saturado no rompe el techo');
});

test('«Duplicar bloque» crea una copia independiente con acordes propios',()=>{
  const t=setup();
  t.load([{name:'Verso',repeat:1,indices:[0,1]}]);
  const copy=t.byText(0,'Duplicar');
  assert.ok(copy,'la fila tiene el control «Duplicar» visible y con su texto');
  copy.onclick();
  const data=t.serialize();
  assert.equal(data.length,2,'el arreglo ahora tiene dos entradas: Verso y su copia');
  assert.equal(data[0].name,'Verso');
  assert.equal(data[1].name,'Verso (copia)','la copia sale con nombre único: la dedupción de workingToStructure no la colapsa');
  assert.notEqual(data[1].indices[0],data[0].indices[0],'los acordes de la copia son tarjetas NUEVAS de la progresión, no los mismos índices');
  // Independencia real: editar la tarjeta clonada no toca al original.
  const cloned=data[1].indices[0];
  t.progression[cloned].root=7;
  assert.equal(t.progression[data[0].indices[0]].root,0,'el acorde del original queda igual');
  assert.equal(data[1].name,'Verso (copia)');
});

test('los controles comparten la misma acción de una sola pulsación (sin doble clic ambiguo)',()=>{
  const t=setup();
  t.load([{name:'Verso',repeat:1,indices:[0,1]}]);
  const repeat=t.byText(0,'Repetir');
  repeat.onclick();repeat.onclick();
  assert.equal(t.serialize()[0].repeat,3,'dos pulsaciones del control dan dos incrementos: cada click pesa una vez');
});

test('cada botón nuevo tiene nombre accesible con el nombre de la sección',()=>{
  const t=setup();
  t.load([{name:'Verso',repeat:1,indices:[0,1]}]);
  const labeled=t.rows()[0].children.filter(button=>{
    const label=button.attrs['aria-label'];
    return label!==undefined&&(label.startsWith('Repetir ')||label.startsWith('Duplicar '));
  });
  assert.equal(labeled.length,2,'los dos controles del bloque llevan su aria-label');
  assert.equal(labeled[0].attrs['aria-label'],'Repetir Verso');
  assert.equal(labeled[1].attrs['aria-label'],'Duplicar bloque Verso');
});

test('duplicar conserva el orden: la copia viaja después del original y la vista sigue mostrando el nombre del bloque activo con su ×N',()=>{
  const t=setup();
  t.load([{name:'Verso',repeat:2,indices:[0,1]}]);
  const label=t.id('section-view-label');
  assert.equal(label.textContent,'Todos los acordes','sin fila activa la etiqueta es la de siempre');
  // Seleccionar la fila: el botón de la fila es el que se pulsa al abrir la vista.
  const select=t.rows()[0].children.find(node=>node.className==='section-select');
  select.onclick();
  assert.equal(label.textContent,'Verso · ×2','la etiqueta muestra qué bloque y qué repetición se están editando');
  const data=t.serialize();const before=data[0].indices;
  t.byText(0,'Duplicar').onclick();
  const after=t.serialize();
  assert.equal(after.length,2);
  assert.equal(after[0].name,'Verso','la fila original sigue primera');
  assert.equal(after[1].name,'Verso (copia)','la copia se inserta inmediatamente después del original');
  assert.deepEqual(after[0].indices,before,'los índices del original no cambian');
});
