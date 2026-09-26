const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const SOURCE=fs.readFileSync(path.join(__dirname,'../youtube-player.js'),'utf8');
const URL_SOURCE=fs.readFileSync(path.join(__dirname,'../youtube-url.js'),'utf8');

// `fail` es idempotente porque YouTube repite onError; aquí se dispara las veces que haga falta.
function setup({onReady=true,duration=1000}={}) {
  const store=new Map();
  // El HTML arranca con la caja del video y el enlace externo ocultos.
  const startsHidden=new Set(['youtube-video-wrap','youtube-external']);
  function element(key) {
    if(!store.has(key))store.set(key,{
      value:'',checked:key==='youtube-float',disabled:false,title:'',href:'',textContent:'',
      hidden:startsHidden.has(key),inert:false,clientWidth:320,afterCalls:0,
      _children:[],_class:'',_style:{},
      listeners:{},_attrs:{'aria-expanded':'false','aria-label':''},
      get innerHTML(){return this._html||'';},set innerHTML(v){this._html=v;},
      get classList(){const self=this;return{
        toggle:(name,on)=>{const has=self._class.split(' ').includes(name);
          if(on===undefined){self._class=self._class?self._class+' '+name:name;return has;}
          self._class=[...new Set((on?self._class+' '+name:self._class.split(' ').filter(c=>c&&c!==name).join(' ')).split(' ').filter(Boolean))].join(' ');return has;},
        contains:(name)=>self._class.split(' ').includes(name),
        add:(name)=>{self._class=[...new Set((self._class+' '+name).split(' ').filter(Boolean))].join(' ');},
        remove:(name)=>{self._class=self._class.split(' ').filter(c=>c&&c!==name).join(' ');},
      };},
      get className(){return this._class;},
      get style(){const s=this._style;return{...s,removeProperty:k=>{delete s[k];}};},
      get children(){return this._children;},
      get childElementCount(){return this._children.length;},
      setAttribute(name,value){this._attrs[name]=String(value);},
      getAttribute(name){return Object.hasOwn(this._attrs,name)?this._attrs[name]:null;},
      addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);},
      removeEventListener(){},focus(){},setPointerCapture(){},contains(){return false;},
      appendChild(child){this._children.push(child);return child;},
      append(...kids){this._children.push(...kids);},
      after(node){this.afterCalls++;store.get('__parent')._children.splice(1,0,node);return node;},
      replaceChildren(...kids){this._children=kids;},
      getBoundingClientRect(){return{width:320,height:180,left:0,top:0};},
      querySelector(){return null;},
    });
    return store.get(key);
  }
  const document={
    getElementById:key=>element(key),
    createElement(tag){return element(`created-${tag}-${created++}`);},
    head:element('head'),body:element('body'),
    activeElement:null,
  };
  store.set('__parent',{_children:[]});
  let created=0;
  const players=[];
  const YT={Player:class{
    constructor(host,cfg){
      this.host=host;this.cfg=cfg;this.destroyed=false;this.sizes=[];this.time=0;
      players.push(this);
      if(onReady)queueMicrotask(()=>cfg.events.onReady&&cfg.events.onReady({target:host}));
    }
    setSize(w,h){this.sizes.push([w,h]);}
    getCurrentTime(){return this.time;}
    getDuration(){return duration;}
    getPlayerState(){return 1;}
    playVideo(){}pauseVideo(){}seekTo(){}destroy(){this.destroyed=true;}
  }};
  const timers=new Map();let timerId=0;
  // Temporizadores falsos: el código usa `setTimeout`/`setInterval` globales.
  const fakeTimers={
    setTimeout(fn){timers.set(++timerId,{fn,every:null});return timerId;},
    setInterval(fn,ms){timers.set(++timerId,{fn,every:ms});return timerId;},
    clearTimeout(id){timers.delete(id);},
    clearInterval(id){timers.delete(id);},
  };
  const windowStub={
    YT,innerWidth:1440,innerHeight:900,
    listeners:{},
    addEventListener(n,fn){(this.listeners[n]??=[]).push(fn);},
    fire(n,e){for(const fn of this.listeners[n]??[])fn(e);},
    dispatchEvent(){},
    ...fakeTimers,
  };
  const context={window:windowStub,document,location:{protocol:'http:',origin:'http://127.0.0.1:8000'},
    CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},
    // `youtubeVideoId` usa `new URL`, así que el sandbox necesita el constructor.
    URL,YT,console,...fakeTimers};
  vm.createContext(context);
  vm.runInContext(URL_SOURCE,context);
  vm.runInContext(SOURCE,context);

  const submit=()=>{const f=element('youtube-form');for(const fn of f.listeners.submit??[])fn({preventDefault(){}});};
  // Dispara el temporizador pendiente de una sola vez (el de los 15 s de espera).
  const runPendingTimeout=()=>{for(const [id,t] of [...timers])if(t.every===null){timers.delete(id);t.fn();return true;}return false;};
  return {element,windowStub,players,submit,wrap:element('youtube-video-wrap'),runPendingTimeout,pending:()=>timers.size};
}

test('un video que YouTube no deja incrustar se explica y no deja el recuadro gris',async()=>{
  const {element,players,submit,wrap}=setup({onReady:false});
  element('youtube-url').value='https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  submit();
  await new Promise(r=>setImmediate(r));
  const [player]=players;
  assert.ok(player,'se creó el reproductor');
  player.cfg.events.onError({data:150});

  assert.match(element('youtube-status').textContent,/no deja mostrar este video fuera de su propia web/);
  assert.equal(wrap.hidden,true,'la caja gris se oculta');
  assert.equal(wrap.children.length,0,'el iframe se elimina del panel');
  assert.equal(player.destroyed,true,'el reproductor se destruye');
  assert.equal(element('youtube-toggle').disabled,true);
  assert.equal(element('youtube-load').disabled,false,'se puede volver a cargar');
  assert.equal(element('youtube-external').hidden,false,'el enlace a YouTube sigue a mano');
});

test('un video eliminado o privado se distingue del que no se puede incrustar',async()=>{
  const {element,players,submit,wrap}=setup({onReady:false});
  element('youtube-url').value='https://www.youtube.com/watch?v=aaaaaaaaaaa';
  submit();
  await new Promise(r=>setImmediate(r));
  players[0].cfg.events.onError({data:100});
  assert.match(element('youtube-status').textContent,/no está disponible/);
  assert.equal(wrap.hidden,true);
});

test('si el video fallaba mientras estaba flotando, la caja vuelve al panel y no queda sobre la página',async()=>{
  const {element,players,submit,wrap}=setup({onReady:false});
  const disclosure=element('youtube-disclosure'),body=element('body'),content=element('youtube-content');
  disclosure.setAttribute('aria-expanded','true');
  element('youtube-url').value='https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  submit();
  await new Promise(r=>setImmediate(r));
  players[0].cfg.events.onError({data:150});

  // Tras el error el reproductor no debe quedar en el body ni conservar posición.
  assert.equal(body.children.length,0,'nada del reproductor queda pegado al body');
  assert.equal(wrap.classList.contains('is-floating'),false);
  assert.equal(wrap.style.left,undefined,'se borra la posición flotante');
  assert.equal(content.afterCalls>0,true,'el reproductor vuelve junto al panel');
});

test('YouTube repite onError y la limpieza no se rompe',async()=>{
  const {element,players,submit,wrap}=setup({onReady:false});
  element('youtube-url').value='https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  submit();
  await new Promise(r=>setImmediate(r));
  players[0].cfg.events.onError({data:150});
  players[0].cfg.events.onError({data:150});
  assert.equal(players.length,1,'no se crean reproductores extra');
  assert.equal(wrap.hidden,true);
  assert.match(element('youtube-status').textContent,/no deja mostrar este video fuera de su propia web/);
});

test('sin respuesta de YouTube se avisa y se puede reintentar',async()=>{
  const {element,submit,wrap,runPendingTimeout}=setup({onReady:false});
  element('youtube-url').value='https://www.youtube.com/watch?v=M7lc1UVf-VE';
  submit();
  await new Promise(r=>setImmediate(r));
  assert.equal(runPendingTimeout(),true,'quedaba pendiente la espera de 15 s');
  assert.match(element('youtube-status').textContent,/bloqueador de anuncios|tardó demasiado/);
  assert.equal(wrap.hidden,true,'no queda el recuadro a medio cargar');
  assert.equal(element('youtube-load').disabled,false);
});

test('un enlace que no es de YouTube no intenta cargar nada',()=>{
  const {element,players,submit,wrap}=setup({onReady:false});
  element('youtube-url').value='https://otro-sitio.test/watch?v=M7lc1UVf-VE';
  submit();
  assert.equal(element('youtube-status').textContent,'Introduce un enlace válido de YouTube.');
  assert.equal(players.length,0);
  assert.equal(element('youtube-external').hidden,true);
});

test('el video se ajusta a 16:9 con el ancho del panel',async()=>{
  const {element,players,submit,wrap}=setup();
  wrap.clientWidth=360;
  element('youtube-url').value='https://www.youtube.com/watch?v=M7lc1UVf-VE';
  submit();
  await new Promise(r=>setImmediate(r));
  const [player]=players;
  assert.deepEqual(player.sizes.at(-1),[360,203],'360 px de ancho -> 203 px de alto (16:9)');
  assert.equal(element('youtube-status').textContent.startsWith('Controla el video'),true);
  assert.equal(wrap.hidden,false);
});
