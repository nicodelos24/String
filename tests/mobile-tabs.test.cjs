// A-80 · D1: guarda focal de `mobile-tabs.js`.
// Evalúa el módulo con un DOM mínimo: selección de pestaña, aria-pressed y
// limpieza del estado al volver a escritorio. Comportamiento, no texto de
// código. El DOM simulado no reemplaza la prueba física en el navegador.

const {test} = require('node:test');
const assert = require('node:assert/strict');
const {crearEscenario, ejecutarModulo} = require('./helpers/dom-simulado.cjs');

const MOVIL = '(max-width: 800px)';

function armar({movil = true, botones = ['mastil', 'progresion', 'acomp', 'mas']} = {}) {
  const esc = crearEscenario({anchoInicial: {[MOVIL]: movil}});
  const barra = new esc.Nodo(esc.document, {clase: 'mobile-tabs'});
  const tabs = botones.map(id => {
    const boton = new esc.Nodo(esc.document, {dataset: {mobileTab: id}});
    barra.append(boton);
    return boton;
  });
  esc.document.registrar('.mobile-tabs', barra);
  ejecutarModulo('mobile-tabs.js', esc);
  assert.equal(esc.consultas.length, 1, 'el módulo observa el media query móvil');
  return {tab: esc.consultas[0], tabs, esc};
}

test('al cargar en móvil, mástil queda activo y es el único aria-pressed=true', () => {
  const {tab, tabs, esc} = armar();
  assert.equal(typeof tab.addEventListener, 'function');
  assert.equal(esc.document.body.dataset.mobileTab, 'mastil');
  assert.deepEqual(tabs.map(b => b.getAttribute('aria-pressed')),
    ['true', 'false', 'false', 'false']);
});

test('un clic selecciona la pestaña, mueve el estado del body y actualiza todos los aria-pressed', () => {
  const {tabs, esc} = armar();
  tabs[2].click();
  assert.equal(esc.document.body.dataset.mobileTab, 'acomp');
  assert.deepEqual(tabs.map(b => b.getAttribute('aria-pressed')),
    ['false', 'false', 'true', 'false']);
  tabs[1].click();
  assert.equal(esc.document.body.dataset.mobileTab, 'progresion');
  assert.deepEqual(tabs.map(b => b.getAttribute('aria-pressed')),
    ['false', 'true', 'false', 'false']);
});

test('al volver a escritorio se limpia el estado; al regresar a móvil se restaura la pestaña elegida', () => {
  const {tab, tabs, esc} = armar();
  tabs[3].click();
  assert.equal(esc.document.body.dataset.mobileTab, 'mas');

  tab.cambiar(false);
  assert.equal(Object.hasOwn(esc.document.body.dataset, 'mobileTab'), false,
    'en escritorio ninguna pestaña queda marcada en el body');

  tab.cambiar(true);
  assert.equal(esc.document.body.dataset.mobileTab, 'mas', 'se recupera la última pestaña elegida');
  assert.deepEqual(tabs.map(b => b.getAttribute('aria-pressed')),
    ['false', 'false', 'false', 'true']);
});

test('sin barra de pestañas el módulo no rompe la carga de la página', () => {
  const esc = crearEscenario();
  assert.doesNotThrow(() => ejecutarModulo('mobile-tabs.js', esc));
});
