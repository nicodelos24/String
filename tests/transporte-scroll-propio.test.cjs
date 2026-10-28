// T-56 ronda 4 · A-43 (la letra (B) de D-10: scroll propio del panel) + A-46
// (la cápsula de la barra fija) · 27-10.
//
// La guarda nace ROJA contra la base `0c199e5` y la implementación debe dejarla
// verde (PACTO §4). Fija la CLASE de arquitectura que pide el pliego:
//   · el que scrollea es la ventana del panel: el documento (body) deja de
//     desplazarse y todo viaja dentro de `#scroll-window`;
//   · la banda de tarjetas y la fila del transporte viven fuera del scrolleo,
//     clavadas al marco (sticky); nada cruza por detrás de la cápsula;
//   · A-46: la ÚNICA pieza con fondo es la cápsula redondeada de la fila —
//     sin sombra, cuadro fino de 1 px radio 12, ancho natural de la fila,
//     menos alta que el compacto de A-35, flechita adentro a la izquierda, y
//     «Detenido» (y todo lo demás fuera de la cápsula) sin fondo fijo;
//   · movimiento reducido: `animation: none` en los estados volantes.
// La geometría real (superposición a varias posiciones, recorte de controles)
// se mide en Chromium: barrido multi-posición de QA (PACTO §5).

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const js = fs.readFileSync(path.join(root, 'transport-pill.js'), 'utf8');

// Contenido interior del <div> que abre con `apertura`, contando anidamientos.
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

// Reglas CSS de un bloque @media (o del archivo entero, con condicion null).
function reglas(condicion) {
  const salida = [];
  let desde = 0;
  while (true) {
    if (condicion == null) {
      salida.push(...[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .map(m => [m[1].trim(), m[2].replace(/\s+/g, ' ')]));
      break;
    }
    const inicio = css.indexOf(condicion, desde);
    if (inicio === -1) break;
    const abre = css.indexOf('{', inicio + condicion.length);
    let profundidad = 1;
    let cursor = abre + 1;
    while (profundidad > 0 && cursor < css.length) {
      if (css[cursor] === '{') profundidad += 1;
      else if (css[cursor] === '}') profundidad -= 1;
      cursor += 1;
    }
    const cuerpo = css.slice(abre + 1, cursor - 1);
    salida.push(...[...cuerpo.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => [m[1].trim(), m[2].replace(/\s+/g, ' ')]));
    desde = cursor;
  }
  return salida;
}

function Hay(selector, cuerpo, condicion = null) {
  return reglas(condicion).some(([s, c]) =>
    s.replace(/\s+/g, ' ').includes(selector) && c.includes(cuerpo));
}

test('T-56 r4 · la ventana del panel existe y envuelve main + el pie (el topbar queda fuera)', () => {
  assert.match(html, /<div class="scroll-window" id="scroll-window">/);
  const ventana = bloqueDiv(html, 'id="scroll-window"');
  assert.ok(ventana.includes('<main class="shell">'), 'la caja del shell scrollea dentro de la ventana');
  assert.ok(ventana.includes('<footer'), 'el pie es parte del recorrido propio');
  const antes = html.slice(0, html.indexOf('id="scroll-window"'));
  assert.ok(antes.includes('<header class="topbar">'), 'la barra superior no entra en el scrolleo');
});

test('T-56 r4 · clase de arquitectura: el body deja de desplazarse y la ventana del panel es la que scrollea', () => {
  assert.ok(Hay('html.ventana body', 'overflow: hidden'), 'el documento deja de desplazarse con la ventana activa');
  assert.ok(Hay('.scroll-window', 'overflow-y: auto'), 'la ventana del panel desplaza su propio contenido');
});

test('T-56 r4 · la banda y la fila del transporte quedan clavadas al marco, fuera del scrolleo', () => {
  // La fila del transporte se clava con sticky debajo de la banda (A-43):
  // sticky sobre la CAJA (.progression-view-controls) — «Detenido» es hermano
  // de la caja en .progression-stack y NO viaja con lo fijo (A-46 ·3).
  assert.ok(
    Hay('.progression-stack > .progression-view-controls', 'position: sticky'),
    'la fila del transporte se clava con sticky dentro de la ventana');
  assert.ok(!Hay('.workspace > .progression-workspace', 'position: sticky'),
    'el sticky ya no se aplica al carril entero');
  assert.ok(js.includes('--banda-franja'), 'el observador publica la franja de banda que usa el sticky');
  // A-46 ·3: el «Detenido» queda fuera de la caja sticky (estructura del HTML).
  const caja = bloqueDiv(html, '<div class="progression-view-controls">');
  assert.ok(!caja.includes('progression-playback'),
    '«Detenido» vive fuera de la caja sticky y no viaja con lo fijo');
});

test('T-56 r4 · A-46 cápsula-only: fondo y cuadro en la cápsula, transparente por fuera, sin sombra', () => {
  assert.ok(Hay('html.ventana .transport-row.is-floating:not(.is-transport-minimized) .transport-pill', 'background: var(--paper-light)'),
    'la cápsula clavada lleva fondo');
  assert.ok(Hay('html.ventana .transport-row.is-floating:not(.is-transport-minimized) .transport-pill', 'border: 1px solid var(--line)'),
    'cuadro fino de 1 px');
  assert.ok(Hay('html.ventana .transport-row.is-floating:not(.is-transport-minimized) .transport-pill', 'border-radius: 12px'),
    'cápsula redondeada radio 12 (18-14-55)');
  const clavadas = reglas().filter(([s]) => s.includes('html.ventana') && s.includes('.transport-pill'));
  for (const [, cuerpo] of clavadas) {
    assert.ok(!cuerpo.replace(/box-shadow:\s*none/g, '').includes('box-shadow'),
      'sin sombra en la cápsula clavada (A-41: no flotante)');
  }
  assert.ok(clavadas.length >= 4, 'el bloque clavado de la ronda 4 está');
});

test('T-56 r4 · A-46 ·3: la flechita del minimizar queda DENTRO de la cápsula, a la izquierda', () => {
  assert.ok(Hay('html.ventana .transport-row.is-floating .transport-minimize', 'position: static'),
    'la flechita deja de estar absolute en el extremo');
  assert.ok(Hay('html.ventana .transport-row.is-floating .transport-minimize', 'order: -1'),
    'la flechita se lleva al arranque de la fila (Imagen 3: 18-14-55)');
});

test('T-56 r4 · A-46 ·4: la cápsula clavada queda menos alta que el compacto de A-35', () => {
  assert.ok(Hay('html.ventana .transport-row.is-floating .transport-pill .tempo-tap', 'min-height: 26px'),
    'el botón de Tempo baja de los 30 px del compacto');
  assert.ok(Hay('html.ventana .transport-row.is-floating .transport-pill .mute-toggle', 'min-height: 22px'),
    'Silencio baja de los 24 px del compacto');
});

test('T-56 r4 · movimiento reducido: los estados volantes siguen sin animación', () => {
  // La guarda entra en algún bloque prefers-reduced-motion (el de la ronda 2
  // quedó al final del archivo y hay otros más arriba).
  let visto = false;
  let desde = 0;
  while (true) {
    const inicio = css.indexOf('prefers-reduced-motion: reduce', desde);
    if (inicio === -1) break;
    const abre = css.indexOf('{', inicio);
    let profundidad = 1;
    let cursor = abre + 1;
    while (profundidad > 0 && cursor < css.length) {
      if (css[cursor] === '{') profundidad += 1;
      else if (css[cursor] === '}') profundidad -= 1;
      cursor += 1;
    }
    const cuerpo = css.slice(abre + 1, cursor - 1);
    if (cuerpo.includes('.transport-row.is-floating .transport-pill') && cuerpo.includes('animation: none')) {
      visto = true;
      break;
    }
    desde = cursor;
  }
  assert.ok(visto, 'reset de movimiento reducido en la píldora volante');
});

test('T-56 r4 · el reparto móvil de la ronda 2 no se pierde: sin ventana activa, la fila sigue el régimen fijo', () => {
  // El fallback (sin JS o sin ventana) conserva la fila clavada de la ronda 2,
  // con su reserva y su posición fija: móvil sin la ventana no queda pelado.
  assert.ok(Hay('.transport-row.is-floating:not(.is-transport-minimized) .transport-pill', 'position: fixed'),
    'el estado clavado sin ventana conserva su posición fija');
  assert.ok(Hay('.transport-row.is-floating', 'width: var(--transporte-ancho, auto)'),
    'la reserva del hueco de reposo queda publicada');
});

test('T-56 r4 · el observador vive en la ventana: escucha el scroll del panel, no el del documento', () => {
  assert.ok(js.includes("getElementById('scroll-window')"),
    'el módulo toma la ventana del panel');
  assert.match(js, /ventana\.addEventListener\('scroll'/);
});

test('T-56 r4 · comportamiento de la fila en el sandbox: clavada, minimizada y variables', () => {
  // DOM simulado mínimo: la fila, su caja, la banda, la flechita y la ventana.
  const estilos = {borderLeftWidth: '0px', borderRightWidth: '0px', borderTopWidth: '0px',
    paddingLeft: '0px', paddingRight: '0px', paddingTop: '0px', position: 'sticky'};
  const rect = (top, left, w, h) => ({top, left, right: left + w, bottom: top + h, width: w, height: h});
  const clase = (nombres) => ({
    contiene: new Set(nombres),
    add(...n) { n.forEach(x => this.contiene.add(x)); },
    remove(...n) { n.forEach(x => this.contiene.delete(x)); },
    toggle(n, v) { (v === undefined ? !this.contiene.has(n) : v) ? this.add(n) : this.remove(n); },
    contains(n) { return this.contiene.has(n); },
  });

  const pildora = {classList: clase([]), children: [], getBoundingClientRect: () => rect(0, 0, 40, 24),
    querySelector: () => null, style: {setProperty() {}}};
  const boton = {classList: clase([]), setAttribute() {}, addEventListener(ev, fn) { this.alClick = fn; }, style: {setProperty() {}}};
  const fila = {classList: clase([]), style: {setProperty() {}}, getClientRects: () => [{}],
    getBoundingClientRect: () => rect(260 - ventana.scrollTop, 0, 40, 40), offsetHeight: 40, offsetWidth: 40,
    querySelector: (sel) => (sel === '#transport-minimize' ? boton : pildora), children: []};
  const caja = {classList: clase([]), getBoundingClientRect: () => rect(210, 0, 40, 90), clientWidth: 40,
    style: {setProperty() {}}};
  fila.closest = () => caja;
  const banda = {classList: clase([]), style: {setProperty() {}}, getBoundingClientRect: () => rect(78, 0, 40, 160),
    getComputedStyle: undefined};
  const ventana = {scrollTop: 0, addEventListener() {}, getBoundingClientRect: () => rect(78, 0, 40, 650)};

  const escuchas = {scroll: []};
  ventana.addEventListener = (ev, fn) => { if (ev === 'scroll') escuchas.scroll.push(fn); };

  const documento = {
    querySelector: (sel) => ({
      '.transport-row': fila, '.cards-band': banda }[sel] || null),
    getElementById: (id) => (id === 'scroll-window' ? ventana : null),
    documentElement: {style: {setProperty() {}}, classList: clase([])},
  };

  const marco = {
    document: documento,
    window: {
      addEventListener() {}, MutationObserver: undefined, requestAnimationFrame(f) { f(); },
      getComputedStyle: () => estilos, scrollY: 0, innerWidth: 1366,
      matchMedia: (q) => ({matches: /\.matches/i.test(q) ? true : true, addEventListener() {}}),
    },
    requestAnimationFrame(f) { f(); },
    getComputedStyle: () => estilos,
  };
  let raf = marco.requestAnimationFrame;
  const comunes = {Math, getComputedStyle: marco.getComputedStyle, requestAnimationFrame: raf};
  const globalStub = new Proxy(comunes, {get: (t, k) => (k in marco ? marco[k] : t[k])});
  globalStub.requestAnimationFrame = raf;
  vm.runInNewContext(js, globalStub);

  assert.ok(escuchas.scroll.length, 'el observador escucha el scroll de la ventana del panel');
  // Guarda de ACTIVACIÓN (la ausencia que midió QA): el observador enciende la
  // clase `ventana` en el documento — sin ella el régimen no funciona.
  assert.ok(documento.documentElement.classList.contains('ventana'),
    'la clase de arquitectura `ventana` se activa en el documento al arrancar');

  // En reposo (scrollTop 0) la fila natural está (260 - 0) por debajo de la
  // franja de banda (160): no se clava.
  assert.ok(!fila.classList.contains('is-floating'), 'en reposo la fila no muestra la cápsula');
  // Desplazando a 150 la fila natural (260 - 150 = 110) queda debajo de la
  // franja (160): se clava.
  ventana.scrollTop = 150;
  escuchas.scroll.forEach(fn => fn());
  assert.ok(fila.classList.contains('is-floating'), 'al cruzar el borde de la banda la fila se clava');
  assert.ok(caja.classList.contains('is-transport-floating'), 'la caja grande deja ver el fondo de la página');

  // La flechita minimiza a la píldora de la ronda 1 (estado de la sesión).
  boton.alClick();
  assert.ok(fila.classList.contains('is-transport-minimized'), 'la flechita alterna el estado minimizado');

  // Volviendo arriba la fila retoma su estado de reposo (la.band vuelve clara).
  ventana.scrollTop = 0;
  escuchas.scroll.forEach(fn => fn());
  assert.ok(!fila.classList.contains('is-floating'), 'al volver al tope la fila deja de estar clavada');
});
