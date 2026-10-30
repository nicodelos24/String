const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {parsePitchClass, DIATONIC_DEGREES, MODES_BY_DEGREE, CHORD_INTERVALS, inferTonalContext} = require('../tonal-context.js');

// La ficha de TAREAS.md (T-44, QA-TONAL-01) pide inferencia EXACTA, no «más
// cercana»: para una tonalidad mayor, el modo lo decide el GRADO por semitonos
// de la raíz respecto de la tónica, y solo se infiere si el acorde es
// diatónico — todas sus notas dentro de la escala. Todo lo demás devuelve
// null: el prestado, el cromático y la calidad incompatible conservan su modo
// explícito, sin conversión silenciosa.
const DO = {key: 'C', scale: 'major'};
const LA_MENOR = {key: 'A', scale: 'minor'};

test('la tonalidad se acepta por su tónica del cómputo de la app: doce grafías con # y b, basura rechazada',()=>{
  assert.equal(parsePitchClass('C'),0);
  assert.equal(parsePitchClass('G'),7);
  assert.equal(parsePitchClass('F#'),6);
  assert.equal(parsePitchClass('Bb'),10);
  assert.equal(parsePitchClass('Eb'),3);
  for(const malo of [null,undefined,'','H','Do','6','#',{}]) assert.equal(parsePitchClass(malo),null,`${String(malo)} no es una tónica del cómputo`);
});

test('los siete grados diatónicos de Do infieren su modo por el grado de la raíz',()=>{
  const tabla = [
    [{root:0, type:'maj'},'ionian'],      // C
    [{root:2, type:'m'},'dorian'],        // Dm
    [{root:4, type:'m'},'phrygian'],      // Em
    [{root:5, type:'maj'},'lydian'],      // F
    [{root:7, type:'maj'},'mixolydian'],  // G
    [{root:9, type:'m'},'aeolian'],       // Am
    [{root:11,type:'dim'},'locrian']      // Bdim
  ];
  for(const [chord,modo] of tabla){
    assert.equal(inferTonalContext(chord,DO),modo,`|| C-${modo} espera ${JSON.stringify(chord)}`);
  }
});

test('las extensiones diatónicas básicas infieren igual: séptimas, novenas, sextas y suspensos del modo natural',()=>{
  const tabla = [
    [{root:0, type:'maj7'},'ionian'],       // Cmaj7
    [{root:2, type:'m7'},'dorian'],         // Dm7
    [{root:4, type:'m7'},'phrygian'],       // Em7
    [{root:5, type:'maj7'},'lydian'],       // Fmaj7
    [{root:7, type:'7'},'mixolydian'],      // G7 — el V natural es dominante, no maj7
    [{root:9, type:'m7'},'aeolian'],        // Am7
    [{root:11,type:'m7b5'},'locrian'],      // Bm7♭5
    [{root:0, type:'maj9'},'ionian'],       // Cmaj9
    [{root:2, type:'m9'},'dorian'],         // Dm9
    [{root:9, type:'m11'},'aeolian'],       // Am11
    [{root:0, type:'add9'},'ionian'],       // Cadd9
    [{root:0, type:'6/9'},'ionian'],        // C6/9
    [{root:5, type:'maj13'},'lydian'],      // Fmaj13
    [{root:7, type:'13'},'mixolydian'],     // G13
    [{root:7, type:'7sus4'},'mixolydian'],  // G7sus4
    [{root:7, type:'sus4'},'mixolydian'],   // Gsus4
    [{root:7, type:'sus2'},'mixolydian'],   // Gsus2
    [{root:2, type:'sus4'},'dorian']        // Dsus4 = D G A, todo diatónico
  ];
  for(const [chord,modo] of tabla){
    assert.equal(inferTonalContext(chord,DO),modo,`extensión ${JSON.stringify(chord)} espera ${modo}`);
  }
});

test('los negativos obligatorios devuelven null: prestado D mayor en Do y cromático B♭ en Do',()=>{
  assert.equal(inferTonalContext({root:2,type:'maj'},DO),null,'D mayor en Do es prestado: conserva su modo, sin conversión');
  assert.equal(inferTonalContext({root:10,type:'maj'},DO),null,'B♭ no pertenece a la escala de Do: cromático');
});

test('raíz diatónica con calidad incompatible también devuelve null, sin ceder al «más cercano»',()=>{
  assert.equal(inferTonalContext({root:9,type:'maj'},DO),null,'A mayor en Do introduciría c#, fuera de la escala');
  assert.equal(inferTonalContext({root:4,type:'7'},DO),null,'E7 introduce g#, calidad incompatible del iii');
  assert.equal(inferTonalContext({root:7,type:'maj7'},DO),null,'Gmaj7 introduce f#: el V natural de Do es dominante');
  assert.equal(inferTonalContext({root:11,type:'dim7'},DO),null,'la séptima disminuida siempre amarra una nota ajena en mayor');
  assert.equal(inferTonalContext({root:0,type:'aug'},DO),null,'el aumentado nunca es diatónico en tonalidad mayor');
  assert.equal(inferTonalContext({root:0,type:'m'},DO),null,'Cm en Do es prestado (eb): null');
  assert.equal(inferTonalContext({root:5,type:'m'},DO),null,'Fm en Do es prestado (ab): la calidad menor solo cabe en ii, iii y vi');
});

test('la tónica no es siempre Do: el grado se mide contra la tónica dada (G, B♭)',()=>{
  assert.equal(inferTonalContext({root:6,type:'dim'},{key:'G',scale:'major'}),'locrian','F#dim es el vii° de Sol');
  assert.equal(inferTonalContext({root:11,type:'dim'},{key:'G',scale:'major'}),null,'Bdim trae f natural: no existe en Sol mayor');
  assert.equal(inferTonalContext({root:0,type:'m'},{key:'Bb',scale:'major'}),'dorian','Cm es el ii de B♭');
  assert.equal(inferTonalContext({root:2,type:'maj'},{key:'G',scale:'major'}),'mixolydian','D mayor es el V de Sol: su modo natural es mixolidio, el caso del pedido del autor');
  assert.equal(inferTonalContext({root:10,type:'maj'},{key:'G',scale:'major'}),null,'B♭ mayor es cromático en Sol: la escala de Sol no lo contiene');
});

test('una tonalidad sin escala válida no tiene tabla: null sin inventar',()=>{
  assert.equal(inferTonalContext({root:0,type:'maj'},{}),null);
  assert.equal(inferTonalContext({root:0,type:'maj'},null),null);
});

test('los siete grados de La menor natural infieren el modo exacto por grado',()=>{
  const tabla = [
    [{root:9,type:'m'},'aeolian'],       // i, Am
    [{root:11,type:'dim'},'locrian'],    // ii°, Bdim
    [{root:0,type:'maj'},'ionian'],      // bIII, C
    [{root:2,type:'m'},'dorian'],        // iv, Dm
    [{root:4,type:'m'},'phrygian'],      // v, Em
    [{root:5,type:'maj'},'lydian'],      // bVI, F
    [{root:7,type:'maj'},'mixolydian']   // bVII, G
  ];
  for(const [chord,mode] of tabla) assert.equal(inferTonalContext(chord,LA_MENOR),mode,`${JSON.stringify(chord)} en La menor`);
});

test('el contexto menor acepta extensiones diatónicas y no infiere prestados ni cromáticos',()=>{
  assert.equal(inferTonalContext({root:11,type:'m7b5'},LA_MENOR),'locrian');
  assert.equal(inferTonalContext({root:9,type:'m7'},LA_MENOR),'aeolian');
  assert.equal(inferTonalContext({root:7,type:'7'},LA_MENOR),'mixolydian');
  assert.equal(inferTonalContext({root:4,type:'maj'},LA_MENOR),null,'E mayor introduce G# (menor armónica), no menor natural');
  assert.equal(inferTonalContext({root:6,type:'maj'},LA_MENOR),null,'F# mayor es cromático en La menor natural');
  assert.equal(inferTonalContext({root:0,type:'m'},LA_MENOR),null,'Cm prestado no se convierte');
});

test('datos mal formados devuelven null sin explotar: raíz, tipo y acorde completos',()=>{
  for(const malo of [null,undefined,{},'Cmaj',{type:'maj'},{root:0},{root:2.5,type:'maj'},{root:12,type:'maj'},{root:-1,type:'maj'},{root:'2',type:'maj'},{root:0,type:7},{root:0,type:'13add9#11'}]){
    assert.equal(inferTonalContext(malo,DO),null,`${JSON.stringify(malo)} no infere`);
  }
});

test('el modo es pura función del grado: la tabla exportada es exacta y constante',()=>{
  assert.deepEqual(DIATONIC_DEGREES,[0,2,4,5,7,9,11]);
  assert.deepEqual(MODES_BY_DEGREE,{0:'ionian',2:'dorian',4:'phrygian',5:'lydian',7:'mixolydian',9:'aeolian',11:'locrian'});
});

test('guarda de fuente única: la tabla local de intervalos coincide con chordTypes de music-model.js',()=>{
  const appJs = fs.readFileSync(path.join(__dirname,'..','music-model.js'),'utf8');
  const enApp = new Map();
  for(const m of appJs.matchAll(/\{ value: '([^']+)',[^\n]*?intervals: \[([^\]]+)\]/g)){
    enApp.set(m[1], m[2].split(',').map(v=>Number(v.trim())));
  }
  assert(enApp.size >= 23,'music-model.js declara los tipos de acorde del cómputo');
  for(const [value,intervals] of enApp){
    assert.deepEqual(CHORD_INTERVALS[value],intervals,`el tipo ${value} existe en el módulo y en music-model.js con los mismos intervalos`);
  }
  for(const value of Object.keys(CHORD_INTERVALS)){
    assert(enApp.has(value),`el módulo no declara tipos que music-model.js no conoce (${value})`);
  }
});

test('el módulo es puro: sin DOM y sin dependencias',()=>{
  const fuente = fs.readFileSync(path.join(__dirname,'..','tonal-context.js'),'utf8');
  assert(!fuente.match(/document\.|querySelector|addEventListener|localStorage/),'el contrato tonal no toca el DOM');
  assert(!fuente.match(/require\(/),'el módulo no depende de la app ni de nada: es autocontenido');
});
