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

// Mínimo de lectura (WCAG AA para texto normal) y el aire que se le deja a la
// tinta suave: el gris se elige con un pelo de margen para que ninguna
// aritmética de medición lo deje en 4,49.
const AA_MIN_RATIO = 4.5;
const SOFT_INK_MARGIN = 0.05;

function grayHex(value) {
  const channel = value.toString(16).padStart(2, '0');
  return '#' + channel + channel + channel;
}

// Tinta del rótulo sobre ese relleno: la de más contraste de las dos, que en la
// tabla de intervalos es siempre ≥ 4,5. Devuelve null si el relleno no es un
// color sólido legible (`transparent`, `rgba(...)`): ahí manda quien pinta.
//
// Con `{ soft: true }` no devuelve el extremo sino **el gris más suave del mismo
// lado que todavía llega a AA** (T-55 ronda 3, palabra `A-33` del autor: «algún
// color más grisáceo de fuentes y no un negro tan disruptivo»). Es la misma
// autoridad y la misma medición; solo cambia cuánto se aparta del extremo, y en
// los rellenos apretados —el rojo de la raíz— el gris honesto queda casi negro
// porque ahí el AA no deja más aire.
function inkOverFill(fill, options) {
  const dark = contrastRatio(NOTE_INK_DARK, fill);
  const light = contrastRatio(NOTE_INK_LIGHT, fill);
  if (dark === null || light === null) return null;
  const darkSide = dark >= light;
  if (!options || !options.soft) return darkSide ? NOTE_INK_DARK : NOTE_INK_LIGHT;

  const limit = AA_MIN_RATIO + SOFT_INK_MARGIN;
  const reachesAA = value => {
    const ratio = contrastRatio(grayHex(value), fill);
    return ratio !== null && ratio >= limit;
  };
  if (darkSide) {
    // Del gris más claro al más oscuro: el primero que pasa es el más suave.
    for (let value = 254; value >= 1; value--) if (reachesAA(value)) return grayHex(value);
  } else {
    for (let value = 1; value <= 254; value++) if (reachesAA(value)) return grayHex(value);
  }
  // Un relleno tan apretado que solo el extremo lee: se queda el extremo.
  return darkSide ? NOTE_INK_DARK : NOTE_INK_LIGHT;
}

// Polaridad del halo de `T-36` r2: va al revés de la tinta, y se decide por
// luminancia, no por igualdad con el hex del extremo — con la tinta suave ese
// hex ya no aparece y la nota que suena se quedaría sin halo. Devuelve '' donde
// no hay par medible (relleno transparente o tinta con alfa).
function inkShadowClass(fill, ink) {
  const inkLuminance = relativeLuminance(ink);
  const fillLuminance = relativeLuminance(fill);
  if (inkLuminance === null || fillLuminance === null) return '';
  return inkLuminance < fillLuminance ? 'ink-dark' : 'ink-light';
}

const NoteInk = {
  NOTE_INK_DARK, NOTE_INK_LIGHT, AA_MIN_RATIO,
  parseHexColor, relativeLuminance, contrastRatio, inkOverFill, inkShadowClass,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NoteInk;
} else if (typeof window !== 'undefined') {
  // En la página (index.html lo carga antes de app.js) queda en window, y
  // app.js lo lee como identificador global igual que el resto de módulos.
  window.NoteInk = NoteInk;
}
