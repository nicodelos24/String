// T-11 · Las secciones se guardan por índices: la guarda del invariante que
// hoy lo sostiene.
//
// La ficha dice que «si una tarjeta se borra del medio, los índices se corren».
// La medición sobre `526324a` muestra que el corrimiento **no ocurre** por una
// razón concreta: en memoria cada sección guarda la tarjeta (`items`) y
// `serializeSection` la traduce a índice **en el momento de guardar**. Mientras
// todo pase por esa puerta, el índice no puede quedar viejo.
//
// Esta guarda fija ese contrato con el código real de `sections.js`, no con una
// copia: si alguien «optimiza» el guardado cacheando los índices de cuando se
// cargó la sección, las pruebas se ponen rojas. Nace verde porque no hay
// defecto que corregir (la ficha es deuda de arquitectura, no una regresión);
// la prueba de que no es decorativa está en la evidencia de la ronda, con la
// mutación «índices cacheados» y su salida roja.
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');

// Mini-DOM: lo mínimo que consume sections.js al renderizar las filas. Es el
// mismo patrón de tests/sections-composer.test.cjs, recortado a lo que esta
// guarda necesita (no hay clics: solo se cargan secciones y se mueve la lista).
function setup(){
  function make(tag){
    const el={tag,dataset:{},attrs:{},handlers:{},onclick:null,disabled:false,open:false,type:'',value:'',textContent:'',className:''};
    el.children=[];
    el.append=(...kids)=>{kids.forEach(k=>{if(!k)return;el.children.push(k);k.parent=el;});};
    el.replaceChildren=(...kids)=>{el.children=[];el.append(...kids);};
    el.querySelectorAll=()=>[];
    el.closest=selector=>{
      let node=el;
      while(node){
        const cls=(node.attrs.class||'').split(' ').filter(Boolean);
        if((selector.startsWith('.')&&cls.includes(selector.slice(1)))||(selector==='[data-section]'&&node.dataset.section!==undefined))return node;
        node=node.parent;
      }
      return null;
    };
    el.setAttribute=(name,value)=>{if(name==='class')el.className=String(value);else el.attrs[name]=String(value);};
    el.removeAttribute=name=>{delete el.attrs[name];};
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
  const id=name=>{if(!byId.has(name))byId.set(name,make(name));return byId.get(name);};

  // Cuatro tarjetas distinguibles por su raíz: C, D, E, F.
  const progression=[
    {root:0,type:'maj',mode:'ionian',ghostMode:''},
    {root:2,type:'min',mode:'dorian',ghostMode:''},
    {root:4,type:'maj',mode:'ionian',ghostMode:''},
    {root:5,type:'maj',mode:'ionian',ghostMode:''},
  ];

  const ctx=vm.createContext({
    document:{querySelector:selector=>id(selector),getElementById:id,createElement:tag=>make(tag),addEventListener(){}},
    matchMedia:()=>({matches:true}),
    Event:class Event{constructor(type){this.type=type;}},
    MutationObserver:class MutationObserver{constructor(callback){this.callback=callback;}observe(){}},
    window:{handlers:{},addEventListener(n,f){this.handlers[n]=f;},dispatchEvent(){},StringSections:null},
    progression,
    noteName:i=>['C','D','E','F','G','A','B'][(i%7+7)%7],
    chordTypes:[{value:'maj',suffix:''},{value:'min',suffix:'m'}],
    modes:{ionian:{name:'Jónico'},dorian:{name:'Dórico'}},
    defaultChordMode:()=>'ionian',
    selectProgressionChord:()=>{},
    renderProgression:()=>{},
    draggingProgressionItem:false,
  });
  ctx.globalThis=ctx;
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../sections.js'),'utf8'),ctx);

  const run=code=>JSON.parse(JSON.stringify(vm.runInContext(code,ctx)));
  const runRaw=code=>vm.runInContext(code,ctx);
  return {
    ctx,progression,
    run,runRaw,
    load:value=>runRaw(`window.StringSections.load(${JSON.stringify(value)})`),
    serialize:()=>run('window.StringSections.serialize()'),
    // Las raíces que el guardado dice que suenan, en el orden de la sección.
    roots:saved=>saved.indices.map(index=>progression[index].root),
  };
}

test('borrar del medio una tarjeta que no es de la sección corre los índices y conserva las tarjetas',()=>{
  const t=setup();
  // La sección salta la tarjeta del medio (índice 1): es justo el caso que la
  // ficha describe como peligroso.
  t.load([{name:'Verso',repeat:1,indices:[0,2]}]);
  assert.deepEqual(t.serialize()[0].indices,[0,2]);
  // Se borra la tarjeta del medio, como removeProgressionChord: splice + autoguardado.
  t.runRaw('progression.splice(1,1)');
  const saved=t.serialize()[0];
  assert.deepEqual(saved.indices,[0,1],'los índices se corren con la lista');
  assert.deepEqual(t.roots(saved),[0,4],'pero la sección sigue apuntando a las mismas tarjetas (C y E)');
});

test('borrar una tarjeta de la sección saca esa sola y no toca a sus vecinas',()=>{
  const t=setup();
  t.load([{name:'Verso',repeat:1,indices:[0,1,2,3]}]);
  t.runRaw('progression.splice(2,1)'); // se borra E, del medio
  const saved=t.serialize()[0];
  assert.deepEqual(saved.indices,[0,1,2]);
  assert.deepEqual(t.roots(saved),[0,2,5],'quedan C, D y F: sale la tarjeta borrada, no la siguiente');
});

test('dos secciones que comparten la lista no se pisan al borrar del medio',()=>{
  const t=setup();
  t.load([
    {name:'Verso',repeat:1,indices:[0,1]},
    {name:'Estribillo',repeat:2,indices:[2,3]},
  ]);
  t.runRaw('progression.splice(1,1)'); // se borra D, que estaba en el verso
  const [verso,estribillo]=t.serialize();
  assert.deepEqual(verso.indices,[0]);
  assert.deepEqual(t.roots(verso),[0]);
  assert.deepEqual(estribillo.indices,[1,2],'la otra sección corre sus índices por su cuenta');
  assert.deepEqual(t.roots(estribillo),[4,5]);
  assert.equal(estribillo.repeat,2,'las repeticiones no se tocan al borrar tarjetas');
});

test('mover una tarjeta: el índice sigue a la tarjeta y la sección conserva su orden',()=>{
  const t=setup();
  t.load([{name:'Verso',repeat:1,indices:[0,1]}]);
  // Mover la primera tarjeta al final, como moveProgressionChord sin sección activa.
  t.runRaw('progression.push(progression.shift())');
  const saved=t.serialize()[0];
  assert.deepEqual(saved.indices,[3,0],'los índices siguen a las tarjetas, no a la posición');
  assert.deepEqual(t.roots(saved),[0,2],'y el orden propio de la sección (C, D) no cambia');
});

test('el guardado conserva la forma v1 y valida con el largo nuevo de la lista',()=>{
  const t=setup();
  t.load([{name:'Verso',repeat:2,indices:[0,1,2]}]);
  t.runRaw('progression.splice(1,1)');
  const saved=t.serialize();
  assert.deepEqual(Object.keys(saved[0]),['name','repeat','indices'],'la sección guardada no estrena campos: v1 intacta');
  assert.equal(saved[0].repeat,2);
  const validated=t.run(`validateSections(${JSON.stringify(saved)},progression.length)`);
  assert.deepEqual(validated,saved,'el mismo dato que se guarda pasa la validación de carga');
});

test('un índice fuera de rango se rechaza al cargar: no se recorta a silencio',()=>{
  const t=setup();
  // Un guardado al que le borraron tarjetas por fuera de la app no se reinterpreta:
  // la canción entera se rechaza en voz alta, en vez de sonar otra cosa.
  assert.throws(()=>t.run('validateSections([{name:"Verso",repeat:1,indices:[0,4]}],4)'),/Sección no válida/);
});

test('la reproducción usa los índices recalculados: suena la sección, no la lista vieja',()=>{
  const t=setup();
  t.load([{name:'Verso',repeat:1,indices:[0,2]}]);
  t.runRaw('progression.splice(1,1)');
  const entries=t.run('window.StringSections.playback()');
  assert.deepEqual(entries.map(entry=>entry.source.root),[0,4],'el acompañamiento sigue a las tarjetas de la sección');
  assert.match(entries[0].section,/^Verso · vuelta 1\/1$/);
});
