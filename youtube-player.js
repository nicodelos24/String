(() => {
  const $=id=>document.getElementById(id);
  const wrap=$('youtube-video-wrap'),status=$('youtube-status'),toggle=$('youtube-toggle'),seek=$('youtube-seek');
  const disclosure=$('youtube-disclosure'),content=$('youtube-content'),floating=$('youtube-float');
  // Mantener el mismo iframe al minimizar evita reiniciar la canción.
  content.after(wrap);
  let player=null,ready=false,generation=0,poll=null,timeout=null,apiPromise=null;
  let floatPosition=null;
  // YouTube avisa por su API del motivo, pero sin leer el código solo se veía un
  // recuadro gris sin explicación. Ojo: el 150 también sale con enlaces copiados
  // mal, así que el mensaje no lo presenta como un caso único.
  const FAILURES={
    2:'Ese enlace no apunta a un video válido de YouTube.',
    5:'YouTube no pudo reproducir este video aquí: suele ser un problema de formato o de permisos del navegador.',
    100:'Ese video no está disponible: fue eliminado o es privado.',
    101:'El canal de este video no permite mostrarlo fuera de YouTube, así que no se puede incrustar.',
    150:'YouTube no deja mostrar este video fuera de su propia web. Lo más común es que su canal tenga desactivada la opción de compartir; si el enlace está bien copiado, es que el video es privado o ya no existe.',
    153:'YouTube no pudo verificar el origen de esta página. Prueba a cargar el video de nuevo.',
    timeout:'YouTube tardó demasiado en responder. Si tienes un bloqueador de anuncios o una extensión que filtre YouTube, puede estar impidiendo la carga.',
  };
  // `code` es el número que manda YouTube; los strings llegan desde `catch`.
  const failure=code=>FAILURES[code]??(typeof code==='string'&&code?code:'YouTube no pudo reproducir este video aquí.');
  // El reproductor de YouTube deja su pantalla gris de error dentro del iframe, y
  // si estaba flotando ese recuadro quedaba pegado sobre la página sin forma de
  // cerrarlo. Al fallar se destruye y se devuelve todo al panel.
  function fail(code){
    ready=false;clearTimeout(timeout);clearInterval(poll);timeout=null;poll=null;
    toggle.disabled=true;seek.disabled=true;$('youtube-load').disabled=false;setIcon(false);
    if(player)try{player.destroy();}catch{}
    player=null;park();wrap.replaceChildren();wrap.hidden=true;
    $('youtube-time').textContent='0:00 / 0:00';seek.value='0';seek.max='0';
    status.textContent=`${failure(code)} Puedes abrirlo en YouTube con el enlace de abajo o cargar otro video.`;
  }
  // 16:9 exacto: la caja fija de 220 px dejaba bandas grises sobre y bajo el video.
  // `setSize` escribe el atributo `height` del iframe, así que el CSS no lo fuerza.
  function fit(){
    const width=wrap.clientWidth;
    if(!ready||!player||!width)return;
    player.setSize(width,Math.max(120,Math.round(width*9/16)));
  }
  function park(){
    content.after(wrap);
    ['left','top','right','bottom'].forEach(key=>wrap.style.removeProperty(key));
    wrap.classList.remove('is-floating');
  }
  function positionFloat(x,y){
    const bounds=wrap.getBoundingClientRect();
    floatPosition={x:Math.max(8,Math.min(x,window.innerWidth-bounds.width-8)),y:Math.max(8,Math.min(y,window.innerHeight-bounds.height-8))};
    Object.assign(wrap.style,{left:floatPosition.x+'px',top:floatPosition.y+'px',right:'auto',bottom:'auto'});
  }
  window.addEventListener('resize',()=>{if(wrap.classList.contains('is-floating') && floatPosition)positionFloat(floatPosition.x,floatPosition.y);fit();});
  const label=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  const setIcon=ticking=>{toggle.innerHTML=ticking?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';toggle.setAttribute('aria-label',ticking?'Pausar':'Reproducir');toggle.title=ticking?'Pausar':'Reproducir';};
  // Ancestros con `transform` (p. ej. la animación del panel) rompen el
  // `position:fixed`: el video quedaría anclado a la página entera y el
  // arrastre se despegaría del puntero. Al volar se mueve al `body` y al
  // restaurar vuelve junto al panel.
  function layout() {
    const collapsed=disclosure.getAttribute('aria-expanded')==='false';
    if(collapsed && content.contains(document.activeElement))disclosure.focus();
    content.classList.toggle('is-collapsed',collapsed); content.inert=collapsed;
    const floatingNow=collapsed && floating.checked && ready && !!(player && wrap.children.length);
    if(floatingNow){
      document.body.append(wrap);
      if(floatPosition)positionFloat(floatPosition.x,floatPosition.y);
    }else{
      park();
    }
    wrap.classList.toggle('is-floating',floatingNow);
    wrap.hidden=!ready || (collapsed && !floating.checked);
    toggle.disabled=!ready || wrap.hidden;
    if(ready && wrap.hidden) player.pauseVideo();
    fit();
  }
  disclosure.addEventListener('click',()=>{disclosure.setAttribute('aria-expanded',String(disclosure.getAttribute('aria-expanded')!=='true'));layout();});
  floating.addEventListener('change',layout);
  function api() {
    if(window.YT?.Player) return Promise.resolve();
    if(apiPromise) return apiPromise;
    apiPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      const timer=setTimeout(giveUp,15000);
      function giveUp() {clearTimeout(timer);script.remove();apiPromise=null;reject(new Error(FAILURES.timeout));}
      window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);resolve();};
      script.src='https://www.youtube.com/iframe_api';script.onerror=giveUp;document.head.append(script);
    });return apiPromise;
  }
  function tick() {
    if(!ready) return;
    const time=player.getCurrentTime() || 0,duration=player.getDuration() || 0;
    $('youtube-time').textContent=`${label(time)} / ${label(duration)}`;
    seek.max=String(duration);seek.disabled=duration<=0; if(document.activeElement!==seek) seek.value=String(time);
    setIcon(player.getPlayerState()===1);
    window.dispatchEvent(new CustomEvent('string:video-time',{detail:{time}}));
  }
  async function load(value) {
    const id=value?youtubeVideoId(value):null;
    if(value && !id) {status.textContent='Introduce un enlace válido de YouTube.';return;}
    const request=++generation;
    window.dispatchEvent(new CustomEvent('string:video-reset',{detail:id||''}));
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
      const handle=document.createElement('button');handle.type='button';handle.className='video-drag';handle.textContent='⠿ Mover';handle.setAttribute('aria-label','Mover video flotante con las flechas');wrap.append(handle);
      let drag=null;
      handle.addEventListener('pointerdown',event=>{
        if(event.button!==0 || !wrap.classList.contains('is-floating'))return;
        const rect=wrap.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX-rect.left,y:event.clientY-rect.top};
        handle.setPointerCapture(event.pointerId);wrap.classList.add('is-dragging');
      });
      handle.addEventListener('pointermove',event=>{if(drag && drag.id===event.pointerId)positionFloat(event.clientX-drag.x,event.clientY-drag.y);});
      const endDrag=()=>{drag=null;wrap.classList.remove('is-dragging');};
      handle.addEventListener('pointerup',endDrag);handle.addEventListener('pointercancel',endDrag);handle.addEventListener('lostpointercapture',endDrag);
      handle.addEventListener('keydown',event=>{
        const delta={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[event.key];
        if(!delta || !wrap.classList.contains('is-floating'))return;
        event.preventDefault();const rect=wrap.getBoundingClientRect();positionFloat(rect.left+delta[0],rect.top+delta[1]);
      });
      const restore=document.createElement('button');restore.className='video-restore';restore.textContent='↗ Restaurar video';restore.type='button';restore.onclick=()=>{disclosure.setAttribute('aria-expanded','true');layout();disclosure.focus();};wrap.append(restore);
      timeout=setTimeout(()=>{if(request===generation && !ready)fail('timeout');},15000);
      player=new YT.Player(host,{width:'100%',height:'180',videoId:id,playerVars:{origin:location.origin,playsinline:1,autoplay:0,rel:0},events:{
        onReady:()=>{if(request!==generation)return;clearTimeout(timeout);ready=true;$('youtube-load').disabled=false;layout();fit();tick();poll=setInterval(tick,250);status.textContent='Controla el video aquí o desde YouTube. Guarda su enlace con tu progresión en Mis progresiones.';},
        onStateChange:()=>{if(request===generation)tick();},
        // Sin leer el código, todo fallo se veía igual. YouTube reintenta y repite
        // el evento, por eso `fail` es idempotente.
        onError:event=>{if(request===generation)fail(event&&event.data);}
      }});
    } catch(error) {if(request===generation)fail(error.message);}
  }
  toggle.addEventListener('click',()=>{if(ready){if(player.getPlayerState()===1)player.pauseVideo();else player.playVideo();tick();}});
  seek.addEventListener('change',()=>{if(ready)player.seekTo(Number(seek.value),true);});
  $('youtube-form').addEventListener('submit',event=>{event.preventDefault();load($('youtube-url').value.trim());});
  window.addEventListener('traste:load-video',event=>load(event.detail));
  window.addEventListener('pagehide',()=>{generation++;clearInterval(poll);clearTimeout(timeout);player?.destroy();player=null;ready=false;});
})();
