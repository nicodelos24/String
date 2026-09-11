(() => {
  let dark=false;
  try {dark=localStorage.getItem('string.theme')==='dark';}catch{}
  function apply(){document.documentElement.dataset.theme=dark?'dark':'light';}
  apply();
  document.addEventListener('DOMContentLoaded',()=>{
    const button=document.getElementById('theme-toggle');
    function label(){button.setAttribute('aria-pressed',String(dark));button.textContent=dark?'Modo claro':'Modo oscuro';}
    label();button.addEventListener('click',()=>{dark=!dark;apply();label();try{localStorage.setItem('string.theme',dark?'dark':'light');}catch{}});
  });
})();
