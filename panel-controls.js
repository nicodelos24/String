(() => {
  const $=id=>document.getElementById(id);
  function choose(source,stop=true){
    if(stop)window.dispatchEvent(new Event('traste:load-song'));
    document.querySelectorAll('[data-source]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.source===source)));
    $('progression-transport').hidden=source!=='progression';
    $('midi-transport').hidden=source!=='midi';
    $('player-status').hidden=source!=='progression';
  }
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
      animation?.cancel();expanded=!expanded;
      [...panel.children].filter(child=>child!==summary).forEach(child=>child.inert=!expanded);
      if(!expanded && panel.contains(document.activeElement))summary.focus();
      if(matchMedia('(prefers-reduced-motion: reduce)').matches){panel.open=expanded;return;}
      panel.open=true;
      const target=expanded?panel.getBoundingClientRect().height:summary.getBoundingClientRect().height+parseFloat(getComputedStyle(panel).paddingTop)+parseFloat(getComputedStyle(panel).paddingBottom)+2;
      animation=panel.animate([{height:height+'px',overflow:'hidden'},{height:target+'px',overflow:'hidden'}],{duration:250,easing:'cubic-bezier(.2,.8,.2,1)'});
      animation.onfinish=()=>{panel.open=expanded;animation=null;};
    });
    panel.addEventListener('toggle',()=>{if(!animation)expanded=panel.open;});
  });
})();
