// T-56 · ronda 2 (A-35 + A-37, 2026-10-26). Palabra del autor sobre la ronda 1
// ya publicada: la barrita no debe flotar sobre el contenido —queda clavada
// abajo de la banda de tarjetas, con todo el ancho útil y más baja—, sólo su
// fila viaja en el cuadro fino (el recuadro grande se queda atrás, sobre el
// fondo punteado) y una flechita la minimiza a la píldora de la ronda 1, que no
// se descarta. Y al desplazarse, el límite superior de la banda conserva la
// línea que se ve en reposo (A-37).
//
// Esta guarda fija los dos estados del scroll y el interruptor: en reposo no
// existe ninguno de los dos. La compaction y lo lindo se miden en Chromium
// (PACTO.md §5): npm test no mide estilos.

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const cssCrudo = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const css = cssCrudo.replace(/\/\*[\s\S]*?\*\//g, '');
const modulo = path.join(root, 'transport-pill.js');

// El bloque de T-56, desde su cabecera hasta el final del archivo.
const marca = cssCrudo.indexOf('/* T-56');
const bloque = marca === -1 ? '' : cssCrudo.slice(marca).replace(/\/\*[\s\S]*?\*\//g, '');

function reglas(fuente) {
  return [...fuente.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, cuerpo]) => ({
    selector: selector.trim(),
    cuerpo: cuerpo.replace(/\s+/g, ' '),
  }));
}

function reglaEn(fuente, selectorExacto, donde) {
  const encontrada = reglas(fuente).find(regla => regla.selector === selectorExacto);
  assert.ok(encontrada, `falta la regla ${selectorExacto} en ${donde}`);
  return encontrada.cuerpo;
}

const tiene = (cuerpo, propiedad, valor) =>
  new RegExp('(^|;)\\s*' + propiedad + '\\s*:\\s*' + valor + '\\s*(;|$)', 'i').test(cuerpo);
const valor = (cuerpo, propiedad) => {
  const m = cuerpo.match(new RegExp('(?:^|;)\\s*' + propiedad + '\\s*:\\s*([^;]+)', 'i'));
  return m ? m[1].trim() : null;
};

// Contenido interior del <div> que abre con `apertura` exacta, contando
// anidamientos: sirve para aislar la píldora del HTML plano.
function bloqueDiv(fuente, apertura) {
  const inicio = fuente.indexOf(apertura);
  assert.notEqual(inicio, -1, `falta el bloque ${apertura}`);
  const desde = inicio + apertura.length;
  const etiquetas = /<div\b|<\/div>/g;
  etiquetas.lastIndex = desde;
  let profundidad = 1;
  for (let m = etiquetas.exec(fuente); m; m = etiquetas.exec(fuente)) {
    profundidad += m[0] === '</div>' ? -1 : 1;
    if (profundidad === 0) return fuente.slice(desde, m.index);
  }
  assert.fail(`el bloque ${apertura} no cierra`);
}

test('la barrita clavada usa todo el ancho útil y queda en su cuadro fino', () => {
  const clavada = reglaEn(bloque,
    '.transport-row.is-floating:not(.is-transport-minimized) .transport-pill', 'el bloque T-56');
  assert.ok(tiene(clavada, 'position', 'fixed'),
    'el estado clavado sigue a la vista al desplazarse');
  assert.match(valor(clavada, 'width') || '', /^var\(--transporte-franja/,
    'toma todo el ancho útil de la caja (no el ancho de la fila de T-47, que comparte línea)');
  assert.match(valor(clavada, 'left') || '', /^var\(--transporte-left/,
    'arranca alineada con el contenido de la caja');
  assert.equal(valor(clavada, 'border-radius'), '12px',
    'el cuadro fino de borde redondeado de la imagen del autor (no la media luna de la píldora)');
  assert.ok(tiene(clavada, 'border', '1px solid var\\(--line\\)'),
    'sólo su fila viaja con la línea fina del cuadro');
  assert.ok(tiene(clavada, 'background', 'var\\(--paper-light\\)'),
    'su rectángulo es el único con fondo claro');
  assert.ok(!tiene(clavada, 'width', 'max-content'),
    'clavada no se encoge a su contenido: eso es el estado minimizado');
});

test('la flechita minimiza a la píldora de la ronda 1 y la vuelve a desplegar', () => {
  const minimizada = reglaEn(bloque,
    '.transport-row.is-floating.is-transport-minimized .transport-pill', 'el bloque T-56');
  assert.ok(tiene(minimizada, 'width', 'max-content'),
    'minimizada vuelve a la píldora de la ronda 1: se ajusta a su contenido');
  assert.ok(tiene(minimizada, 'border-radius', '999px'),
    'con el borde redondeado de píldora que la ronda 1 ya tenía');
  assert.ok(tiene(minimizada, 'justify-content', 'space-between'),
    'y el reparto de la ronda 1, con la flechita en el extremo');

  // El control: oculto en reposo, visible sólo cuando la barrita vuela.
  const boton = reglaEn(bloque, '.transport-minimize', 'el bloque T-56');
  assert.ok(tiene(boton, 'display', 'none'),
    'en reposo no hay flechita: la fila es idéntica a hoy');
  const visible = reglaEn(bloque, '.transport-row.is-floating .transport-minimize', 'el bloque T-56');
  assert.ok(!tiene(visible, 'display', 'none'), 'con el scroll la flechita aparece');
  assert.ok(tiene(visible, 'position', 'absolute'),
    'va posicionada: no le roba una línea a los controles en pantallas angostas');
  assert.match(valor(visible, 'right') || '', /^\d+px$/,
    'queda en el extremo derecho de la barrita');
  assert.ok(reglas(bloque).some(regla => /is-transport-minimized[^{]*\.transport-minimize-icon/.test(regla.selector)),
    'el icono cambia de sentido cuando la barrita está minimizada');
});

test('el HTML pone la flechita dentro de la píldora, con su nombre accesible', () => {
  const transporte = bloqueDiv(html, '<div class="progression-controls-row transport-row"');
  const pildora = bloqueDiv(transporte, '<div class="transport-pill">');
  const cuantas = (html.match(/id="transport-minimize"/g) || []).length;
  assert.equal(cuantas, 1, '#transport-minimize aparece una sola vez en la página');
  assert.ok(pildora.includes('id="transport-minimize"'),
    'la flechita vive dentro de la píldora, no fuera de la fila');
  assert.match(pildora, /id="transport-minimize"[^>]*type="button"/,
    'es un botón, no un enlace');
  assert.match(pildora, /id="transport-minimize"[^>]*aria-pressed="false"/,
    'nace desplegada');
  assert.match(pildora, /id="transport-minimize"[^>]*aria-label="[^"]*[Mm]inimizar/,
    'y su nombre accesible dice qué hace');
  // Los controles de siempre siguen ahí: la flechita se suma, no reemplaza.
  for (const id of ['progression-view', 'accompaniment-mute', 'tempo-play-stand', 'tempo-tap']) {
    assert.ok(pildora.includes(`id="${id}"`), `la píldora conserva #${id}`);
  }
});

test('el borde superior de la banda conserva su línea al quedar pegada', () => {
  const pegada = reglaEn(bloque, '.cards-band.is-stuck', 'el bloque T-56');
  assert.ok(tiene(pegada, 'border-top', '1px solid var\\(--line\\)'),
    'con la banda clavada, su límite superior pinta la misma línea de 1 px del reposo');
  // La banda del reposo no declara la clase: la línea sólo existe al desplazarse.
  const base = reglas(css).filter(regla => regla.selector === '.cards-band');
  for (const regla of base) {
    assert.ok(!tiene(regla.cuerpo, 'border-top', '1px solid var\\(--line\\)'),
      'en reposo la banda no suma una línea nueva: ni un pixel de cambio');
  }
});

test('en movimiento reducido los dos estados flotantes quedan sin animación', () => {
  // Devolución de QA sobre `4adba3e`: la regla heredada de la ronda 1
  // (`.transport-row.is-floating .transport-pill`, tres clases) pierde en la
  // cascada contra el estado clavado de la ronda 2 (cuatro clases, porque el
  // `:not()` cuenta). La guarda exige que el reset nombre los dos estados con
  // especificidad suficiente, no que confíe en el orden del archivo.
  const medios = [...bloque.matchAll(/@media\s*([^{]+)\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)];
  const reduce = medios.find(([, condicion]) => /prefers-reduced-motion\s*:\s*reduce/.test(condicion));
  assert.ok(reduce, 'el bloque T-56 declara su media de movimiento reducido');

  const especificidad = selector => {
    const sinNot = selector.replace(/:not\(([^)]*)\)/g, ' $1 ');
    const clases = (sinNot.match(/\.[\w-]+/g) || []).length +
      (sinNot.match(/\[[^\]]*\]/g) || []).length;
    const ids = (sinNot.match(/#[\w-]+/g) || []).length;
    const elementos = (sinNot.replace(/\.[\w-]+|#[-\w]+|\[[^\]]*\]|\s+/g, ' ')
      .match(/[a-zA-Z][\w-]*/g) || []).length;
    return ids * 10000 + clases * 100 + elementos;
  };

  // Cada selector que enciende la animación de la píldora, con su peso.
  const animados = reglas(bloque)
    .filter(regla => /\.transport-pill\b/.test(regla.selector))
    .filter(regla => /(^|;)\s*animation\s*:\s*transporte-pildora/.test(regla.cuerpo))
    .map(regla => ({selector: regla.selector, peso: especificidad(regla.selector)}));
  assert.ok(animados.length >= 2, 'los dos estados flotantes entran animados');

  const resets = reglas(reduce[2])
    .filter(regla => /\.transport-pill\b/.test(regla.selector))
    .filter(regla => tiene(regla.cuerpo, 'animation', 'none'))
    .map(regla => ({selector: regla.selector, peso: especificidad(regla.selector)}));

  for (const animado of animados) {
    const alcanza = resets.some(reset => reset.peso >= animado.peso);
    assert.ok(alcanza,
      `con movimiento reducido ${animado.selector} debe computar animation: none; ` +
      'el reset tiene que nombrarlo con su misma especificidad');
  }
  // Y los dos estados se nombran de forma explícita, no por arrastre.
  const todos = resets.map(reset => reset.selector).join(', ');
  assert.match(todos, /:not\(\.is-transport-minimized\)/,
    'el estado clavado queda nombrado en el reset');
  assert.match(todos, /\.is-floating\.is-transport-minimized/,
    'el estado minimizado también');
  assert.ok(!/animation\s*:\s*none\s*!important/.test(reduce[2]),
    'se corrige la cascada por especificidad, sin !important');
});

test('el observador publica los dos estados, el ancho de la franja y la banda pegada', () => {
  const js = fs.readFileSync(modulo, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  for (const contrato of ['is-transport-minimized', 'is-stuck', '--transporte-franja',
    'transport-minimize', 'aria-pressed']) {
    assert.ok(js.includes(contrato), `el observador publica ${contrato}`);
  }
  assert.match(js, /addEventListener\(\s*'click'/, 'la flechita alterna el estado con un clic');
  assert.match(js, /--transporte-franja/, 'mide el ancho útil de la caja en cada aplicación');
  assert.match(js, /clientWidth/, 'el ancho útil sale de la caja real, no de una constante');
  // Sin tocar nada más: ni guardado, ni audio, ni motor.
  for (const ajeno of ['localStorage', 'sessionStorage', 'traste.songs', 'AudioContext',
    'AppState', 'saveSong']) {
    assert.ok(!js.includes(ajeno), `el observador no toca ${ajeno}: el minimizado es de la sesión`);
  }
});

test('en reposo la fila conserva el contrato de la ronda 1', () => {
  // La fila en el flujo mantiene su hueco: ni el ancho ni el alto de reposo
  // cambian cuando la barrita vuela, y las dos filas de T-47 no se reflotan.
  const fila = reglaEn(bloque, '.transport-row.is-floating', 'el bloque T-56');
  assert.match(valor(fila, 'width') || '', /^var\(--transporte-ancho/,
    'la fila conserva el ancho de reposo mientras la barrita vuela');
  assert.match(valor(fila, 'height') || '', /^var\(--transporte-alto/,
    'y su alto: el paso al scroll no corre el contenido');
});
