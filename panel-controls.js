(() => {
  const $=id=>document.getElementById(id);
  let currentSource='progression';
  const quickPlay=$('quick-play'),quickTime=$('quick-midi-time');
  function syncQuickPlayer(){
    const original=$(currentSource==='midi'?'midi-play':'player-toggle');
    quickPlay.innerHTML=original.innerHTML;
    quickPlay.disabled=original.disabled;
    quickPlay.title=original.title;
    quickPlay.setAttribute('aria-label',original.getAttribute('aria-label'));
    quickPlay.setAttribute('aria-pressed',original.getAttribute('aria-pressed')||'false');
    quickTime.hidden=currentSource!=='midi';
    quickTime.textContent=$('midi-time').textContent;
  }
  function choose(source,stop=true){
    if(stop && source!==currentSource)window.dispatchEvent(new Event('traste:load-song'));
    currentSource=source;
    document.querySelectorAll('[data-source]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.source===source)));
    $('progression-transport').hidden=source!=='progression';
    $('midi-transport').hidden=source!=='midi';
    $('player-status').hidden=source!=='progression';
    syncQuickPlayer();
  }
  // Un acceso adicional al mismo motor; refleja también finalización, carga y errores.
  quickPlay.addEventListener('click',()=>$(currentSource==='midi'?'midi-play':'player-toggle').click());
  const transportObserver=new MutationObserver(syncQuickPlayer);
  ['player-toggle','midi-play','midi-time'].forEach(id=>transportObserver.observe($(id),{
    attributes:true,attributeFilter:['disabled','aria-label','aria-pressed','title'],childList:true,subtree:true,characterData:true
  }));
  syncQuickPlayer();
  document.querySelectorAll('[data-source]').forEach(button=>button.addEventListener('click',()=>choose(button.dataset.source)));
  $('midi-file').addEventListener('change',()=>choose('midi'));
  $('player-toggle').addEventListener('click',()=>choose('progression',false));
  $('midi-play').addEventListener('click',()=>choose('midi',false));
  document.querySelectorAll('[data-section-name]').forEach(button=>button.addEventListener('click',()=>{$('section-name').value=button.dataset.sectionName;}));
  // Las ayudas y paneles nativos comparten una transición cancelable.
  document.querySelectorAll('details').forEach(panel=>{
    const summary=panel.querySelector(':scope > summary');
    let animation=null,expanded=panel.open;
    summary.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      const height=panel.getBoundingClientRect().height;
      animation?.cancel();animation=null;expanded=!expanded;
      if(!expanded && panel.contains(document.activeElement))summary.focus();
      [...panel.children].filter(child=>child!==summary).forEach(child=>child.inert=!expanded);
      if(matchMedia('(prefers-reduced-motion: reduce)').matches){panel.open=expanded;return;}
      panel.open=true;
      const target=expanded?panel.getBoundingClientRect().height:summary.getBoundingClientRect().height+parseFloat(getComputedStyle(panel).paddingTop)+parseFloat(getComputedStyle(panel).paddingBottom)+2;
      animation=panel.animate([{height:height+'px',overflow:'hidden'},{height:target+'px',overflow:'hidden'}],{duration:250,easing:'cubic-bezier(.2,.8,.2,1)'});
      animation.onfinish=()=>{panel.open=expanded;animation=null;};
    });
    panel.addEventListener('toggle',()=>{if(!animation){expanded=panel.open;[...panel.children].filter(child=>child!==summary).forEach(child=>child.inert=!expanded);}});
  });
})();
