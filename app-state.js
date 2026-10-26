// Estado central de la aplicación (T-01, paso 3).
//
// Hasta la ronda 2 de T-01 el estado de la página eran veinte `let` sueltos en
// el ámbito global de `app.js`. Cualquiera de los scripts clásicos que comparten
// ese ámbito podía leerlos y escribirlos, y el dueño del dato no estaba escrito
// en ningún lado: para saber quién cambiaba `root` había que recorrer la página
// entera. Acá el estado vive en un solo objeto, `AppState`, con sus getters y
// setters.
//
// El resto de los scripts lo sigue usando por su nombre —`root`, `progression`,
// `ghostMode`— porque cada nombre se publica como acceso al objeto central: leer
// `root` pregunta a `AppState` y escribir `root = 4` le avisa a `AppState`. No
// hay una segunda copia que se pueda desincronizar.
//
// Los setters guardan el valor y nada más: no repintan ni guardan. El repintado
// sigue siendo explícito (`updateView`, `renderProgression`, …) igual que antes,
// para que este paso no cambie cuándo se ve cada cosa.

const AppState = (() => {
  const valores = new Map();
  const NOMBRE = /^[A-Za-z_$][\w$]*$/;

  // Declara un nombre una sola vez. Repetirlo es un error de carga, no algo que
  // se pueda tapar: dos declaraciones del mismo estado volverían a abrir la
  // puerta a que dos archivos crean que son dueños del mismo dato.
  function define(name, initial) {
    if (!NOMBRE.test(name)) throw new Error(`nombre de estado inválido: ${name}`);
    if (valores.has(name)) throw new Error(`el estado ${name} ya está declarado`);
    valores.set(name, initial);
    return initial;
  }

  function has(name) {
    return valores.has(name);
  }

  function get(name) {
    if (!valores.has(name)) throw new Error(`el estado ${name} no está declarado`);
    return valores.get(name);
  }

  function set(name, value) {
    if (!valores.has(name)) throw new Error(`el estado ${name} no está declarado`);
    valores.set(name, value);
    return value;
  }

  // Nombres declarados, en orden de declaración. Lo usan la guarda del paso 3 y
  // cualquier diagnóstico que quiera el inventario del estado.
  function names() {
    return [...valores.keys()];
  }

  // Foto superficial del estado, para diagnóstico. Los objetos y listas que
  // guarda el estado se comparten por referencia, como siempre.
  function snapshot() {
    return Object.fromEntries(valores);
  }

  return { define, has, get, set, names, snapshot };
})();

// Publica `name` como propiedad global con lectura y escritura sobre el objeto
// central. En la página los scripts clásicos ven el nombre como antes; en los
// tests, el sandbox `vm` ve el mismo acceso. `globalThis` es el ámbito donde
// `app.js` declaraba los `let`, así que el alcance no cambia.
function declareAppState(name, initial) {
  AppState.define(name, initial);
  Object.defineProperty(globalThis, name, {
    configurable: true,
    enumerable: true,
    get() { return AppState.get(name); },
    set(value) { AppState.set(name, value); },
  });
  return initial;
}

// Puente para Node, igual que `music-model.js`: los tests pueden mirar la API
// del estado sin montar la página. En el navegador no hay `module` y este bloque
// no hace nada.
if (typeof module !== 'undefined' && module.exports) module.exports = { AppState, declareAppState };
