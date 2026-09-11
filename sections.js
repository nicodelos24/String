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
  let sections=[],active=null,drag=null;
  const $=id=>document.getElementById(id);
  function serialize(){return sections.map(s=>({name:s.name,repeat:s.repeat,indices:s.items.map(item=>progression.indexOf(item)).filter(i=>i>=0)})).filter(s=>s.indices.length);}
  function render(){
    if(drag)return;
    if(active&&!sections.includes(active))active=null;
    $('section-all').setAttribute('aria-pressed',String(!active));
    $('section-view-label').textContent=active?active.name:'Todos los acordes';
    const list=$('section-list');list.replaceChildren();
    sections.forEach((s,index)=>{
      const row=document.createElement('li'),label=document.createElement('button');row.dataset.section=index;row.className='section-card';row.classList.toggle('selected',active===s);
      label.type='button';label.className='section-select';label.setAttribute('aria-pressed',String(active===s));
      const title=document.createElement('strong'),meta=document.createElement('span'),notes=document.createElement('small');title.textContent=s.name;meta.textContent=`${s.items.filter(item=>progression.includes(item)).length} acordes · ×${s.repeat}`;
      notes.textContent=s.items.filter(item=>progression.includes(item)).map(c=>(c.rootNoteName||noteName(c.root))+(chordTypes.find(t=>t.value===c.type)?.suffix||'')).join(' · ');
      label.append(title,meta,notes);label.onclick=()=>{active=s;render();const first=s.items.find(item=>progression.includes(item));if(first)selectProgressionChord(progression.indexOf(first));};row.append(label);
      const grip=document.createElement('button');grip.type='button';grip.className='section-grip';grip.textContent='⠿';grip.setAttribute('aria-label','Arrastrar '+s.name);row.append(grip);
      for(const [text,delta] of [['↑',-1],['↓',1],['×',0]]){
        const button=document.createElement('button');button.type='button';button.textContent=text;button.setAttribute('aria-label',`${delta===0?'Quitar':delta<0?'Subir':'Bajar'} ${s.name}`);
        button.disabled=delta<0?index===0:delta>0?index===sections.length-1:false;
        button.onclick=()=>{window.dispatchEvent(new Event('traste:load-song'));if(delta===0)sections.splice(index,1);else [sections[index],sections[index+delta]]=[sections[index+delta],sections[index]];render();renderProgression();};row.append(button);
      }list.append(row);
    });
  }
  window.StringSections={serialize,
    visible(){if(active&&!active.items.some(item=>progression.includes(item)))active=null;return (active?active.items.filter(item=>progression.includes(item)):progression).map(item=>({item,index:progression.indexOf(item)}));},
    follow(entry){const next=sections.includes(entry.sectionRef)?entry.sectionRef:null;if(active!==next){$('progression').scrollTop=0;$('progression').scrollLeft=0;}active=next;render();},
    clearView(){active=null;render();renderProgression();},
    adjacent(index,delta){const items=active?active.items.filter(item=>progression.includes(item)):progression;return progression.indexOf(items[items.indexOf(progression[index])+delta]);},
    move(from,to){if(!active)return false;const items=active.items.filter(item=>progression.includes(item)),a=items.indexOf(progression[from]),b=items.indexOf(progression[to]);if(a>=0&&b>=0){items.splice(b,0,items.splice(a,1)[0]);active.items=items;renderProgression();}return true;},
    include(source,copy){if(active){const at=active.items.indexOf(source);active.items.splice(at<0?active.items.length:at+1,0,copy);}},
    load(value){sections=validateSections(value,progression.length).map(s=>({...s,items:s.indices.map(i=>progression[i])}));active=null;render();renderProgression();},playback(){
    const data=validateSections(serialize(),progression.length);
    if(!data.length)return progression.map(source=>({source,saved:{...source}}));
    const live=sections.filter(s=>s.items.some(item=>progression.includes(item)));
    return data.flatMap((s,sectionIndex)=>Array.from({length:s.repeat},(_,i)=>s.indices.map(index=>({source:progression[index],saved:{...progression[index]},sectionRef:live[sectionIndex],section:`${s.name} · vuelta ${i+1}/${s.repeat}`}))).flat());
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
  $('section-all').onclick=()=>window.StringSections.clearView();
  const list=$('section-list');
  list.addEventListener('pointerdown',event=>{const grip=event.target.closest('.section-grip');if(!grip||event.button!==0)return;const row=grip.closest('[data-section]');drag={id:event.pointerId,from:Number(row.dataset.section),to:Number(row.dataset.section)};list.setPointerCapture(event.pointerId);row.classList.add('dragging');});
  list.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;event.preventDefault();const rows=[...list.children],target=rows.find(row=>{const r=row.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;});if(target){drag.to=Number(target.dataset.section);rows.forEach(row=>row.classList.toggle('drop-target',row===target));}});
  function finish(event,cancel=false){if(!drag||event.pointerId!==drag.id)return;const previous=drag;drag=null;if(list.hasPointerCapture(previous.id))list.releasePointerCapture(previous.id);if(!cancel&&previous.from!==previous.to){window.dispatchEvent(new Event('traste:load-song'));sections.splice(previous.to,0,sections.splice(previous.from,1)[0]);}render();}
  list.addEventListener('pointerup',event=>finish(event));list.addEventListener('pointercancel',event=>finish(event,true));window.addEventListener('blur',()=>{if(drag)finish({pointerId:drag.id},true);});
  new MutationObserver(()=>{sections=sections.filter(s=>s.items.some(item=>progression.includes(item)));render();}).observe($('progression'),{childList:true});
})();
