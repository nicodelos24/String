(() => {
  const picker=document.querySelector('#instrument-picker');
  const select=document.querySelector('#instrument-select');
  const drawing=bass=>`<svg viewBox="0 0 70 70" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><g transform="rotate(35 35 35)"><path d="M31 5h8v30h-8z M30 5h10v10H30z"/><path d="${bass?'M29 31q-13 -8 -13 5q0 8 7 10q-10 17 12 19q22 -2 12 -19q7 -2 7 -10q0 -13 -13 -5':'M29 32q-12 -6 -13 6q0 6 7 10q-11 15 12 18q23 -3 12 -18q7 -4 7 -10q-1 -12 -13 -6'}"/><path d="M32 9v49m6-49v49M27 59h16"/>${bass?'<path d="M28 46h14m-14 5h14"/>':'<circle cx="35" cy="44" r="5"/>'}</g></svg>`;
  picker.innerHTML=Object.entries(instruments).map(([key,value])=>`<label class="instrument-choice"><input type="radio" name="string-instrument" value="${key}" ${key===select.value?'checked':''}>${drawing(key==='bass')}<span>${value.name}</span></label>`).join('');
  picker.addEventListener('change',event=>{select.value=event.target.value;select.dispatchEvent(new Event('change'));});
  select.addEventListener('change',()=>{picker.querySelectorAll('input').forEach(input=>input.checked=input.value===select.value);});
})();
