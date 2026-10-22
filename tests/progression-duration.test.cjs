const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {isValidBeats, validBeats, beatsLabel, beatOptions, MIN_BEATS, MAX_BEATS, DEFAULT_BEATS} = require('../progression-duration.js');

test('el contrato valida enteros de 1 a 16 y rechaza el resto sin convertir cadenas',()=>{
  for(const beats of [1,4,5,7,12,16]) assert.equal(isValidBeats(beats),true,`${beats} es admisible`);
  for(const malo of [0,-3,17,4.5,'5','abc',null,undefined,NaN,{}]) assert.equal(isValidBeats(malo),false,`${JSON.stringify(malo)} no es admisible`);
});

test('validBeats normaliza: admite por coerción numérica (valores de <select>) y cae al 4',()=>{
  assert.equal(validBeats(5),5,'un 5 admitido se conserva entero');
  assert.equal(validBeats('8'),8,'los valores del selector llegan como cadena');
  for(const malo of [0,17,4.5,'abc',null,undefined]) assert.equal(validBeats(malo),4,'predeterminado explícito');
});

test('beatsLabel rotula todos los enteros 1..16 como n/4 compases, nunca undefined',()=>{
  const esperados={1:'¼',2:'½',3:'¾',4:'1',5:'1¼',6:'1½',7:'1¾',8:'2',9:'2¼',10:'2½',11:'2¾',12:'3',13:'3¼',14:'3½',15:'3¾',16:'4'};
  for(let beats=1;beats<=16;beats++){
    assert.equal(isValidBeats(beats),true);
    assert.equal(beatsLabel(beats),esperados[beats],`el ${beats} no puede caer en undefined`);
  }
  assert.equal(beatsLabel(0),'1','inválidos muestran el predeterminado 4 = 1 compás');
  assert.equal(beatsLabel(99),'1');
});

test('el módulo es dueño único de límites y predeterminado: los exporta y sus funciones los consumen',()=>{
  assert.equal(MIN_BEATS,1,'límite inferior exportado');
  assert.equal(MAX_BEATS,16,'límite superior exportado');
  assert.equal(DEFAULT_BEATS,4,'predeterminado de duración ausente/nueva exportado');
  const fuente=fs.readFileSync(path.join(__dirname,'..','progression-duration.js'),'utf8');
  assert(fuente.match(/beats\s*>=\s*MIN_BEATS/),'isBeatsInRange consume el límite exportado, no el 1 suelto');
  assert(fuente.match(/beats\s*<=\s*MAX_BEATS/),'isBeatsInRange consume el límite exportado, no el 16 suelto');
  assert(fuente.match(/:\s*DEFAULT_BEATS;/),'validBeats cae al predeterminado exportado, no al 4 suelto');
});

test('los consumidores toman del módulo el 4 de «duración ausente o nueva»',()=>{
  const root=path.join(__dirname,'..');
  const appJs=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert(appJs.includes('DEFAULT_BEATS'),'la creación de tarjeta trae el predeterminado del módulo');
  assert(!appJs.match(/beats\s*:\s*4\b/),'app.js no declara el 4 del acorde nuevo: lo porta el módulo');
  const library=fs.readFileSync(path.join(root,'song-library-ui.js'),'utf8');
  assert(library.includes('DEFAULT_BEATS'),'la biblioteca lee con el predeterminado del módulo');
  assert(!library.match(/undefined\s*\?\s*4\b/),'la biblioteca no vuelve a codificar el 4 de lectura');
  const midi=fs.readFileSync(path.join(root,'midi-ui.js'),'utf8');
  assert(midi.includes('DEFAULT_BEATS'),'midi-ui toma del módulo la semilla del redondeo');
  assert(!midi.match(/return\s+4\b|best\s*=\s*4\b/),'midi-ui no vuelve a codificar el fallback ni la semilla de cuantización');
  const motor=fs.readFileSync(path.join(root,'progression-player.js'),'utf8');
  assert(motor.includes('DEFAULT_BEATS'),'el motor copia el acorde con el predeterminado del módulo');
  assert(!motor.match(/beats\s*===\s*undefined\s*\?\s*4\b/),'el motor no vuelve a codificar el 4 del acorde sin beats');
  assert(motor.match(/this\.duration\s*=\s*4\s*\*\s*this\.beat/),'el 4 del compás musical 4/4 se queda: no es el predeterminado');
});

test('la cuadrícula de la interfaz ofrece los ocho valores históricos',()=>{
  assert.deepEqual(beatOptions,[1,2,3,4,6,8,12,16]);
});

test('el rango y la cuadrícula viven solo en el módulo: ningún consumidor repite la tabla',()=>{
  const root=path.join(__dirname,'..');
  const appJs=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert(!appJs.includes('function validBeats'),'app.js ya no define su propio validador');
  assert(!appJs.includes('function beatsLabel'),'app.js ya no define su propio rótulo');
  assert(!appJs.match(/beatOptions\s*=/),'app.js ya no declara la cuadrícula');
  const library=fs.readFileSync(path.join(root,'song-library-ui.js'),'utf8');
  assert(!library.match(/chord\.beats<1/),'la biblioteca ya no repite el rango: consume el módulo');
  assert(library.includes('isValidBeats'),'la biblioteca valida con el contrato del módulo');
  const midi=fs.readFileSync(path.join(root,'midi-ui.js'),'utf8');
  assert(!midi.includes('[1,2,3,4,6,8,12,16]'),'midi-ui cuantiza con la cuadrícula del módulo, no con una copia');
  const motor=fs.readFileSync(path.join(root,'progression-player.js'),'utf8');
  assert(!motor.match(/Number\.isInteger\(chord\.beats\)|chord\.beats\s*<\s*1\b|chord\.beats\s*>\s*16\b/),'el motor ya no re-codifica el rango: programa con el contrato del módulo');
  assert(motor.includes('isValidBeats'),'el motor valida las duraciones con el mismo contrato');
});
