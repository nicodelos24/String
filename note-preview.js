// Una voz breve: pulsar otra nota libera la anterior sin acumular volumen.
class NotePreview {
  constructor(createContext=()=>new (window.AudioContext || window.webkitAudioContext)()) {this.createContext=createContext;this.sequence=0;}
  stop() {
    this.sequence++;
    if(this.voice) {const {osc,gain}=this.voice,t=this.context.currentTime;gain.gain.cancelScheduledValues(t);gain.gain.setTargetAtTime(0,t,0.008);osc.stop(t+0.04);this.voice=null;}
  }
  async play(midi,volume=0.35) {
    if(!Number.isInteger(midi) || midi<0 || midi>127) return;
    this.stop();const sequence=this.sequence;
    this.context ||= this.createContext();
    await this.context.resume();
    if(sequence!==this.sequence) return;
    const ctx=this.context,t=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='triangle';osc.frequency.value=440*2**((midi-69)/12);
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(Math.max(0,Math.min(1,volume))*0.22,t+0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001,t+0.65);
    osc.connect(gain);gain.connect(ctx.destination);this.voice={osc,gain};
    osc.onended=()=>{osc.disconnect();gain.disconnect();if(this.voice?.osc===osc)this.voice=null;};
    osc.start(t);osc.stop(t+0.7);
  }
}
if(typeof module!=='undefined' && module.exports) module.exports={NotePreview};
if(typeof document!=='undefined') (()=>{
  const preview=new NotePreview();
  document.addEventListener('click',event=>{
    const key=event.target.closest('[data-pitch]'),note=event.target.closest('[data-midi]');
    if(!key && !note) return;
    const midi=note?Number(note.dataset.midi):(instrument==='bass'?36:60)+Number(key.dataset.pitch);
    preview.play(midi,Number(document.querySelector('#player-volume').value)/100).catch(()=>{document.querySelector('.hint').textContent='No se pudo escuchar la nota. Intenta de nuevo.';});
  });
  window.addEventListener('pagehide',()=>{preview.stop();preview.context?.close();});
})();
