// T-56 · rondas 1-2 (A-30, A-35 + A-37) y ronda 4 (A-43 + A-46, 27-10).
// La fila del transporte se queda a la vista al desplazar. Este módulo es
// sólo el observador: mide y publica las medidas que el CSS necesita, y
// alterna los estados de la fila (clases en la fila, en su caja y en la banda).
//
// DOS REGÍMENES:
//   · **Ventana del panel (A-43):** con la letra (B) de D-10 el panel de trabajo
//     scrollea dentro de su propia ventana (`#scroll-window`); la banda de
//     tarjetas y la fila viven por fuera del scrolleo, clavadas al marco. El
//     documento deja de desplazarse (`html.ventana body { overflow: hidden }`),
//     así que nada cruza nunca por detrás de la cápsula. El observador mide el
//     tope natural de la fila dentro del contenido y las alterna a `is-floating`
//     cuando ese tope cruza el borde de la banda; el clavado lo resuelve el CSS
//     con `position: sticky` sobre la fila, atado a `--banda-franja` (el alto de
//     la banda, que aquí es fijo). A-46: la cápsula con fondo único, cuadro fino
//     radio 12 sin sombra, ancho natural de la fila, menos alta, flechita
//     adentro a la izquierda; «Detenido» y el resto del reposo no viajan con lo
//     fijo.
//   · **Respaldo sin ventana (móvil sin pasante / sin JS):** el régimen de la
//     ronda 2 queda intacto —la fila vuela en `position: fixed` debajo de la
//     banda con su reserva de hueco-- para que la página no quede pelada si la
//     ventana no se activa.
//
// Dos estados del scroll, un solo interruptor: clavada (por defecto) y
// minimizada (la píldora de la ronda 1). La flechita #transport-minimize
// alterna; el estado es de la sesión, no se guarda. Además marca `is-stuck`
// en la banda cuando queda pegada, para que conserve su línea superior (A-37).
// No toca motor, audio, guardado, atajos ni traste.songs.v1: es forma.
(() => {
  const fila = document.querySelector('.transport-row');
  const caja = fila && fila.closest('.progression-view-controls');
  const banda = document.querySelector('.cards-band');
  const boton = fila && fila.querySelector('#transport-minimize');
  const ventana = document.getElementById('scroll-window');
  if (!fila || !caja) return;

  // Piezas del armado A-43 (sólo régimen ventana, transport-pill.js al
  // arrancar): la caja del transporte sale de .progression-stack y se coloca
  // en el marco, entre la banda y un envoltorio nuevo `.panel-scroll` que
  // contamina TODO lo que sigue (workspace, secciones, pie). Así el scroller
  // empieza DEBAJO de la caja: nada cruza nunca por detrás, la caja siempre
  // se ve, y la fila de captura puede entrar a la cápsula (A-46 ·2). Sin la
  // ventana el armado se desarma pieza por pieza (móvil/respaldo intacto).
  const piezas = {
    panel: null, armado: false,
    cajaHogar: caja.parentNode, cajaDespues: caja.nextSibling,
    captura: (typeof caja.querySelector === 'function') ? caja.querySelector('.capture-row') : null,
  };
  // La fila de captura vive SIEMPRE dentro de la caja, como segunda línea;
  // recuperar el domicilio actual de la caja es lo que hace el resto abajo.
  function reponerCaptura() {
    if (!piezas.captura || piezas.captura.parentNode === caja || !caja.insertBefore) return;
    const ancla = (fila.parentNode === caja) ? fila.nextSibling : null;
    caja.insertBefore(piezas.captura, ancla);
  }
  const HUECO = 6;
  const TOPE_VISTA = 0.5;
  let pendiente = false;
  let minimizada = false;
  let bandaAltoPx = 0;

  function raiz() {
    return document.documentElement;
  }

  function visible() {
    return fila.getClientRects().length > 0;
  }

  // ---- Régimen ventana (A-43) ------------------------------------------------
  // La banda es estable en el régimen ventana (sticky, el marco no se mueve):
  // su alto alimenta a --banda-franja, que el CSS usa como `top` del sticky.
  function medirBanda() {
    if (!banda || !visible()) return bandaAltoPx;
    bandaAltoPx = Math.max(0, banda.getBoundingClientRect().height);
    raiz().style.setProperty('--banda-franja', bandaAltoPx + 'px');
    return bandaAltoPx;
  }

  // La caja vive EN el marco (fuera del scrolleo): su posición no cambia con
  // el panel. La conmutación reposo→clavada la decide el recorrido del panel:
  // apenas desplaza, la cápsula se muestra (y con 0 vuelve el recuadro de
  // reposo). No hay tope que calcular: la fila siempre está debajo de la banda.

  // ---- Armado de la ventana del panel (A-43) ---------------------------------
  // Reestructura en vivo: caja tras la banda; envoltorio .panel-scroll con todo
  // lo que le sigue de main más el pie. Sin la clase la estructura se desarma.
  function armar() {
    if (piezas.armado) return;
    const bandaMarco = document.querySelector('.cards-band');
    const shell = document.querySelector('main');
    if (!bandaMarco || !shell) return;
    bandaMarco.parentNode.insertBefore(caja, bandaMarco.nextSibling);
    const panel = document.createElement('div');
    panel.className = 'panel-scroll';
    panel.id = 'panel-scroll';
    let nodo = caja.nextSibling;
    while (nodo) { const siguiente = nodo.nextSibling; panel.appendChild(nodo); nodo = siguiente; }
    shell.appendChild(panel);
    const pie = document.querySelector('footer');
    if (pie) panel.appendChild(pie);
    panel.addEventListener('scroll', pedir, {passive: true});
    piezas.panel = panel;
    piezas.armado = true;
  }

  function unarm() {
    if (!piezas.armado) return;
    const panel = piezas.panel;
    const shell = panel.parentNode;
    while (panel.firstChild) shell.insertBefore(panel.firstChild, panel);
    shell.removeChild(panel);
    piezas.panel = null;
    piezas.armado = false;
    // la caja vuelve a su nido original para el respaldo (ronda 2) y la fila
    // de captura vuelve junto a la de transporte
    if (piezas.cajaHogar) piezas.cajaHogar.insertBefore(caja, piezas.cajaDespues);
    reponerCaptura();
  }

  // En un teléfono la barrita no entra en una línea y envuelve sus controles.
  function lineas(pildora) {
    const cajas = [...pildora.children]
      .filter(hijo => !hijo.classList.contains('transport-minimize') &&
        !hijo.classList.contains('capture-row'))
      .map(h => h.getBoundingClientRect());
    if (!cajas.length || cajas.some(c => !c.height)) return 1;
    const alto = Math.max(...cajas.map(c => c.height));
    let total = 1;
    let referencia = cajas[0].top + cajas[0].height / 2;
    for (const c of cajas) {
      const centro = c.top + c.height / 2;
      if (centro - referencia > alto / 2) { total += 1; referencia = centro; }
    }
    return total;
  }

  function pintarBoton() {
    if (!boton) return;
    boton.setAttribute('aria-pressed', minimizada ? 'true' : 'false');
    const accion = minimizada ? 'Desplegar' : 'Minimizar';
    boton.setAttribute('aria-label', accion + ' la barra del transporte');
    boton.setAttribute('title', accion + ' la barra del transporte' +
      (minimizada ? ': la deja clavada con todo el ancho' : ': la deja como píldora'));
  }

  // La píldora minimizada (ronda 1) sí vuela: es chiquita y por fuera del
  // recorrido; en el régimen ventana su hueco es el de la propia caja en el
  // marco (debajo de la banda, junto a donde queda la cápsula clavada).
  function publicarPildora() {
    const cajaRect = caja.getBoundingClientRect();
    fila.style.setProperty('--transporte-top', Math.round(cajaRect.top + 8) + 'px');
    fila.style.setProperty('--transporte-left',
      Math.round(Math.max(8, cajaRect.left + 10)) + 'px');
  }

  function aplicarVentana() {
    pendiente = false;
    medirBanda();
    const panel = piezas.panel;
    const recorrido = panel ? panel.scrollTop : ventana.scrollTop;
    const clavada = recorrido > 0;
    fila.classList.toggle('is-floating', clavada);
    caja.classList.toggle('is-transport-floating', clavada);
    fila.classList.toggle('is-transport-minimized', minimizada);
    const carril = caja.closest && caja.closest('.progression-workspace');
    if (carril && typeof carril.classList.toggle === 'function') {
      carril.classList.toggle('is-carril-clavado', clavada);
    }
    if (banda) banda.classList.toggle('is-stuck', recorrido > 0);
    const pildora = fila.querySelector('.transport-pill');
    if (pildora) {
      // A-46 ·2: clavada y expandida, la fila de captura es la segunda línea
      // de la cápsula; en reposo, minimizada o respaldo vuelve a su caja.
      const adentro = clavada && !minimizada;
      if (adentro && piezas.captura && pildora.appendChild &&
          piezas.captura.parentNode !== pildora) pildora.appendChild(piezas.captura);
      if (!adentro) reponerCaptura();
      const envuelta = clavada && !minimizada && lineas(pildora) > 1;
      pildora.classList.toggle('is-pill-wrapped', envuelta);
    }
    if (clavada) publicarPildora();
  }

  // ---- Respaldo sin ventana (régimen de la ronda 2, intacto) ------------------
  function marcarBanda() {
    if (!banda) return;
    const estilo = getComputedStyle(banda);
    const pegada = (estilo.position === 'sticky' || estilo.position === 'fixed') &&
      banda.getBoundingClientRect().top <= TOPE_VISTA && window.scrollY > 0;
    banda.classList.toggle('is-stuck', pegada);
  }

  function medirReposo() {
    if (!visible()) return false;
    const flotando = fila.classList.contains('is-floating');
    if (flotando) fila.classList.remove('is-floating');
    fila.style.setProperty('--transporte-alto', fila.offsetHeight + 'px');
    fila.style.setProperty('--transporte-ancho', fila.offsetWidth + 'px');
    if (flotando) fila.classList.add('is-floating');
    return true;
  }

  function topeBanda() {
    if (!banda) return 0;
    const estilo = getComputedStyle(banda);
    if (estilo.position !== 'sticky' && estilo.position !== 'fixed') return 0;
    return Math.max(0, banda.getBoundingClientRect().bottom);
  }

  function aplicarLegado() {
    pendiente = false;
    marcarBanda();
    fila.classList.toggle('is-transport-minimized', minimizada);
    if (!visible()) {
      fila.classList.remove('is-floating');
      caja.classList.remove('is-transport-floating');
      const p = fila.querySelector('.transport-pill');
      if (p) p.classList.remove('is-pill-wrapped');
      return;
    }
    const estilo = getComputedStyle(caja);
    const reposo = caja.getBoundingClientRect().top +
      parseFloat(estilo.borderTopWidth || 0) + parseFloat(estilo.paddingTop || 0);
    const tope = topeBanda();
    const flotar = reposo < tope;
    if (flotar) {
      if (!fila.classList.contains('is-floating')) medirReposo();
      const ancho = caja.clientWidth - parseFloat(estilo.paddingLeft || 0) -
        parseFloat(estilo.paddingRight || 0);
      fila.style.setProperty('--transporte-franja', ancho + 'px');
      fila.style.setProperty('--transporte-left',
        (caja.getBoundingClientRect().left + parseFloat(estilo.borderLeftWidth || 0) +
          parseFloat(estilo.paddingLeft || 0)) + 'px');
    }
    fila.classList.toggle('is-floating', flotar);
    caja.classList.toggle('is-transport-floating', flotar);
    fila.style.setProperty('--transporte-top', (tope + HUECO) + 'px');
    const pildora = fila.querySelector('.transport-pill');
    if (pildora) pildora.classList.toggle('is-pill-wrapped', flotar && lineas(pildora) > 1);
  }

  // La clase `ventana` ENCIENDE la arquitectura de A-43: sin ella, las reglas
  // de `style.css` quedan dormidas y el documento sigue desplazándose (el
  // defecto que QA midió en la entrega anterior). Se activa sólo en escritorio:
  // en ≤800 px rige el respaldo de la ronda 2, ya verificado, para que el
  // régimen nuevo no invente una ventana.Vertical en el móvil.
  function claseVentana(activa) {
    if (!activa) {
      // al pasar a respaldo, el recorrido propio vuelve al documento
      const previo = piezas.panel ? (piezas.panel.scrollTop || 0) : 0;
      unarm();
      if (ventana && typeof window.scrollTo === 'function') window.scrollTo(0, previo);
    } else {
      armar();
    }
    return raiz().classList.toggle('ventana', activa);
  }

  function enEscritorio() {
    return window.matchMedia && window.matchMedia('(min-width: 801px)').matches;
  }

  function regimenes() {
    if (ventana) claseVentana(enEscritorio());
  }

  function aplicar() {
    if (ventana && raiz().classList.contains('ventana')) aplicarVentana();
    else aplicarLegado();
  }

  function pedir() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(aplicar);
  }

  if (boton) {
    boton.addEventListener('click', () => {
      minimizada = !minimizada;
      pintarBoton();
      aplicar();
    });
    pintarBoton();
  }

  // En el régimen ventana el scroll del panel es el que desplaza; sin ventana,
  // el del documento (respaldo). El cambio de tamaño re-mide el tope natural y
  // reevalúa el régimen (escritorio ⇄ móvil).
  window.addEventListener('scroll', pedir, {passive: true});
  if (ventana) ventana.addEventListener('scroll', pedir, {passive: true});
  window.addEventListener('resize', () => { regimenes(); aplicar(); });
  if (window.matchMedia) {
    try { window.matchMedia('(min-width: 801px)').addEventListener('change', () => { regimenes(); aplicar(); }); } catch (e) {}
  }
  // En móvil la caja vive en la pestaña «Progresión»: al cambiarla hay que
  // volver a medir (oculta mide 0 y no se clava).
  if (window.MutationObserver) {
    new MutationObserver(() => { aplicar(); })
      .observe(document.body, {attributes: true, attributeFilter: ['data-mobile-tab']});
  }

  regimenes();
  aplicar();
})();
