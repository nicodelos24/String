(() => {
  const $=id=>document.getElementById(id);
  const title=$('song-title'), list=$('song-list'), status=$('song-status');
  const settingIds=['player-bpm','player-style','player-percussion','player-loop','player-volume','player-drum-volume'];
  let openedId=null;
  function validate(song) {
    if(!song || typeof song.id!=='string' || song.id.length>100 || !song.id || typeof song.title!=='string' || !song.title.trim() || song.title.length>100 ||
      typeof song.video!=='string' || (song.video && !youtubeVideoId(song.video)) ||
      !Array.isArray(song.chords) || !song.chords.length || song.chords.length>4096) throw new Error('Progresión no válida.');
    const chords=song.chords.map(chord=>{
      if(!chord || !Number.isInteger(chord.root) || chord.root<0 || chord.root>11 || !chordTypes.some(type=>type.value===chord.type) ||
        (chord.mode!==undefined && !Object.hasOwn(modes,chord.mode)) ||
        (chord.ghostMode && !Object.hasOwn(modes,chord.ghostMode)) ||
        (chord.rootNoteName!==undefined && !/^[A-G](?:#|b|♯|♭)?$/.test(chord.rootNoteName))) throw new Error('Acorde no válido.');
      return {root:chord.root,type:chord.type,rootNoteName:chord.rootNoteName,mode:chord.mode,ghostMode:chord.ghostMode || ''};
    });
    const settings={};
    for(const id of settingIds) {
      const control=$(id), value=song.settings?.[id];
      if(control.type==='checkbox') {if(typeof value!=='boolean') throw new Error('Ajuste no válido.');}
      else if(control.tagName==='SELECT') {if(![...control.options].some(option=>option.value===value)) throw new Error('Ritmo no válido.');}
      else if(typeof value!=='number' || !Number.isInteger(value) || value<Number(control.min) || value>Number(control.max)) throw new Error('Valor fuera de rango.');
      settings[id]=value;
    }
    return {id:song.id,title:song.title.trim(),video:song.video,chords,settings};
  }
  // El acceso puede fallar si el usuario bloquea el almacenamiento.
  const library=new SongLibrary({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},validate);
  function run(action) {try {action();} catch(error) {status.textContent=`No se completó la operación: ${error.message} Los datos existentes no se han reemplazado.`;}}
  function refresh(selected='') {
    const songs=library.read();
    list.replaceChildren(new Option('Selecciona una progresión',''));
    for(const song of songs) list.add(new Option(song.title,song.id));
    list.value=selected;
    $('song-update').disabled=!openedId || !songs.some(song=>song.id===openedId);
  }
  function snapshot(id) {
    const settings={};
    for(const key of settingIds) {const control=$(key); settings[key]=control.type==='checkbox'?control.checked:control.tagName==='SELECT'?control.value:Number(control.value);}
    return validate({id,title:title.value,video:$('youtube-url').value.trim(),chords:progression,settings});
  }
  function save(update) {run(()=>{
    const song=snapshot(update?openedId:crypto.randomUUID());
    library.save(song); openedId=song.id; refresh(song.id);
    status.textContent=`Guardado: ${song.title}.`;
  });}
  $('song-save').addEventListener('click',()=>save(false));
  $('song-update').addEventListener('click',()=>save(true));
  $('song-open').addEventListener('click',()=>run(()=>{
    const song=library.read().find(item=>item.id===list.value);
    if(!song) {status.textContent='Selecciona una progresión guardada.';return;}
    if(draggingProgressionItem) return;
    window.dispatchEvent(new Event('traste:load-song'));
    progression=song.chords.map(chord=>({...chord})); playingProgressionItem=null; selectProgressionChord(0);
    for(const id of settingIds) {const control=$(id);if(control.type==='checkbox') control.checked=song.settings[id];else control.value=song.settings[id];control.dispatchEvent(new Event('input'));}
    title.value=song.title; openedId=song.id; refresh(song.id);
    window.dispatchEvent(new CustomEvent('traste:load-video',{detail:song.video}));
    status.textContent=`Abierta: ${song.title}. Los cambios se guardan con «Actualizar».`;
  }));
  $('song-delete').addEventListener('click',()=>run(()=>{
    const song=library.read().find(item=>item.id===list.value);
    if(!song) {status.textContent='Selecciona una progresión guardada.';return;}
    if(!confirm(`¿Eliminar «${song.title}» de la biblioteca?`)) return;
    library.remove(song.id); if(openedId===song.id) openedId=null; refresh(); status.textContent='Progresión eliminada de la biblioteca. Las tarjetas actuales se conservan.';
  }));
  $('song-export').addEventListener('click',()=>run(()=>{
    const url=URL.createObjectURL(new Blob([library.export()],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='string-progresiones.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent='Respaldo preparado para descargar.';
  }));
  $('song-import').addEventListener('change',async event=>{
    const file=event.target.files[0]; if(!file) return;
    try {
      if(file.size>2*1024*1024) throw new Error('El archivo supera 2 MB.');
      const count=library.import(await file.text()); refresh();status.textContent=`Se importaron ${count} progresiones como copias.`;
    } catch(error) {status.textContent=`No se importó el archivo: ${error.message}`;}
    event.target.value='';
  });
  window.addEventListener('storage',event=>{if(event.key===library.key) run(()=>refresh(list.value));});
  run(()=>refresh());
  if(location.protocol==='file:') status.textContent='Para guardar de forma consistente, abre la aplicación con npm start en http://127.0.0.1:8000.';
})();
