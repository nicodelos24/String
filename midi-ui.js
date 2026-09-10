(() => {
  const input=document.querySelector('#midi-file'),status=document.querySelector('#midi-status'),preview=document.querySelector('#midi-preview'),add=document.querySelector('#midi-add');
  const play=document.querySelector('#midi-play'),clock=document.querySelector('#midi-time');
  let pending=[],generation=0,imported=null,last=-1;
  const engine=new MidiPlayer({onState:running=>{play.textContent=running?'Detener MIDI':'Reproducir MIDI';play.setAttribute('aria-pressed',String(running));if(!running){last=-1;preview.querySelectorAll('li').forEach(row=>row.removeAttribute('aria-current'));}},onTime:time=>{
    clock.textContent=`${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')} / ${Math.floor(imported.duration/60)}:${String(Math.floor(imported.duration%60)).padStart(2,'0')}`;
    let index=-1;for(let i=0;i<imported.chords.length;i++){if(imported.chords[i].time>time)break;index=i;}
    if(index!==last){last=index;preview.querySelectorAll('li').forEach((row,i)=>row.setAttribute('aria-current',String(i===index)));
      if(index>=0)showProgressionChord(imported.chords[index],-1);}
  }});
  play.addEventListener('click',async()=>{
    if(engine.running || engine.starting){engine.stop();return;}
    if(!imported)return;window.dispatchEvent(new Event('traste:load-song'));play.textContent='Iniciando…';
    try {await engine.start(imported);}catch {engine.stop();status.textContent='No se pudo iniciar el audio MIDI. Intenta de nuevo.';}
  });
  window.addEventListener('traste:load-song',()=>engine.stop());
  window.addEventListener('traste:progression-start',()=>engine.stop());
  window.addEventListener('pagehide',()=>{engine.stop();engine.context?.close();});
  input.addEventListener('change',async()=>{
    const request=++generation,file=input.files[0];engine.stop();imported=null;play.disabled=true;clock.textContent='0:00';pending=[];preview.replaceChildren();add.disabled=true;if(!file)return;
    try {
      if(file.size>2*1024*1024)throw new Error('El archivo supera 2 MB.');
      const data=await file.arrayBuffer();if(request!==generation)return;
      const result=readMidiChords(data,chordTypes);imported=result;play.disabled=!result.notes.length;pending=result.chords.map(({root,type})=>({root,type}));
      for(const item of pending){const row=document.createElement('li');row.textContent=noteName(item.root)+chordTypes.find(type=>type.value===item.type).suffix;preview.append(row);}
      add.disabled=!pending.length;
      status.textContent=`${pending.length} acordes reconocidos; ${result.skipped} grupos omitidos. Revisa posibles ambigüedades: las inversiones pueden tener más de un nombre.`;
    } catch(error) {if(request===generation)status.textContent=error.message;}
  });
  add.addEventListener('click',()=>{
    if(!pending.length || draggingProgressionItem)return;
    if(progression.length+pending.length>256){status.textContent='La progresión resultante supera 256 acordes. Reduce las tarjetas antes de añadir.';return;}
    window.dispatchEvent(new Event('traste:load-song'));
    const first=progression.length;progression.push(...pending.map(item=>({...item})));selectProgressionChord(first);
    pending=[];add.disabled=true;status.textContent='Acordes añadidos. Puedes reorganizarlos y guardar la progresión con el video en Mis canciones.';
  });
})();
