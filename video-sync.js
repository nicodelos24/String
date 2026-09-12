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
if(typeof module!=='undefined')module.exports={validateVideoMarks};
if(typeof document!=='undefined')(()=>{
  const $=id=>document.getElementById(id);
  let marks=[],video='',time=null,last=null;
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
      row.textContent=`${Math.floor(mark.time/60)}:${String(Math.floor(mark.time%60)).padStart(2,'0')} · ${index+1}. ${mark.source.rootNoteName||noteName(mark.source.root)}${chordTypes.find(t=>t.value===mark.source.type)?.suffix||''} `;
      remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Eliminar marca');
      remove.onclick=()=>{stop();marks=marks.filter(m=>m!==mark);render();};row.append(remove);list.append(row);
    });
  }
  window.StringVideoSync={
    save(url){return youtubeVideoId(url)===video?validateVideoMarks(marks.filter(m=>progression.includes(m.source)).map(m=>({time:m.time,index:progression.indexOf(m.source)})),progression.length):[];},
    load(value,url){stop();video=youtubeVideoId(url)||'';time=null;marks=validateVideoMarks(value,progression.length).map(m=>({time:m.time,source:progression[m.index]}));render();}
  };
  window.addEventListener('string:video-reset',event=>{
    stop();time=null;$('video-mark').disabled=true;
    if(video!==event.detail){marks=[];video=event.detail;render();}
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
    marks=marks.filter(m=>m.time!==at);marks.push({time:at,source:progression[activeProgression]});marks.sort((a,b)=>a.time-b.time);render();
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
