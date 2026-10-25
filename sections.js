function validateSections(value,count) {
  if(value===undefined)return [];
  if(!Array.isArray(value)||value.length>64)throw new Error('Secciones no válidas.');
  let total=0;
  return value.map(s=>{
    if(!s||typeof s.name!=='string'||!s.name.trim()||s.name.length>40||!Number.isInteger(s.repeat)||s.repeat<1||s.repeat>8||!Array.isArray(s.indices)||!s.indices.length||s.indices.some(i=>!Number.isInteger(i)||i<0||i>=count))throw new Error('Sección no válida.');
    total+=s.indices.length*s.repeat;if(total>32768)throw new Error('Estructura demasiado larga.');
    if(new Set(s.indices).size!==s.indices.length)throw new Error('Una sección no puede incluir dos veces la misma tarjeta. Usa las repeticiones.');
    return {name:s.name.trim(),repeat:s.repeat,indices:[...s.indices]};
  });
}
// La lista de reproducción es una sola secuencia de entradas: cada una sabe
// qué tarjeta es (source), con qué se ve (saved) y, si viene de una sección
// con repeticiones, en qué vuelta va — la clave por la que una variante por
// vuelta cambia lo que se muestra. Sin secciones, cada tarjeta aparece una
// vez y la vuelta la cuenta el loop del Acompañamiento.
// La copia de ejecución congela el estado con el que arranca la reproducción:
// se saca una sola vez al pulsar «Reproducir». Las variantes por vuelta se
// copian también por dentro, porque lo que suena debe conservar su fantasma
// aunque el autor edite el acorde en vivo; la edición se ve al detener y
// volver a reproducir, no a mitad de la canción (devolución QA-R05).
function playbackCopy(source){
  const saved={...source};
  if(saved.variants) saved.variants=Object.fromEntries(Object.entries(saved.variants).map(([key,variant])=>[key,{...variant}]));
  return saved;
}
function playbackEntries(data,progression,live=[]){
  if(!data.length)return progression.map(source=>({source,saved:playbackCopy(source)}));
  return data.flatMap((s,sectionIndex)=>Array.from({length:s.repeat},(_,i)=>s.indices.map(index=>({source:progression[index],saved:playbackCopy(progression[index]),sectionRef:live[sectionIndex],section:`${s.name} · vuelta ${i+1}/${s.repeat}`,vuelta:i+1}))).flat());
}
if(typeof module!=='undefined')module.exports={validateSections,playbackEntries,playbackCopy};
if(typeof document!=='undefined')(()=>{
  // T-07: `editing` es la sección que tiene abierto su formulario en la fila.
  // Es una sola a la vez: abrir otra cierra la anterior y cancelar no toca el
  // estado. El nombre y la ×N son del modelo (`sections`), no del formulario.
  let sections=[],active=null,drag=null,editing=null;
  const $=id=>document.getElementById(id);
  const workspace=document.querySelector('.progression-workspace');
  const panel=document.querySelector('.sections-panel');
  function setWorkspace(view){
    workspace.classList.toggle('sections-expanded',view==='sections');
    workspace.classList.toggle('chords-expanded',view==='chords');
    $('sections-maximize').setAttribute('aria-pressed',String(view==='sections'));
    $('sections-maximize').textContent=view==='sections'?'⤡ Vista compacta':'⤢ Ampliar secciones';
    panel.open=view!=='chords';
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)workspace.animate([{opacity:.4},{opacity:1}],{duration:220,easing:'ease-out'});
  }
  $('sections-maximize').onclick=()=>setWorkspace(workspace.classList.contains('sections-expanded')?'compact':'sections');
  panel.addEventListener('toggle',()=>{if(!panel.open && workspace.classList.contains('sections-expanded'))setWorkspace('chords');});
  function serializeSection(s){return {name:s.name,repeat:s.repeat,indices:s.items.map(item=>progression.indexOf(item)).filter(i=>i>=0)};}
  function serialize(){return sections.map(serializeSection).filter(s=>s.indices.length);}
  // Un solo lugar decide si la edición es válida. Los mensajes son los que el
  // autor lee en `#section-status`; `validateSections` vuelve a pasar al final
  // como guarda del mismo contrato que el guardado de la canción.
  function editProblem(current,name,repeat){
    if(!name)return 'La sección necesita un nombre.';
    if(name.length>40)return 'El nombre de la sección no puede pasar de 40 caracteres.';
    if(!Number.isInteger(repeat)||repeat<1||repeat>8)return 'Las repeticiones van de 1 a 8.';
    if(name!==current.name&&sections.some(other=>other!==current&&other.name===name))return `Ya hay una sección llamada «${name}».`;
    return '';
  }
  function render(){
    if(drag)return;
    if(active&&!sections.includes(active))active=null;
    if(editing&&!sections.includes(editing))editing=null;
    $('section-all').setAttribute('aria-pressed',String(!active));
    $('section-view-label').textContent=active?`${active.name} · ×${active.repeat}`:'Todos los acordes';
    const list=$('section-list');list.replaceChildren();
    sections.forEach((s,index)=>{
      const row=document.createElement('li'),label=document.createElement('button');row.dataset.section=index;row.className='section-card';row.classList.toggle('selected',active===s);
      label.type='button';label.className='section-select';label.setAttribute('aria-pressed',String(active===s));
      const title=document.createElement('strong'),meta=document.createElement('span'),notes=document.createElement('small');title.textContent=s.name;meta.textContent=`${s.items.filter(item=>progression.includes(item)).length} acordes · ×${s.repeat}`;
      notes.textContent=s.items.filter(item=>progression.includes(item)).map(c=>(c.rootNoteName||noteName(c.root))+(chordTypes.find(t=>t.value===c.type)?.suffix||'')).join(' · ');
      const chordList=document.createElement('span');chordList.className='section-chord-preview';
      s.items.filter(item=>progression.includes(item)).forEach(c=>{
        const item=document.createElement('span'),name=document.createElement('b'),mode=document.createElement('small');
        name.textContent=(c.rootNoteName||noteName(c.root))+(chordTypes.find(t=>t.value===c.type)?.suffix||'');
        mode.textContent=modes[c.mode||defaultChordMode(c)]?.name||'';
        item.append(name,mode);chordList.append(item);
      });

      // T-07: la fila en edición reemplaza sus controles por el formulario. No
      // se duplican acciones (subir/bajar/borrar/duplicar quedan fuera hasta
      // guardar o cancelar) y el rango de tarjetas no se toca: esta ficha es
      // nombre y repeticiones.
      if(editing===s){
        row.classList.add('editing');
        const form=document.createElement('div');form.className='section-edit';
        const nameLabel=document.createElement('label');nameLabel.textContent='Nombre';
        const nameInput=document.createElement('input');nameInput.type='text';nameInput.maxLength=40;nameInput.value=s.name;
        nameInput.setAttribute('id','section-edit-name');nameInput.setAttribute('aria-describedby','section-status');
        nameLabel.append(nameInput);
        const repeatLabel=document.createElement('label');repeatLabel.textContent='Repeticiones';
        const repeatInput=document.createElement('input');repeatInput.type='number';repeatInput.min='1';repeatInput.max='8';repeatInput.value=String(s.repeat);
        repeatInput.setAttribute('id','section-edit-repeat');repeatInput.setAttribute('aria-describedby','section-status');
        repeatLabel.append(repeatInput);
        const actions=document.createElement('div');actions.className='section-edit-actions';
        const save=document.createElement('button');save.type='button';save.textContent='Guardar';save.setAttribute('id','section-edit-save');save.setAttribute('aria-label',`Guardar cambios de ${s.name}`);
        const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancelar';cancel.setAttribute('id','section-edit-cancel');cancel.setAttribute('aria-label',`Cancelar la edición de ${s.name}`);
        const close=()=>{editing=null;render();};
        save.onclick=()=>{
          const name=nameInput.value.trim(),repeat=Number(repeatInput.value);
          nameInput.setAttribute('aria-invalid','false');repeatInput.setAttribute('aria-invalid','false');
          const problem=editProblem(s,name,repeat);
          if(problem){nameInput.setAttribute('aria-invalid','true');repeatInput.setAttribute('aria-invalid','true');$('section-status').textContent=problem;return;}
          try{
            validateSections(sections.map(other=>other===s?{name,repeat,indices:other.items.map(item=>progression.indexOf(item)).filter(i=>i>=0)}:serializeSection(other)),progression.length);
          }catch(error){$('section-status').textContent=error.message;return;}
          window.dispatchEvent(new Event('traste:load-song'));
          s.name=name;s.repeat=repeat;editing=null;
          render();renderProgression();
          $('section-status').textContent=`Sección «${name}»: ahora suena ${repeat===1?'1 vez':`${repeat} veces`}.`;
        };
        cancel.onclick=()=>{close();$('section-status').textContent='Edición cancelada.';};
        for(const input of [nameInput,repeatInput])input.addEventListener('keydown',event=>{
          if(event.key==='Enter'){event.preventDefault?.();save.onclick();}
          else if(event.key==='Escape'){event.preventDefault?.();cancel.onclick();}
        });
        actions.append(save,cancel);form.append(nameLabel,repeatLabel,actions);row.append(form);
        list.append(row);nameInput.focus?.({preventScroll:true});
        return;
      }
      label.append(title,meta,notes,chordList);label.onclick=()=>{active=s;render();const first=s.items.find(item=>progression.includes(item));if(first)selectProgressionChord(progression.indexOf(first));};row.append(label);
      const grip=document.createElement('button');grip.type='button';grip.className='section-grip';grip.textContent='⠿';grip.setAttribute('aria-label','Arrastrar '+s.name);row.append(grip);
      for(const [text,delta] of [['↑',-1],['↓',1],['×',0]]){
        const button=document.createElement('button');button.type='button';button.textContent=text;button.setAttribute('aria-label',`${delta===0?'Quitar':delta<0?'Subir':'Bajar'} ${s.name}`);
        button.disabled=delta<0?index===0:delta>0?index===sections.length-1:false;
        button.onclick=()=>{window.dispatchEvent(new Event('traste:load-song'));if(delta===0)sections.splice(index,1);else [sections[index],sections[index+delta]]=[sections[index+delta],sections[index]];render();renderProgression();};row.append(button);
      }
      // T-41 (QA-MOD-03): los dos controles del compositor de bloques. Cada uno
      // es un botón propio con acción unaria — nada de doble clic compartido —
      // y el nombre de la sección viaja en el aria-label para el teclado.
      const repeatButton=document.createElement('button');repeatButton.type='button';repeatButton.className='section-composer';repeatButton.textContent='Repetir';repeatButton.setAttribute('aria-label',`Repetir ${s.name}`);
      repeatButton.disabled=s.repeat>=8;
      repeatButton.onclick=()=>{if(s.repeat>=8)return;window.dispatchEvent(new Event('traste:load-song'));try{
        s.repeat+=1;render();renderProgression();$('section-status').textContent=`${s.name} ahora suena ${s.repeat} veces.`;
      }catch(error){$('section-status').textContent=error.message;render();}};row.append(repeatButton);
      const duplicateButton=document.createElement('button');duplicateButton.type='button';duplicateButton.className='section-composer';duplicateButton.textContent='Duplicar';duplicateButton.setAttribute('aria-label',`Duplicar bloque ${s.name}`);
      duplicateButton.onclick=()=>{
        window.dispatchEvent(new Event('traste:load-song'));
        try{
          // La copia del bloque toma la única API que ya existe para clonar
          // tarjetas (duplicateProgressionChord de app.js): cada acorde de la
          // copia es una tarjeta nueva de la progresión, así que editar el
          // bloque duplicado nunca toca al original. El `include` interno de
          // esa API inserta junto a la sección activa: se neutraliza mientras
          // duplico (la copia es un bloque nuevo, no un añadido de la vista).
          const previous=active;active=null;
          const clones=[];try{
            for(const item of s.items.filter(entry=>progression.includes(entry))){
              const at=progression.indexOf(item);
              if(typeof duplicateProgressionChord!=='function')throw new Error('No hay editor de tarjetas disponible.');
              duplicateProgressionChord(at,true);
              if(progression[at+1]!==item)clones.push(progression[at+1]);
            }
          }finally{active=previous;}
          if(!clones.length)throw new Error('No se encontraron acordes para duplicar.');
          // Los clones se recolocan al final del editor: las filas y las
          // otras secciones que referencian tarjetas viejas no se mueven ni
          // un índice; el original queda byte a byte donde estaba.
          for(const clone of clones){
            const at=progression.indexOf(clone);
            if(at>=0){progression.splice(at,1);progression.push(clone);}
          }
          // Devolución QA de T-41: el autoguardado se escribe UNA vez, aquí al
          // final del flujo y con las copias ya recolocadas (app.js lo difiere
          // con `deferSave`). Los guardados por tarjeta adentro del bucle
          // dejaban el slot «Mi progresión» con el orden intermedio, y al
          // recargar volvían las tarjetas de a mitad del camino.
          if(typeof saveCustomProgression==='function')saveCustomProgression();
          const name=uniqueSectionName(s.name);
          sections.splice(index+1,0,{name,repeat:1,items:clones});
          $('section-status').textContent=` Bloque duplicado: ${name} es una copia independiente.`;
          render();renderProgression();
        }catch(error){$('section-status').textContent=error.message;render();}
      };row.append(duplicateButton);
      // T-07: la edición directa del nombre y la ×N. Control propio (un clic,
      // sin doble clic compartido) y nombre de la sección en el aria-label.
      const editButton=document.createElement('button');editButton.type='button';editButton.className='section-edit-open';editButton.textContent='Editar';editButton.setAttribute('aria-label',`Editar ${s.name}`);
      editButton.onclick=()=>{editing=s;$('section-status').textContent='';render();};
      row.append(editButton);
      list.append(row);
    });
  }
  function uniqueSectionName(base){
    const taken=new Set(sections.map(entry=>entry.name));
    for(let n=1;;n++){
      const candidate=n===1?`${base} (copia)`:`${base} (copia ${n})`;
      if(!taken.has(candidate))return candidate;
    }
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
    if(!data.length)return playbackEntries([],progression);
    const live=sections.filter(s=>s.items.some(item=>progression.includes(item)));
    return playbackEntries(data,progression,live);
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
  $('section-all').onclick=()=>{window.StringSections.clearView();setWorkspace('chords');panel.querySelector('summary').focus();};
  const list=$('section-list');
  list.addEventListener('pointerdown',event=>{const grip=event.target.closest('.section-grip');if(!grip||event.button!==0)return;const row=grip.closest('[data-section]');drag={id:event.pointerId,from:Number(row.dataset.section),to:Number(row.dataset.section)};list.setPointerCapture(event.pointerId);row.classList.add('dragging');});
  list.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;event.preventDefault();const rows=[...list.children],target=rows.find(row=>{const r=row.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;});if(target){drag.to=Number(target.dataset.section);rows.forEach(row=>row.classList.toggle('drop-target',row===target));}});
  function finish(event,cancel=false){if(!drag||event.pointerId!==drag.id)return;const previous=drag;drag=null;if(list.hasPointerCapture(previous.id))list.releasePointerCapture(previous.id);if(!cancel&&previous.from!==previous.to){window.dispatchEvent(new Event('traste:load-song'));sections.splice(previous.to,0,sections.splice(previous.from,1)[0]);}render();}
  list.addEventListener('pointerup',event=>finish(event));list.addEventListener('pointercancel',event=>finish(event,true));window.addEventListener('blur',()=>{if(drag)finish({pointerId:drag.id},true);});
  new MutationObserver(()=>{sections=sections.filter(s=>s.items.some(item=>progression.includes(item)));render();}).observe($('progression'),{childList:true});
})();
