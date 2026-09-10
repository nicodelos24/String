// Arrastre con puntero: funciona con mouse y con el asa táctil, sin flechas visibles.
(() => {
  const list = document.querySelector('#progression');
  let drag = null, suppressClick = false;
  let lastClick=null;
  const cards = () => [...list.querySelectorAll('.progression-card')];
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const positions = () => new Map(cards().map(card => [card, card.getBoundingClientRect().left]));
  function animateShift(before) {
    if (reducedMotion()) return;
    cards().forEach(card => {
      const dx = before.get(card) - card.getBoundingClientRect().left;
      if (Number.isFinite(dx) && Math.abs(dx) > 1 && card !== drag?.card) {
        card.animate([{transform:`translateX(${dx}px)`},{transform:'translateX(0)'}],
          {duration:180,easing:'cubic-bezier(.2,.7,.2,1)'});
      }
    });
  }
  list.addEventListener('dragstart', event => event.preventDefault());
  list.addEventListener('click', event => {
    if (suppressClick) {event.preventDefault(); event.stopImmediatePropagation(); suppressClick=false;}
    else if(event.detail>0 && !event.target.closest('button')) {
      const card=event.target.closest('.progression-card');
      if(!card)return;
      const index=Number(card.dataset.index),source=progression[index],now=performance.now();
      // La selección reconstruye las tarjetas: reconocer el segundo clic por el acorde, no por el nodo DOM.
      if(lastClick?.source===source && now-lastClick.time<400) {
        event.preventDefault();event.stopImmediatePropagation();lastClick=null;
        duplicateProgressionChord(index);
        list.querySelector(`[data-index="${index+1}"]`)?.focus();
      } else lastClick={source,time:now};
    }
  }, true);
  list.addEventListener('contextmenu',event=>{
    const card=event.target.closest('.progression-card');
    if(!card || event.target.closest('button'))return;
    event.preventDefault();lastClick=null;
    if(draggingProgressionItem)return;
    const index=Number(card.dataset.index);removeProgressionChord(index);
    list.querySelector(`[data-index="${Math.min(index,progression.length-1)}"]`)?.focus();
  });
  list.addEventListener('pointerdown', event => {
    if (drag) return;
    if (event.button !== 0 || event.target.closest('button')) return;
    const card = event.target.closest('.progression-card');
    if (!card || (event.pointerType === 'touch' && !event.target.closest('.drag-grip'))) return;
    drag = {card, id:event.pointerId, x:event.clientX, y:event.clientY,
      source:progression[Number(card.dataset.index)], started:false};
  });
  window.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.started) {
      if (Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<7) return;
      drag.started=true;
      lastClick=null;
      draggingProgressionItem=drag.source;
      const rect=drag.card.getBoundingClientRect();
      drag.offsetX=drag.x-rect.left; drag.offsetY=drag.y-rect.top;
      drag.ghost=drag.card.cloneNode(true);
      drag.ghost.classList.add('drag-ghost');
      drag.ghost.removeAttribute('data-index');
      drag.ghost.removeAttribute('tabindex');
      drag.ghost.setAttribute('aria-hidden','true');
      Object.assign(drag.ghost.style,{width:rect.width+'px',height:rect.height+'px'});
      document.body.append(drag.ghost);
      drag.card.classList.add('drag-placeholder');
      list.classList.add('is-dragging');
      list.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    drag.ghost.style.left=(event.clientX-drag.offsetX)+'px';
    drag.ghost.style.top=(event.clientY-drag.offsetY)+'px';
    const bounds=list.getBoundingClientRect();
    if(event.clientX<bounds.left+30) list.scrollLeft-=18;
    if(event.clientX>bounds.right-30) list.scrollLeft+=18;
    cards().forEach(card=>card.getAnimations().forEach(animation=>animation.cancel()));
    const before=positions();
    const target=cards().find(card=>card!==drag.card && event.clientX < card.getBoundingClientRect().left+card.offsetWidth/2);
    list.insertBefore(drag.card,target || null);
    animateShift(before);
  }, {passive:false});
  function finish(event, cancel=false) {
    if (!drag || event.pointerId!==drag.id) return;
    const current=drag; drag=null;
    if (!current.started) return;
    const from=progression.indexOf(current.source), to=cards().indexOf(current.card);
    const target=current.card.getBoundingClientRect();
    draggingProgressionItem=null;
    list.classList.remove('is-dragging');
    if(list.hasPointerCapture(current.id)) list.releasePointerCapture(current.id);
    if (!cancel) moveProgressionChord(from,to);
    renderProgression();
    if (!cancel && !reducedMotion()) {
      const animation=current.ghost.animate([{left:current.ghost.style.left,top:current.ghost.style.top,opacity:1},
        {left:target.left+'px',top:target.top+'px',opacity:0}],{duration:160,easing:'ease-out'});
      animation.finished.finally(()=>current.ghost.remove());
    } else current.ghost.remove();
    suppressClick=true;
    setTimeout(()=>{suppressClick=false;},0);
  }
  window.addEventListener('pointerup',event=>finish(event));
  window.addEventListener('pointercancel',event=>finish(event,true));
  window.addEventListener('blur',()=>{if(drag) finish({pointerId:drag.id},true);});
  list.addEventListener('keydown', event => {
    if(event.target.closest('button')) return;
    const card=event.target.closest('[data-index]');
    if(!card) return;
    const index=Number(card.dataset.index);
    if(event.altKey && ['ArrowLeft','ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const to=index+(event.key==='ArrowLeft'?-1:1);
      const old=card.getBoundingClientRect();
      moveProgressionChord(index,to);
      const moved=list.querySelector(`[data-index="${Math.max(0,Math.min(progression.length-1,to))}"]`);
      moved?.focus();
      if(moved && !reducedMotion()) moved.animate([{transform:`translateX(${old.left-moved.getBoundingClientRect().left}px)`},{transform:'translateX(0)'}],{duration:180});
    } else if(event.key==='Enter' || event.key===' ') {
      event.preventDefault(); selectProgressionChord(index);
      list.querySelector(`[data-index="${index}"]`)?.focus();
    }
  });
})();
