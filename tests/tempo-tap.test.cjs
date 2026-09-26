const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function setup() {
  const elements=new Map();
  const source={dataset:{source:'progression'}};
  function element(key) {
    if(key==='[data-source][aria-pressed="true"]')return source;
    if(!elements.has(key)){
      const el={
        handlers:{},_value:'100',dataset:{},
        get value(){return this._value;},
        set value(value){this._value=String(value);},
        addEventListener(name,fn){this.handlers[name]=fn;},
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
    document:{querySelector:element,querySelectorAll:sel=>['.tempo-tap-step[data-step="1"]','.tempo-tap-step[data-step="-1"]'].map(element)},
    performance:{now:()=>clock.now},
    StringMetronome:metronome,
    window:windowStub,
    Event:class{constructor(type){this.type=type;}},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../tempo-tap.js'),'utf8'),ctx);
  return {element,clock,events,metronome,source,window:windowStub,global:vm.runInContext('globalThis',ctx)};
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
  const {element,clock,metronome,source}=setup();
  const button=element('#tempo-tap'),bpmInput=element('#tempo-tap-bpm');
  const playerBpm=element('#player-bpm'),videoBpm=element('#video-bpm'),metroBpm=element('#metronome-bpm');
  assert.equal(bpmInput.value,'100');
  clock.now=0;button.handlers.click();
  assert.equal(bpmInput.value,'100');
  clock.now=500;source.dataset.source='metronome';button.handlers.click();
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
  const {element,clock,metronome,source}=setup();
  const button=element('#tempo-tap');
  const playerBpm=element('#player-bpm'),videoBpm=element('#video-bpm'),metroBpm=element('#metronome-bpm');
  source.dataset.source='progression';metroBpm.value='90';metronome.tempo=90;
  clock.now=0;button.handlers.click();
  clock.now=500;button.handlers.click();
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
  const {element,clock,events,window:win,global}=setup();
  clock.now=0;global.tapProgressionTempo();
  assert.equal(element('#tempo-tap-bpm').value,'100');
  assert.deepEqual(events,[],'Con un solo golpe aún no hay tempo que aplicar');
  clock.now=500;global.tapProgressionTempo();
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