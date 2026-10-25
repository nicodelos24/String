// Las marcas conservan referencias a tarjetas mientras se edita; el respaldo usa índices.
function validateVideoMarks(value, count) {
  if(value===undefined)return [];
  if(!Array.isArray(value)||value.length>4096)throw new Error('Marcas de video no válidas.');
  let previous=-1;
  return value.map(mark=>{
    if(!mark || !Number.isFinite(mark.time)||mark.time<0||mark.time<=previous||!Number.isInteger(mark.index)||mark.index<0||mark.index>=count)throw new Error('Marcas de video no válidas.');
    previous=mark.time;return {time:mark.time,index:mark.index};
  });
}
function createTempoMarks(indices,start,bpm,beats){
  if(!Number.isFinite(start)||start<0||!Number.isFinite(bpm)||bpm<30||bpm>240||!Number.isInteger(beats)||beats<1||beats>16||!indices.length||indices.length>4096)throw new Error('Usa BPM entre 30 y 240, de 1 a 16 pulsos y hasta 4096 cambios.');
  return indices.map((index,i)=>({index,time:start+i*60/bpm*beats}));
}
// T-09 · Una sola autoridad para el salto: la marca de una tarjeta es la
// PRIMERA que la nombra. Una progresión que se repite puede tener el mismo
// acorde marcado a dos tiempos; «ir a esta tarjeta» significa el primero, no
// el último que pasó (que es lo que usa el seguimiento para saber qué suena).
function markTimeFor(marks,source){
  const mark=Array.isArray(marks)?marks.find(entry=>entry&&entry.source===source):null;
  return mark?mark.time:null;
}
// El mismo `m:ss` de la lista de marcas y de la etiqueta del video.
function formatVideoTime(seconds){
  return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
}
if(typeof module!=='undefined')module.exports={validateVideoMarks,createTempoMarks,markTimeFor,formatVideoTime};
if(typeof document!=='undefined')(()=>{
  const $=id=>document.getElementById(id);
  let marks=[],video='',time=null,last=null;
  let taps=[];
  $('video-tap').onclick=()=>{
    const now=performance.now();if(taps.length && now-taps.at(-1)>2500)taps=[];
    taps.push(now);taps=taps.slice(-8);
    if(taps.length>1){const bpm=Math.round(60000*(taps.length-1)/(now-taps[0]));if(bpm>=30&&bpm<=240)$('video-bpm').value=bpm;}
  };
  $('video-tempo-start').onclick=()=>{
    if(time===null){$('video-sync-status').textContent='Carga un video primero.';return;}
    try{
      const entries=window.StringSections?window.StringSections.playback():progression.map(source=>({source}));
      const planned=createTempoMarks(entries.map(e=>progression.indexOf(e.source)),time,Number($('video-bpm').value),Number($('video-beats').value));
      validateVideoMarks(planned,progression.length);
      window.dispatchEvent(new Event('traste:load-song'));
      marks=planned.map(m=>({time:m.time,source:progression[m.index]}));changed();
      $('video-follow').checked=true;last=null;
      $('video-sync-status').textContent='Siguiendo el tempo desde aquí. Guarda o actualiza tu progresión para conservar estos tiempos.';
    }catch(error){$('video-sync-status').textContent=error.message;}
  };
  function stop(){
    $('video-follow').checked=false;
    if(last && playingProgressionItem===last){playingProgressionItem=null;renderProgression();}
    last=null;
  }
  function render(){
    const list=$('video-marks');list.replaceChildren();
    marks=marks.filter(mark=>progression.includes(mark.source));
    marks.forEach(mark=>{
      const row=document.createElement('li'),remove=document.createElement('button');
      const index=progression.indexOf(mark.source);
      row.textContent=`${formatVideoTime(mark.time)} · ${index+1}. ${mark.source.rootNoteName||noteName(mark.source.root)}${chordTypes.find(t=>t.value===mark.source.type)?.suffix||''} `;
      remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Eliminar marca');
      remove.onclick=()=>{stop();marks=marks.filter(m=>m!==mark);changed();};row.append(remove);list.append(row);
    });
  }
  // T-09 · Aviso único: cambiar las marcas cambia también lo que ofrecen las
  // tarjetas y las secciones (su minuto). Las dos vistas se repintan desde acá,
  // sin recargar la canción ni pasar por el guardado.
  function changed(){
    render();
    if(typeof renderProgression==='function')renderProgression();
    window.StringSections?.refresh?.();
  }
  window.StringVideoSync={
    save(url){return youtubeVideoId(url)===video?validateVideoMarks(marks.filter(m=>progression.includes(m.source)).map(m=>({time:m.time,index:progression.indexOf(m.source)})),progression.length):[];},
    load(value,url){stop();video=youtubeVideoId(url)||'';time=null;marks=validateVideoMarks(value,progression.length).map(m=>({time:m.time,source:progression[m.index]}));changed();},
    // El rótulo del salto: `null` cuando la tarjeta no tiene marca, para que
    // la interfaz no ofrezca un destino que no existe.
    labelFor(index){const source=progression[index];const at=source?markTimeFor(marks,source):null;return at===null?null:formatVideoTime(at);},
    // Pedido de salto. El reproductor (youtube-player.js) es quien puede mover
    // el video; acá solo se elige el punto y se avisa. No cambia play/pausa.
    jump(index){
      const source=progression[index],at=source?markTimeFor(marks,source):null;
      if(at===null){$('video-sync-status').textContent='Esa tarjeta no tiene una marca de tiempo: márcala con el video cargado.';return false;}
      window.dispatchEvent(new CustomEvent('string:video-seek',{detail:{time:at,index}}));
      return true;
    }
  };
  window.addEventListener('string:video-reset',event=>{
    stop();time=null;$('video-mark').disabled=true;
    if(video!==event.detail){marks=[];video=event.detail;changed();}
  });
  window.addEventListener('string:video-time',event=>{
    time=event.detail.time;$('video-mark').disabled=false;
    if(!$('video-follow').checked)return;
    const mark=marks.filter(m=>m.time<=time&&progression.includes(m.source)).at(-1);
    if(!mark){if(last){playingProgressionItem=null;last=null;renderProgression();}return;}
    if(last===mark.source)return;
    last=mark.source;window.StringSections?.clearView();
    playingProgressionItem=last;showProgressionChord(last,progression.indexOf(last));
    const card=$('progression').querySelector('.playing');
    if(card){const list=$('progression'),r=card.getBoundingClientRect(),b=list.getBoundingClientRect();if(r.top<b.top||r.bottom>b.bottom)list.scrollTop+=r.top-b.top;if(r.left<b.left||r.right>b.right)list.scrollLeft+=r.left-b.left;}
  });
  $('video-mark').onclick=()=>{
    if(time===null||!progression[activeProgression]){$('video-sync-status').textContent='Selecciona una tarjeta y carga un video.';return;}
    if(marks.length>=4096){$('video-sync-status').textContent='Se alcanzó el límite de marcas.';return;}
    stop();const at=Math.round(time*100)/100;
    marks=marks.filter(m=>m.time!==at);marks.push({time:at,source:progression[activeProgression]});marks.sort((a,b)=>a.time-b.time);changed();
    $('video-sync-status').textContent='Marca añadida. Guarda o actualiza la progresión para conservarla.';
  };
  $('video-follow').onchange=event=>{
    if(!event.target.checked){stop();return;}
    if(!marks.length||time===null){event.target.checked=false;$('video-sync-status').textContent='Carga el video y añade una marca primero.';return;}
    window.dispatchEvent(new Event('traste:load-song'));event.target.checked=true;last=null;
  };
  window.addEventListener('traste:load-song',stop);
  window.addEventListener('traste:progression-start',stop);
})();
