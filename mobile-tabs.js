// Barra de pestañas para móvil: en vez de una página larga, se ve una sección
// cada vez. En escritorio la barra no se muestra y la rejilla de tres columnas
// funciona igual que siempre, así que esto solo cambia el móvil.
(() => {
  const bar = document.querySelector('.mobile-tabs');
  if (!bar) return;
  const buttons = Array.prototype.slice.call(bar.querySelectorAll('[data-mobile-tab]'));
  const mobile = window.matchMedia('(max-width: 800px)');
  let current = 'mastil';
  const choose = tab => {
    current = tab;
    document.body.dataset.mobileTab = tab;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mobileTab === tab)));
  };
  buttons.forEach(button => {
    button.addEventListener('click', () => choose(button.dataset.mobileTab || 'mastil'));
  });
  // Al volver a escritorio se quita el estado: nada debe quedar oculto por un
  // ancho que ya no es móvil.
  const onChange = () => { if (!mobile.matches) delete document.body.dataset.mobileTab; else choose(current); };
  mobile.addEventListener('change', onChange);
  choose('mastil');
})();
