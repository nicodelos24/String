function validateSections(value,count) {
  if(value===undefined)return [];
  if(!Array.isArray(value)||value.length>64)throw new Error('Secciones no válidas.');
  let total=0;
  return value.map(s=>{
    if(!s||typeof s.name!=='string'||!s.name.trim()||s.name.length>40||!Number.isInteger(s.repeat)||s.repeat<1||s.repeat>8||!Array.isArray(s.indices)||!s.indices.length||s.indices.some(i=>!Number.isInteger(i)||i<0||i>=count))throw new Error('Sección no válida.');
    total+=s.indices.length*s.repeat;if(total>32768)throw new Error('Estructura demasiado larga.');
    return {name:s.name.trim(),repeat:s.repeat,indices:[...s.indices]};
  });
}
if(typeof module!=='undefined')module.exports={validateSections};
if(typeof document!=='undefined')(()=>{
  let sections=[];
  const $=id=>document.getElementById(id);
  function serialize(){return sections.map(s=>({name:s.name,repeat:s.repeat,indices:s.items.map(item=>progression.indexOf(item)).filter(i=>i>=0)})).filter(s=>s.indices.length);}
  function render(){
    const list=$('section-list');list.replaceChildren();
    sections.forEach((s,index)=>{
      const row=document.createElement('li'),label=document.createElement('span');label.textContent=`${s.name} · ${s.items.filter(item=>progression.includes(item)).length} acordes ×${s.repeat}`;row.append(label);
      for(const [text,delta] of [['↑',-1],['↓',1],['×',0]]){
        const button=document.createElement('button');button.type='button';button.textContent=text;button.setAttribute('aria-label',`${delta===0?'Quitar':delta<0?'Subir':'Bajar'} ${s.name}`);
        button.disabled=delta<0?index===0:delta>0?index===sections.length-1:false;
        button.onclick=()=>{window.dispatchEvent(new Event('traste:load-song'));if(delta===0)sections.splice(index,1);else [sections[index],sections[index+delta]]=[sections[index+delta],sections[index]];render();};row.append(button);
      }list.append(row);
    });
  }
  window.StringSections={serialize,load(value){sections=validateSections(value,progression.length).map(s=>({...s,items:s.indices.map(i=>progression[i])}));render();},playback(){
    const data=validateSections(serialize(),progression.length);
    if(!data.length)return progression.map(source=>({source,saved:{...source}}));
    return data.flatMap(s=>Array.from({length:s.repeat},(_,i)=>s.indices.map(index=>({source:progression[index],saved:{...progression[index]},section:`${s.name} · vuelta ${i+1}/${s.repeat}`}))).flat());
  }};
  $('section-add').onclick=()=>{
    const from=Number($('section-from').value),to=Number($('section-to').value),repeat=Number($('section-repeat').value),name=$('section-name').value.trim();
    try {
      if(draggingProgressionItem)return;
      if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>progression.length)throw new Error('Selecciona un rango de tarjetas existente.');
      validateSections([...serialize(),{name,repeat,indices:Array.from({length:to-from+1},(_,i)=>from-1+i)}],progression.length);
      window.dispatchEvent(new Event('traste:load-song'));sections.push({name,repeat,items:progression.slice(from-1,to)});render();$('section-status').textContent='Sección añadida. El acompañamiento seguirá esta lista.';
    }catch(error){$('section-status').textContent=error.message;}
  };
  new MutationObserver(()=>{sections=sections.filter(s=>s.items.some(item=>progression.includes(item)));render();}).observe($('progression'),{childList:true});
})();
