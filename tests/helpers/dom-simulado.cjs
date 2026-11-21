// Mínimo DOM para ejecutar los scripts clásicos de la página bajo node:test.
// No reemplaza al navegador: cubre solo querySelector(All), atributos,
// dataset, classList, eventos, foco, inserción before/after y matchMedia.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');

class Nodo {
  constructor(document, opciones = {}) {
    this.ownerDocument = document;
    this.esComentario = Boolean(opciones.comentario);
    this.texto = opciones.comentario || '';
    this.attrs = {...opciones.attrs};
    this.dataset = {...opciones.dataset};
    this.clases = new Set((opciones.clase || '').split(/\s+/).filter(Boolean));
    this.hijos = [];
    this.padre = null;
    this.oyentes = new Map();
    this.inert = Boolean(opciones.inert);
    this.enfocadoVeces = 0;
    if (opciones.id) this.attrs.id = opciones.id;
    const self = this;
    this.classList = {
      toggle(nombre, forzar) {
        const activo = forzar === undefined ? !self.clases.has(nombre) : Boolean(forzar);
        if (activo) self.clases.add(nombre);
        else self.clases.delete(nombre);
        return activo;
      },
      contains(nombre) { return self.clases.has(nombre); },
    };
  }

  getAttribute(nombre) { return Object.hasOwn(this.attrs, nombre) ? this.attrs[nombre] : null; }
  setAttribute(nombre, valor) { this.attrs[nombre] = String(valor); }

  addEventListener(tipo, fn) {
    if (!this.oyentes.has(tipo)) this.oyentes.set(tipo, []);
    this.oyentes.get(tipo).push(fn);
  }
  despachar(tipo) {
    for (const fn of this.oyentes.get(tipo) || []) fn({type: tipo, target: this});
  }
  click() { this.despachar('click'); }
  focus() {
    this.ownerDocument.activeElement = this;
    this.enfocadoVeces += 1;
  }

  contains(nodo) {
    return nodo === this || this.hijos.some(hijo => hijo.contains(nodo));
  }

  querySelectorAll(selector) {
    const resultado = [];
    const visitar = nodo => {
      for (const hijo of nodo.hijos) {
        if (selector === '[data-mobile-tab]' && Object.hasOwn(hijo.dataset, 'mobileTab')) resultado.push(hijo);
        else if (hijo.selector === selector) resultado.push(hijo);
        visitar(hijo);
      }
    };
    visitar(this);
    return resultado;
  }

  _insertar(antes, nodo) {
    if (nodo.padre) nodo.padre.hijos = nodo.padre.hijos.filter(h => h !== nodo);
    nodo.padre = this.padre;
    const indice = this.padre ? this.padre.hijos.indexOf(this) : -1;
    if (indice < 0) return;
    this.padre.hijos.splice(antes ? indice : indice + 1, 0, nodo);
  }
  before(nodo) { this._insertar(true, nodo); }
  after(nodo) { this._insertar(false, nodo); }
  append(...nodos) {
    for (const nodo of nodos) {
      if (nodo.padre) nodo.padre.hijos = nodo.padre.hijos.filter(h => h !== nodo);
      nodo.padre = this;
      this.hijos.push(nodo);
    }
  }
}

// Los selectores se registran explícitamente, como en el HTML de la página;
// así cada guarda dice qué fragmento del documento está probando. Se guarda
// la identidad del nodo: querySelector devuelve siempre el mismo objeto.
class Registro {
  constructor() { this.pares = new Map(); }
  poner(selector, nodos) { this.pares.set(selector, nodos); }
  uno(selector) {
    const valor = this.pares.get(selector);
    return (Array.isArray(valor) ? valor[0] : valor) || null;
  }
  todos(selector) {
    const valor = this.pares.get(selector);
    return Array.isArray(valor) ? [...valor] : valor ? [valor] : [];
  }
}

function crearEscenario({anchoInicial = {}} = {}) {
  const consultas = [];
  const registro = new Registro();
  const document = {
    activeElement: null,
    body: null,
    querySelector(selector) { return registro.uno(selector); },
    querySelectorAll(selector) { return registro.todos(selector); },
    createComment(texto) { return new Nodo(this, {comentario: texto}); },
    registrar(selector, ...nodos) {
      if (nodos.length === 1 && Array.isArray(nodos[0])) nodos = nodos[0];
      registro.poner(selector, nodos);
      nodos.forEach(nodo => { if (nodo) nodo.selector = selector; });
      return nodos;
    },
  };
  document.body = new Nodo(document, {id: 'cuerpo'});
  document.registrar('body', document.body);

  const window = {
    matchMedia(query) {
      const media = {
        media: query,
        matches: Boolean(anchoInicial[query]),
        oyentes: [],
        addEventListener(tipo, fn) { if (tipo === 'change') this.oyentes.push(fn); },
        cambiar(matches) {
          this.matches = Boolean(matches);
          for (const fn of this.oyentes) fn({matches: this.matches, media: query});
        },
      };
      consultas.push(media);
      return media;
    },
  };

  return {document, window, Nodo, consultas};
}

function ejecutarModulo(archivo, ctx) {
  const fuente = fs.readFileSync(path.join(ROOT, archivo), 'utf8');
  vm.runInNewContext(fuente, {document: ctx.document, window: ctx.window, console}, {filename: archivo});
  return fuente;
}

module.exports = {crearEscenario, ejecutarModulo};
