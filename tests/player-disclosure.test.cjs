// A-80 · D1: guarda focal de `player-disclosure.js`.
// Evalúa el módulo con un DOM mínimo: aria-expanded, is-collapsed, inert y
// devolución del foco al botón al cerrar con el foco dentro del contenido.
// El DOM simulado no reemplaza la prueba física en el navegador.

const {test} = require('node:test');
const assert = require('node:assert/strict');
const {crearEscenario, ejecutarModulo} = require('./helpers/dom-simulado.cjs');

function armar({focusDentro = false} = {}) {
  const esc = crearEscenario();
  const boton = new esc.Nodo(esc.document, {id: 'player-disclosure', attrs: {'aria-expanded': 'false'}});
  const dentro = new esc.Nodo(esc.document, {id: 'player-content-hijo'});
  const contenido = new esc.Nodo(esc.document, {
    id: 'player-content', clase: 'collapsible-content is-collapsed', inert: true,
  });
  contenido.append(dentro);
  esc.document.registrar('#player-disclosure', boton);
  esc.document.registrar('#player-content', contenido);
  if (focusDentro) esc.document.activeElement = dentro;
  ejecutarModulo('player-disclosure.js', esc);
  return {boton, contenido, dentro, esc};
}

test('al cargar, el contenido arranca cerrado y no cambia hasta el primer clic', () => {
  const {boton, contenido, esc} = armar();
  assert.equal(boton.getAttribute('aria-expanded'), 'false');
  assert.equal(contenido.classList.contains('is-collapsed'), true);
  assert.equal(contenido.inert, true);
  assert.equal(boton.enfocadoVeces, 0);
});

test('el primer clic abre: aria-expanded=true, sin is-collapsed y contenido no inerte', () => {
  const {boton, contenido, esc} = armar();
  boton.click();
  assert.equal(boton.getAttribute('aria-expanded'), 'true');
  assert.equal(contenido.classList.contains('is-collapsed'), false);
  assert.equal(contenido.inert, false);
  assert.equal(boton.enfocadoVeces, 0, 'abrir no roba el foco');
});

test('el segundo clic cierra y devuelve el foco al botón si estaba dentro del contenido', () => {
  const {boton, contenido, esc} = armar({focusDentro: true});
  boton.click();
  assert.equal(boton.getAttribute('aria-expanded'), 'true');
  assert.equal(contenido.inert, false);
  boton.click();
  assert.equal(boton.getAttribute('aria-expanded'), 'false');
  assert.equal(contenido.classList.contains('is-collapsed'), true);
  assert.equal(contenido.inert, true, 'el contenido cerrado deja de recibir interacción');
  assert.equal(boton.enfocadoVeces, 1, 'el foco vuelve al botón antes de ocultar el contenido');
  assert.equal(esc.document.activeElement, boton);
});

test('cerrar con el foco fuera del contenido no mueve el foco', () => {
  const {boton, contenido, esc} = armar();
  const otro = new esc.Nodo(esc.document, {id: 'otro-control'});
  esc.document.activeElement = otro;
  boton.click();
  boton.click();
  assert.equal(boton.getAttribute('aria-expanded'), 'false');
  assert.equal(contenido.inert, true);
  assert.equal(boton.enfocadoVeces, 0);
  assert.equal(esc.document.activeElement, otro);
});
