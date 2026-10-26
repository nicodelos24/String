// T-56 · A-30 (2026-10-26). La fila del transporte se queda a la vista al
// desplazar como una píldora flotante. Este módulo es sólo el observador: mide
// y publica el estado (una clase en la fila y otra en su caja) y las tres
// medidas que el CSS necesita para no mover el contenido:
//   · --transporte-alto / --transporte-ancho: el hueco de reposo que la fila
//     conserva en el flujo mientras la píldora vuela;
//   · --transporte-top: el borde inferior de la banda sticky de T-53, para que
//     la píldora quede clavada justo debajo y no la tape;
//   · --transporte-left: la columna de la caja, para que la píldora arranque
//     donde arrancaba la barrita.
// No toca motor, audio, guardado, atajos ni traste.songs.v1: es forma.
(() => {
  const fila = document.querySelector('.transport-row');
  const caja = fila && fila.closest('.progression-view-controls');
  const banda = document.querySelector('.cards-band');
  if (!fila || !caja) return;

  const HUECO = 6;
  let pendiente = false;

  function visible() {
    return fila.getClientRects().length > 0;
  }

  // El alto y el ancho de reposo se miden sin la clase de estado. Si la fila
  // estaba flotando se vuelve a poner en el mismo cuadro: no hay pintura entre
  // medio, así que no se ve el cambio.
  function medirReposo() {
    if (!visible()) return false;
    const flotando = fila.classList.contains('is-floating');
    if (flotando) fila.classList.remove('is-floating');
    fila.style.setProperty('--transporte-alto', fila.offsetHeight + 'px');
    fila.style.setProperty('--transporte-ancho', fila.offsetWidth + 'px');
    if (flotando) fila.classList.add('is-floating');
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

  // En un teléfono la píldora no entra en una línea y envuelve sus controles.
  // Se cuentan las líneas por los centros de los controles: si el alto de la
  // píldora da para más de una, el CSS le da al Tempo la segunda línea junto a
  // la ayuda, en vez de dejar la ayuda sola abajo. Con una sola línea, nada.
  function lineas(pildora) {
    const cajas = [...pildora.children].map(h => h.getBoundingClientRect());
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

  function aplicar() {
    pendiente = false;
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
    if (flotar && !fila.classList.contains('is-floating')) medirReposo();
    fila.classList.toggle('is-floating', flotar);
    caja.classList.toggle('is-transport-floating', flotar);
    fila.style.setProperty('--transporte-top', (tope + HUECO) + 'px');
    fila.style.setProperty('--transporte-left', caja.getBoundingClientRect().left + 'px');
    const pildora = fila.querySelector('.transport-pill');
    if (pildora) pildora.classList.toggle('is-pill-wrapped', flotar && lineas(pildora) > 1);
  }

  function pedir() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(aplicar);
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
