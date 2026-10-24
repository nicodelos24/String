// T-18 · IA_GUIDE.md:657 · la pelotita que rebota junto a las tarjetas.
//
// La ficha manda dos reglas duras y estas pruebas las atan: un reloj que ya
// existe alimenta la pelota (la rejilla de Improvisar, publicada por eventos
// desde improvisation.js) y la pelota no lleva temporizador propio — si la
// pelota contara por su cuenta, se desincronizaría de la rejilla que ya está
// bien hecha. Además, en movimiento reducido la pelota no flota: el pulso se
// dice con el color, que no es animación.
//
// Prueba roja primero (PACTO §5): los cuatro grupos nacen fallando sin el
// módulo. Lo que NO se afirma aquí también queda escrito: que el punto se vea
// bien en las dos paletas, que el rebote se lea bonito y que no desborde a
// 320 — eso es navegador, PACTO.md §5, y lo mide QA.
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const ballSource=fs.readFileSync(path.join(root,'beat-ball.js'),'utf8');
const {ballHop,ballAccent,ballFrame,BALL_HOP_PX}=require('../beat-ball.js');

// ─── La matemática del rebote, pura ─────────────────────────────────────────

test('el rebote sube y baja dentro del pulso, como una pelota',()=>{
  const close=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-9,msg||('esperaba '+b+' y salió '+a));
  const H=beat=>ballHop(beat);
  close(H(0),0,'en el golpe el punto está abajo');
  close(H(0.5),1,'a mitad del pulso alcanza lo más alto');
  close(H(0.25),Math.SQRT1_2,'un cuarto de pulso sube a media altura');
  close(H(0.75),Math.SQRT1_2,'tres cuartos baja por la misma curva');
  close(H(1),0,'en el pulso siguiente vuelve a estar abajo');
  close(H(1.5),1,'cada pulso rebota de nuevo, sin memorias');
  assert.ok(H(4.02)<0.1,'cerca del golpe sigue abajo');
  // Lo que llega no es un número: el punto queda en el suelo, sin NaN.
  for(const bad of [undefined,null,NaN,'x',{}])assert.equal(H(bad),0,'sin número no hay rebote: '+String(bad));
});

test('el acento es el primer pulso del compás, como en el metrónomo',()=>{
  assert.equal(ballAccent(0),true,'el primer pulso acentúa');
  for(const otro of [1,2,3])assert.equal(ballAccent(otro),false,'pulso '+otro+' no acentúa');
  assert.equal(ballAccent(0.5),false,'mitad de pulso no es un acento');
  assert.equal(ballAccent('0'),false,'un texto no es un pulso');
  assert.equal(ballAccent(null),false);
  assert.equal(ballAccent(undefined),false);
});

test('el fotograma resume el instante de la rejilla, y sin rejilla queda en reposo',()=>{
  assert.deepEqual(ballFrame(null),{hop:0,accent:false},'sin posición la pelota está en el suelo');
  assert.deepEqual(ballFrame(undefined),{hop:0,accent:false});
  assert.deepEqual(ballFrame({beat:2.5,beatInBar:2}),{hop:1,accent:false},'mitad del pulso 2, sin acento');
  assert.deepEqual(ballFrame({beat:4,beatInBar:0}),{hop:0,accent:true},'en el primer pulso la pelota aterriza acentuada');
  assert.deepEqual(ballFrame({beat:5.13,beatInBar:1,bar:1,beatMs:500,barMs:2000}),
    {hop:Math.sin(Math.PI*(5.13-Math.floor(5.13))),accent:false},'los campos demás de la rejilla no molestan');
});

// ─── La regla de la ficha: ninguna cuenta por su lado ──────────────────────

test('la pelota no lleva nunca un temporizador propio: quien cuenta es improvisation.js',()=>{
  // El fallo más caro sería un módulo que se arma su propio reloj: con el
  // tiempo se desincroniza de la rejilla ya probada. Si este test muere, es
  // que el archivo volvió a llevar su propia cuenta.
  assert.ok(!/setInterval|setTimeout|requestAnimationFrame/.test(ballSource),
    'beat-ball.js no puede llevar temporizador propio: la cuenta la hace la rejilla');
  // Y el editor de la rejilla sigue teniendo exactamente la cuenta que ya
  // tenía: la publica, no la duplica.
  const improv=fs.readFileSync(path.join(root,'improvisation.js'),'utf8');
  assert.equal(improv.split('setInterval').length-1,1,
    'improvisation.js sigue con su único sondeo: la pelota no esconde un segundo reloj');
});

// ─── improvisation.js publica la rejilla que ya cuenta ─────────────────────

const IMPROV_SOURCE=fs.readFileSync(path.join(root,'improvisation.js'),'utf8');

function improvSetup(){
  const timers=new Set();
  const el=extra=>{
    const node=Object.assign({tag:'span',handlers:{},className:'',textContent:'',style:{},checked:false,hidden:false,
      classList:{toggle:(c,on)=>{if(on===false)node.className=node.className.split(' ').filter(x=>x!==c).join(' ');
        else node.className=[...new Set(node.className.split(' ').filter(Boolean).concat([c]))].join(' ');},
        contains:c=>node.className.split(' ').includes(c),add(c){node.classList.toggle(c,true);},
        remove(c){node.classList.toggle(c,false);}}},extra);
    node.addEventListener=(name,fn)=>{(node.handlers[name]=node.handlers[name]||[]).push(fn);};
    return node;
  };
  const toggleEl=el({id:'improvisation-toggle'});
  const statusEl=el({id:'improvisation-status'});
  const bpmEl=el({id:'tempo-tap-bpm',value:'120'});
  const micEl=el({id:'microphone-toggle'});
  const events=[];
  const byId={['improvisation-toggle']:toggleEl,['improvisation-status']:statusEl,['tempo-tap-bpm']:bpmEl,['microphone-toggle']:micEl};
  const sandbox={
    document:{
      getElementById:id=>byId[id]||null,
      addEventListener(){},
    },
    performance:{now:()=>Date.now()},
    setInterval:(fn,ms)=>{const h=setInterval(fn,ms);timers.add(h);return h;},
    clearInterval:h=>{clearInterval(h);timers.delete(h);},
    CustomEvent:class CustomEvent{constructor(type,payload){this.type=type;this.detail=payload&&payload.detail;}},
    Event:class Event{constructor(type){this.type=type;}},
    window:{handlers:new Map(),addEventListener(name,fn){if(!this.handlers.has(name))this.handlers.set(name,[]);this.handlers.get(name).push(fn);},
      dispatchEvent(ev){events.push({type:ev.type,detail:ev.detail&&JSON.parse(JSON.stringify(ev.detail))});(this.handlers.get(ev.type)||[]).forEach(fn=>fn(ev));return true;}},
    __microRunning:()=>true,
    __microCurrentChord:()=>null,
  };
  vm.createContext(sandbox);
  vm.runInContext(IMPROV_SOURCE,sandbox);
  const fireToggle=checked=>{toggleEl.checked=checked;(toggleEl.handlers.change||[]).forEach(fn=>fn({type:'change'}));};
  return {events,timers,fireToggle,statusEl};
}

test('la rejilla publica su vida y su pulso: la pelota escucha lo que ya se cuenta',async()=>{
  // Si la pelota contara con su propia cuenta, se desincronizaría; así que la
  // publicación va pegada al sondeo que YA existe: el mismo estado vivo que
  // pinta `is-live` en el texto y la posición flotante de la rejilla — el
  // rebote debe poder seguirse pulso a pulso, no solo al cambiar de compás.
  const t=improvSetup();
  try{
    t.fireToggle(true);
    await new Promise(resolve=>setTimeout(resolve,140));
    const lives=t.events.filter(ev=>ev.type==='traste:improv-live');
    assert.ok(lives.length,'improvisation.js avisa por evento el estado vivo de la rejilla');
    assert.deepEqual(lives[0].detail,{live:true},'el primer aviso nace encendido');
    assert.equal(lives.filter(ev=>ev.detail&&ev.detail.live!==true).length,0,'mientras improvisa, vivo');
    const beats=t.events.filter(ev=>ev.type==='traste:improv-beat');
    assert.ok(beats.length>=2,'la posición llega seguido, no una sola vez al compás');
    const sample=beats[beats.length-1];
    assert.ok(Number.isFinite(sample.detail.beat),'el pulso viaja con su fracción, para un rebote fluido');
    assert.ok(Number.isInteger(sample.detail.beatInBar),'y con el pulso del compás');
    assert.ok(Number.isInteger(sample.detail.bar),'y el compás que va contando');
    t.fireToggle(false);
    await new Promise(resolve=>setTimeout(resolve,10));
    const last=t.events[t.events.length-1];
    assert.equal(last.type,'traste:improv-live','apagada la improvisación, el aviso corre el último');
    assert.deepEqual(last.detail,{live:false},'y suelta la vida: la pelota queda en el suelo');
    assert.equal(beats.length>0,true);
  }finally{for(const h of t.timers)clearInterval(h);}
});

// ─── El cableado del punto: escuchar y pintar ──────────────────────────────

const BALL_SANDBOX=reduced=>{
  const el=extra=>{
    const node=Object.assign({tag:'span',className:'',style:{},attrs:{},hidden:true,classList:{
      add(c){node.className=[...new Set(node.className.split(' ').filter(Boolean).concat([c]))].join(' ');},
      remove(c){node.className=node.className.split(' ').filter(x=>x!==c).join(' ');},
      contains(c){return node.className.split(' ').includes(c);},
      toggle(c,on){const has=node.className.split(' ').includes(c);const value=on===undefined?!has:Boolean(on);
        if(value&&!has)node.classList.add(c);if(!value&&has)node.classList.remove(c);return value;}}},extra);
    return node;
  };
  const ballEl=el({id:'improv-ball',hidden:true});
  const statusEl=el({id:'improvisation-status'});
  const sandbox={
    document:{
      getElementById:id=>({['improv-ball']:ballEl,['improvisation-status']:statusEl}[id]||null),
      addEventListener(){},
    },
    matchMedia:()=>({matches:reduced===true}),
    CustomEvent:class CustomEvent{constructor(type,payload){this.type=type;this.detail=payload&&payload.detail;}},
    window:{handlers:[],addEventListener(name,fn){this.handlers.push([name,fn]);},
      dispatchEvent(ev){this.handlers.filter(x=>x[0]===ev.type).forEach(x=>x[1](ev));return true;}},
  };
  vm.createContext(sandbox);
  vm.runInContext(ballSource,sandbox);
  const emit=(type,detail)=>sandbox.window.dispatchEvent({type,detail});
  return {ballEl,emit};
};

test('la pelota vive con la rejilla: aparece, rebota, aterriza acentuada y muere al apagar',()=>{
  const t=BALL_SANDBOX(false);
  const ball=t.ballEl;
  // Antes de improvisar: escondida, sin estilo.
  assert.equal(ball.hidden,true,'al empezar la pelota está escondida');
  assert.equal(ball.style.transform,undefined);
  // Viva: aparece y en el golpe está abajo.
  t.emit('traste:improv-live',{live:true});
  assert.equal(ball.hidden,false,'con la rejilla viva la pelota aparece junto al estado');
  assert.ok(ball.classList.contains('is-live'),'el estado vivo también se lleva por clase');
  t.emit('traste:improv-beat',{beat:0,beatInBar:0,bar:0});
  assert.equal(ball.style.transform,'translateY(0px) scale(1.4)','en el acento aterriza abajo y más grande');
  // A mitad del pulso 1: arriba del todo, ya sin el empuje del acento.
  t.emit('traste:improv-beat',{beat:1.5,beatInBar:1,bar:0});
  assert.equal(ball.style.transform,'translateY('+(-BALL_HOP_PX)+'px)','a mitad de un pulso normal está arriba del todo');
  // Apagada la rejilla: vuelta al reposo y escondida.
  t.emit('traste:improv-live',{live:false});
  assert.equal(ball.hidden,true,'sin rejilla se esconde de nuevo');
  assert.equal(ball.style.transform,'','sin rejilla no queda colgada a media altura: el transform limpia');
  assert.equal(ball.classList.contains('is-live'),false);
});

test('la pelota sin la vida avisada no pinta un pulso que no existe',()=>{
  const t=BALL_SANDBOX(false);
  const ball=t.ballEl;
  // Un pulso suelto sin el aviso de vida no aparece ni mueve: el orden de los
  // eventos no puede dejar colgada a la pelota.
  t.emit('traste:improv-beat',{beat:0.5,beatInBar:0,bar:0});
  assert.equal(ball.hidden,true,'sin aviso de vida, el punto sigue escondido');
  assert.equal(ball.style.transform,undefined,'y sin transform');
});

test('con movimiento reducido la pelota no flota: el pulso se dice con el color',()=>{
  const t=BALL_SANDBOX(true);
  const ball=t.ballEl;
  t.emit('traste:improv-live',{live:true});
  t.emit('traste:improv-beat',{beat:0,beatInBar:0,bar:0});
  assert.equal(ball.style.transform,undefined,'movimiento reducido: nada sube');
  assert.equal(ball.classList.contains('is-beat'),true,'el primer pulso marca el acento por color');
  t.emit('traste:improv-beat',{beat:1.2,beatInBar:1,bar:0});
  assert.equal(ball.classList.contains('is-beat'),false,'y cada pulso alterna el color, sin animar nada');
  assert.equal(ball.style.transform,undefined,'nunca sube');
  t.emit('traste:improv-beat',{beat:2.99,beatInBar:2,bar:0});
  assert.equal(ball.classList.contains('is-beat'),true,'los pares de pulso marcan de nuevo');
});

// ─── El punto en la página: HTML y CSS ─────────────────────────────────────

const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');

test('el punto vive junto al estado de Improvisar, escondido y sin voz propia',()=>{
  const span=html.match(/<span[^>]*id="improv-ball"[^>]*>/);
  assert(span,'el punto falta en index.html');
  const tag=span[0];
  assert(/class="[^"]*\bimprov-ball\b/.test(tag),'y lleva su clase para el CSS');
  assert(/\bhidden\b/.test(tag),'nace escondido: sin rejilla no ocupa fila');
  assert(/aria-hidden="true"/.test(tag),'es ornamento: el pulso ya lo dice el estado con role="status"');
  const statusAt=html.indexOf('id="improvisation-status"');
  const spanAt=html.indexOf('id="improv-ball"');
  assert.ok(spanAt>-1&&statusAt>spanAt,'el punto va antes del estado, en el mismo bloque de Improvisar');
  const controlAt=html.indexOf('class="improvisation-control"');
  assert.ok(controlAt>-1&&controlAt<spanAt,'el punto vive dentro del bloque de control de improvisación');
  const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(scripts.filter(src=>src==='beat-ball.js').length,1,'beat-ball.js se carga una sola vez');
  assert.ok(scripts.indexOf('beat-ball.js')>scripts.indexOf('improvisation.js'),
    'el punto se carga después de la rejilla que lo alimenta');
});

test('el punto lleva estilos de la página: punto del tema, escondido en reposo y sin flotar con movimiento reducido',()=>{
  const rule=css.match(/\.improv-ball\s*\{([^}]*)\}/);
  assert(rule,'falta la regla base de .improv-ball en style.css');
  const body=rule[1];
  assert(/width:\s*10px/.test(body)&&/height:\s*10px/.test(body),'punto pequeño, al lado del estado');
  assert(/border-radius:\s*50%/.test(body),'es una pelotita, no un cuadrado');
  assert(/var\(--rust\)/.test(body),'color del acento del tema, que la página ya usa');
  // El rebote lo escribe beat-ball.js con transform: el CSS no se anima por
  // su cuenta, para no corregir con su curva un pulso que no es el de la rejilla.
  assert.ok(!/@keyframes[^@]{0,80}improv-/.test(css),'sin animación CSS propia: el tiempo lo manda la rejilla');
  const hidden=css.match(/\.improv-ball\[hidden\]\s*\{([^}]*)\}/);
  assert(hidden&&/display:\s*none/.test(hidden[1]),'escondido en reposo no solo por el atributo: el display none lo dice el CSS');
  // Movimiento reducido: el transform jamás se aplica, venga de donde venga.
  const media=css.match(/@media[^{]*prefers-reduced-motion[^{]*\{[^@]*?\.improv-ball[^}]*\}/);
  assert(media,'la pelota exige su regla de movimiento reducido');
  assert.ok(/transform:\s*none/.test(media[0]),'en movimiento reducido el punto no flota');
});

test('el HTML nuevo no pisa los IDs que ya existen (control de estructura)',()=>{
  // El alcance de esta ronda no toca el motor ni player-ui: sus candados
  // quedan en sus propios archivos; aquí solo se re-cuenta el punto nuevo.
  const ids=[...html.replace(/<!--[\s\S]*?-->/g,'').matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,'IDs únicos en index.html');
});
