const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeTonality, tonalityNotes, degreeLabel, modeForTonality, tonalityRelation,
  validTonalityRoot, validTonalityScale, validTonalityLabel,
  TONALITY_SCALES, TONALITY_LABELS,
} = require('../tonality.js');

// La tabla de modos tal y como la define app.js. Se copia aquí a propósito:
// estas pruebas tienen que poder fallar si la tonalidad calcula mal, sin que
// les toque la página entera. Los grados son lo que decide si un acorde cae
// dentro de la tonalidad.
const modes = {
  ionian: { type: 'major', degree: 0, intervals: [0, 2, 4, 5, 7, 9, 11] },
  dorian: { type: 'minor', degree: 2, intervals: [0, 2, 3, 5, 7, 9, 10] },
  phrygian: { type: 'minor', degree: 4, intervals: [0, 1, 3, 5, 7, 8, 10] },
  lydian: { type: 'major', degree: 5, intervals: [0, 2, 4, 6, 7, 9, 11] },
  mixolydian: { type: 'major', degree: 7, intervals: [0, 2, 4, 5, 7, 9, 10] },
  aeolian: { type: 'minor', degree: 9, intervals: [0, 2, 3, 5, 7, 8, 10] },
  locrian: { type: 'minor', degree: 11, intervals: [0, 1, 3, 5, 6, 8, 10] },
  majorPentatonic: { type: 'both', degree: 0, intervals: [0, 2, 4, 7, 9] },
  minorPentatonic: { type: 'both', degree: 0, intervals: [0, 3, 5, 7, 10] },
};
const MAJ = [0, 4, 7];      // acorde mayor
const MIN = [0, 3, 7];      // acorde menor
const DOM7 = [0, 4, 7, 10]; // dominante

test('la tonalidad trae su propia escala, con raíz propia y no la del acorde', () => {
  assert.deepEqual(tonalityNotes(9), [1, 2, 4, 6, 8, 9, 11], 'La mayor: Do#, Re, Mi, Fa#, Sol#, La, Si');
  assert.deepEqual(tonalityNotes(0), [0, 2, 4, 5, 7, 9, 11], 'Do mayor');
  assert.deepEqual(tonalityNotes(5), [0, 2, 4, 5, 7, 9, 10], 'Fa mayor con su séptima');
  assert.deepEqual(tonalityNotes(9, 'minorPentatonic'), [0, 2, 4, 7, 9], 'la pentatónica menor de La');
  assert.deepEqual(tonalityNotes(9, 'majorPentatonic'), [1, 4, 6, 9, 11], 'la mayor de La');
  // La misma nota con dos grafías es la misma clase de altura, y una escala
  // desconocida cae en la mayor en vez de quedarse sin pintar nada.
  assert.deepEqual(tonalityNotes(10), tonalityNotes(9).map(n => (n + 1) % 12).sort((a, b) => a - b));
  assert.deepEqual(tonalityNotes(9, 'inventada'), tonalityNotes(9));
  assert.deepEqual(tonalityNotes(99), tonalityNotes(0), 'una tónica imposible cae en Do');
  assert.equal(tonalityNotes(9).length, 7);
  assert.equal(tonalityNotes(9, 'minorPentatonic').length, 5);
});

test('el grado se cuenta desde la tonalidad y la lectura del bajo grado es la de siempre', () => {
  assert.equal(degreeLabel(0), '1');
  assert.equal(degreeLabel(4), '3');
  assert.equal(degreeLabel(3), '♭3');
  assert.equal(degreeLabel(7), '5');
  assert.equal(degreeLabel(10), '♭7');
  assert.equal(degreeLabel(12), '1', 'una octava por encima es el mismo grado');
  assert.equal(degreeLabel(-1), '7', 'y por debajo también');
  // El ♯4 solo aparece cuando la escala es la lidia, y el ♯5 en un aumentado:
  // son los dos grados que la escala no nombra con su cifra.
  assert.equal(degreeLabel(6), '♭5');
  assert.equal(degreeLabel(6, { modeKey: 'lydian' }), '♯4');
  assert.equal(degreeLabel(8), '♭6');
  assert.equal(degreeLabel(8, { chordValue: 'aug' }), '♯5');
  assert.equal(degreeLabel(8, { modeKey: 'lydian' }), '♭6', 'la lidia no cambia la sexta menor');
});

test('un acorde se sitúa en su modo de la tonalidad solo si todas sus notas son de la tonalidad', () => {
  // En tonalidad La: La = I, Si = II, Do# = III, Re = IV, Mi = V, Fa = VI, Sol# = VII.
  assert.equal(modeForTonality(9, MAJ, 9, modes), 'ionian');
  assert.equal(modeForTonality(11, MIN, 9, modes), 'dorian');
  assert.equal(modeForTonality(2, MAJ, 9, modes), 'lydian');
  assert.equal(modeForTonality(9, DOM7, 9, modes), null, 'el La7 trae el Sol natural y sale del menor paralelo');
  assert.equal(modeForTonality(4, DOM7, 9, modes), 'mixolydian', 'la dominante de Re mayor es el V de La');
  assert.equal(modeForTonality(6, MIN, 9, modes), 'aeolian', 'el Fa# menor es el vi de La');
  assert.equal(modeForTonality(5, MIN, 9, modes), null, 'el Fa menor es el ♭VI prestado del menor paralelo');
  // El Do mayor NO es un modo de La: la G natural no está en su escala. Es el
  // ♭III tomado del menor paralelo, y forzarlo a lydian mentiría.
  assert.equal(modeForTonality(0, MAJ, 9, modes), null);
  // El Mi menor tampoco: comparte A, C# y E, pero trae la G natural.
  assert.equal(modeForTonality(4, MIN, 9, modes), null);
  // Un acorde que sí es diatónico con otra nota añadida que no lo es, tampoco.
  assert.equal(modeForTonality(11, [0, 3, 7, 10, 2], 9, modes), 'dorian');
  assert.equal(modeForTonality(11, [0, 3, 7, 10, 4], 9, modes), null, 'con una cuarta añadida ya no es diatónico');
  // La misma regla en tonalidad de Re, donde el vii es el Do# y lleva la quinta
  // disminuida: con la quinta justa (menor) ya no es diatónico.
  assert.equal(modeForTonality(1, [0, 3, 6], 2, modes), 'locrian', 'el Do# disminuido es el vii de Re');
  assert.equal(modeForTonality(1, MIN, 2, modes), null, 'el Do# menor trae el Sol# y sale de la escala');
  assert.equal(modeForTonality(1, MAJ, 2, modes), null, 'el Do# mayor tampoco es diatónico en Re');
});

test('la relación con la tonalidad se escribe, y avisa cuando el acorde no es diatónico', () => {
  const diatonic = tonalityRelation(2, MAJ, 9, modes);
  assert.deepEqual(diatonic, { modeKey: 'lydian', degree: 5, diatonic: true, degreeLabel: '4' });
  const prestado = tonalityRelation(0, MAJ, 9, modes);
  assert.equal(prestado.diatonic, false);
  assert.equal(prestado.modeKey, null);
  assert.equal(prestado.degreeLabel, '♭3', 'el Do es el ♭III de La');
  // En Re, el Do# mayor es el VII, que no tiene modo: se dice el grado.
  const septimo = tonalityRelation(1, MAJ, 2, modes);
  assert.equal(septimo.diatonic, false);
  assert.equal(septimo.degreeLabel, '7');
});

test('una tonalidad guardada incompleta o inválida se normaliza sin romperse', () => {
  // Una canción guardada antes de que existiera la tonalidad no trae el campo.
  assert.deepEqual(normalizeTonality(undefined), { on: false, root: 0, scale: 'ionian', label: 'degree' });
  assert.deepEqual(normalizeTonality(null), { on: false, root: 0, scale: 'ionian', label: 'degree' });
  assert.deepEqual(normalizeTonality('tonalidad'), { on: false, root: 0, scale: 'ionian', label: 'degree' });
  assert.deepEqual(normalizeTonality({ on: true, root: 9, scale: 'minorPentatonic', label: 'note' }),
    { on: true, root: 9, scale: 'minorPentatonic', label: 'note' });
  // Nada de lo que venga corrupto puede dejar la app sin escala que pintar.
  assert.deepEqual(normalizeTonality({ on: 'sí', root: 99, scale: 'lydian', label: 7 }),
    { on: false, root: 0, scale: 'ionian', label: 'degree' });
  assert.deepEqual(normalizeTonality({ on: true, root: -1, scale: null, label: null }),
    { on: true, root: 0, scale: 'ionian', label: 'degree' });
  assert.equal(validTonalityRoot(11), 11);
  assert.equal(validTonalityRoot(12), 0);
  assert.equal(validTonalityScale('minorPentatonic'), 'minorPentatonic');
  assert.equal(validTonalityScale('locrian'), 'ionian', 'una escala que no es de la tonalidad no se cuela');
  assert.equal(validTonalityLabel('off'), 'off');
  assert.equal(validTonalityLabel('notas'), 'degree');
  assert.deepEqual(TONALITY_SCALES, ['ionian', 'majorPentatonic', 'minorPentatonic']);
  assert.deepEqual(TONALITY_LABELS, ['off', 'note', 'degree']);
});
