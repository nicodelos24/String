// Tinta legible sobre el relleno de una nota del mástil (T-36, línea 2).
//
// Autoridad única del par relleno/tinta: lo usan el render del mástil (`app.js`)
// y el tintado del micrófono (`microphone-ui.js`), que escribe el mismo par
// mientras la nota suena. Sin esto, el micrófono devolvía el defecto.
//
// Por qué existe: la tinta era una sola para todos los rellenos —clara en la
// raíz y en las notas del acorde, oscura en las demás— y no llegaba a AA:
// `#f3f0e8` sobre la 5ª (`#e6b800`) daba 1,64, sobre la 3ª mayor (`#4caf50`)
// 2,44 y sobre la raíz (`#e53935`) 3,71; `#666` sobre el gris de la nota de
// escala sin resaltar (`#bbb`), 2,99. Son los 84 rótulos visibles del arranque
// a 1366×650 (medición de `docs/CONTRASTE-SUPERFICIES.md`).
//
// No se toca el relleno: el color del intervalo es el lenguaje de la escala y
// vive en una sola tabla (`intervalClasses` de `app.js`). Se adapta la tinta,
// entre la más oscura y la más clara posibles, y todo relleno de esa tabla
// llega a 4,5: los claros llevan negro (el más justo, la raíz, 4,97) y los
// oscuros blanco (el más justo, el 7ª mayor, 4,82).

const NOTE_INK_DARK = '#000000';
const NOTE_INK_LIGHT = '#ffffff';

// Canales 0–255 de un color hex de 3 o 6 dígitos, o null si no lo es.
function parseHexColor(color) {
  if (typeof color !== 'string') return null;
  const match = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const full = match[1].length === 3 ? match[1].split('').map(c => c + c).join('') : match[1];
  return [0, 2, 4].map(start => parseInt(full.slice(start, start + 2), 16));
}

// Luminancia relativa de WCAG 2.1, o null si el color no es hex.
function relativeLuminance(color) {
  const rgb = parseHexColor(color);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(value => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Ratio de contraste de dos colores hex, o null si alguno no se puede leer.
function contrastRatio(a, b) {
  const first = relativeLuminance(a), second = relativeLuminance(b);
  if (first === null || second === null) return null;
  const [light, dark] = first > second ? [first, second] : [second, first];
  return (light + 0.05) / (dark + 0.05);
}

// Tinta del rótulo sobre ese relleno: la de más contraste de las dos, que en la
// tabla de intervalos es siempre ≥ 4,5. Devuelve null si el relleno no es un
// color sólido legible (`transparent`, `rgba(...)`): ahí manda quien pinta.
function inkOverFill(fill) {
  const dark = contrastRatio(NOTE_INK_DARK, fill);
  const light = contrastRatio(NOTE_INK_LIGHT, fill);
  if (dark === null || light === null) return null;
  return dark >= light ? NOTE_INK_DARK : NOTE_INK_LIGHT;
}

const NoteInk = { NOTE_INK_DARK, NOTE_INK_LIGHT, parseHexColor, relativeLuminance, contrastRatio, inkOverFill };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NoteInk;
} else if (typeof window !== 'undefined') {
  // En la página (index.html lo carga antes de app.js) queda en window, y
  // app.js lo lee como identificador global igual que el resto de módulos.
  window.NoteInk = NoteInk;
}
