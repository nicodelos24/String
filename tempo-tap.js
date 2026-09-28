// Botón «Tempo» por pulsaciones: con al menos dos clics estima el BPM. El valor
// se muestra en un campo editable que también aplica cambios manuales y se
// mantiene sincronizado con el acompañamiento y con el video si hay referencia.
// Solo si la fuente activa es «Metrónomo» se fija también su tempo (al tocar/
// editar tempo y también al dar play con esa fuente). El MIDI no se toca:
// conserva su propio tempo.
// La cuenta no se mezcla con la anterior: el estimador se apoya en la mediana de
// los intervalos y descarta los que se apartan, de modo que una pausa o un
// golpe fallido dentro de la cuenta no arrastran el resultado; además, tras una
// pausa larga la cuenta empieza de cero.
// Mientras se cuenta, el BPM solo se previsualiza en el campo. Se aplica una
// única vez al Acompañamiento, al video y al metrónomo cuando dejas de tocar,
// para que el ritmo que está sonando no dé un tirón con cada golpe. El botón
// «↺» (o Escape) descarta la cuenta y devuelve el último tempo aplicado.
// Las tarjetas no marcan el tempo: solo este botón. Pulsar una tarjeta elige el
// acorde por el que empieza o reinicia el Acompañamiento, y el doble clic la
// duplica, sin que nada de eso toque el BPM.

// Pausa que corta la cuenta. Tiene que ser mayor que el pulso más lento que
// aceptamos (30 BPM = 2000 ms) para que marcar a 30 no se tome por un reinicio.
var TEMPO_TAP_WINDOW_MS = 2500;
// Espera desde el último golpe para dar la cuenta por cerrada y aplicarla.
var TEMPO_TAP_COMMIT_MS = 900;
// Margen que se acepta alrededor de la mediana antes de descartar un intervalo.
var TEMPO_TAP_OUTLIER = 0.3;
// Pulsaciones que se guardan como máximo (los intervalos más antiguos pesan
// menos y el número alto mantiene la mediana bien centrada).
var TEMPO_TAP_MAX_TAPS = 8;

// BPM a partir de las marcas de tiempo de las pulsaciones. Usa la mediana de los
// intervalos entre golpes y descarta los que se alejan más de un 30%: un golpe
// perdido o una pausa no falsean el resultado. Sin al menos dos pulsaciones, o
// fuera del rango 30-240, no hay tempo que aplicar (devuelve null).
function tempoFromTaps(taps) {
  if (!Array.isArray(taps) || taps.length < 2) return null;
  var intervals = [];
  for (var i = 1; i < taps.length; i++) {
    var gap = taps[i] - taps[i - 1];
    if (Number.isFinite(gap) && gap > 0) intervals.push(gap);
  }
  if (!intervals.length) return null;
  var sorted = intervals.slice().sort(function (a, b) { return a - b; });
  var middle = sorted.length >> 1;
  var median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  var kept = intervals.filter(function (gap) {
    return Math.abs(gap - median) <= median * TEMPO_TAP_OUTLIER;
  });
  if (!kept.length) return null;
  var total = kept.reduce(function (sum, gap) { return sum + gap; }, 0);
  var bpm = Math.round(60000 / (total / kept.length));
  return bpm >= 30 && bpm <= 240 ? bpm : null;
}

(() => {
  const button = document.querySelector('#tempo-tap');
  const bpmInput = document.querySelector('#tempo-tap-bpm');
  if (!button || !bpmInput) return;
  const playerBpm = document.querySelector('#player-bpm');
  const videoBpm = document.querySelector('#video-bpm');
  const group = document.querySelector('.progression-tempo');
  const discardButton = document.querySelector('#tempo-tap-discard');
  const IDLE_TITLE = button.getAttribute('title') || '';
  const TAPPING_TITLE = 'Suelta para aplicar el tempo. Con ↺ o Escape descartas la cuenta.';
  let taps = [];
  let commitTimer = null;
  let applied = null;
  let anchor = null;
  const syncTempoToMetronome = () => {
    const sourceButton = document.querySelector('[data-source][aria-pressed="true"]');
    if (!sourceButton || sourceButton.dataset.source !== 'metronome') return;
    const metroBpm = document.querySelector('#metronome-bpm');
    const metronome = globalThis.StringMetronome;
    if (metronome && typeof metronome.setTempo === 'function') {
      const value = metronome.setTempo(Number(bpmInput.value) || 100);
      if (metroBpm) metroBpm.value = value;
    }
  };
  globalThis.syncTempoToMetronome = syncTempoToMetronome;
  // Estado visible de la cuenta en curso. El botón «↺» está siempre en la fila
  // y solo se muestra mientras se cuenta, así la caja no se mueve al empezar.
  const setTapping = on => {
    button.classList.toggle('is-tapping', on);
    bpmInput.classList.toggle('is-pending', on);
    button.setAttribute('aria-busy', String(on));
    button.title = on ? TAPPING_TITLE : IDLE_TITLE;
    if (group) group.classList.toggle('is-tapping', on);
    if (discardButton) {
      discardButton.classList.toggle('is-ready', on);
      discardButton.setAttribute('aria-hidden', String(!on));
      discardButton.tabIndex = on ? 0 : -1;
    }
  };
  const clearCount = () => {
    taps = [];
    if (commitTimer) { clearTimeout(commitTimer); commitTimer = null; }
    setTapping(false);
  };
  // Aplica un tempo ya decidido (cuenta cerrada, edición a mano o flechas):
  // cierra cualquier cuenta en curso y publica el valor.
  const commit = bpm => {
    // De dónde sale este tempo decide si hay ancla: si salió de una cuenta, el
    // primer golpe es un punto de partida conocido; si se escribió a mano o con
    // las flechas, no lo hay y quien use la ancla tiene que saberlo.
    const source = taps.length ? taps[0] : null;
    clearCount();
    applied = bpm;
    anchor = source;
    bpmInput.value = bpm;
    if (playerBpm) playerBpm.value = bpm;
    if (videoBpm) videoBpm.value = bpm;
    syncTempoToMetronome();
    // Quien esté sonando (el Acompañamiento) ajusta su pulso sin reiniciar.
    globalThis.window?.dispatchEvent?.(new Event('traste:tempo-applied'));
  };
  // Descartar la cuenta devuelve el campo al último tempo aplicado y no toca
  // nada más: el Acompañamiento sigue con el tempo que ya tenía.
  const discard = () => {
    if (!taps.length) return;
    clearCount();
    if (applied !== null) bpmInput.value = applied;
  };
  // El tempo vigente es el del Acompañamiento: sirve de referencia para deshacer
  // una cuenta a medias y para el estado inicial de los dos campos.
  const adoptPlayerBpm = () => {
    if (!playerBpm || playerBpm.value === '') return;
    bpmInput.value = playerBpm.value;
    const value = Number(playerBpm.value);
    applied = Number.isFinite(value) && value > 0 ? Math.min(240, Math.max(30, Math.round(value))) : null;
  };
  const clampedBpm = () => Math.min(240, Math.max(30, Math.round(Number(bpmInput.value) || 100)));
  if (discardButton) discardButton.addEventListener('click', discard);
  document.querySelectorAll('.tempo-tap-step').forEach(step => step.addEventListener('click', () => {
    commit(Math.min(240, Math.max(30, clampedBpm() + Number(step.dataset.step))));
  }));
  adoptPlayerBpm();
  setTapping(false);
  // Editar el tempo del Acompañamiento o aplicar una plantilla manda sobre la
  // cuenta: el tempo explícito siempre gana.
  if (playerBpm) playerBpm.addEventListener('input', () => { clearCount(); adoptPlayerBpm(); });
  globalThis.window?.addEventListener?.('traste:preset-applied', () => { clearCount(); adoptPlayerBpm(); });
  bpmInput.addEventListener('change', () => {
    commit(Math.min(240, Math.max(30, Math.round(Number(bpmInput.value) || 100))));
  });
  const tap = () => {
    const now = performance.now();
    // Una pausa larga empieza una cuenta nueva: los golpes anteriores no se
    // suman a los nuevos.
    if (taps.length && now - taps[taps.length - 1] > TEMPO_TAP_WINDOW_MS) taps = [];
    taps.push(now);
    taps = taps.slice(-TEMPO_TAP_MAX_TAPS);
    if (commitTimer) { clearTimeout(commitTimer); commitTimer = null; }
    const bpm = tempoFromTaps(taps);
    if (bpm === null) { setTapping(taps.length > 0); return; }
    bpmInput.value = bpm;
    setTapping(true);
    commitTimer = setTimeout(() => { commitTimer = null; commit(bpm); }, TEMPO_TAP_COMMIT_MS);
  };
  globalThis.tapProgressionTempo = tap;
  globalThis.discardTempoTap = discard;
  // El primer golpe de la última cuenta, en la misma base de tiempo que usa el
  // reloj. La improvisación lo toma como punto uno de su compás, para que la
  // cuadrícula caiga donde el autor empezó a marcar y no donde encendió el
  // interruptor (si se encendió después de contar, la rejilla quedaría corrida).
  // Sin cuenta, no hay ancla: quien la use decide qué hacer con ese null.
  globalThis.tempoTapAnchor = function () { return anchor; };
  button.addEventListener('click', tap);
  // Escape es la vía de teclado para descartar la cuenta, sin ratón.
  document.addEventListener('keydown', event => {
    if (event.code !== 'Escape' || !taps.length) return;
    event.preventDefault();
    discard();
  });
})();
