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

  const HUECO = 6;
  const TOPE_VISTA = 0.5;
  let pendiente = false;
  let minimizada = false;
  let bandaAltoPx = 0;
  // Tope natural de la fila, en coordenadas del contenido de la ventana:
  // constante en el régimen ventana (el marco no se mueve), se recalcula al
  // medir (cambio de tamaño o de pestaña móvil).
  let topeNatural = 0;

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

  // Tope natural de la fila dentro del contenido de la ventana. Vale-medir
  // mientras la fila no esté clavada (clavada, el rect ya muestra el offset
  // sticky); el clavado no cambia el valor cacheado.
  function medirTopeNatural() {
    const marco = ventana.getBoundingClientRect().top;
    const enContenido = fila.getBoundingClientRect().top - marco + ventana.scrollTop;
    if (!fila.classList.contains('is-floating')) topeNatural = enContenido;
    return topeNatural;
  }

  // En un teléfono la barrita no entra en una línea y envuelve sus controles.
  function lineas(pildora) {
    const cajas = [...pildora.children]
      .filter(hijo => !hijo.classList.contains('transport-minimize'))
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
  // recorrido; sus coordenadas fijas van justo debajo de la banda del marco
  // (el tope de la ventana es el pie de la barra superior).
  function publicarPildora() {
    const ventanaArriba = ventana.getBoundingClientRect().top;
    fila.style.setProperty('--transporte-top', (ventanaArriba + bandaAltoPx + HUECO) + 'px');
    fila.style.setProperty('--transporte-left',
      Math.max(8, caja.getBoundingClientRect().left + 10) + 'px');
  }

  function aplicarVentana() {
    pendiente = false;
    const topeClavija = medirBanda() + HUECO;
    medirTopeNatural();
    const clavada = topeNatural - ventana.scrollTop <= topeClavija;
    fila.classList.toggle('is-floating', clavada);
    caja.classList.toggle('is-transport-floating', clavada);
    fila.classList.toggle('is-transport-minimized', minimizada);
    const carril = caja.closest && caja.closest('.progression-workspace');
    if (carril) carril.classList.toggle('is-carril-clavado', clavada);
    if (banda) banda.classList.toggle('is-stuck', ventana.scrollTop > 0);
    const pildora = fila.querySelector('.transport-pill');
    if (pildora) {
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

  function aplicar() {
    if (ventana) aplicarVentana();
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
  // el del documento (respaldo). El cambio de tamaño re-mide el tope natural.
  if (ventana) ventana.addEventListener('scroll', pedir, {passive: true});
  else window.addEventListener('scroll', pedir, {passive: true});
  window.addEventListener('resize', () => { topeNatural = 0; aplicar(); });
  // En móvil la caja vive en la pestaña «Progresión»: al cambiarla hay que
  // volver a medir (oculta mide 0 y no se clava).
  if (window.MutationObserver) {
    new MutationObserver(() => { topeNatural = 0; aplicar(); })
      .observe(document.body, {attributes: true, attributeFilter: ['data-mobile-tab']});
  }

  aplicar();
})();
