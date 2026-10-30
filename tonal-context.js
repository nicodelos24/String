// Contrato puro del contexto tonal (T-44 · QA-TONAL-01): la inferencia es
// exacta por grado, no «más cercana». El mapa depende de la escala (mayor o
// menor natural) y del grado de la raíz respecto de la tónica. Solo se infiere
// si el acorde es diatónico —todas sus notas dentro de la escala—; prestados,
// cromáticos y calidades incompatibles devuelven null, sin conversión silenciosa.
// Autocontenido y sin DOM. Su única tabla compartida con la app (intervalos
// por tipo) la vela la guarda de fuente única de su archivo de pruebas, que
// la coteja contra chordTypes de app.js leído como texto.

const DIATONIC_DEGREES = [0, 2, 4, 5, 7, 9, 11];

const MODES_BY_DEGREE = {
  0: 'ionian', 2: 'dorian', 4: 'phrygian',
  5: 'lydian', 7: 'mixolydian', 9: 'aeolian', 11: 'locrian'
};

const NATURAL_MINOR_DEGREES = [0, 2, 3, 5, 7, 8, 10];
const MINOR_MODES_BY_DEGREE = {
  0: 'aeolian', 2: 'locrian', 3: 'ionian', 5: 'dorian',
  7: 'phrygian', 8: 'lydian', 10: 'mixolydian'
};

// Intervalos por tipo de acorde, exactamente los del cómputo (chordTypes de
// app.js). La tabla vive acá porque el módulo corre solo en Node; la prueba
// de fuente única coteja las dos para que no puedan diverjar.
const CHORD_INTERVALS = {
  maj: [0, 4, 7], maj7: [0, 4, 7, 11], maj9: [0, 4, 7, 11, 2],
  maj13: [0, 4, 7, 11, 2, 9], add9: [0, 4, 7, 2],
  m: [0, 3, 7], m7: [0, 3, 7, 10], m9: [0, 3, 7, 10, 2],
  m6: [0, 3, 7, 9], m11: [0, 3, 7, 10, 2, 5],
  dim: [0, 3, 6], dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10],
  aug: [0, 4, 8],
  '7': [0, 4, 7, 10], '7sus4': [0, 5, 7, 10], '9': [0, 4, 7, 10, 2],
  '13': [0, 4, 7, 10, 2, 9], '11': [0, 4, 7, 10, 2, 5],
  '6': [0, 4, 7, 9], '6/9': [0, 4, 7, 9, 2],
  sus2: [0, 2, 7], sus4: [0, 5, 7]
};

const NOTE_PC = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};

// La tónica de la tonalidad: la grafía del cómputo ('C', 'F#', 'Bb'…).
// Cualquier otra cosa es null, sin adivinar.
function parsePitchClass(text) {
  if (typeof text !== 'string' || text.length < 1) return null;
  const base = NOTE_PC[text[0].toUpperCase()];
  if (base === undefined) return null;
  let alter = 0;
  for (const ch of text.slice(1)) {
    if (ch === '#' || ch === '♯') alter += 1;
    else if (ch === 'b' || ch === '♭') alter -= 1;
    else return null;
  }
  return ((base + alter) % 12 + 12) % 12;
}

// El contrato. Recibe el acorde del dato de la app ({root: entero 0..11,
// type: uno de chordTypes}) y la tonalidad ({key: 'C'…, scale: 'major'|'minor'}).
// Devuelve el modo exacto del grado, o null. Nunca lanza: datos mal formados
// no infieren, no explota.
function inferTonalContext(chord, tonality) {
  if (!chord || typeof chord !== 'object') return null;
  if (!Number.isInteger(chord.root) || chord.root < 0 || chord.root > 11) return null;
  if (typeof chord.type !== 'string') return null;
  const intervals = CHORD_INTERVALS[chord.type];
  if (!intervals) return null;
  if (!tonality || typeof tonality !== 'object') return null;
  if (tonality.scale !== 'major' && tonality.scale !== 'minor') return null;
  const tonic = parsePitchClass(tonality.key);
  if (tonic === null) return null;
  const grado = (chord.root - tonic + 12) % 12;
  const minor = tonality.scale === 'minor';
  const modo = (minor ? MINOR_MODES_BY_DEGREE : MODES_BY_DEGREE)[grado];
  if (!modo) return null;
  for (const interval of intervals) {
    if (!(minor ? NATURAL_MINOR_DEGREES : DIATONIC_DEGREES).includes((grado + interval) % 12)) return null;
  }
  return modo;
}

const TonalContext = {parsePitchClass, DIATONIC_DEGREES, MODES_BY_DEGREE, NATURAL_MINOR_DEGREES, MINOR_MODES_BY_DEGREE, CHORD_INTERVALS, inferTonalContext};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TonalContext;
} else if (typeof window !== 'undefined') {
  // En la página (index.html lo carga antes de app.js) queda en window, y
  // app.js lo lee como identificador global igual que el resto de módulos.
  window.TonalContext = TonalContext;
}
