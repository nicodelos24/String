(() => {
  const $=id=>document.getElementById(id);
  let currentSource='progression';
  const quickPlay=$('quick-play'),quickTime=$('quick-midi-time');
  const metronomeIcon = running => `<svg viewBox="0 0 24 24" aria-hidden="true">${running ? '<path d="M6 6h12v12H6z"/>' : '<path d="M8 5v14l11-7z"/>'}</svg>`;
  function syncQuickPlayer(){
    if(currentSource==='metronome'){
      const running=$('metronome-toggle').getAttribute('aria-pressed')==='true';
      quickPlay.innerHTML=metronomeIcon(running);
      quickPlay.disabled=false;
      quickPlay.title=running?'Pausar metrónomo':'Iniciar metrónomo';
      quickPlay.setAttribute('aria-label',running?'Pausar metrónomo':'Iniciar metrónomo');
      quickPlay.setAttribute('aria-pressed',String(running));
      quickTime.hidden=true;
      return;
    }
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
    if(currentSource==='metronome' && source!=='metronome')window.StringMetronome?.stop();
    currentSource=source;
    document.querySelectorAll('[data-source]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.source===source)));
    $('progression-transport').hidden=source!=='progression';
    $('midi-transport').hidden=source!=='midi';
    $('player-status').hidden=source!=='progression';
    syncQuickPlayer();
  }
  quickPlay.addEventListener('click',()=>{
    if(currentSource==='metronome'){
      const metronome=window.StringMetronome;
      if(!metronome)return;
      if(metronome.running||metronome.starting){metronome.stop();return;}
      metronome.start().catch(()=>metronome.stop());
      return;
    }
    $(currentSource==='midi'?'midi-play':'player-toggle').click();
  });
  const transportObserver=new MutationObserver(syncQuickPlayer);
  ['player-toggle','midi-play','midi-time','metronome-toggle'].forEach(id=>transportObserver.observe($(id),{
    attributes:true,attributeFilter:['disabled','aria-label','aria-pressed','title'],childList:true,subtree:true,characterData:true
  }));
  window.addEventListener('traste:metronome-state',syncQuickPlayer);
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
