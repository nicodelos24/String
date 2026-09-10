// El video se controla únicamente desde los controles oficiales de YouTube.
(() => {
  const form = document.querySelector('#youtube-form');
  const input = document.querySelector('#youtube-url');
  const status = document.querySelector('#youtube-status');
  const wrap = document.querySelector('#youtube-video-wrap');
  const external = document.querySelector('#youtube-external');
  function load(value) {
    input.value = value;
    if (!value) {
      wrap.replaceChildren(); wrap.hidden = true; external.hidden = true;
      status.textContent = 'Puedes cargar un video o practicar con el acompañamiento de ritmos.';
      return;
    }
    const id = youtubeVideoId(value);
    if (!id) {status.textContent = 'Introduce un enlace válido de YouTube.'; return;}
    external.href = `https://www.youtube.com/watch?v=${id}`; external.hidden = false;
    if (location.protocol === 'file:') {
      status.textContent = 'Para mostrar el video, inicia npm start y abre http://127.0.0.1:8000. También puedes usar el enlace externo.';
      return;
    }
    const frame = document.createElement('iframe');
    frame.title = 'Reproductor de YouTube';
    frame.src = `https://www.youtube.com/embed/${id}?playsinline=1&rel=0`;
    frame.allow = 'encrypted-media; fullscreen; picture-in-picture';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allowFullscreen = true;
    wrap.replaceChildren(frame); wrap.hidden = false;
    status.textContent = 'Usa los controles del video. Si no permite reproducirse aquí, ábrelo en YouTube.';
  }
  form.addEventListener('submit', event => {event.preventDefault(); load(input.value);});
  window.addEventListener('traste:load-video', event => load(event.detail));
})();
