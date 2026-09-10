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
  const cueList=document.querySelector('#youtube-cues');
  const timeline=new SongTimeline();
  let player=null, ready=false, videoId=null, lastCue=null, generation=0, timer=null, readyTimer=null;
  let apiPromise=null;
  const timeLabel=seconds=>`${Math.floor(seconds/60)}:${(seconds%60).toFixed(1).padStart(4,'0')}`;
  function controls() {mark.disabled=!ready; useTime.disabled=!ready; follow.disabled=!ready || !timeline.cues.length;}
  function applyCue(cue) {
    if(cue===lastCue) return;
    lastCue=cue;
    if(!cue) {playingProgressionItem=null; renderProgression(); return;}
    playingProgressionItem=cue.source;
    showProgressionChord(cue.saved,progression.indexOf(cue.source));
  }
  function tick() {
    if(ready && follow.checked && player) applyCue(timeline.at(player.getCurrentTime()));
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
  }
  function api() {
    if(window.YT?.Player) return Promise.resolve();
    if(apiPromise) return apiPromise;
    apiPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      const timeout=setTimeout(()=>fail(),15000);
      function fail() {clearTimeout(timeout); script.remove(); apiPromise=null; reject(new Error('No se pudo conectar con YouTube. Revisá la conexión e intentá de nuevo.'));}
      window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout); resolve();};
      script.src='https://www.youtube.com/iframe_api'; script.onerror=fail;
      document.head.append(script);
    });
    return apiPromise;
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const id=youtubeVideoId(url.value);
    if(!id) {status.textContent='Pegá un enlace válido a un video de YouTube.'; return;}
    const external=document.querySelector('#youtube-external');
    external.href=`https://www.youtube.com/watch?v=${id}`; external.hidden=false;
    if(location.protocol==='file:') {status.textContent='Para conectar YouTube, abrí este proyecto con Live Server o desde http://localhost:8000. Los pasos están en el README.'; return;}
    const request=++generation;
    clearTimeout(readyTimer);
    loadButton.disabled=true; ready=false; controls();
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
        if(request===generation && !ready) {loadButton.disabled=false;status.textContent='YouTube está tardando en responder. Podés intentar cargar el video de nuevo.';}
      },15000);
      player=new YT.Player(host,{width:'100%',height:'300',videoId:id,
        playerVars:{origin:location.origin,playsinline:1,autoplay:0,rel:0},
        events:{
          onReady:()=>{
            if(request!==generation) return;
            clearTimeout(readyTimer);
            ready=true; loadButton.disabled=false; controls(); renderCues();
            status.textContent='Video listo. Reproducilo desde sus controles y prepará las marcas de acordes.';
            clearInterval(timer); timer=setInterval(tick,100);
          },
          onStateChange:event=>{
            if(request!==generation) return;
            if(event.data===1) {window.dispatchEvent(new Event('traste:youtube-playing')); lastCue=null; tick();}
            if(event.data===0) {playingProgressionItem=null; lastCue=null; renderProgression();}
          },
          onError:event=>{
            if(request!==generation) return;
            ready=false; follow.checked=false; controls(); loadButton.disabled=false;
            lastCue=null; playingProgressionItem=null; renderProgression();
            clearTimeout(readyTimer);
            clearInterval(timer);
            const messages={100:'El video no está disponible.',101:'Este video no permite reproducción en otras páginas.',150:'Este video no permite reproducción en otras páginas.',153:'YouTube no pudo identificar esta página. Abrila con Live Server o un servidor HTTP.'};
            status.textContent=messages[event.data] || 'YouTube no pudo reproducir este video. Probá con otro enlace.';
          }
        }});
    } catch(error) {
      if(request===generation) {status.textContent=error.message; loadButton.disabled=false; ready=false; controls();}
    }
  });
  useTime.addEventListener('click',()=>{if(ready) cueTime.value=player.getCurrentTime().toFixed(1);});
  mark.addEventListener('click',()=>{
    if(!ready || !cueTime.reportValidity()) return;
    const item=progression[activeProgression];
    if(!item) {status.textContent='Primero seleccioná una tarjeta de la progresión.'; return;}
    if(Number(cueTime.value)>player.getDuration()) {status.textContent='La marca no puede quedar después del final del video.'; return;}
    timeline.add(cueTime.value,item); lastCue=null; renderCues();
    status.textContent=`Marca guardada en ${timeLabel(Number(cueTime.value))}. Activá «Seguir acordes» para sincronizar el mástil.`;
  });
  follow.addEventListener('change',()=>{lastCue=null; if(follow.checked) {window.dispatchEvent(new Event('traste:youtube-playing')); tick();}
    else {playingProgressionItem=null; renderProgression();}});
  cueList.addEventListener('click',event=>{
    const remove=event.target.closest('[data-remove-cue]');
    if(remove) {timeline.remove(Number(remove.dataset.removeCue)); lastCue=null; if(!timeline.cues.length) follow.checked=false;
      playingProgressionItem=null; renderProgression(); renderCues(); return;}
    const seek=event.target.closest('[data-seek]');
    if(seek && ready) {const time=Number(seek.dataset.seek); player.seekTo(time,true); lastCue=null; applyCue(timeline.at(time));}
  });
  window.addEventListener('traste:synth-start',()=>{
    if(ready) player.pauseVideo(); follow.checked=false; lastCue=null;
  });
  window.addEventListener('pagehide',()=>{generation++; clearInterval(timer); clearTimeout(readyTimer); if(player) player.destroy(); player=null; ready=false; controls(); loadButton.disabled=false;});
  if(location.protocol==='file:') status.textContent='YouTube necesita Live Server o un servidor local. Ver los pasos en el README.';
  controls();
})();
