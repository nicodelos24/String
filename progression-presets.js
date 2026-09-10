// Cada tarjeta representa un compás de cuatro pulsos del acompañamiento.
const progressionPresets={
  jazz:{name:'Jazz · ii–V–I en Do',bpm:100,style:'jazz',chords:[{root:2,type:'m7',mode:'dorian'},{root:7,type:'7',mode:'mixolydian'},{root:0,type:'maj7',mode:'ionian'},{root:0,type:'maj7',mode:'ionian'}]},
  blues:{name:'Blues · 12 compases en La',bpm:90,style:'jazz',chords:[9,9,9,9,2,2,9,9,4,2,9,4].map(root=>({root,type:'7',mode:'mixolydian'}))},
  turnaround:{name:'Jazz · I–vi–ii–V en Do',bpm:110,style:'jazz',chords:[{root:0,type:'maj7',mode:'ionian'},{root:9,type:'m7',mode:'aeolian'},{root:2,type:'m7',mode:'dorian'},{root:7,type:'7',mode:'mixolydian'}]}
};
if(typeof document!=='undefined')document.querySelector('#apply-preset').addEventListener('click',()=>{
  const preset=progressionPresets[document.querySelector('#progression-preset').value];
  if(!preset || draggingProgressionItem)return;
  window.dispatchEvent(new Event('traste:load-song'));
  progression=preset.chords.map(chord=>({...chord}));progressionEdited=true;playingProgressionItem=null;
  selectProgressionChord(0);
  document.querySelector('#player-bpm').value=preset.bpm;
  document.querySelector('#player-style').value=preset.style;
  document.querySelector('#player-percussion').checked=true;
  document.querySelector('#player-loop').checked=true;
  document.querySelector('#preset-status').textContent=`${preset.name}: ${preset.chords.length} compases, ${preset.bpm} BPM, ritmo Jazz suave. Puedes editar las tarjetas y guardar como una canción nueva.`;
});
if(typeof module!=='undefined' && module.exports)module.exports={progressionPresets};
