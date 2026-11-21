// A-80 · D1: guarda focal de `responsive-layout.js`.
// Evalúa el módulo con un DOM mínimo: el mismo nodo `.scale-summary` se
// reubica entre el ancla de escritorio y `.board-footer` al cruzar 1100px.
// El DOM simulado no reemplaza la prueba física en el navegador.

const {test} = require('node:test');
const assert = require('node:assert/strict');
const {crearEscenario, ejecutarModulo} = require('./helpers/dom-simulado.cjs');

const COMPACTO = '(max-width: 1100px)';

function armar({compacto = true} = {}) {
  const esc = crearEscenario({anchoInicial: {[COMPACTO]: compacto}});
  const resumen = new esc.Nodo(esc.document, {clase: 'scale-summary'});
  const footer = new esc.Nodo(esc.document, {clase: 'board-footer'});
  const raiz = new esc.Nodo(esc.document, {clase: 'workspace'});
  raiz.append(resumen, footer);
  esc.document.registrar('.scale-summary', resumen);
  esc.document.registrar('.board-footer', footer);
  ejecutarModulo('responsive-layout.js', esc);
  assert.equal(esc.consultas.length, 1, 'el módulo observa un único media query');
  return {resumen, footer, raiz, media: esc.consultas[0]};
}

// Orden de la raíz: el comentario de ancla se marca como 'ancla'.
function orden(raiz) {
  return raiz.hijos.map(n => n.esComentario ? 'ancla' : n.selector);
}

test('con ancho compacto al cargar, el resumen queda después del pie', () => {
  const caso = armar({compacto: true});
  assert.equal(caso.media.media, COMPACTO);
  assert.deepEqual(orden(caso.raiz), ['ancla', '.board-footer', '.scale-summary']);
  assert.equal(caso.raiz.hijos.filter(n => n === caso.resumen).length, 1, 'el resumen no se duplica');
});

test('con ancho de escritorio al cargar, el resumen queda en su ancla original', () => {
  const caso = armar({compacto: false});
  assert.deepEqual(orden(caso.raiz), ['ancla', '.scale-summary', '.board-footer']);
  assert.equal(caso.raiz.hijos.filter(n => n === caso.resumen).length, 1);
});

test('al cruzar 1100px el mismo nodo se reubica en ambos sentidos', () => {
  const caso = armar({compacto: false});
  assert.deepEqual(orden(caso.raiz), ['ancla', '.scale-summary', '.board-footer']);

  caso.media.cambiar(true);
  assert.deepEqual(orden(caso.raiz), ['ancla', '.board-footer', '.scale-summary'],
    'al pasar a compacto el resumen baja junto al pie');
  assert.ok(caso.raiz.hijos.includes(caso.resumen), 'sigue siendo el mismo nodo');

  caso.media.cambiar(false);
  assert.deepEqual(orden(caso.raiz), ['ancla', '.scale-summary', '.board-footer'],
    'al volver a escritorio el resumen regresa al ancla');
  assert.equal(caso.raiz.hijos.filter(n => n === caso.resumen).length, 1,
    'los cambios no duplican el resumen');
});
