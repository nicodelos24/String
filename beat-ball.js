// T-18 · IA_GUIDE.md:657 · la pelotita que rebota junto a las tarjetas para
// mostrar el tiempo visualmente.
//
// Es un adorno del pulso de la rejilla de Improvisar: improvisation.js ya
// cuenta (su único sondeo, con el ancla del primer golpe del Tempo) y publica
// dos eventos de ventana: `traste:improv-live` (el estado vivo, el mismo flag
// que pinta `is-live` en el texto del estado) y `traste:improv-beat` (la
// posición del pulso con su fracción). Este módulo solo escucha y pinta.
//
// Regla dura de la ficha, dejada como prueba: aquí no va a aparecer un
// temporizador. Si la pelota llevara su propio reloj, con el tiempo se
// desincronizaría de la rejilla que ya está bien hecha — la cuenta la hace
// quien ya la sabe hacer.
//
// En movimiento reducido (prefers-reduced-motion) la pelota no flota: el
// rebote no se dibuja y el pulso se marca alternando el color del punto por
// la clase `is-beat`, que alterna siempre que cambia el pulso — un cambio de
// color no es un movimiento animado.

// Cuánto sube la pelota en el rebote, en píxeles. Fijado a mano con el
// tamaño del punto: por encima del punto, sin disputar el texto del estado.
var BALL_HOP_PX = 7;

// Altura del rebote en la fracción del pulso: en el golpe la pelota está
// abajo, a mitad del pulso arriba del todo, y en el pulso siguiente vuelve a
// estar abajo — un rebote por pulso, cada uno por su lado. Con lo que llega
// sin número devuelve el suelo, para que un instante raro no la deje colgada.
function ballHop(beat) {
  const value = Number(beat);
  if (!Number.isFinite(value)) return 0;
  return Math.sin(Math.PI * (value - Math.floor(value)));
}

// El primer pulso del compás es el acento, el mismo criterio del metrónomo
// (accent solo en el 0). Una fracción de pulso o un texto no son pulsos.
function ballAccent(beatInBar) {
  return Number.isInteger(beatInBar) && beatInBar === 0;
}

// Lo que se pinta en un instante de la rejilla. Sin posición (o con una que
// no sirve) la pelota queda en el suelo y sin acento: reposo.
function ballFrame(position) {
  if (!position || !Number.isFinite(Number(position.beat))) return {hop: 0, accent: false};
  return {hop: ballHop(position.beat), accent: ballAccent(position.beatInBar)};
}

if (typeof document !== 'undefined') (() => {
  const ball = document.getElementById('improv-ball');
  const status = document.getElementById('improvisation-status');
  if (!ball || !status) return; // Sin el punto la página queda como era: sin nada que pintar.
  // Movimiento reducido se mira en cada pulso, no una sola vez: la
  // preferencia puede cambiarse con la página abierta.
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastPulse = null;
  const live = () => ball.classList.contains('is-live');
  const paint = frame => {
    // Un -0 por el redondeo no llega a la página: se pinta como «0».
    const lift = Number((-frame.hop * BALL_HOP_PX).toFixed(3));
    ball.style.transform = 'translateY(' + (lift || 0) + 'px)' + (frame.accent ? ' scale(1.4)' : '');
    ball.classList.toggle('is-beat', frame.accent);
  };
  const rest = () => {
    ball.hidden = true;
    ball.classList.remove('is-live');
    ball.classList.remove('is-beat');
    ball.style.transform = '';
    lastPulse = null;
  };
  window.addEventListener('traste:improv-live', event => {
    if (event?.detail?.live) {
      ball.hidden = false;
      ball.classList.add('is-live');
      return;
    }
    // Apagada la improvisación: escondida y en el suelo, sin quedarse
    // sostenida en el aire del último pulso.
    rest();
  });
  window.addEventListener('traste:improv-beat', event => {
    // Un pulso suelto sin el aviso de vida no pinta: el orden de los eventos
    // manda y nadie mueve algo que no existe para el usuario.
    if (!live()) return;
    const frame = ballFrame(event?.detail);
    if (reduced()) {
      // Nada sube en movimiento reducido: el pulso alterna el color del punto
      // (la clase is-beat) cada vez que cambia el número de pulso. Un cambio
      // de color no es una animación.
      const pulseNow = Number.isFinite(Number(event?.detail?.beat)) ? Math.floor(Number(event.detail.beat)) : null;
      if (pulseNow !== null && pulseNow !== lastPulse) { ball.classList.toggle('is-beat', pulseNow % 2 === 0); lastPulse = pulseNow; }
      return;
    }
    ball.hidden = false;
    paint(frame);
  });
})();

if (typeof module !== 'undefined' && module.exports) module.exports = {BALL_HOP_PX, ballHop, ballAccent, ballFrame};
