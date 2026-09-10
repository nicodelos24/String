(() => {
  const form=document.querySelector('#youtube-form');
  const url=document.querySelector('#youtube-url');
  const loadButton=document.querySelector('#youtube-load');
  const status=document.querySelector('#youtube-status');
  const videoWrap=document.querySelector('#youtube-video-wrap');
  const cueTime=document.querySelector('#youtube-cue-time');
  const mark=document.querySelector('#youtube-mark');
  const useTime=document.querySelector('#youtube-use-time');
  const follow=document.querySelector('#youtube-follow');
  const record=document.querySelector('#youtube-record');
  const markNow=document.querySelector('#youtube-mark-now');
  const cueList=document.querySelector('#youtube-cues');
  const timeline=new SongTimeline();
  let player=null, ready=false, videoId=null, lastCue=null, generation=0, timer=null, readyTimer=null;
  let apiPromise=null;
  const timeLabel=seconds=>`${Math.floor(seconds/60)}:${(seconds%60).toFixed(1).padStart(4,'0')}`;
  function controls() {mark.disabled=!ready; useTime.disabled=!ready; record.disabled=!ready; markNow.disabled=!ready; follow.disabled=!ready || !timeline.cues.length;}
  function highlight(cue) {
    cueList.querySelectorAll('[data-seek]').forEach(button=>button.setAttribute('aria-current',String(Number(button.dataset.seek)===cue?.time)));
  }
  function applyCue(cue) {
    if(cue===lastCue) return;
    lastCue=cue;
    highlight(cue);
    if(!cue) {playingProgressionItem=null; renderProgression(); return;}
    playingProgressionItem=cue.source;
    showProgressionChord(cue.saved,progression.indexOf(cue.source));
  }
  function tick() {
    if(ready && follow.checked && player && player.getPlayerState()!==0) applyCue(timeline.at(player.getCurrentTime()));
  }
  function renderCues() {
    cueList.replaceChildren();
    for(const cue of timeline.cues) {
      const row=document.createElement('li');
      const seek=document.createElement('button');
      const type=chordTypes.find(type=>type.value===cue.saved.type);
      seek.type='button'; seek.dataset.seek=String(cue.time);
      seek.textContent=`${timeLabel(cue.time)} · ${cue.saved.rootNoteName || noteName(cue.saved.root)}${type?.suffix || ''} · ${modes[cue.saved.mode || defaultChordMode(cue.saved)]?.name || ''}`;
      const remove=document.createElement('button');
      remove.type='button'; remove.dataset.removeCue=String(cue.time); remove.textContent='×';
      remove.setAttribute('aria-label',`Quitar marca de ${timeLabel(cue.time)}`);
      row.append(seek,remove); cueList.append(row);
    }
    controls();
    highlight(lastCue);
  }
  function api() {
    if(window.YT?.Player) return Promise.resolve();
    if(apiPromise) return apiPromise;
    apiPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      const timeout=setTimeout(()=>fail(),15000);
      function fail() {clearTimeout(timeout); script.remove(); apiPromise=null; reject(new Error('No se pudo conectar con YouTube. Revisa la conexión e intenta de nuevo.'));}
      window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout); resolve();};
      script.src='https://www.youtube.com/iframe_api'; script.onerror=fail;
      document.head.append(script);
    });
    return apiPromise;
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const id=youtubeVideoId(url.value);
    if(!id) {status.textContent='Pega un enlace válido a un video de YouTube.'; return;}
    const external=document.querySelector('#youtube-external');
    external.href=`https://www.youtube.com/watch?v=${id}`; external.hidden=false;
    if(location.protocol==='file:') {status.textContent='Para conectar YouTube, ejecuta npm start y abre http://127.0.0.1:8000. También puedes usar Python o Live Server; ver README.'; return;}
    const request=++generation;
    clearTimeout(readyTimer);
    loadButton.disabled=true; ready=false; controls();
    record.checked=false; playingProgressionItem=null; lastCue=null; renderProgression(); highlight(null);
    status.textContent='Conectando con YouTube…';
    try {
      await api();
      if(request!==generation) return;
      clearInterval(timer);
      if(player) player.destroy();
      if(videoId!==id) {timeline.clear(); follow.checked=false; lastCue=null;}
      videoId=id; videoWrap.hidden=false;
      videoWrap.replaceChildren();
      const host=document.createElement('div'); videoWrap.append(host);
      readyTimer=setTimeout(()=>{
        if(request===generation && !ready) {loadButton.disabled=false;status.textContent='YouTube está tardando en responder. Puedes intentar cargar el video de nuevo.';}
      },15000);
      player=new YT.Player(host,{width:'100%',height:'300',videoId:id,
        playerVars:{origin:location.origin,playsinline:1,autoplay:0,rel:0},
        events:{
          onReady:()=>{
            if(request!==generation) return;
            clearTimeout(readyTimer);
            ready=true; loadButton.disabled=false; controls(); renderCues();
            status.textContent='Video listo. Reproduce la canción y activa el registro para marcar los cambios con las tarjetas.';
            clearInterval(timer); timer=setInterval(tick,100);
          },
          onStateChange:event=>{
            if(request!==generation) return;
            if(event.data===1) {window.dispatchEvent(new Event('traste:youtube-playing')); lastCue=null; tick();}
            if(event.data===0) {playingProgressionItem=null; lastCue=null; highlight(null); renderProgression();}
          },
          onError:event=>{
            if(request!==generation) return;
            ready=false; follow.checked=false; record.checked=false; controls(); loadButton.disabled=false;
            lastCue=null; playingProgressionItem=null; renderProgression();
            highlight(null);
            clearTimeout(readyTimer);
            clearInterval(timer);
            const messages={100:'El video no está disponible.',101:'Este video no permite reproducción en otras páginas.',150:'Este video no permite reproducción en otras páginas.',153:'YouTube no pudo identificar esta página. Abre la aplicación con Live Server o un servidor HTTP.'};
            status.textContent=messages[event.data] || 'YouTube no pudo reproducir este video. Prueba con otro enlace.';
          }
        }});
    } catch(error) {
      if(request===generation) {status.textContent=error.message; loadButton.disabled=false; ready=false; controls();}
    }
  });
  useTime.addEventListener('click',()=>{if(ready) cueTime.value=player.getCurrentTime().toFixed(1);});
  function captureNow() {
    if(!ready || player.getPlayerState()!==1) {status.textContent='Reproduce el video para registrar un cambio en tiempo real.'; return;}
    const item=progression[activeProgression];
    if(!item) {status.textContent='Selecciona una tarjeta de la progresión.'; return;}
    window.dispatchEvent(new Event('traste:youtube-playing'));
    follow.checked=false;
    const seconds=player.getCurrentTime();
    if(!timeline.add(seconds,item)) return;
    cueTime.value=seconds.toFixed(1); lastCue=null; renderCues(); applyCue(timeline.at(seconds+0.05));
    status.textContent=`Cambio registrado en ${timeLabel(seconds)}. Puedes seguir marcando mientras escuchas.`;
  }
  markNow.addEventListener('click',captureNow);
  record.addEventListener('change',()=>{
    if(record.checked) {
      follow.checked=false; lastCue=null; highlight(null);
      window.dispatchEvent(new Event('traste:youtube-playing'));
      status.textContent='Registro activo. Pulsa una tarjeta cuando escuches su acorde.';
    } else if(timeline.cues.length) {follow.checked=true; lastCue=null; tick();}
  });
  function selectCard(event) {
    if(event.target.closest('button') || !event.target.closest('[data-index]')) return;
    if(record.checked) captureNow();
    else if(follow.checked) {follow.checked=false; lastCue=null; playingProgressionItem=null; highlight(null); renderProgression();}
  }
  document.querySelector('#progression').addEventListener('click',event=>{
    if(!event.defaultPrevented) selectCard(event);
  });
  document.querySelector('#progression').addEventListener('keydown',event=>{
    if(!event.altKey && ['Enter',' '].includes(event.key)) selectCard(event);
  });
  mark.addEventListener('click',()=>{
    if(!ready || !cueTime.reportValidity()) return;
    const item=progression[activeProgression];
    if(!item) {status.textContent='Primero selecciona una tarjeta de la progresión.'; return;}
    if(Number(cueTime.value)>player.getDuration()) {status.textContent='La marca no puede quedar después del final del video.'; return;}
    follow.checked=false;
    timeline.add(cueTime.value,item); lastCue=null; renderCues();
    status.textContent=`Marca guardada en ${timeLabel(Number(cueTime.value))}. Activa «Seguir acordes» para sincronizar el mástil.`;
  });
  follow.addEventListener('change',()=>{lastCue=null; if(follow.checked) {record.checked=false; window.dispatchEvent(new Event('traste:youtube-playing')); tick();}
    else {playingProgressionItem=null; highlight(null); renderProgression();}});
  cueList.addEventListener('click',event=>{
    const remove=event.target.closest('[data-remove-cue]');
    if(remove) {timeline.remove(Number(remove.dataset.removeCue)); lastCue=null; if(!timeline.cues.length) follow.checked=false;
      playingProgressionItem=null; renderProgression(); renderCues(); return;}
    const seek=event.target.closest('[data-seek]');
    if(seek && ready) {const time=Number(seek.dataset.seek); window.dispatchEvent(new Event('traste:youtube-playing')); player.seekTo(time,true); lastCue=null; applyCue(timeline.at(time));}
  });
  window.addEventListener('traste:synth-start',()=>{
    if(ready) player.pauseVideo(); follow.checked=false; record.checked=false; lastCue=null; highlight(null);
  });
  window.addEventListener('pagehide',()=>{generation++; clearInterval(timer); clearTimeout(readyTimer); if(player) player.destroy(); player=null; ready=false; controls(); loadButton.disabled=false;});
  if(location.protocol==='file:') status.textContent='Para usar YouTube, inicia el servidor con npm start y abre http://127.0.0.1:8000. También puedes usar Python o Live Server; ver README.';
  controls();
})();
