// Seguir la canción con el micrófono: dos cosas que el micrófono hace que pase
// en el Acompañamiento, y ninguna de las dos es tocar una nota del mástil.
//
//   · El BPM se puede marcar tocando notas al ritmo de la canción, en vez de
//     golpeando el botón Tempo con el ratón. Usa el estimador de tempo-tap.js,
//     el mismo que el botón: una sola versión del cálculo, no dos.
//   · «Entrar al tocar»: en cuanto el micrófono capta la primera nota, arranca
//     con sonido la fuente que se esté usando. Es para entrar a la canción
//     contando con el oído, en vez de darle a un botón.
//
// Lo que decide y lo que pinta están separados, como en el resto de la página:
// aquí lo puro es `micTaps` y `micTapSettled`, y el IIFE solo escucha, mira el
// reloj y llama a la interfaz. Cada control tiene su línea de estado, porque los
// dos cuentan cosas distintas y una taparía a la otra.

// Evento que emite microphone-ui.js cada vez que el micrófono confirma una nota
// nueva. Solo en los cambios (nota nueva o silencio), que es justo lo que hace
// que sirva como golpe: una nota sostenida no vuelve a contar.
var MIC_NOTE_EVENT = 'traste:mic-note';

// Pausa que corta la cuenta de notas. Tiene que ser mayor que el pulso más lento
// que se acepta (30 BPM = 2000 ms), igual que en el botón Tempo: si no, marcar a
// 30 se tomaría por empezar de cero.
var MIC_TAP_WINDOW_MS = 2500;
// Golpes que se guardan como máximo. La mediana se mantiene mejor centrada con
// alguno más de los que hacen falta.
var MIC_TAP_MAX_TAPS = 8;
// Espera desde la última nota para dar la cuenta por cerrada y aplicar el tempo.
// Algo más larga que la del botón (900 ms) porque una nota tarda un poco más en
// quedar confirmada que un clic.
var MIC_TAP_COMMIT_MS = 1200;

// Los golpes de la cuenta, con la misma regla de reinicio que el botón: una pausa
// larga empieza una cuenta nueva en vez de mezclar dos canciones.
function micTaps(taps, now, windowMs, max) {
  // Los dos valores por defecto se resuelven aquí y no se comparan en crudo: con
  // `windowMs` sin resolver, `now - ultimo > undefined` siempre es falso y la
  // cuenta no reinicia nunca, que es justo el fallo que evita este reinicio.
  const wait = Number.isFinite(windowMs) ? windowMs : MIC_TAP_WINDOW_MS;
  const limit = Number.isInteger(max) && max > 0 ? max : MIC_TAP_MAX_TAPS;
  const list = Array.isArray(taps) ? taps.slice() : [];
  if (list.length && now - list[list.length - 1] > wait) list.length = 0;
  list.push(now);
  return list.slice(-limit);
}

// Si la cuenta lleva el tiempo suficiente quieta para dar por terminado el tempo.
// Sin esta espera se aplicaría a mitad de camino en instrumentos lentos, que es
// justo donde más se nota.
function micTapSettled(taps, now, commitAfterMs) {
  if (!Array.isArray(taps) || taps.length < 2) return false;
  const wait = Number.isFinite(commitAfterMs) ? commitAfterMs : MIC_TAP_COMMIT_MS;
  return now - taps[taps.length - 1] >= wait;
}

if (typeof module !== 'undefined' && module.exports) module.exports = {micTaps, micTapSettled, MIC_TAP_WINDOW_MS, MIC_TAP_MAX_TAPS, MIC_TAP_COMMIT_MS, MIC_NOTE_EVENT};
if (typeof document !== 'undefined') (() => {
  const armButton = document.getElementById('tempo-tap-mic');
  const armStatus = document.getElementById('mic-tempo-status');
  const enterBox = document.getElementById('enter-on-note');
  const enterStatus = document.getElementById('enter-status');
  if (!armButton || !armStatus || !enterBox) return;

  const bpmField = document.getElementById('tempo-tap-bpm');
  const quickPlay = document.getElementById('quick-play');
  const micRunning = () => typeof globalThis.__microRunning === 'function' && globalThis.__microRunning();

  // El estimador y el que aplica viven en tempo-tap.js: se le piden, para que no
  // haya una segunda versión del cálculo que se pueda quedar vieja.
  const estimate = () => typeof globalThis.estimateTempo === 'function' ? globalThis.estimateTempo(taps) : null;
  const applyEstimate = () => typeof globalThis.applyTappedTempo === 'function' && globalThis.applyTappedTempo(estimate());

  // ---------- Tempo marcando con notas ----------

  let taps = [];
  let armed = false;
  let before = null;    // el BPM que había antes de empezar a marcar
  let watcher = null;
  let shownTempo = '';
  let shownEnter = '';

  // Un mensaje que se borra solo, o null para limpiarlo de inmediato.
  const flash = (state, text, ms) => {
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    state.text = text || '';
    if (text && ms) state.timer = setTimeout(() => { state.text = ''; state.timer = null; paintTempo(); }, ms);
  };
  const tempoNote = {text: '', timer: null};
  const enterNote = {text: '', timer: null};

  const paintTempo = () => {
    const bpm = estimate();
    const text = tempoNote.text || (armed
      ? (taps.length < 2 ? 'Toca dos o más notas al ritmo' : bpm === null ? 'Marcando…' : bpm + ' BPM · suelta para aplicar')
      : '');
    if (text !== shownTempo) { shownTempo = text; armStatus.textContent = text; }
    armStatus.hidden = !text;
    armStatus.classList.toggle('is-counting', armed && taps.length >= 2 && bpm !== null);
    armButton.setAttribute('aria-pressed', String(armed));
  };

  const stopWatching = () => { if (watcher !== null) { clearInterval(watcher); watcher = null; } };

  const disarm = restore => {
    armed = false;
    stopWatching();
    // Al cancelar se devuelve el BPM que había: el campo se había escrito para
    // previsualizar, y un tempo a medias no es un tempo.
    if (restore && before !== null && bpmField) bpmField.value = before;
    taps = [];
    if (bpmField) bpmField.classList.remove('is-pending');
    flash(tempoNote, '');
    paintTempo();
  };

  const arm = () => {
    before = bpmField ? bpmField.value : null;
    taps = [];
    armed = true;
    // Se puede dejar armed sin micrófono: la cuenta no empieza hasta que lo haya
    // y no hay que pulsar el botón dos veces. Se avisa y se sigue esperando.
    flash(tempoNote, micRunning() ? '' : 'Enciende el micrófono para marcar con notas', micRunning() ? 0 : 2600);
    stopWatching();
    // Se mira el reloj cada 120 ms: solo hace falta llegar al momento de aplicar,
    // y 120 ms es una fracción del pulso más rápido que se acepta.
    watcher = setInterval(() => {
      if (!armed || !micRunning()) return;
      if (!micTapSettled(taps, performance.now(), MIC_TAP_COMMIT_MS)) return;
      const bpm = estimate();
      if (bpm === null) return;
      const applied = applyEstimate();
      disarm(false);
      flash(tempoNote, applied ? bpm + ' BPM aplicados desde las notas' : 'No se pudo aplicar el tempo', 2600);
    }, 120);
    paintTempo();
  };

  armButton.addEventListener('click', () => { if (armed) disarm(true); else arm(); });

  window.addEventListener(MIC_NOTE_EVENT, () => {
    if (!armed || !micRunning()) return;
    taps = micTaps(taps, performance.now(), MIC_TAP_WINDOW_MS, MIC_TAP_MAX_TAPS);
    // Mientras se cuenta solo se previsualiza, igual que con el botón: el ritmo
    // que esté sonando no debe dar un tirón a cada nota.
    const bpm = estimate();
    if (bpmField && bpm !== null) { bpmField.value = bpm; bpmField.classList.add('is-pending'); }
    paintTempo();
  });

  // El botón ↺ del Tempo descarta la cuenta del ratón. Si lo que estaba contando
  // eran notas, esa cuenta es del mismo tempo y se va con él.
  document.getElementById('tempo-tap-discard')?.addEventListener('click', () => { if (armed) disarm(false); });

  // ---------- Entrar al tocar ----------

  // Una sola vez por armado. Si el autor para el Acompañamiento a mano, no se le
  // vuelve a encender solo a la espalda: para eso está el interruptor, y para
  // volver a armarlo hay que desmarcarlo y marcarlo otra vez.
  let entered = false;
  const paintEnter = () => {
    if (!enterStatus) return;
    if (enterNote.text !== shownEnter) { shownEnter = enterNote.text; enterStatus.textContent = shownEnter; }
    enterStatus.hidden = !shownEnter;
  };

  window.addEventListener(MIC_NOTE_EVENT, () => {
    if (!enterBox.checked || entered || !micRunning()) return;
    const source = globalThis.StringSources?.active ?? 'progression';
    // El MIDI tiene su propio transporte y su propio archivo: esto no lo toca.
    if (source === 'midi') return;
    if (!quickPlay || quickPlay.disabled) return;
    // Si ya está sonando no se toca: el objetivo es entrar, no reiniciar.
    if (quickPlay.getAttribute('aria-pressed') === 'true') return;
    entered = true;
    // Se pulsa el botón de verdad en vez de llamar al motor por dentro, para que
    // pase por el mismo camino que el ratón, con el mismo arreglo del metrónomo
    // y las mismas guardas.
    quickPlay.click();
    flash(enterNote, 'Entrando ' + (source === 'metronome' ? 'con el metrónomo' : 'con el Acompañamiento'), 2600);
    paintEnter();
  });

  enterBox.addEventListener('change', () => {
    entered = false;
    flash(enterNote, enterBox.checked && !micRunning() ? 'Enciende el micrófono para entrar al tocar' : (enterBox.checked ? 'Sonando a la primera nota' : ''), enterBox.checked ? 2600 : 0);
    paintEnter();
  });

  // El micrófono se puede encender después de dejar el interruptor marcado.
  document.getElementById('microphone-toggle')?.addEventListener('click', () => setTimeout(() => { if (armed) paintTempo(); }, 0));
  paintTempo();
  paintEnter();
})();
