// T-56 · A-30 (2026-10-26) y ronda 2 · A-35 + A-37 (2026-10-26). La fila del
// transporte se queda a la vista al desplazar. Este módulo es sólo el
// observador: mide y publica el estado (clases en la fila, en su caja y en la
// banda) y las medidas que el CSS necesita para no mover el contenido:
//   · --transporte-alto / --transporte-ancho: el hueco de reposo que la fila
//     conserva en el flujo mientras la barrita vuela;
//   · --transporte-top: el borde inferior de la banda sticky de T-53, para que
//     la barrita quede clavada justo debajo y no la tape;
//   · --transporte-left / --transporte-franja: el contenido útil de la caja
//     (sin borde ni relleno), que es el ancho de la barrita clavada de la
//     ronda 2 — no el de la fila, que en escritorio comparte línea con la
//     captura en vivo de T-47.
// Dos estados del scroll, un solo interruptor: clavada (por defecto, ancho
// completo y baja) y minimizada (la píldora de la ronda 1). La flechita
// #transport-minimize alterna; el estado es de la sesión, no se guarda.
// Además marca `is-stuck` en la banda cuando queda pegada al viewport, para
// que conserve su línea superior (A-37).
// No toca motor, audio, guardado, atajos ni traste.songs.v1: es forma.
(() => {
  const fila = document.querySelector('.transport-row');
  const caja = fila && fila.closest('.progression-view-controls');
  const banda = document.querySelector('.cards-band');
  const boton = fila && fila.querySelector('#transport-minimize');
  if (!fila || !caja) return;

  const HUECO = 6;
  const TOPE_VISTA = 0.5;
  let pendiente = false;
  let minimizada = false;

  function visible() {
    return fila.getClientRects().length > 0;
  }

  // El alto y el ancho de reposo se miden sin la clase de estado. Si la fila
  // estaba flotando se vuelve a poner en el mismo cuadro: no hay pintura entre
  // medio, así que no se ve el cambio. Las medidas de la franja salen del
  // contenido real de la caja (borde y relleno fuera), que es el ancho útil
  // que el autor quiere conservar al desplazarse.
  function medirReposo() {
    if (!visible()) return false;
    const flotando = fila.classList.contains('is-floating');
    if (flotando) fila.classList.remove('is-floating');
    fila.style.setProperty('--transporte-alto', fila.offsetHeight + 'px');
    fila.style.setProperty('--transporte-ancho', fila.offsetWidth + 'px');
    if (flotando) fila.classList.add('is-floating');
    const estilo = getComputedStyle(caja);
    const izquierda = parseFloat(estilo.borderLeftWidth || 0) +
      parseFloat(estilo.paddingLeft || 0);
    const franja = caja.clientWidth - izquierda - parseFloat(estilo.paddingRight || 0);
    fila.style.setProperty('--transporte-left', (caja.getBoundingClientRect().left + izquierda) + 'px');
    fila.style.setProperty('--transporte-franja', franja + 'px');
    return true;
  }

  // El tope es el borde inferior de la banda cuando la banda está clavada
  // (sticky); si no lo está, el borde de arriba del viewport.
  function topeBanda() {
    if (!banda) return 0;
    const estilo = getComputedStyle(banda);
    if (estilo.position !== 'sticky' && estilo.position !== 'fixed') return 0;
    return Math.max(0, banda.getBoundingClientRect().bottom);
  }

  // A-37: la banda clavada conserva la línea del reposo. La clase sólo se pone
  // cuando su borde superior toca el viewport; en reposo no existe y la página
  // queda idéntica.
  function marcarBanda() {
    if (!banda) return;
    const estilo = getComputedStyle(banda);
    const pegada = (estilo.position === 'sticky' || estilo.position === 'fixed') &&
      banda.getBoundingClientRect().top <= TOPE_VISTA && window.scrollY > 0;
    banda.classList.toggle('is-stuck', pegada);
  }

  // En un teléfono la barrita no entra en una línea y envuelve sus controles.
  // Se cuentan las líneas por los centros de los controles: si el alto de la
  // barrita da para más de una, el CSS le da al Tempo la segunda línea junto a
  // la ayuda, en vez de dejar la ayuda sola abajo. Con una sola línea, nada.
  // La flechita se cuenta aparte: es el interruptor, no un control de la fila.
  function lineas(pildora) {
    const cajas = [...pildora.children]
      .filter(hijo => !hijo.classList.contains('transport-minimize'))
      .map(h => h.getBoundingClientRect());
    if (!cajas.length) return 1;
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

  function aplicar() {
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
      // La franja se re-mide en cada cuadro que vuela: un cambio de tamaño o de
      // columna no puede dejar la barrita con el ancho viejo.
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

  medirReposo();
  aplicar();

  window.addEventListener('scroll', pedir, {passive: true});
  window.addEventListener('resize', () => { medirReposo(); aplicar(); });
  // En móvil la caja vive en la pestaña «Progresión»: al cambiarla hay que
  // volver a medir (oculta mide 0 y no se flota).
  if (window.MutationObserver) {
    new MutationObserver(() => { medirReposo(); aplicar(); })
      .observe(document.body, {attributes: true, attributeFilter: ['data-mobile-tab']});
  }
})();
