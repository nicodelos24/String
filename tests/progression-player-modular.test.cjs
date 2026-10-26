// T-01 · paso 5: evaluación de `progression-player.js`.
// La ficha pedía, como último paso, evaluar el motor que ya estaba separado.
// La medición (evidencia de la ronda, 112c01e) concluyó que la separación es
// correcta y que no hace falta partirlo; esta guarda fija ese límite para que
// no se deshaga: módulo hoja sin DOM ni estado de la página, un solo consumidor
// y un orden de carga que el propio módulo exige. La guarda nace verde porque
// el paso evalúa, no corrige; las mutaciones controladas de la evidencia
// muestran que falla cuando el límite se rompe.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const leer = file => fs.readFileSync(path.join(root, file), 'utf8');
const scriptsDeLaPagina = () => [...leer('index.html').replace(/<!--[\s\S]*?-->/g, '')
  .matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);

const MODULO = 'progression-player.js';
// Lo que el paso 5 midió como superficie del módulo. `durations` es interno
// (el contrato vive en progression-duration.js); los otros cinco son el
// contrato público que consumen la página y los tests.
const DECLARACIONES = ['durations', 'midiToFrequency', 'chordToMidi', 'accompanimentStyles',
  'chordLevels', 'ProgressionPlayer'];
const PUBLICOS = ['midiToFrequency', 'chordToMidi', 'accompanimentStyles', 'chordLevels',
  'ProgressionPlayer'];

function declaracionesTopLevel(source) {
  const nombres = [];
  for (const linea of source.split('\n')) {
    const match = linea.match(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/);
    if (match) nombres.push(match[1]);
  }
  return nombres;
}

// Carga el módulo como lo hace la página: script clásico, sin `module`, con el
// contrato de duraciones ya cargado y contando efectos de arranque.
function cargarComoPagina(source) {
  const efectos = {contextos: 0, temporizadores: 0};
  const contexto = vm.createContext({
    isValidBeats: () => true,
    DEFAULT_BEATS: 4,
    setInterval() { efectos.temporizadores++; return 0; },
    AudioContext: function AudioContext() { efectos.contextos++; },
    webkitAudioContext: function webkitAudioContext() { efectos.contextos++; },
  });
  vm.runInContext(source.replace(/if \(typeof module[\s\S]*$/, ''), contexto);
  return {contexto, efectos};
}

test('el motor es un módulo hoja: declara lo suyo y no toca DOM, almacenamiento ni estado de la página', () => {
  const fuente = leer(MODULO);

  assert.deepEqual(declaracionesTopLevel(fuente), DECLARACIONES,
    'el módulo declara sus seis nombres y nada más se le cuela en la superficie');
  for (const nombre of DECLARACIONES) {
    const declaracion = new RegExp('^(?:const|let|var|function|class)\\s+' + nombre + '\\b', 'm');
    const duenios = scriptsDeLaPagina().filter(script => declaracion.test(leer(script)));
    assert.deepEqual(duenios, [MODULO], `${nombre} tiene un único dueño: ${MODULO}`);
  }

  // El motor no mezcla la página ni el guardado: eso vive en app.js y
  // player-ui.js. Se busca el uso, no la palabra suelta en un comentario.
  assert.doesNotMatch(fuente, /\bdocument\s*\.|\blocalStorage\b|\baddEventListener\b|\bquerySelector\b|\bgetElementById\b/,
    'el motor no toca el DOM ni el almacenamiento');
  const estadoDeLaPagina = ['AppState', 'rootNoteName', 'selectedMode', 'chordType', 'ghostMode',
    'selectedFretMidi', 'renderProgression', 'updateView', 'progressionEdited'];
  for (const nombre of estadoDeLaPagina) {
    assert(!new RegExp('\\b' + nombre + '\\b').test(fuente), `el motor no lee el estado ${nombre} de la página`);
  }

  // Cargarlo no pinta, no suena y no agenda nada: solo declara.
  const {contexto, efectos} = cargarComoPagina(fuente);
  assert.equal(efectos.contextos, 0, 'cargar el módulo no crea un AudioContext');
  assert.equal(efectos.temporizadores, 0, 'cargar el módulo no agenda temporizadores');
  assert.equal(vm.runInContext('typeof ProgressionPlayer', contexto), 'function',
    'los scripts posteriores ven la clase como global del script clásico');
  for (const nombre of PUBLICOS) {
    assert.notEqual(vm.runInContext(`typeof ${nombre}`, contexto), 'undefined',
      `${nombre} sigue publicado para los scripts posteriores`);
  }
});

test('la página carga el motor una sola vez, después del contrato de duraciones y antes de su consumidor', () => {
  const scripts = scriptsDeLaPagina();
  const motor = scripts.filter(script => script === MODULO);
  const duraciones = scripts.indexOf('progression-duration.js');
  const ui = scripts.indexOf('player-ui.js');
  assert.equal(motor.length, 1, 'progression-player.js se carga una sola vez');
  assert.equal(motor[0], MODULO);
  assert(duraciones >= 0, 'la página carga progression-duration.js');
  assert(ui >= 0, 'la página carga player-ui.js');
  assert(duraciones < scripts.indexOf(MODULO), 'el contrato de duraciones se carga antes que el motor');
  assert(scripts.indexOf(MODULO) < ui, 'el motor se carga antes que su consumidor');

  // El orden no es una casualidad: sin el contrato de duraciones el módulo
  // no puede leer sus globales y falla al cargarse.
  assert.throws(() => vm.runInContext(
    leer(MODULO).replace(/if \(typeof module[\s\S]*$/, ''), vm.createContext({})),
  /isValidBeats is not defined/, 'sin progression-duration.js el motor no carga');
});

test('un solo consumidor en la página instancia el motor: player-ui.js', () => {
  const instancian = scriptsDeLaPagina().filter(script => /\bnew\s+ProgressionPlayer\b/.test(leer(script)));
  assert.deepEqual(instancian, ['player-ui.js'],
    'el transporte es uno solo: ninguna otra parte de la página crea otro motor');
  // El contrato público que usa la página es el que el módulo exporta en Node.
  const motor = require('../' + MODULO);
  for (const nombre of PUBLICOS) assert(nombre in motor, `${nombre} sale en module.exports`);
});

test('el menú #player-style y accompanimentStyles son la misma lista, en las dos direcciones', () => {
  const {accompanimentStyles} = require('../' + MODULO);
  const html = leer('index.html').replace(/<!--[\s\S]*?-->/g, '');
  const select = html.match(/<select id="player-style"[^>]*>([\s\S]*?)<\/select>/);
  assert(select, 'el menú de estilos existe en index.html');
  const opciones = [...select[1].matchAll(/<option value="([^"]+)"[^>]*>([^<]*)<\/option>/g)]
    .map(match => ({value: match[1], label: match[2]}));

  const estilos = Object.keys(accompanimentStyles);
  assert(estilos.length > 0, 'el motor declara estilos');
  assert.deepEqual([...new Set(opciones.map(opcion => opcion.value))], opciones.map(opcion => opcion.value),
    'sin valores repetidos en el menú');
  // T-19 ya dejó un modo de falla medido: un estilo alcanzable en el módulo y
  // sin opción en el menú (datos muertos), o una opción que el motor rechaza
  // con «Estilo desconocido». Las dos direcciones tienen que coincidir.
  assert.deepEqual(estilos.filter(estilo => !opciones.some(opcion => opcion.value === estilo)), [],
    'todo estilo del motor tiene su opción en el menú');
  assert.deepEqual(opciones.filter(opcion => !estilos.includes(opcion.value)).map(opcion => opcion.value), [],
    'toda opción del menú tiene su estilo en el motor');
  for (const opcion of opciones) {
    assert.equal(opcion.label, accompanimentStyles[opcion.value].name,
      `la etiqueta de ${opcion.value} dice lo mismo en el menú y en el motor`);
  }
});
