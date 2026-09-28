// Improvisar: con el tempo marcado y el micrófono encendido, cada primer tiempo
// se abre la escucha y el primer acorde que el micrófono confirme desde ahí se
// añade como tarjeta nueva. Es para armar la progresión mientras tocas, en vez
// de tener que parar a pulsar «añadir acorde» en cada cambio.
//
// El orden que recomienda la página es el del propio flujo: primero el
// micrófono (sin él no hay nada que escuchar), después el tempo (sin él no hay
// cuadrícula) y solo entonces la improvisación. `improvHint` dice cuál de los
// dos falta, y es pura para poder probarla.
//
// Lo que decide y lo que pinta están separados, como en el resto de la página:
// aquí la lógica es `improvGrid` y `improvStep`, puras y testeadas, y el IIFE
// solo llama a la interfaz, al reloj y a `addProgressionChord`.

// Cuántos pulsos tiene un compás. La cuadrícula es de 4/4, como los compases que
// explica la guía de acordes; la duración de cada tarjeta es otra cosa.
var IMPROV_BEATS_PER_BAR = 4;
// Cada cuánto se mira el reloj y el micrófono. El detector tarda unos 470 ms en
// confirmar un acorde (171 de ventana, hasta 60 de sondeo y 240 de confirmación),
// así que 40 ms de sondeo no añade nada perceptible: solo llega a tiempo antes
// de que el compás se acabe.
var IMPROV_POLL_MS = 40;
// Cuántos compás se aguanta una ancla vieja antes de darla por perdida. Sin este
// tope, encender la improvisación mucho después de haber marcado el tempo
// empezaría en un compás que no existe.
var IMPROV_MAX_ANCHOR_BARS = 8;

// Dónde está la cuadrícula en un instante. `beat` va en pulsos desde el primer
// tiempo, que es lo que divide en compases. Devuelve null sin un tempo válido:
// es lo que hace que la página pueda pedir el tempo en vez de contar con uno
// inventado.
function improvGrid(bpm, beatsPerBar, elapsedMs) {
  const tempo = Math.round(Number(bpm));
  if (!Number.isFinite(tempo) || tempo < 30 || tempo > 240) return null;
  const bars = Number.isInteger(beatsPerBar) && beatsPerBar > 0 ? beatsPerBar : IMPROV_BEATS_PER_BAR;
  const elapsed = Number(elapsedMs);
  if (!Number.isFinite(elapsed) || elapsed < 0) return null;
  const beatMs = 60000 / tempo;
  const beat = elapsed / beatMs;
  const whole = Math.floor(beat);
  return {
    beat,
    bar: Math.floor(whole / bars),
    beatInBar: whole % bars,
    beatMs,
    barMs: beatMs * bars,
  };
}

// Identidad de un acorde para el micrófono, o cadena vacía si no hay ninguno.
function improvChordKey(chord) {
  return chord && Number.isInteger(chord.root) ? chord.root + ':' + chord.type : '';
}

// Un compás de la captura. Los dos eventos son:
//
//   {type:'bar',  bar, chord}  el primer tiempo: se abre la escucha del compás.
//   {type:'chord', chord}      el acorde confirmado cambió, o se calló (null).
//
// Devuelve `add` con el acorde cuando ese compás ya tiene su tarjeta, y nada más
// cuando todavía no.
//
// Lo difícil no es contar los compases sino no contar el acorde anterior. Al
// llegar el primer tiempo el micrófono todavía tiene confirmado el acorde del
// compás pasado, así que tomarlo «la primera nota» añadiría la misma tarjeta una
// y otra vez. Por eso el acorde que sonaba en el primer tiempo se guarda aparte
// (`atBar`) y solo cuenta como nuevo si desde entonces el micrófono se ha callado
// o ha cambiado de acorde: las dos cosas que hace un rasgueo.
function improvStep(state, event) {
  const s = state || {bar: 0, taken: false, atBar: '', sawSilence: false, open: false};
  if (!event || typeof event.type !== 'string') return {state: s};
  if (event.type === 'bar') {
    return {state: {
      bar: Number.isInteger(event.bar) ? event.bar : s.bar + 1,
      taken: false,
      atBar: improvChordKey(event.chord),
      sawSilence: false,
      open: true,
    }};
  }
  if (event.type === 'chord') {
    // Sin un primer tiempo que abra el compás no se sabe cuál era el acorde de
    // referencia, y adivinarlo es lo que añadiría tarjetas de más. Se espera al
    // primer tiempo en vez de tomar lo primero que suene.
    if (!s.open) return {state: s};
    if (s.taken) return {state: s};
    const key = improvChordKey(event.chord);
    // El silencio no es un acorde: solo anota que el micrófono se ha callado,
    // que es lo que hace que lo que venga detrás cuente como nuevo.
    if (!key) return s.sawSilence ? {state: s} : {state: {bar: s.bar, taken: s.taken, atBar: s.atBar, sawSilence: true, open: true}};
    if (!s.sawSilence && key === s.atBar) return {state: s};
    return {state: {bar: s.bar, taken: true, atBar: s.atBar, sawSilence: true, open: true}, add: event.chord};
  }
  return {state: s};
}

// Qué falta para poder improvisar, en el orden en que se necesita: primero el
// micrófono, después el tempo. Sin esto el interruptor no se explicaría solo.
// El segundo paso pide **pulsar** el botón, no tener un tempo escrito: la
// cuadrícula se ancla en el primer golpe de la cuenta, y de un número tecleado no
// se sabe dónde empezaste a marcar. El campo de BPM trae 100 de arranque, así que
// preguntar «¿tienes tempo?» no diría nada; lo que se pregunta es si lo has
// marcado. Es una recomendación, no un candado:Improvisar funciona igual con el
// tempo escrito, solo que la rejilla no queda alineada con la canción.
function improvHint(microOn, bpm, tapped) {
  if (!microOn) return '1. Enciende el micrófono';
  const tempo = Math.round(Number(bpm));
  if (!Number.isFinite(tempo) || tempo < 30 || tempo > 240) return '2. Marca el tempo con «Tempo»';
  return tapped ? 'Listo para improvisar' : '2. Marca el tempo con «Tempo»';
}

if (typeof module !== 'undefined' && module.exports) module.exports = {improvGrid, improvStep, improvChordKey, improvHint, IMPROV_BEATS_PER_BAR, IMPROV_MAX_ANCHOR_BARS};
if (typeof document !== 'undefined') (() => {
  const toggle = document.getElementById('improvisation-toggle');
  const status = document.getElementById('improvisation-status');
  if (!toggle || !status) return;

  let timer = null;
  let startedAt = 0;
  let grid = null;
  let state = null;
  let lastBar = null;
  let lastKey = '';
  let lastName = '';
  let rejected = false;
  // Último texto escrito en el estado, para no repetirlo en cada sondeo.
  let shown = '';

  const tempoNow = () => {
    const field = document.getElementById('tempo-tap-bpm') || document.getElementById('player-bpm');
    const value = Number(field && field.value);
    return Number.isFinite(value) && value >= 30 && value <= 240 ? Math.round(value) : null;
  };
  const micRunning = () => typeof globalThis.__microRunning === 'function' && globalThis.__microRunning();
  // Si el tempo vigente salió de una cuenta de pulsaciones. Es lo que distingue
  // «marqué el ritmo de la canción» de «escribí un número».
  const tempoTapped = () => typeof globalThis.tempoTapAnchor === 'function' && globalThis.tempoTapAnchor() !== null;
  const currentChord = () => {
    if (typeof globalThis.__microCurrentChord !== 'function') return null;
    try { return globalThis.__microCurrentChord(); } catch { return null; }
  };
  // El acorde se escribe con su propio nombre; la tónica del detector ya viene
  // con la grafía resuelta, y por si acaso se vuelve a pasar por la del switch.
  // `chordTypes` y `addProgressionChord` son de app.js: se leen por su nombre y
  // no con `globalThis`, porque un `const` de nivel superior no cuelga del objeto
  // global aunque el ámbito sí sea compartido entre los scripts.
  const chordName = chord => {
    if (!chord) return '';
    const base = chord.rootNoteName || (typeof displayNoteSpelled === 'function' ? displayNoteSpelled(chord.root) : '');
    const type = typeof chordTypes !== 'undefined' && Array.isArray(chordTypes) ? chordTypes.find(entry => entry.value === chord.type) : null;
    return base + (type ? type.suffix : '');
  };

  // Desde dónde cuentan los compases. Se usa el primer golpe de la última cuenta
  // del tempo, que es donde el autor empezó a marcar la canción, y no el momento
  // de encender el interruptor: si se encendió después de contar, la rejilla
  // quedaría corrida y el «primer tiempo» no sería el primero.
  const anchorFor = (tempo, now) => {
    const tapped = typeof globalThis.tempoTapAnchor === 'function' ? globalThis.tempoTapAnchor() : null;
    if (Number.isFinite(tapped) && tapped <= now) {
      const bars = (now - tapped) / (60000 / tempo) / IMPROV_BEATS_PER_BAR;
      if (bars <= IMPROV_MAX_ANCHOR_BARS) return tapped;
    }
    return now;
  };

  const paint = () => {
    const bpm = tempoNow();
    const microOn = micRunning();
    let text;
    let live = false;
    if (!toggle.checked) {
      text = improvHint(microOn, bpm, tempoTapped());
    } else if (!microOn || bpm === null) {
      text = 'Improvisar necesita ' + (!microOn ? 'el micrófono' : 'un tempo');
    } else if (rejected) {
      text = 'No caben más tarjetas (4096)';
    } else {
      live = true;
      text = grid
        ? 'Compás ' + (grid.bar + 1) + ' · ' + (lastName ? 'última: ' + lastName : 'esperando el acorde')
        : 'Escuchando';
    }
    // El sondeo corre 25 veces por segundo: escribir el mismo texto en un
    // role="status" las otras 24 no dice nada nuevo y sí hace que un lector de
    // pantalla lo repita.
    if (text !== shown) { shown = text; status.textContent = text; }
    status.classList.toggle('is-live', live);
  };

  const stop = () => {
    if (timer !== null) { clearInterval(timer); timer = null; }
    state = null; grid = null; lastBar = null; lastKey = ''; lastName = ''; rejected = false;
  };

  const tick = () => {
    const bpm = tempoNow();
    if (bpm === null) { paint(); return; }
    if (micRunning() !== true) { paint(); return; }
    const position = improvGrid(bpm, IMPROV_BEATS_PER_BAR, performance.now() - startedAt);
    if (!position) { paint(); return; }
    grid = position;
    const chord = currentChord();
    // El primer tiempo va antes que el acorde: el acorde que hay en este
    // instante es el del compás anterior, y es justo el que hay que apartar.
    if (position.bar !== lastBar) {
      lastBar = position.bar;
      state = improvStep(state, {type: 'bar', bar: position.bar, chord}).state;
    }
    const key = improvChordKey(chord);
    if (key !== lastKey) {
      lastKey = key;
      const result = improvStep(state, {type: 'chord', chord});
      state = result.state;
      if (result.add) {
        lastName = chordName(result.add);
        const added = typeof addProgressionChord === 'function' ? addProgressionChord(result.add) : false;
        if (added === false) rejected = true;
      }
    }
    paint();
  };

  const start = () => {
    stop();
    const bpm = tempoNow();
    const now = performance.now();
    startedAt = bpm === null ? now : anchorFor(bpm, now);
    timer = setInterval(tick, IMPROV_POLL_MS);
    tick();
  };

  toggle.addEventListener('change', () => {
    if (toggle.checked) start(); else stop();
    paint();
  });
  // Cambiar el tempo cambia la cuadrícula: se vuelve a anclar para que el
  // «primer tiempo» siga siendo el primero, sin reiniciar la captura en curso.
  window.addEventListener('traste:tempo-applied', () => {
    if (!toggle.checked) { paint(); return; }
    const bpm = tempoNow();
    startedAt = bpm === null ? performance.now() : anchorFor(bpm, performance.now());
    lastBar = null;
  });
  // Encender o apagar el micrófono, o parar, cambia lo que se puede hacer.
  document.getElementById('microphone-toggle')?.addEventListener('click', () => setTimeout(paint, 0));
  paint();
})();
