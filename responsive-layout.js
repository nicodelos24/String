// Se mueve el mismo panel para conservar sus valores y eventos al redimensionar.
(() => {
  const summary = document.querySelector('.scale-summary');
  const footer = document.querySelector('.board-footer');
  const anchor = document.createComment('Posición del resumen en escritorio');
  summary.before(anchor);
  const compact = window.matchMedia('(max-width: 1100px)');
  function arrange() {
    if (compact.matches) footer.after(summary);
    else anchor.after(summary);
  }
  compact.addEventListener('change', arrange);
  arrange();
})();
