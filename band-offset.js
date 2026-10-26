// T-54 · A-26 (2026-10-25): la columna central se pega debajo de la banda fija
// y su alto es el viewport que queda entre esa banda y el pie. La banda mide
// distinto según el ancho (240 px con los controles en una línea, 286 cuando
// envuelven), así que su alto real se publica como `--banda-alto` del workspace
// en vez de quedar escrito a mano en el CSS: el CSS trae 240 px como respaldo
// y este módulo lo corrige en cuanto la banda se mide —también cuando cambia
// de alto por un giro, un resize o el ajuste de los controles—. Sin
// ResizeObserver (o en un documento sin banda, como el de las pruebas) no hace
// nada: el respaldo del CSS queda en pie.
(function () {
  'use strict';

  var banda = document.querySelector('.cards-band');
  var workspace = document.querySelector('.workspace');
  if (!banda || !workspace) return;

  function publicar() {
    var alto = banda.getBoundingClientRect().height;
    if (!alto || alto <= 0) return;
    workspace.style.setProperty('--banda-alto', alto.toFixed(2) + 'px');
  }

  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(publicar).observe(banda);
  }
  window.addEventListener('resize', publicar);
  publicar();
})();
