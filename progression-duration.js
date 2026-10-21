// Duraciones admitidas en las progresiones: el único contrato de validación y
// rótulos, sin copias de rango en app.js, la biblioteca o midi-ui. Todo pasa
// por enteros de 1 a 16 pulsos; cualquier otra cosa vuelve al predeterminado 4.
// Los cuatro pulsos equivalen a un compás, así que el rótulo es n/4 compases.

function isBeatsInRange(beats) {
  return Number.isInteger(beats) && beats >= 1 && beats <= 16;
}

// Validación estricta para el guardado: la biblioteca acepta o rechaza el valor
// tal como llegó, sin coercionar cadenas ni valores sueltos.
function isValidBeats(value) {
  return isBeatsInRange(value);
}

// Normalización para la interfaz: los valores del <select> llegan como cadena y
// los datos que ya viajaron pueden traer otra cosa; lo admitible pasa entero y
// el resto cae en 4.
function validBeats(value) {
  const beats = Number(value);
  return isBeatsInRange(beats) ? beats : 4;
}

// Rótulo accesible y del título del control. Existe para TODOS los enteros 1..16:
// un 5 restaurado de «Mi progresión» no puede caer en el `undefined` de un mapa
// que solo traiga los ocho valores de la cuadrícula.
function beatsLabel(value) {
  const beats = validBeats(value);
  const wholes = Math.floor(beats / 4), rest = beats % 4;
  if (rest === 0) return String(wholes);
  return `${wholes ? wholes : ''}${['', '¼', '½', '¾'][rest]}`;
}

// Los ocho valores que la interfaz ofrece. La cuantización del importado MIDI
// y el selector consumen esta misma lista.
const beatOptions = [1, 2, 3, 4, 6, 8, 12, 16];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {isValidBeats, validBeats, beatsLabel, beatOptions};
}
