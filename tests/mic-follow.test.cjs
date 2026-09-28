const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {micTaps,micTapSettled,MIC_TAP_WINDOW_MS,MIC_TAP_MAX_TAPS,MIC_TAP_COMMIT_MS,MIC_NOTE_EVENT}=require('../mic-follow.js');

test('cada nota cuenta un golpe y la cuenta se guarda acotada',()=>{
  let taps=[];
  taps=micTaps(taps,0);
  assert.deepEqual(taps,[0]);
  taps=micTaps(taps,500);
  assert.deepEqual(taps,[0,500]);
  taps=micTaps(taps,1000);
  assert.deepEqual(taps,[0,500,1000]);
  // Se queda solo con los últimos, para que una cuenta larga no crezca sin fin.
  for(let i=3;i<20;i++)taps=micTaps(taps,i*500);
  assert.equal(taps.length,MIC_TAP_MAX_TAPS,'la cuenta no crece sin límite');
  assert.equal(taps[taps.length-1],19*500,'y el último golpe es el último');
});

test('una pausa larga empieza una cuenta nueva, como en el botón Tempo',()=>{
  // Si no, se mezclarían los golpes de dos canciones distintas y el tempo saldría
  // un número que no es de ninguna.
  let taps=[];
  taps=micTaps(taps,0);
  taps=micTaps(taps,500);
  assert.equal(taps.length,2);
  taps=micTaps(taps,500+MIC_TAP_WINDOW_MS+10);
  assert.deepEqual(taps,[500+MIC_TAP_WINDOW_MS+10],'la cuenta arranca de cero tras la pausa');
  // Justo por debajo de la ventana no se corta: 30 BPM son 2000 ms de pulso.
  let lento=[];
  lento=micTaps(lento,0);
  lento=micTaps(lento,2000);
  assert.equal(lento.length,2,'marcar a 30 BPM no se toma por empezar de nuevo');
  // Y un estado raro no rompe nada.
  assert.deepEqual(micTaps(null,100),[100]);
  assert.deepEqual(micTaps('x',100),[100]);
  assert.deepEqual(micTaps(undefined,100),[100]);
});

test('el tempo se aplica cuando la cuenta lleva quieta un momento',()=>{
  const dos=[0,500];
  assert.equal(micTapSettled(dos,500),false,'en cuanto suena el segundo golpe todavía no');
  assert.equal(micTapSettled(dos,500+MIC_TAP_COMMIT_MS-1),false,'todavía no ha pasado la espera');
  assert.equal(micTapSettled(dos,500+MIC_TAP_COMMIT_MS),true);
  // Con un solo golpe no hay nada que aplicar, por muy quieta que esté.
  assert.equal(micTapSettled([0],99999),false);
  assert.equal(micTapSettled([],99999),false);
  assert.equal(micTapSettled(null,99999),false);
  assert.equal(micTapSettled('x',99999),false);
});

test('los tiempos de la cuenta son los del botón, no otros',()=>{
  // Si la ventana de reinicio fuera más corta que el pulso más lento, marcar a
  // 30 BPM se tomaría por empezar de nuevo y el tempo saldría mal.
  assert.ok(MIC_TAP_WINDOW_MS>2000,'la ventana de reinicio supera el pulso más lento (30 BPM)');
  assert.ok(MIC_TAP_COMMIT_MS>=900,'la espera no es más corta que la del botón');
});

test('no hay una segunda versión del cálculo del tempo',()=>{
  // mic-follow no puede estimar el BPM por su cuenta: si lo hiciera, bastaría
  // cambiar el estimador del botón para que las dos formas de marcar dieran
  // tempos distintos, y nadie se enteraría. Se le pide a tempo-tap.js.
  const source=fs.readFileSync(path.join(__dirname,'../mic-follow.js'),'utf8');
  assert.equal(/60000\s*\//.test(source),false,'no calcula ningún BPM por su cuenta');
  assert.equal(/60\s*\/\s*bpm/.test(source),false);
  assert.match(source,/globalThis\.estimateTempo/,'usa el estimador que expone tempo-tap');
  assert.match(source,/globalThis\.applyTappedTempo/,'y aplica por su mismo camino');
  assert.equal(MIC_NOTE_EVENT,'traste:mic-note','el evento de la nota es el que emite el micrófono');
});
