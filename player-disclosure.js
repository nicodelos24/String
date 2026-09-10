(() => {
  const button=document.querySelector('#player-disclosure');
  const content=document.querySelector('#player-content');
  button.addEventListener('click',()=>{
    const expanded=button.getAttribute('aria-expanded')!=='true';
    button.setAttribute('aria-expanded',String(expanded));
    content.classList.toggle('is-collapsed',!expanded);
    content.inert=!expanded;
  });
})();
