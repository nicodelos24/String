(() => {
  let dark=false;
  try {dark=localStorage.getItem('string.theme')==='dark';}catch{}
  function apply(){document.documentElement.dataset.theme=dark?'dark':'light';}
  apply();
  document.addEventListener('DOMContentLoaded',()=>{
    const button=document.getElementById('theme-toggle');
    button.setAttribute('role','switch');
    button.innerHTML='<span class="theme-sky" aria-hidden="true"><span class="theme-orb"></span></span>';
    function label(){button.setAttribute('aria-checked',String(dark));button.removeAttribute('aria-pressed');button.setAttribute('aria-label','Modo oscuro');button.title=dark?'Cambiar a modo claro':'Cambiar a modo oscuro';}
    label();button.addEventListener('click',()=>{dark=!dark;apply();label();try{localStorage.setItem('string.theme',dark?'dark':'light');}catch{}});
  });
})();
