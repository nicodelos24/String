(() => {
  const $=id=>document.getElementById(id);
  const wrap=$('youtube-video-wrap'),status=$('youtube-status'),toggle=$('youtube-toggle'),seek=$('youtube-seek');
  const disclosure=$('youtube-disclosure'),content=$('youtube-content'),floating=$('youtube-float');
  // Mantener el mismo iframe al minimizar evita reiniciar la canción.
  content.after(wrap);
  let player=null,ready=false,generation=0,poll=null,timeout=null,apiPromise=null;
  const label=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  const setIcon=ticking=>{toggle.innerHTML=ticking?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';toggle.setAttribute('aria-label',ticking?'Pausar':'Reproducir');toggle.title=ticking?'Pausar':'Reproducir';};
  function layout() {
    const collapsed=disclosure.getAttribute('aria-expanded')==='false';
    content.classList.toggle('is-collapsed',collapsed); content.inert=collapsed;
    wrap.classList.toggle('is-floating',collapsed && floating.checked);
    wrap.hidden=!player || (collapsed && !floating.checked);
    toggle.disabled=!ready || wrap.hidden;
    if(ready && wrap.hidden) player.pauseVideo();
  }
  disclosure.addEventListener('click',()=>{disclosure.setAttribute('aria-expanded',String(disclosure.getAttribute('aria-expanded')!=='true'));layout();});
  floating.addEventListener('change',layout);
  function api() {
    if(window.YT?.Player) return Promise.resolve();
    if(apiPromise) return apiPromise;
    apiPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      const timer=setTimeout(fail,15000);
      function fail() {clearTimeout(timer);script.remove();apiPromise=null;reject(new Error('No se pudo conectar con YouTube. Revisa tu conexión y vuelve a cargar el video.'));}
      window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);resolve();};
      script.src='https://www.youtube.com/iframe_api';script.onerror=fail;document.head.append(script);
    });return apiPromise;
  }
  function tick() {
    if(!ready) return;
    const time=player.getCurrentTime() || 0,duration=player.getDuration() || 0;
    $('youtube-time').textContent=`${label(time)} / ${label(duration)}`;
    seek.max=String(duration);seek.disabled=duration<=0; if(document.activeElement!==seek) seek.value=String(time);
    setIcon(player.getPlayerState()===1);
  }
  async function load(value) {
    const id=value?youtubeVideoId(value):null;
    if(value && !id) {status.textContent='Introduce un enlace válido de YouTube.';return;}
    const request=++generation;
    clearInterval(poll);clearTimeout(timeout);ready=false;toggle.disabled=true;seek.disabled=true;
    $('youtube-load').disabled=false;
    if(player) player.destroy();player=null;wrap.replaceChildren();wrap.hidden=true;
    $('youtube-url').value=value;seek.value='0';seek.max='0';$('youtube-time').textContent='0:00 / 0:00';setIcon(false);
    const external=$('youtube-external');external.hidden=!id;
    if(!id) {status.textContent='Carga una canción para practicar.';return;}
    external.href=`https://www.youtube.com/watch?v=${id}`;
    if(location.protocol==='file:') {status.textContent='Inicia npm start y abre http://127.0.0.1:8000 para usar YouTube.';return;}
    status.textContent='Conectando con YouTube…';$('youtube-load').disabled=true;
    try {
      await api();if(request!==generation) return;
      const host=document.createElement('div');wrap.append(host);
      const restore=document.createElement('button');restore.className='video-restore';restore.textContent='↗ Restaurar video';restore.type='button';restore.onclick=()=>{disclosure.setAttribute('aria-expanded','true');layout();disclosure.focus();};wrap.append(restore);
      timeout=setTimeout(()=>{if(request===generation && !ready){$('youtube-load').disabled=false;status.textContent='YouTube no respondió. Puedes volver a cargar o abrir el enlace externo.';}},15000);
      player=new YT.Player(host,{width:'100%',height:'220',videoId:id,playerVars:{origin:location.origin,playsinline:1,autoplay:0,rel:0},events:{
        onReady:()=>{if(request!==generation)return;clearTimeout(timeout);ready=true;$('youtube-load').disabled=false;layout();tick();poll=setInterval(tick,250);status.textContent='Controla el video aquí o desde YouTube. Guarda su enlace con tu progresión en Mis progresiones.';},
        onStateChange:()=>{if(request===generation)tick();},
        onError:()=>{if(request!==generation)return;ready=false;clearTimeout(timeout);clearInterval(poll);toggle.disabled=true;seek.disabled=true;$('youtube-load').disabled=false;status.textContent='Este video no se pudo reproducir aquí. Prueba otro enlace o ábrelo en YouTube.';}
      }});layout();
    } catch(error) {if(request===generation){$('youtube-load').disabled=false;status.textContent=error.message;}}
  }
  toggle.addEventListener('click',()=>{if(ready){if(player.getPlayerState()===1)player.pauseVideo();else player.playVideo();tick();}});
  seek.addEventListener('change',()=>{if(ready)player.seekTo(Number(seek.value),true);});
  $('youtube-form').addEventListener('submit',event=>{event.preventDefault();load($('youtube-url').value.trim());});
  window.addEventListener('traste:load-video',event=>load(event.detail));
  window.addEventListener('pagehide',()=>{generation++;clearInterval(poll);clearTimeout(timeout);player?.destroy();player=null;ready=false;});
})();
