const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  MAST_FRETS, mastMidiRange, midiOnMast, KEY_OFFSETS, keyboardMidiFor
} = require('../keyboard-section.js');

const raiz = path.join(__dirname, '..');
const leer = archivo => fs.readFileSync(path.join(raiz, archivo), 'utf8');

// T-06 · El bajo de 4 cuerdas (E1 A1 D2 G2, MIDI 28 33 38 43) con 22 trastes
// llega a fa4 (65). La fila grave del teclado, en la base del piano (a = do
// central), llega a la4 (69): el punto y el guion quedan fuera y la coma cae
// justo en el último traste. La decisión de producto (A-22 / D-4) es no
// recortar la fila: se documenta y se avisa en el piano.
const BAJO = [28, 33, 38, 43];
const GUITARRA = [40, 45, 50, 55, 59, 64];
const BASE = keyboardMidiFor(4, 0); // 60

test('T-06: el mástil del bajo llega a fa4 y el de la guitarra pasa el piano entero', () => {
  assert.equal(MAST_FRETS, 22, 'los 22 trastes del mástil dibujado');
  const bajo = mastMidiRange(BAJO);
  assert.deepEqual(bajo, { lowest: 28, highest: 65 }, 'E1 al aire y fa4 en el traste 22 de la cuerda G');
  const guitarra = mastMidiRange(GUITARRA);
  assert.deepEqual(guitarra, { lowest: 40, highest: 86 }, 'E2 al aire y re6 en el traste 22 de la primera');
  // La constante no puede separarse del dibujo de app.js: si cambia el número
  // de trastes, esta prueba lo dice antes de que el aviso mienta.
  const app = leer('app.js');
  const trastesDibujados = (app.match(new RegExp('length: ' + MAST_FRETS + '\\b', 'g')) || []).length;
  assert.equal(trastesDibujados, 4, 'app.js dibuja columnas, números, trastes e incrustaciones con el mismo largo');
});

test('T-06: la coma del bajo queda en el borde y el punto y el guion fuera del mástil', () => {
  assert.equal(BASE + KEY_OFFSETS[','], 65, 'la coma es fa4');
  assert.equal(midiOnMast(BAJO, 65), true, 'fa4 se toca en el traste 22');
  assert.equal(BASE + KEY_OFFSETS['.'], 67, 'el punto es sol4');
  assert.equal(midiOnMast(BAJO, 67), false, 'sol4 no tiene posición en 4 cuerdas de 22 trastes');
  assert.equal(BASE + KEY_OFFSETS['-'], 69, 'el guion es la4');
  assert.equal(midiOnMast(BAJO, 69), false, 'la4 tampoco');
  // La fila media también pasa el borde cuando el bajo no baja de octava: la
  // tecla t (fa#4) ya no tiene traste. El aviso no es solo de dos teclas.
  assert.equal(midiOnMast(BAJO, BASE + KEY_OFFSETS.t), false, 'fa#4 queda fuera');
  assert.equal(midiOnMast(BAJO, BASE + KEY_OFFSETS.f), true, 'fa4, la última que entra');
  // Con la guitarra, que en modo Mástil baja una octava, nada de esto pasa.
  assert.equal(midiOnMast(GUITARRA, BASE + KEY_OFFSETS['-']), true);
  assert.equal(midiOnMast(GUITARRA, BASE + KEY_OFFSETS.t), true);
  // Los bordes: el piano empieza en do2 (36), por encima de la cuerda E1 del
  // bajo, así que ahí no hay teclas sin traste; con la guitarra (E2, 40) sí.
  assert.equal(midiOnMast(BAJO, 36), true, 'do2 se toca en la cuerda D del bajo');
  assert.equal(midiOnMast(GUITARRA, 36), false, 'do2 queda por debajo de la cuerda E2 de la guitarra');
  assert.equal(midiOnMast(BAJO, 28), true);
  // Sin cuerdas no hay rango: no se inventa una marca.
  assert.equal(mastMidiRange(null), null);
  assert.equal(midiOnMast(null, 60), false);
});

test('T-06: el piano marca las teclas sin posición y lo explica sin tocar el texto', () => {
  const fuente = leer('keyboard-section.js');
  assert.match(fuente, /function mastMidiRange/, 'el rango del mástil es una función pura y exportada');
  assert.match(fuente, /if \(typeof module !== 'undefined' && module\.exports\)[\s\S]*mastMidiRange: mastMidiRange/,
    'la prueba puede medirlo sin navegador');
  assert.match(fuente, /midiOnMast\(mastStrings\(\), key\.midi\)/, 'la marca de cada tecla sale del rango real');
  assert.match(fuente, /kp-off-mast/, 'la tecla sin posición lleva su clase');
  assert.match(fuente, /sin posición en el mástil/, 'y lo dice en el texto accesible');
  assert.match(fuente, /instrumentSelect\.addEventListener\('change', function \(\) \{[^}]*render\(\)/,
    'cambiar de instrumento vuelve a marcar el piano');
  assert.match(fuente, /mástil hasta/, 'el rango del mástil se lee junto al del piano');
  // El texto de la tecla no se toca: la marca es una banda, no un color nuevo
  // que pueda bajar el contraste ganado en T-36.
  const css = leer('style.css');
  assert.match(css, /\.kp-key\.kp-off-mast \{[\s\S]{0,400}background-image:/);
  assert.doesNotMatch(css, /\.kp-key\.kp-off-mast \{[^}]*\bopacity:/, 'sin opacidad sobre el texto');
});

test('T-06: la ayuda del teclado y el README documentan el límite del bajo', () => {
  const html = leer('index.html');
  assert.match(html, /bajo[^<]{0,200}fa4/i, 'la ayuda del teclado dice hasta dónde llega el bajo');
  assert.match(html, /sin posición en el mástil|no tienen posición en el mástil/,
    'y avisa qué teclas se quedan sin traste');
  const readme = leer('README.md');
  assert.match(readme, /mástil de 4 cuerdas[^.]{0,200}fa4/i, 'el README deja el límite por escrito');
});
