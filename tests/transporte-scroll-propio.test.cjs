// T-56 r5 · A-55 reemplaza el scroll interno de A-43 por el documento.
// Conserva las guardas de cápsula A-46 y respaldo móvil. La geometría real
// y la rueda se comprueban en tests/browser/transporte-regresion.cjs.

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const js = fs.readFileSync(path.join(root, 'transport-pill.js'), 'utf8');

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
  assert.ok(ventana.includes('<main class="shell">'), 'la caja del shell vive dentro de la ventana');
  assert.ok(ventana.includes('<footer'), 'el pie es parte del contenido que el panel recorre');
  const antes = html.slice(0, html.indexOf('id="scroll-window"'));
  assert.ok(antes.includes('<header class="topbar">'), 'la barra superior no entra en el scrolleo');
});

test('T-56 r6 · el documento desplaza y el conjunto de tarjetas y barra se fija arriba', () => {
  assert.ok(!Hay('html.ventana body', 'overflow: hidden'), 'sin bloqueo global del documento');
  assert.ok(!Hay('html.ventana .scroll-window', 'overflow: hidden'), 'sin recorte del documento');
  assert.ok(!Hay('.panel-scroll', 'overflow-y: auto'), 'sin scroller interno');
  assert.ok(Hay('html.ventana .panel-strip', 'position: sticky'), 'franja sticky con recorrido en main');
  assert.ok(Hay('html.ventana .panel-strip', 'top: var(--franja-tope, 0px)'), 'se fija bajo las tarjetas');
  assert.ok(Hay('html.ventana .cards-band', 'position: sticky'), 'las tarjetas siguen visibles');
});

test('T-56 r5 · la caja vive en una franja con recorrido y conserva su hogar móvil', () => {
  // El armado en vivo del observador (defecto medido por QA: el sticky moría
  // a los 59 px de .progression-stack y la barra desaparecía a 550).
  assert.match(js, /\.cards-band/, 'el observador toma la banda para clavar la caja al marco');
  assert.match(js, /className = 'panel-strip'/, 'la franja del marco se crea en vivo');
  assert.match(js, /bandaMarco\.parentNode\.insertBefore\(strip, bandaMarco\.nextSibling\)/,
    'la franja se deja entre la banda y el panel');
  assert.match(js, /strip\.appendChild\(caja\)/,
    'la caja del transporte entra a la franja (la cabecera de la caja grande)');
  assert.match(js, /className = 'panel-scroll'/, 'el envoltorio del recorrido propio se crea en vivo');
  assert.match(js, /querySelector\('footer'\)/, 'el pie entra al recorrido del panel');
  assert.match(js, /cajaHogar\.insertBefore\(caja, piezas\.cajaDespues\)/,
    'sin ventana, la caja vuelve a su nido (respaldo ronda 2 intacto)');
  // ya no hay sticky sobre la caja: el estilazo moría sin recorrido del padre
  assert.ok(!Hay('.progression-stack > .progression-view-controls', 'position: sticky'),
    'la caja no se clava con sticky dentro del stack (el defecto medido por QA)');
  // ni fondo tapón sobre la caja clavada (defecto 3 de la 2ª devolución: el
  // exterior tiene que quedar TRANSPARENTE, el papel llega por detrás vacío)
  assert.ok(!Hay('is-carril-clavado', 'background: var(--paper)'),
    'la caja clavada no tapa con papel: el contenido ya no cruza por detrás');
  assert.ok(!Hay('progression-stack > .progression-view-controls', 'background'),
    'ninguna regla pinta el exterior de la caja (A-46: transparente)');
  // «Detenido» sigue fuera de la caja (A-46 ·3).
  const cajaHtml = bloqueDiv(html, '<div class="progression-view-controls">');
  assert.ok(!cajaHtml.includes('progression-playback'),
    '«Detenido» vive fuera de la caja y no viaja con lo fijo');
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
});

test('T-56 r4 · A-46 ·2: la fila de captura entra a la cápsula como segunda línea al clavarse', () => {
  assert.match(js, /querySelector\('\.capture-row'\)/, 'el observador toma la fila de captura en vivo');
  assert.match(js, /piezas\.captura\.parentNode !== pildora\)\s*pildora\.appendChild\(piezas\.captura\)/,
    'clavada y expandida, la captura se reúne con la cápsula (Improvisar, Tempo con notas, Entrar al tocar, Seguir acorde MIDI dentro)');
  assert.match(js, /caja\.insertBefore\(piezas\.captura, ancla\)/,
    'en reposo, minimizada o respaldo, la captura vuelve a su caja');
  assert.ok(Hay('html.ventana .transport-row.is-floating:not(.is-transport-minimized) .capture-row', 'width: 100%'),
    'la captura ocupa la segunda línea de la cápsula');
  assert.ok(Hay('html.ventana .transport-row.is-floating:not(.is-transport-minimized) .capture-row', 'border-top: 1px solid var(--line)'),
    'la segunda línea se separa como en el recuadro de reposo');
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
  assert.ok(Hay('.transport-row.is-floating:not(.is-transport-minimized) .transport-pill', 'position: fixed'),
    'el estado clavado sin ventana conserva su posición fija');
  assert.ok(Hay('.transport-row.is-floating', 'width: var(--transporte-ancho, auto)'),
    'la reserva del hueco de reposo queda publicada');
});

test('T-56 r5 · el recorrido del documento fija y suelta la barra, conservando captura y estados', () => {
  // ---- Stub mínimo de nodos: reparenteo real en cadenas de children.
  function nodo(cls) {
    const n = {
      className: cls || '', id: '', children: [], parentNode: null,
      classList: clase([]), style: {setProperty() {}},
      appendChild(h) { quitaHijo(h); h.parentNode = n; n.children.push(h); return h; },
      insertBefore(h, ref) {
        quitaHijo(h);
        const i = ref ? n.children.indexOf(ref) : -1;
        n.children.splice(i < 0 ? n.children.length : i, 0, h);
        h.parentNode = n;
        return h;
      },
      removeChild(h) { const i = n.children.indexOf(h); if (i >= 0) n.children.splice(i, 1); h.parentNode = null; return h; },
      get nextSibling() {
        if (!n.parentNode) return null;
        return n.parentNode.children[n.parentNode.children.indexOf(n) + 1] || null;
      },
      getBoundingClientRect: () => rect(120, 0, 40, 40),
      listeners: {},
      addEventListener(ev, fn) { (n.listeners[ev] = n.listeners[ev] || []).push(fn); },
    };
    return n;
  }
  function quitaHijo(h) {
    if (h && h.parentNode && h.parentNode.children) {
      const i = h.parentNode.children.indexOf(h);
      if (i >= 0) h.parentNode.children.splice(i, 1);
    } else if (h) { h.parentNode = null; }
  }
  function clase(nombres) {
    return {
      contiene: new Set(nombres || []),
      add(...n) { n.forEach(x => this.contiene.add(x)); },
      remove(...n) { n.forEach(x => this.contiene.delete(x)); },
      toggle(n, v) { (v === undefined ? !this.contiene.has(n) : v) ? this.add(n) : this.remove(n); },
      contains(n) { return this.contiene.has(n); },
    };
  }
  function rect(top, left, w, h) {
    return {top, left, right: left + w, bottom: top + h, width: w, height: h};
  }

  // ---- Árbol inicial igual al index.html (pre-armado):
  const stackPadre = nodo('progression-workspace');   // hogar original de la caja
  const banda = nodo('cards-band');
  const shell = nodo('shell');
  const banner = nodo('topbar');
  const intro = nodo('intro');
  const workspace = nodo('workspace');
  const pie = nodo('');
  shell.children = [intro, banda, workspace];
  intro.parentNode = shell; banda.parentNode = shell; workspace.parentNode = shell;

  const pildora = nodo('transport-pill');
  pildora.getBoundingClientRect = () => rect(0, 0, 40, 24);
  pildora.querySelector = () => null;
  const boton = nodo('transport-minimize');
  boton.setAttribute = () => {};
  boton.addEventListener = (ev, fn) => { if (ev === 'click') boton.alClick = fn; };
  const fila = nodo('progression-controls-row transport-row');
  fila.getClientRects = () => [{}];
  fila.getBoundingClientRect = () => rect(220, 0, 40, 40);
  fila.offsetHeight = 40; fila.offsetWidth = 40;
  fila.closest = () => caja;
  fila.querySelector = (sel) => (sel === '#transport-minimize' ? boton : pildora);
  pildora.children = [boton]; boton.parentNode = pildora;
  fila.children = [pildora]; pildora.parentNode = fila;
  const filaTransporte = fila;                       // primera línea de la caja
  const captura = nodo('progression-controls-row capture-row');   // segunda línea
  const caja = nodo('progression-view-controls');
  caja.querySelector = (sel) => (sel === '.capture-row' ? captura : null);
  caja.closest = () => null;
  caja.clientWidth = 40;
  caja.children = [filaTransporte, captura];
  filaTransporte.parentNode = caja; captura.parentNode = caja;
  stackPadre.children = [caja]; caja.parentNode = stackPadre;

  const ventanaEl = nodo('scroll-window');
  ventanaEl.getBoundingClientRect = () => rect(56, 0, 40, 650);
  ventanaEl.scrollTop = 0;
  const escuchasVentana = {scroll: []};
  ventanaEl.addEventListener = (ev, fn) => { if (ev === 'scroll') escuchasVentana.scroll.push(fn); };

  const documento = {
    querySelector: (sel) => ({
      '.transport-row': fila, '.cards-band': banda,
      'main': shell, 'footer': pie,
    }[sel] || null),
    getElementById: (id) => (id === 'scroll-window' ? ventanaEl : null),
    createElement: () => nodo(''),
    documentElement: {style: {setProperty() {}}, classList: clase([])},
  };
  const eventos = {};
  const jsWindow = {
    addEventListener(ev, fn) { (eventos[ev] ||= []).push(fn); }, MutationObserver: undefined,
    requestAnimationFrame(f) { f(); },
    getComputedStyle: () => ({borderLeftWidth: '0px', position: 'sticky'}),
    scrollY: 0, innerWidth: 1366, innerHeight: 768,
    scrollBy(x, y) { this.scrollY += y; eventos.scroll.forEach(fn => fn()); },
    matchMedia: () => ({matches: true, addEventListener() {}}),
  };

  vm.runInNewContext(js, {
    Math, document: documento, window: jsWindow,
    requestAnimationFrame: jsWindow.requestAnimationFrame,
  });

  // Activación: la clase `ventana` se enciende en el documento al arrancar.
  assert.ok(documento.documentElement.classList.contains('ventana'),
    'la clase de arquitectura `ventana` se activa en el documento');

  // Armado (A-43): la caja entra a la franja junto a la banda; el panel-scroll
  // se lleva lo demás y el pie entra al recorrido.
  const stripArmado = shell.children[shell.children.indexOf(banda) + 1];
  assert.ok(stripArmado.className === 'panel-strip' &&
    stripArmado.parentNode === shell && stripArmado.children.includes(caja),
    'la caja vive en la franja del marco, justo después de la banda');
  const panel = shell.children[shell.children.length - 1];
  assert.ok(panel.className === 'panel-scroll' && panel.id === 'panel-scroll',
    'el envoltorio del recorrido propio existe');
  assert.ok(panel.children.includes(workspace),
    'el panel de trabajo entra al recorrido propio');
  assert.ok(panel.children.includes(pie), 'el pie desplaza con el panel');
  assert.ok(caja.children.includes(filaTransporte) && captura.parentNode === caja,
    'en reposo las dos filas viven en su caja como siempre');

  stripArmado.getBoundingClientRect = () => rect(Math.max(0, 120 - jsWindow.scrollY), 0, 40, 40);
  assert.ok(eventos.scroll.length > 0, 'el observador escucha el documento');
  function desplazar(y) { jsWindow.scrollY = y; eventos.scroll.forEach(fn => fn()); }
  assert.ok(!fila.classList.contains('is-floating'), 'reposo sin clavado');
  const rueda = (opciones = {}) => {
    const evento = { deltaY: 40, deltaMode: 0, preventDefault() { this.defaultPrevented = true; }, ...opciones };
    banda.listeners.wheel.forEach(fn => fn(evento));
    return evento;
  };
  assert.ok(rueda().defaultPrevented, 'la rueda vertical de tarjetas se dirige al documento');
  assert.equal(jsWindow.scrollY, 40);
  for (const opciones of [{ ctrlKey: true }, { shiftKey: true }, { deltaY: 0 }, { defaultPrevented: true }]) {
    rueda(opciones);
    assert.equal(jsWindow.scrollY, 40, 'zoom, Shift y eventos ya atendidos conservan su destino');
  }
  rueda({ deltaY: 2, deltaMode: 1 });
  assert.equal(jsWindow.scrollY, 72, 'la rueda expresada en líneas se convierte a píxeles');
  rueda({ deltaY: 1, deltaMode: 2 });
  assert.equal(jsWindow.scrollY, 840, 'la rueda expresada en páginas respeta el alto de pantalla');
  documento.documentElement.classList.remove('ventana');
  assert.ok(!rueda().defaultPrevented, 'el respaldo móvil conserva su rueda nativa');
  assert.equal(jsWindow.scrollY, 840);
  documento.documentElement.classList.add('ventana');

  desplazar(60);
  assert.ok(!fila.classList.contains('is-floating'), 'no compacta antes de alcanzar arriba');
  desplazar(300);
  assert.ok(fila.classList.contains('is-floating'), 'al desplazar el panel la fila se clava');
  assert.ok(caja.classList.contains('is-transport-floating'), 'la caja clavada deja el exterior transparente');
  assert.ok(pildora.children.includes(captura) && captura.parentNode === pildora,
    'clavada y expandida, la fila de captura vive DENTRO de la cápsula (A-46 ·2)');

  // Minimizada: la captura vuelve y la píldora queda en el marco (el hueco
  // propio de la barra: nada la cruza por detrás, por arquitectura).
  boton.alClick();
  assert.ok(fila.classList.contains('is-transport-minimized'), 'la flechita alterna el estado minimizado');
  assert.ok(caja.children.includes(captura) && captura.parentNode === caja,
    'minimizada, la fila de captura vuelve a su caja');

  // Vuelta al tope: reposo otra vez (la caja reasume su recuadro).
  boton.alClick();
  desplazar(60);
  assert.ok(!fila.classList.contains('is-floating'), 'al volver por el umbral se descuelga');
  desplazar(0);
  assert.ok(!fila.classList.contains('is-floating'), 'al volver al tope la fila deja de estar clavada');
});
