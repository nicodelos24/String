const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function setup() {
  const elements=new Map();
  const source={dataset:{source:'progression'}};
  const timers=[];
  let nextTimer=0;
  function element(key) {
    if(key==='[data-source][aria-pressed="true"]')return source;
    if(!elements.has(key)){
      const el={
        handlers:{},_value:'100',dataset:{},tabIndex:0,_attrs:{},
        classes:new Set(),
        classList:{
          add:(...names)=>names.forEach(name=>el.classes.add(name)),
          remove:(...names)=>names.forEach(name=>el.classes.delete(name)),
          contains:name=>el.classes.has(name),
          toggle:(name,force)=>{const on=force===undefined?!el.classes.has(name):Boolean(force);if(on)el.classes.add(name);else el.classes.delete(name);return on;},
        },
        getAttribute(name){return name in el._attrs?el._attrs[name]:null;},
        setAttribute(name,value){el._attrs[name]=String(value);},
        get value(){return this._value;},
        set value(value){this._value=String(value);},
        addEventListener(name,fn){el.handlers[name]=fn;},
      };
      if(key.startsWith('.tempo-tap-step')){const match=/"(-?\d+)"/.exec(key);if(match)el.dataset.step=match[1];}
      elements.set(key,el);
    }
    return elements.get(key);
  }
  const clock={now:0};
  const metronome={tempo:null,setTempo(value){this.tempo=Number(value);return this.tempo;}};
  const events=[];
  const windowStub={handlers:{},dispatchEvent(event){events.push(event.type);},addEventListener(name,fn){this.handlers[name]=fn;}};
  const ctx=vm.createContext({
    document:{querySelector:element,querySelectorAll:sel=>['.tempo-tap-step[data-step="1"]','.tempo-tap-step[data-step="-1"]'].map(element),addEventListener(name,fn){element('document:'+name).handlers[name]=fn;}},
    performance:{now:()=>clock.now},
    setTimeout(fn,ms){const id=++nextTimer;timers.push({id,fn,at:clock.now+ms});return id;},
    clearTimeout(id){const index=timers.findIndex(timer=>timer.id===id);if(index>=0)timers.splice(index,1);},
    StringMetronome:metronome,
    window:windowStub,
    Event:class{constructor(type){this.type=type;}},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../tempo-tap.js'),'utf8'),ctx);
  // Avanza el reloj hasta que vencen los temporizadores pendientes, como el
  // navegador: la cuenta se cierra sola cuando dejas de tocar.
  const settle=ms=>{clock.now+=ms;let guard=0;while(timers.length&&guard++<20){timers.sort((a,b)=>a.at-b.at);if(timers[0].at>clock.now)break;timers.shift().fn();}};
  return {element,clock,settle,events,metronome,source,window:windowStub,global:vm.runInContext('globalThis',ctx),
    tempoFromTaps:taps=>vm.runInContext('tempoFromTaps',ctx)(taps)};
}

test('tempo tap: syncTempoToMetronome publishes the field tempo, only with the metronome source active',()=>{
  const {element,metronome,source,global}=setup();
  const bpmInput=element('#tempo-tap-bpm'),metroBpm=element('#metronome-bpm');
  bpmInput.value='130';metroBpm.value='90';metronome.tempo=90;
  source.dataset.source='progression';global.syncTempoToMetronome();
  assert.equal(metroBpm.value,'90','Con otra fuente no publica el tempo');
  assert.equal(metronome.tempo,90);
  source.dataset.source='metronome';global.syncTempoToMetronome();
  assert.equal(metroBpm.value,'130');
  assert.equal(metronome.tempo,130,'Al dar play publica el tempo del campo');
});

test('tempo tap: two clicks estimate the BPM and write the editable field, accompaniment, video and metronome',()=>{
  const {element,clock,settle,metronome,source}=setup();
  const button=element('#tempo-tap'),bpmInput=element('#tempo-tap-bpm');
  const playerBpm=element('#player-bpm'),videoBpm=element('#video-bpm'),metroBpm=element('#metronome-bpm');
  assert.equal(bpmInput.value,'100');
  clock.now=0;button.handlers.click();
  assert.equal(bpmInput.value,'100');
  clock.now=500;source.dataset.source='metronome';button.handlers.click();
  settle(900);
  assert.equal(bpmInput.value,'120');
  assert.equal(playerBpm.value,'120');
  assert.equal(videoBpm.value,'120');
  assert.equal(metroBpm.value,'120');
  assert.equal(metronome.tempo,120,'El metrónomo recibe el tempo pulsado');
});

test('tempo tap: the button keeps its own sequence when the browser passes the click event',()=>{
  const {element,clock,source}=setup();
  const button=element('#tempo-tap'),bpmInput=element('#tempo-tap-bpm');
  // El navegador invoca el manejador con el evento: si ese evento se tomara como
  // tarjeta, cada pulsación del botón reiniciaría la estimación y no marcaría nada.
  clock.now=0;button.handlers.click({type:'click'});
  assert.equal(bpmInput.value,'100');
  clock.now=500;button.handlers.click({type:'click'});
  assert.equal(bpmInput.value,'120');
  clock.now=1000;button.handlers.click({type:'click'});
  assert.equal(bpmInput.value,'120','La tercera pulsación mantiene la estimación');
  source.dataset.source='progression';
});

test('tempo tap: without metronome selected, the tempo buttons leave the metronome untouched',()=>{
  const {element,clock,settle,metronome,source}=setup();
  const button=element('#tempo-tap');
  const playerBpm=element('#player-bpm'),videoBpm=element('#video-bpm'),metroBpm=element('#metronome-bpm');
  source.dataset.source='progression';metroBpm.value='90';metronome.tempo=90;
  clock.now=0;button.handlers.click();
  clock.now=500;button.handlers.click();
  settle(900);
  assert.equal(playerBpm.value,'120');
  assert.equal(videoBpm.value,'120');
  assert.equal(metroBpm.value,'90','El campo del metrónomo no cambia');
  assert.equal(metronome.tempo,90,'El tempo del metrónomo no cambia');
});

test('tempo tap: manual edits apply the BPM with limits and the accompaniment field stays in sync',()=>{
  const {element,metronome,source}=setup();
  const bpmInput=element('#tempo-tap-bpm'),playerBpm=element('#player-bpm'),videoBpm=element('#video-bpm'),metroBpm=element('#metronome-bpm');
  bpmInput.value='90';bpmInput.handlers.change();
  assert.equal(playerBpm.value,'90');
  assert.equal(videoBpm.value,'90');
  source.dataset.source='metronome';bpmInput.handlers.change();
  assert.equal(playerBpm.value,'90');
  assert.equal(metroBpm.value,'90');
  assert.equal(metronome.tempo,90,'La edición manual también fija el metrónomo');
  bpmInput.value='999';bpmInput.handlers.change();
  assert.equal(bpmInput.value,'240');
  assert.equal(playerBpm.value,'240');
  bpmInput.value='5';bpmInput.handlers.change();
  assert.equal(bpmInput.value,'30');
  playerBpm.value='140';playerBpm.handlers.input();
  assert.equal(bpmInput.value,'140');
});

test('tempo tap: far-apart taps restart the estimation window',()=>{
  const {element,clock}=setup();
  const button=element('#tempo-tap'),bpmInput=element('#tempo-tap-bpm');
  clock.now=0;button.handlers.click();
  clock.now=400;button.handlers.click();
  assert.equal(bpmInput.value,'150');
  clock.now=10400;button.handlers.click();
  clock.now=10900;button.handlers.click();
  assert.equal(bpmInput.value,'120');
});

test('tempo tap: the applied tempo is announced so a playing accompaniment can follow',()=>{
  const {element,clock,settle,events,window:win,global}=setup();
  clock.now=0;global.tapProgressionTempo();
  assert.equal(element('#tempo-tap-bpm').value,'100');
  assert.deepEqual(events,[],'Con un solo golpe aún no hay tempo que aplicar');
  clock.now=500;global.tapProgressionTempo();
  settle(900);
  assert.equal(element('#tempo-tap-bpm').value,'120');
  assert.deepEqual(events,['traste:tempo-applied']);
  clock.now=1000;element('#tempo-tap').handlers.click({type:'click'});
  assert.equal(element('#tempo-tap-bpm').value,'120',
    'El botón y las tarjetas comparten la misma estimación');
  events.length=0;
  element('#tempo-tap-bpm').value='150';element('#tempo-tap-bpm').handlers.change();
  assert.deepEqual(events,['traste:tempo-applied'],
    'Editar el campo a mano también avisa');
});

test('tempo tap: una pausa larga entre golpes empieza la cuenta de nuevo',()=>{
  const {element,clock,source,global}=setup();
  source.dataset.source='metronome';
  clock.now=0;global.tapProgressionTempo();
  clock.now=500;global.tapProgressionTempo();
  assert.equal(element('#tempo-tap-bpm').value,'120');
  clock.now=10000;global.tapProgressionTempo();
  clock.now=10500;global.tapProgressionTempo();
  assert.equal(element('#tempo-tap-bpm').value,'120','La cuenta nueva también da 120 BPM');
});

test('tempo tap: el botón es el único que marca el tempo',()=>{
  const {element,clock,global}=setup();
  const button=element('#tempo-tap'),bpmInput=element('#tempo-tap-bpm');
  clock.now=0;button.handlers.click({type:'click'});
  assert.equal(bpmInput.value,'100','Un solo golpe aún no fija nada');
  clock.now=500;button.handlers.click({type:'click'});
  assert.equal(bpmInput.value,'120');
  clock.now=1000;button.handlers.click({type:'click'});
  assert.equal(bpmInput.value,'120','El tercero mantiene la estimación');
  // Nada más llama al estimador: las tarjetas ya no lo usan.
  assert.equal(typeof global.tapProgressionTempo,'function');
  assert.equal(global.tapProgressionTempo.length,0,'El estimador no espera ninguna tarjeta');
});

test('tempo tap: stepper arrows adjust the BPM by one with the same limits',()=>{
  const {element,source}=setup();
  const up=element('.tempo-tap-step[data-step="1"]'),down=element('.tempo-tap-step[data-step="-1"]');
  const bpmInput=element('#tempo-tap-bpm'),playerBpm=element('#player-bpm'),metroBpm=element('#metronome-bpm');
  bpmInput.value='90';source.dataset.source='metronome';up.handlers.click();
  assert.equal(bpmInput.value,'91');
  assert.equal(playerBpm.value,'91');
  assert.equal(metroBpm.value,'91');
  bpmInput.value='240';up.handlers.click();
  assert.equal(bpmInput.value,'240');
  bpmInput.value='30';down.handlers.click();
  assert.equal(bpmInput.value,'30');
  bpmInput.value='120';down.handlers.click();
  assert.equal(bpmInput.value,'119');
});

test('tempo tap: el estimador usa la mediana y descarta la pausa o el golpe perdido',()=>{
  const {tempoFromTaps}=setup();
  assert.equal(tempoFromTaps([0,500]),120,'Dos golpes ya dan tempo');
  assert.equal(tempoFromTaps([0]),null,'Un solo golpe no da tempo');
  assert.equal(tempoFromTaps([]),null);
  // Una pausa de dos segundos en medio de la cuenta a 120 no puede bajar el BPM.
  assert.equal(tempoFromTaps([0,500,1000,3000,3500,4000]),120,
    'El intervalo largo se descarta y la cuenta sigue a 120');
  // Un golpe perdido (intervalo al doble) tampoco falsea el resultado.
  assert.equal(tempoFromTaps([0,500,1000,2000,2500,3000]),120,
    'El golpe perdido se descarta y la cuenta sigue a 120');
  // Un golpe pegado antes (intervalo a la mitad) tampoco.
  assert.equal(tempoFromTaps([0,250,750,1250,1750,2250]),120,
    'El golpe anticipado se descarta y la cuenta sigue a 120');
  assert.equal(tempoFromTaps([0,100]),null,'Por encima de 240 no se aplica');
  assert.equal(tempoFromTaps([0,3000]),null,'Por debajo de 30 no se aplica');
  assert.equal(tempoFromTaps([0,500,500]),120,'Dos golpes en el mismo instante no restan intervalo');
});

test('tempo tap: el tempo se aplica una sola vez, cuando dejas de tocar',()=>{
  const {element,clock,settle,events}=setup();
  const button=element('#tempo-tap'),bpmInput=element('#tempo-tap-bpm'),playerBpm=element('#player-bpm');
  clock.now=0;button.handlers.click();
  clock.now=500;button.handlers.click();
  clock.now=1000;button.handlers.click();
  clock.now=1500;button.handlers.click();
  assert.equal(bpmInput.value,'120','El campo previsualiza la estimación');
  assert.equal(playerBpm.value,'100','El Acompañamiento aún no se toca');
  assert.deepEqual(events,[],'Contar no mueve lo que está sonando');
  settle(900);
  assert.equal(playerBpm.value,'120','Al soltar se aplica una vez');
  assert.deepEqual(events,['traste:tempo-applied'],'Un solo aviso, no uno por golpe');
  settle(3000);
  assert.deepEqual(events,['traste:tempo-applied'],'Y no vuelve a avisar');
});

test('tempo tap: mientras cuentas, el botón avisa y el «↺» queda a mano',()=>{
  const {element,clock,settle}=setup();
  const button=element('#tempo-tap'),bpmInput=element('#tempo-tap-bpm'),discardButton=element('#tempo-tap-discard');
  assert.equal(discardButton.classList.contains('is-ready'),false,'Antes de contar no se ofrece');
  assert.equal(discardButton.getAttribute('aria-hidden'),'true');
  clock.now=0;button.handlers.click();
  assert.equal(button.classList.contains('is-tapping'),true,'Un golpe ya cuenta');
  assert.equal(button.getAttribute('aria-busy'),'true');
  assert.equal(discardButton.classList.contains('is-ready'),true);
  clock.now=500;button.handlers.click();
  assert.equal(bpmInput.classList.contains('is-pending'),true,'El BPM se lee como provisional');
  settle(900);
  assert.equal(button.classList.contains('is-tapping'),false,'Al aplicar se apaga el aviso');
  assert.equal(bpmInput.classList.contains('is-pending'),false);
  assert.equal(discardButton.getAttribute('aria-hidden'),'true');
});

test('tempo tap: descartar la cuenta vuelve al tempo aplicado y no lo cambia',()=>{
  const {element,clock,settle,events}=setup();
  const button=element('#tempo-tap'),bpmInput=element('#tempo-tap-bpm');
  const playerBpm=element('#player-bpm'),discardButton=element('#tempo-tap-discard');
  // Primero dejamos un tempo real aplicado.
  clock.now=0;button.handlers.click();
  clock.now=400;button.handlers.click();
  settle(900);
  assert.equal(playerBpm.value,'150');
  events.length=0;
  // Ahora marcamos mal y nos arrepentimos.
  clock.now=2000;button.handlers.click();
  clock.now=2500;button.handlers.click();
  assert.equal(bpmInput.value,'120','La estimación equivocada se ve en el campo');
  clock.now=2600;discardButton.handlers.click();
  assert.equal(bpmInput.value,'150','El campo vuelve al tempo aplicado');
  assert.equal(playerBpm.value,'150','El Acompañamiento no se movió');
  assert.deepEqual(events,[],'Descartar no toca la música que suena');
  assert.equal(button.classList.contains('is-tapping'),false);
  clock.now=9000;button.handlers.click();
  clock.now=9500;button.handlers.click();
  assert.equal(bpmInput.value,'120','La cuenta nueva empieza de cero');
  settle(900);
  assert.equal(playerBpm.value,'120');
});

test('tempo tap: Escape descarta la cuenta sin ratón',()=>{
  const {element,clock,global}=setup();
  const button=element('#tempo-tap'),bpmInput=element('#tempo-tap-bpm');
  const onKey=element('document:keydown').handlers.keydown;
  assert.equal(typeof onKey,'function','El atajo de teclado está conectado');
  clock.now=0;button.handlers.click();
  clock.now=500;button.handlers.click();
  assert.equal(bpmInput.value,'120');
  const event={code:'Escape',preventDefault(){this.prevented=true;}};
  onKey(event);
  assert.equal(event.prevented,true);
  assert.equal(bpmInput.value,'100','Vuelve al tempo que había');
  assert.equal(element('#tempo-tap').classList.contains('is-tapping'),false);
  // Sin cuenta en curso, Escape no intercepta nada.
  const other={code:'Escape',preventDefault(){this.prevented=true;}};
  onKey(other);
  assert.equal(other.prevented,undefined,'Escape libre cuando no se está contando');
  // Y el atajo global queda publicado por si otro control lo necesita.
  assert.equal(typeof global.discardTempoTap,'function');
});

test('tempo tap: editar el tempo del Acompañamiento o aplicar una plantilla cierra la cuenta',()=>{
  const {element,clock,settle,window:win}=setup();
  const button=element('#tempo-tap'),bpmInput=element('#tempo-tap-bpm');
  const playerBpm=element('#player-bpm'),videoBpm=element('#video-bpm');
  clock.now=0;button.handlers.click();
  clock.now=500;button.handlers.click();
  assert.equal(bpmInput.value,'120');
  playerBpm.value='140';playerBpm.handlers.input();
  assert.equal(bpmInput.value,'140','Manda el tempo explícito');
  assert.equal(button.classList.contains('is-tapping'),false,'La cuenta se cierra');
  settle(2000);
  assert.equal(videoBpm.value,'100','La cuenta descartada no llegó al video');
  // Una plantilla también manda sobre lo que se estuviera contando.
  clock.now=3000;button.handlers.click();
  clock.now=3500;button.handlers.click();
  playerBpm.value='96';win.handlers['traste:preset-applied']();
  assert.equal(bpmInput.value,'96');
  settle(2000);
  assert.equal(videoBpm.value,'100');
});
