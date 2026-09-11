// Cada tarjeta representa un compás de cuatro pulsos del acompañamiento.
const progressionPresets={
  pop:{name:'Pop · I–V–vi–IV en Do',bpm:110,style:'pop',chords:[{root:0,type:'maj',mode:'ionian'},{root:7,type:'maj',mode:'mixolydian'},{root:9,type:'m',mode:'aeolian'},{root:5,type:'maj',mode:'lydian'}]},
  ballad:{name:'Balada · vi–IV–I–V en Do',bpm:72,style:'ballad',chords:[{root:9,type:'m',mode:'aeolian'},{root:5,type:'maj',mode:'lydian'},{root:0,type:'maj',mode:'ionian'},{root:7,type:'maj',mode:'mixolydian'}]},
  reggae:{name:'Reggae · I–IV–V–IV en Sol',bpm:82,style:'reggae',chords:[{root:7,type:'maj',mode:'ionian'},{root:0,type:'maj',mode:'lydian'},{root:2,type:'maj',mode:'mixolydian'},{root:0,type:'maj',mode:'lydian'}]},
  disco:{name:'Disco · i–iv en La menor',bpm:118,style:'disco',chords:[{root:9,type:'m7',mode:'aeolian'},{root:9,type:'m7',mode:'aeolian'},{root:2,type:'m7',mode:'dorian'},{root:2,type:'m7',mode:'dorian'}]},
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
  document.querySelector('#preset-status').textContent=`${preset.name}: ${preset.chords.length} compases, ${preset.bpm} BPM. Puedes editar las tarjetas y guardar como una canción nueva.`;
});
if(typeof module!=='undefined' && module.exports)module.exports={progressionPresets};
