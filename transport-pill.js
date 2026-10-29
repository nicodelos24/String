// T-56 r6 · A-57: las tarjetas se fijan arriba y el transporte debajo;
// el panel sólo se pinta e interactúa bajo ese conjunto, con 6 px de margen.
// El documento desplaza y vuelve al flujo al subir. El escritorio conserva
// la geometría y la cápsula de A-46. En móvil sigue el respaldo de la ronda 2.
// No toca motor, audio, guardado ni atajos.
(() => {
  const fila = document.querySelector('.transport-row');
  const caja = fila && fila.closest('.progression-view-controls');
  const banda = document.querySelector('.cards-band');
  const boton = fila && fila.querySelector('#transport-minimize');
  const ventana = document.getElementById('scroll-window');
  if (!fila || !caja) return;

  // La franja y el contenido comparten main: el sticky tiene todo su recorrido.
  // En móvil se devuelve la caja a su hogar original.
  const piezas = {
    panel: null, strip: null, armado: false,
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
  const MARGEN_PANEL = 6;
  const TOPE_VISTA = 0.5;
  let pendiente = false;
  let minimizada = false;

  function raiz() {
    return document.documentElement;
  }

  function visible() {
    return fila.getClientRects().length > 0;
  }

  // Armado de escritorio: conservar el ancho y el marco de reposo al separar
  // la caja de su pila corta (que no daría recorrido suficiente al sticky).
  function armar() {
    if (piezas.armado) return;
    const bandaMarco = banda || document.querySelector('.cards-band');
    const shell = document.querySelector('main');
    if (!bandaMarco || !shell) return;
    const strip = document.createElement('div');
    strip.className = 'panel-strip';
    bandaMarco.parentNode.insertBefore(strip, bandaMarco.nextSibling);
    strip.appendChild(caja);
    const panel = document.createElement('div');
    panel.className = 'panel-scroll';
    panel.id = 'panel-scroll';
    let nodo = strip.nextSibling;
    while (nodo) { const siguiente = nodo.nextSibling; panel.appendChild(nodo); nodo = siguiente; }
    shell.appendChild(panel);
    const pie = document.querySelector('footer');
    if (pie) panel.appendChild(pie);
    piezas.panel = panel;
    piezas.strip = strip;
    piezas.armado = true;
  }

  function unarm() {
    if (!piezas.armado) return;
    const panel = piezas.panel;
    const shell = panel.parentNode;
    while (panel.firstChild) shell.insertBefore(panel.firstChild, panel);
    shell.removeChild(panel);
    piezas.panel = null;
    const strip = piezas.strip;
    piezas.strip = null;
    piezas.armado = false;
    // la caja vuelve a su nido original para el respaldo (ronda 2) y la fila
    // de captura vuelve junto a la de transporte
    if (piezas.cajaHogar) piezas.cajaHogar.insertBefore(caja, piezas.cajaDespues);
    if (strip) strip.remove();
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

  // Coordenadas del respaldo fixed; en ventana ambos estados conservan su
  // espacio en el flujo de la franja.
  function publicarPildora() {
    const cajaRect = caja.getBoundingClientRect();
    fila.style.setProperty('--transporte-top', Math.round(cajaRect.top + 8) + 'px');
    fila.style.setProperty('--transporte-left',
      Math.round(Math.max(8, cajaRect.left + 10)) + 'px');
  }

  function aplicarVentana() {
    pendiente = false;
    const altoBanda = banda ? banda.getBoundingClientRect().height : 0;
    const tope = altoBanda + MARGEN_PANEL;
    if (piezas.strip) piezas.strip.style.setProperty('--franja-tope', tope + 'px');
    const clavada = !!piezas.strip && window.scrollY > 0 &&
      piezas.strip.getBoundingClientRect().top <= tope + TOPE_VISTA;
    if (piezas.strip && !clavada) {
      piezas.strip.style.setProperty('--franja-alto', piezas.strip.offsetHeight + 'px');
    }
    fila.classList.toggle('is-floating', clavada);
    caja.classList.toggle('is-transport-floating', clavada);
    if (piezas.strip) piezas.strip.classList.toggle('is-transport-floating', clavada);
    fila.classList.toggle('is-transport-minimized', minimizada);
    const carril = caja.closest && caja.closest('.progression-workspace');
    if (carril && typeof carril.classList.toggle === 'function') {
      carril.classList.toggle('is-carril-clavado', clavada);
    }
    if (banda) banda.classList.remove('is-stuck');
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
    if (piezas.panel && piezas.strip) {
      // Recortar también el hit test: un z-index sólo escondería el contenido
      // bajo el fondo de la banda, pero seguiría pasando por sus márgenes.
      const desplazando = window.scrollY > 0;
      const recorte = desplazando ? Math.max(0, piezas.strip.getBoundingClientRect().bottom +
        MARGEN_PANEL - piezas.panel.getBoundingClientRect().top) : 0;
      piezas.panel.style.setProperty('--panel-recorte', recorte + 'px');
      piezas.panel.classList.toggle('is-panel-recortado', desplazando);
    }
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
    const pildora = fila.querySelector('.transport-pill');
    if (pildora) pildora.classList.toggle('is-pill-wrapped', flotar && lineas(pildora) > 1);
    let arriba = tope + HUECO;
    // La captura sigue en el flujo móvil. Mientras pasa bajo la barra fija,
    // desplazar la barra debajo de ella deja accesibles ambos grupos.
    if (flotar && pildora && piezas.captura) {
      const captura = piezas.captura.getBoundingClientRect();
      const alto = pildora.getBoundingClientRect().height;
      if (captura.bottom > arriba && captura.top < arriba + alto) {
        const debajo = captura.bottom + HUECO;
        arriba = debajo + alto <= window.innerHeight ? debajo : Math.max(0, captura.top - alto - HUECO);
      }
    }
    fila.style.setProperty('--transporte-top', arriba + 'px');
  }

  // La clase conserva los estilos de escritorio; ya no bloquea el documento.
  function claseVentana(activa) {
    if (!activa) {
      // El documento conserva su recorrido al recuperar el respaldo móvil.
      unarm();
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

  // El documento desplaza en ambos regímenes. El resize rearma escritorio/móvil.
  window.addEventListener('scroll', pedir, {passive: true});
  if (ventana) ventana.addEventListener('scroll', pedir, {passive: true});
  window.addEventListener('resize', () => { regimenes(); aplicar(); });
  // Más filas, una captura desplegada o las fuentes pueden cambiar la altura
  // del conjunto sin resize del viewport ni un gesto de rueda adicional.
  if (window.ResizeObserver) {
    const medidas = new window.ResizeObserver(pedir);
    if (banda) medidas.observe(banda);
    medidas.observe(caja);
  }
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
