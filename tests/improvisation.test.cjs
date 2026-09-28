const {test}=require('node:test');const assert=require('node:assert/strict');
const {improvGrid,improvStep,improvChordKey,improvHint,IMPROV_BEATS_PER_BAR,IMPROV_MAX_ANCHOR_BARS}=require('../improvisation.js');

const C=root=>({root,type:'maj'});
const F7=root=>({root,type:'7'});

// Una cuenta completa de la captura: primero tiempo, silencio, acorde, y lo que
// venga después hasta el siguiente primer tiempo. Se recogen TODAS las tarjetas
// que salen, no solo la primera: si se parara en la primera, la prueba de «una
// sola por compás» no estaría comprobando nada, que es lo que pasó.
function play(events,state){
  let s=state;
  const adds=[];
  for(const event of events){
    const result=improvStep(s,event);
    s=result.state;
    if(result.add)adds.push(result.add);
  }
  return {state:s,adds};
}

test('la rejilla divide el tiempo en compases de cuatro pulsos',()=>{
  // 120 BPM son 500 ms por pulso y 2000 ms por compás.
  const at=ms=>improvGrid(120,4,ms);
  assert.equal(at(0).bar,0);assert.equal(at(0).beatInBar,0);
  assert.equal(at(499).beatInBar,0,'a mitad del primer pulso sigue en el compás 1');
  assert.equal(at(500).beatInBar,1);
  assert.equal(at(1999).bar,0,'el compás 1 dura cuatro pulsos');
  assert.equal(at(2000).bar,1,'y en 2000 ms empieza el segundo');
  assert.equal(at(4000).bar,2);
  // Un tempo distinto: 60 BPM son 1000 ms por pulso, 4000 por compás.
  assert.equal(improvGrid(60,4,3999).bar,0);
  assert.equal(improvGrid(60,4,4000).bar,1);
  // Sin tempo válido no hay cuadrícula, que es lo que hace que la página pueda
  // pedir el tempo en vez de contar con uno inventado.
  for(const bad of [null,undefined,0,29,241,NaN,'x',{}])assert.equal(improvGrid(bad,4,1000),null,'tempo '+String(bad));
  // Un tiempo negativo o no numérico tampoco: arrancaría en un compás que no existe.
  assert.equal(improvGrid(120,4,-1),null);
  assert.equal(improvGrid(120,4,NaN),null);
  // Los pulsos por compás se pueden cambiar; 3 es un compás de 3/4.
  assert.equal(improvGrid(120,3,1500).bar,1,'con 3 pulsos por compás el segundo llega antes');
  assert.equal(improvGrid(120,0,2000).bar,1,'un valor inútil cae al 4/4 de la página');
});

test('en cada primer tiempo se añade el primer acorde nuevo, y solo uno',()=>{
  // Primer tiempo con Do todavía sonando, luego el micrófono se calla y rasguea
  // Sol: ese Sol es el acorde del compás.
  let r=play([{type:'bar',bar:0,chord:C(0)},{type:'chord',chord:null},{type:'chord',chord:C(7)}]);
  assert.equal(r.adds.length,1);
  assert.deepEqual(r.adds[0],C(7),'el acorde del compás es el primero que se confirma tras el primer tiempo');
  // Lo que suene después dentro del mismo compás no añade otra tarjeta: el
  // compás ya tiene la suya aunque el autor siga cambiando de acorde.
  r=play([{type:'bar',bar:1,chord:C(7)},{type:'chord',chord:null},{type:'chord',chord:F7(5)},{type:'chord',chord:null},{type:'chord',chord:C(0)}],r.state);
  assert.equal(r.adds.length,1,'un compás no puede añadir más de una tarjeta, aunque cambie varias veces');
  assert.deepEqual(r.adds[0],F7(5),'y es el Fa7, no el Do que sonó después');
  // Con tres cambios dentro de un solo compás sigue habiendo una sola tarjeta.
  r=play([{type:'bar',bar:2,chord:C(0)},{type:'chord',chord:null},{type:'chord',chord:C(2)},{type:'chord',chord:null},{type:'chord',chord:C(5)},{type:'chord',chord:null},{type:'chord',chord:C(7)}]);
  assert.equal(r.adds.length,1);
  assert.deepEqual(r.adds[0],C(2),'gana el primero, que es el que empieza el compás');
});

test('el acorde que ya sonaba en el primer tiempo no se vuelve a añadir',()=>{
  // El fallo que hace inútil la función: si se tomara lo que hay confirmado en
  // el primer tiempo, cada compás repetiría la misma tarjeta sin que el autor
  // haya rasgueado nada. Solo cuenta lo nuevo: tras un silencio o un cambio.
  let r=play([{type:'bar',bar:0,chord:C(0)},{type:'chord',chord:C(0)}]);
  assert.equal(r.adds.length,0,'el mismo acorde sin cambio ni silencio no es un acorde nuevo');
  // Con un cambio directo, sin pasar por el silencio (cambio ligado), sí cuenta.
  r=play([{type:'bar',bar:0,chord:C(0)},{type:'chord',chord:F7(5)}]);
  assert.equal(r.adds.length,1,'un acorde distinto cuenta aunque no haya habido silencio');
  assert.deepEqual(r.adds[0],F7(5));
  // Volver al mismo acorde después de callarse cuenta: es un rasgueo nuevo.
  r=play([{type:'bar',bar:0,chord:C(0)},{type:'chord',chord:null},{type:'chord',chord:C(0)}]);
  assert.equal(r.adds.length,1,'repetir el mismo acorde tras callarse sí es rasguearlo otra vez');
  assert.deepEqual(r.adds[0],C(0));
  // Y si en el primer tiempo no sonaba nada, lo primero que se oiga cuenta: el
  // compás está abierto, solo que sin acorde de referencia.
  r=play([{type:'bar',bar:0,chord:null},{type:'chord',chord:C(2)}]);
  assert.equal(r.adds.length,1);
  assert.deepEqual(r.adds[0],C(2));
});

test('un compás que no tiene nada nuevo no añade tarjeta',()=>{
  // El autor mantiene un acorde dos compases sin volver a rasguearlo: no se
  // inventa una segunda tarjeta idéntica, porque no se puede saber si la quiso.
  const r=play([
    {type:'bar',bar:0,chord:C(0)},{type:'chord',chord:null},{type:'chord',chord:C(0)},
    {type:'bar',bar:1,chord:C(0)},{type:'chord',chord:C(0)},{type:'bar',bar:2,chord:C(0)},
  ]);
  assert.equal(r.adds.length,1,'solo el primer rasgueo cuenta; los compases siguientes no');
  // Y un compás en silencio no añade nada ni deja el estado cojeando.
  const r2=play([{type:'bar',bar:0,chord:C(0)},{type:'chord',chord:null},{type:'bar',bar:1,chord:null},{type:'chord',chord:null}]);
  assert.equal(r2.adds.length,0);
  assert.equal(r2.state.taken,false,'el compás en silencio vuelve a estar disponible');
  // Tras ese silencio, lo siguiente sí cuenta.
  const r3=play([{type:'chord',chord:C(4)}],r2.state);
  assert.equal(r3.adds.length,1);
  assert.deepEqual(r3.adds[0],C(4));
});

test('la identidad de un acorde no confunde el tipo con la tónica',()=>{
  assert.equal(improvChordKey(C(0)),'0:maj');
  assert.equal(improvChordKey(F7(0)),'0:7','el mismo do con séptima es otro acorde');
  assert.equal(improvChordKey(null),'');
  assert.equal(improvChordKey({type:'maj'}),'','sin tónica no hay acorde');
  assert.equal(improvChordKey({root:0.5,type:'maj'}),'','una tónica que no es entera no vale');
  // Un acorde sin tipo sigue siendo un acorde: el detector siempre lo trae.
  assert.equal(improvChordKey({root:3}),'3:undefined');
});

test('la página dice lo que falta, en el orden en que hace falta',()=>{
  // Primero el micrófono, después el tempo: ese es el orden del flujo.
  assert.equal(improvHint(false,null),'1. Enciende el micrófono');
  assert.equal(improvHint(false,120,true),'1. Enciende el micrófono','con tempo ya marcado sigue faltando el micrófono');
  // El campo de BPM trae 100 de arranque, así que preguntar si hay tempo no
  // diría nada: lo que se pregunta es si se ha marcado con el botón, que es lo
  // único que sabe dónde empezó el primer tiempo.
  assert.equal(improvHint(true,100,false),'2. Marca el tempo con «Tempo»','con un tempo escrito todavía pide marcar');
  assert.equal(improvHint(true,120,true),'Listo para improvisar','marcado el tempo, solo falta encender el interruptor');
  assert.equal(improvHint(true,null,true),'2. Marca el tempo con «Tempo»');
  assert.equal(improvHint(true,0,true),'2. Marca el tempo con «Tempo»','un tempo de 0 es un tempo que no hay');
  assert.equal(improvHint(true,1000,true),'2. Marca el tempo con «Tempo»','un tempo fuera de rango no vale');
});

test('un estado que no es un objeto se reconstruye en vez de romperse',()=>{
  // El estado viene de la interfaz y de un sondeo temporizado: si llega algo
  // raro, la captura tiene que seguir en pie.
  for(const bad of [null,undefined,0,'',false]){
    const r=improvStep(bad,{type:'chord',chord:C(0)});
    assert.equal(typeof r,'object');
    assert.equal(r.add,undefined,'sin un primer tiempo que abra el compás no se adivina el acorde');
  }
  assert.deepEqual(improvStep(null,{type:'nada'}).state,{bar:0,taken:false,atBar:'',sawSilence:false,open:false});
  assert.equal(improvStep(null,null).state.bar,0);
});

test('los límites de la rejícula son los de la página',()=>{
  assert.equal(IMPROV_BEATS_PER_BAR,4,'el compás es de 4/4, como el de las tarjetas por defecto');
  assert.equal(IMPROV_MAX_ANCHOR_BARS,8);
});
