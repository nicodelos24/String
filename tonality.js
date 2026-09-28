// Tonalidad del tema: la escala que manda en todo el mástil mientras está activa.
//
// No es el modo fantasma de cada tarjeta (`ghostMode`), que cuelga de la raíz
// del acorde: la tonalidad tiene raíz propia, así que se puede poner la de La y
// que el acorde que suena se lea contra ella. Con la tonalidad activada los
// grados y los colores de cada nota dejan de contarse desde la raíz del acorde
// y se cuentan desde la tonalidad; la escala que suena se sigue resaltando
// encima, que es lo que hace falta para ver «esto es el IV de La».
//
// Lo que decide qué es una tonalidad válida, qué notas tiene, qué grado ocupa
// cada nota y si un acorde vive dentro de ella vive aquí, en funciones puras y
// testeadas. El resto del archivo solo pinta y escucha los controles.

// Las escalas que puede tener la tonalidad. Las siete diatónicas son la misma
// escala mayor con otros tantos nombres, así que la tonalidad ofrece la mayor y
// las dos pentatónicas, que sí suenan distinto.
const TONALITY_SCALES = ['ionian', 'majorPentatonic', 'minorPentatonic'];
const TONALITY_INTERVALS = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
};
// Qué escribe la tonalidad en las escalas dibujadas. Fuera de ellas sigue
// mandando el botón MÁSTIL, que no cambia. S/E es «sin etiqueta».
const TONALITY_LABELS = ['off', 'note', 'degree'];

const DEGREE_LABELS = ['1', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];

const validTonalityRoot = value =>
  Number.isInteger(value) && value >= 0 && value <= 11 ? value : 0;
const validTonalityScale = value =>
  TONALITY_SCALES.includes(value) ? value : 'ionian';
const validTonalityLabel = value =>
  TONALITY_LABELS.includes(value) ? value : 'degree';

// Un guardado puede venir incompleto o corrupto (una canción de antes de que
// existiera la tonalidad, un respaldo editado a mano). Nunca lanza: devuelve
// la tonalidad que se puede usar, con la apagada, para no romper lo guardado.
function normalizeTonality(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    on: source.on === true,
    root: validTonalityRoot(source.root),
    scale: validTonalityScale(source.scale),
    label: validTonalityLabel(source.label),
  };
}

// Las notas de la tonalidad, de grave a agudo en clases de altura (0-11).
function tonalityNotes(root, scale = 'ionian') {
  const base = validTonalityRoot(root);
  const intervals = TONALITY_INTERVALS[validTonalityScale(scale)] || TONALITY_INTERVALS.ionian;
  return intervals.map(interval => (base + interval) % 12).sort((a, b) => a - b);
}

// El nombre del grado: el mismo vocabulario que el botón AA GRADOS, contando
// desde la tonalidad. El ♯4 es el grado que la escala lidia llama 4ª
// aumentada, y el ♯5 el que aparece en un acorde aumentado.
function degreeLabel(interval, options) {
  const settings = options || {};
  const value = Math.trunc(interval);
  const normalized = ((value % 12) + 12) % 12;
  if (normalized === 6 && settings.modeKey === 'lydian') return '♯4';
  if (normalized === 8 && settings.chordValue === 'aug') return '♯5';
  return DEGREE_LABELS[normalized];
}

// En qué modo de la tonalidad cae un acorde, o null si no cae dentro. Un
// acorde está en la tonalidad solo si todas sus notas pertenecen a su escala:
// el Do menor en tonalidad La comparte A, C y E con la escala, pero la G no, así
// que no es un modo de La y no se fuerza a que lo parezca. La tabla de modos la
// pasa quien la tiene (app.js), para que aquí no haya una copia que se pueda
// quedar vieja.
function modeForTonality(chordRoot, chordIntervals, tonalityRoot, modesTable) {
  if (!Number.isInteger(chordRoot) || !Number.isInteger(tonalityRoot) || !modesTable) return null;
  if (!Array.isArray(chordIntervals) || !chordIntervals.length) return null;
  const scale = tonalityNotes(tonalityRoot, 'ionian');
  const inside = pitch => scale.includes(((pitch % 12) + 12) % 12);
  // Los intervalos del acorde se cuentan desde su propia raíz, que no es la de
  // la tonalidad: por eso la suma es del acorde.
  if (!chordIntervals.every(interval => inside(chordRoot + interval))) return null;
  const degree = ((chordRoot - tonalityRoot) % 12 + 12) % 12;
  const match = Object.keys(modesTable).find(key => {
    const mode = modesTable[key];
    return mode && mode.type !== 'both' && mode.degree === degree;
  });
  return match || null;
}

// La relación del acorde que suena con la tonalidad, para poder escribirla:
// con el nombre del modo cuando el acorde es diatónico y, si no, el grado
// alterationado que ocupa. `Do mayor` en tonalidad La no es un modo de La (es
// el ♭III, tomado del menor paralelo), y decirlo evita que parezca un error.
function tonalityRelation(chordRoot, chordIntervals, tonalityRoot, modesTable) {
  const modeKey = modeForTonality(chordRoot, chordIntervals, tonalityRoot, modesTable);
  const degree = ((chordRoot - tonalityRoot) % 12 + 12) % 12;
  if (modeKey) {
    return { modeKey, degree, diatonic: true, degreeLabel: DEGREE_LABELS[degree] };
  }
  return { modeKey: null, degree, diatonic: false, degreeLabel: DEGREE_LABELS[degree] };
}

// El estado vive aquí porque app.js lo necesita al pintar, y app.js se carga
// después: es un objeto con campos mutables, no un `let` que se pueda reasignar
// en otro sitio.
const tonality = { on: false, root: 0, scale: 'ionian', label: 'degree' };

if (typeof document !== 'undefined') (() => {
  const toggle = document.getElementById('tonality-toggle');
  const rootSelect = document.getElementById('tonality-root');
  const scaleSelect = document.getElementById('tonality-scale');
  const settings = document.getElementById('tonality-settings');
  const labelRoot = document.getElementById('tonality-label');
  if (!toggle) return;

  function labelButtons() {
    if (!labelRoot || typeof labelRoot.querySelectorAll !== 'function') return [];
    return [].slice.call(labelRoot.querySelectorAll('[data-tonality-label]'));
  }

  function setLabelMode(mode) {
    labelButtons().forEach(button => {
      const active = button.dataset.tonalityLabel === mode;
      button.setAttribute('aria-pressed', String(active));
      if (button.classList && typeof button.classList.toggle === 'function') button.classList.toggle('is-active', active);
    });
    tonality.label = mode;
  }

  // El nombre de la tonalidad sigue el switch ♯/♭, como el resto de los nombres
  // de la página. Se lee `notes`/`noteLabels` de app.js, que se carga después:
  // por eso solo se escribe cuando ya existen.
  function paintRootLabels() {
    if (!rootSelect || typeof rootSelect.querySelectorAll !== 'function') return;
    if (typeof notes === 'undefined' || typeof noteLabels === 'undefined' || typeof pianoUseFlats === 'undefined') return;
    [].slice.call(rootSelect.querySelectorAll('option')).forEach(option => {
      const pitch = Number(option.value);
      if (!Number.isInteger(pitch) || pitch < 0 || pitch > 11) return;
      const sharp = notes[pitch];
      option.textContent = pianoUseFlats ? (noteLabels[sharp] || sharp) : sharp;
    });
  }

  // Los controles se esconden mientras la tonalidad está apagada, igual que
  // «Escala en vivo» con el micrófono apagado: lo que no se puede usar no
  // ocupa sitio ni se anuncia al lector de pantalla.
  function paint() {
    toggle.checked = tonality.on;
    if (rootSelect) rootSelect.value = String(tonality.root);
    if (scaleSelect) scaleSelect.value = tonality.scale;
    if (settings) settings.hidden = !tonality.on;
    setLabelMode(tonality.label);
    paintRootLabels();
  }

  const repaint = () => {
    paint();
    if (typeof updateView === 'function') updateView();
  };

  // Cada manejador lee su propio control, no `event.target`: el valor vive en
  // el elemento y así da igual quién dispare el evento (el ratón, el teclado o
  // las preferencias al restaurar).
  toggle.addEventListener('change', () => {
    tonality.on = Boolean(toggle.checked);
    repaint();
  });
  if (rootSelect) {
    rootSelect.addEventListener('change', () => {
      tonality.root = validTonalityRoot(Number(rootSelect.value));
      repaint();
    });
  }
  if (scaleSelect) {
    scaleSelect.addEventListener('change', () => {
      tonality.scale = validTonalityScale(scaleSelect.value);
      repaint();
    });
  }
  labelButtons().forEach(button => {
    button.addEventListener('click', () => {
      setLabelMode(button.dataset.tonalityLabel || 'degree');
      repaint();
    });
  });
  // El switch ♯/♭ de la raíz vive en app.js; aquí solo se copian sus nombres
  // para que el selector de la tonalidad no se quede con la grafía anterior.
  const spelling = document.getElementById('root-spelling');
  if (spelling && spelling.addEventListener) spelling.addEventListener('change', paintRootLabels);

  // Lo que necesita el resto de la página: pintar sus controles y aplicar una
  // tonalidad que venga de fuera (las preferencias y «Mis progresiones»).
  globalThis.StringTonality = {
    paint,
    apply(value) {
      const next = normalizeTonality(value);
      tonality.on = next.on;
      tonality.root = next.root;
      tonality.scale = next.scale;
      tonality.label = next.label;
      repaint();
    },
  };

  paint();
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    tonality,
    normalizeTonality,
    tonalityNotes,
    degreeLabel,
    modeForTonality,
    tonalityRelation,
    validTonalityRoot,
    validTonalityScale,
    validTonalityLabel,
    TONALITY_SCALES,
    TONALITY_LABELS,
    TONALITY_INTERVALS,
  };
}
