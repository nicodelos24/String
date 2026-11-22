// Régimen compacto: pantalla angosta (móvil en retrato) O pantalla baja en
// horizontal (teléfono acostado). Un único lugar define la condición para que
// CSS y JS no se peleen ni haga falta duplicar parches por resolución.
//
// CSS usa la misma condición escrita en `landscape.css` y en los bloques
// compactos de `style.css`. Si se cambia acá, cambiar también allá.
(() => {
  const QUERY = '(max-width: 800px), (orientation: landscape) and (max-height: 500px)';
  window.pStringCompact = Object.freeze({
    query: QUERY,
    media: () => window.matchMedia ? window.matchMedia(QUERY) : null,
    matches: () => !!(window.matchMedia && window.matchMedia(QUERY).matches),
  });
})();
