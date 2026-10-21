(() => {
  const input=document.querySelector('#midi-file'),status=document.querySelector('#midi-status'),preview=document.querySelector('#midi-preview'),add=document.querySelector('#midi-add');
  const play=document.querySelector('#midi-play'),clock=document.querySelector('#midi-time');
  let pending=[],generation=0,imported=null,last=-1,linked=[];

  // Calcula beats a partir de segundos usando el mapa de tempo del MIDI.
  // tempoMap: [{time, tempo}] donde tempo está en µs por negra (quarter note).
  function beatsFromSeconds(seconds, tempoMap) {
    if (!tempoMap?.length) return 4;
    let beats = 0;
    for (let i = 0; i < tempoMap.length; i++) {
      const segmentStart = tempoMap[i].time;
      const segmentEnd = (i + 1 < tempoMap.length) ? tempoMap[i + 1].time : Infinity;
      const segmentTempo = tempoMap[i].tempo; // µs per quarter note
      const beatsPerSecond = 1_000_000 / segmentTempo;
      const overlapStart = Math.max(seconds[0], segmentStart);
      const overlapEnd = Math.min(seconds[1], segmentEnd);
      if (overlapEnd > overlapStart) {
        beats += (overlapEnd - overlapStart) * beatsPerSecond;
      }
      if (segmentEnd >= seconds[1]) break;
    }
    // Redondear al beat válido más cercano (1-16)
    const valid = beatOptions;
    let best = 4, bestDiff = Infinity;
    for (const v of valid) {
      const diff = Math.abs(v - beats);
      if (diff < bestDiff) { bestDiff = diff; best = v; }
    }
    return best;
  }

  function addCards() {
    if(!pending.length)return true;
    const result=appendMidiChords(pending);
    if(!result){status.textContent='La progresión resultante supera 4096 acordes.';return false;}
    linked=progression.slice(-pending.length);
    pending=[];add.disabled=true;return true;
  }
  const engine=new MidiPlayer({onState:running=>{play.innerHTML=running?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12v12H6z"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';play.setAttribute('aria-label',running?'Detener MIDI':'Reproducir MIDI');play.title=running?'Detener MIDI':'Reproducir MIDI';play.setAttribute('aria-pressed',String(running));if(!running){if(linked.includes(playingProgressionItem)){playingProgressionItem=null;renderProgression();}last=-1;preview.querySelectorAll('li').forEach(row=>row.removeAttribute('aria-current'));}},onTime:time=>{
    clock.textContent=`${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')} / ${Math.floor(imported.duration/60)}:${String(Math.floor(imported.duration%60)).padStart(2,'0')}`;
    let index=-1;for(let i=0;i<imported.chords.length;i++){if(imported.chords[i].time>time)break;index=i;}
    if(index!==last){last=index;preview.querySelectorAll('li').forEach((row,i)=>row.setAttribute('aria-current',String(i===index)));
      if(index>=0){
        const source=linked[index],position=progression.indexOf(source);
        playingProgressionItem=position>=0?source:null;
        showProgressionChord(imported.chords[index],position);
        const list=document.querySelector('#progression'),card=list.querySelector('.playing');
        if(card && document.querySelector('#follow-midi').checked){
          const bounds=list.getBoundingClientRect(),rect=card.getBoundingClientRect();
          if(rect.top<bounds.top || rect.bottom>bounds.bottom)list.scrollTop+=rect.top-bounds.top-8;
          if(list.classList.contains('single-row') && (rect.left<bounds.left || rect.right>bounds.right))list.scrollLeft+=rect.left-bounds.left-8;
        }
      }}
  }});
  play.addEventListener('click',async()=>{
    if(engine.running || engine.starting){engine.stop();return;}
    if(!imported || !addCards())return;window.dispatchEvent(new Event('traste:load-song'));play.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12v12H6z"/></svg>';play.setAttribute('aria-label','Iniciando…');play.title='Iniciando…';
    window.StringSections?.clearView();
    try {await engine.start(imported);}catch {engine.stop();status.textContent='No se pudo iniciar el audio MIDI. Intenta de nuevo.';}
  });
  window.addEventListener('traste:load-song',()=>engine.stop());
  window.addEventListener('traste:progression-start',()=>engine.stop());
  window.addEventListener('pagehide',()=>{engine.stop();engine.context?.close();});
  async function loadFile(file) {
    const request=++generation;engine.stop();linked=[];imported=null;play.disabled=true;clock.textContent='0:00';pending=[];preview.replaceChildren();add.disabled=true;
    if(!file)return;
    status.textContent='Cargando MIDI…';
    try {
      if(file.size>2*1024*1024)throw new Error('El archivo supera 2 MB.');
      const data=await file.arrayBuffer();if(request!==generation)return;
      const result=readMidiChords(data,chordTypes);imported=result;play.disabled=!result.notes.length;
      // Calcular beats para cada acorde basándose en la duración hasta el siguiente acorde (o fin de pista).
      const chords = result.chords;
      const tempoMap = result.tempoMap || [];
      const totalDuration = result.duration || 0;
      pending = chords.map((chord, i) => {
        const start = chord.time;
        const end = (i + 1 < chords.length) ? chords[i + 1].time : totalDuration;
        const beats = beatsFromSeconds([start, end], tempoMap);
        return {root: chord.root, type: chord.type, beats};
      });
      for(const item of pending){const row=document.createElement('li');row.textContent=noteName(item.root)+chordTypes.find(type=>type.value===item.type).suffix;preview.append(row);}
      add.disabled=!pending.length;
      status.textContent=`${pending.length} acordes reconocidos; ${result.skipped} grupos omitidos. Revisa posibles ambigüedades: las inversiones pueden tener más de un nombre.`;
    } catch(error) {if(request===generation)status.textContent=error.message;}
  }
  input.addEventListener('change',()=>loadFile(input.files[0]));
  add.addEventListener('click',()=>{
    if(!pending.length || draggingProgressionItem)return;
    window.dispatchEvent(new Event('traste:load-song'));
    const result=addCards();
    if(!result){status.textContent='La progresión resultante supera 4096 acordes. Reduce las tarjetas antes de añadir.';return;}
    pending=[];add.disabled=true;status.textContent='Acordes añadidos y vinculados a la reproducción MIDI. Puedes guardarlos en Mis progresiones.';
  });
})();
