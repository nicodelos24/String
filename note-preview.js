// Una voz breve: pulsar otra nota libera la anterior sin acumular volumen.
class NotePreview {
  constructor(createContext=()=>new (window.AudioContext || window.webkitAudioContext)()) {this.createContext=createContext;this.sequence=0;}
  stop() {
    this.sequence++;
    if(this.voice) {const {sources,gain}=this.voice,t=this.context.currentTime;gain.gain.cancelScheduledValues(t);gain.gain.setTargetAtTime(0,t,0.008);sources.forEach(osc=>osc.stop(t+0.04));this.voice=null;}
  }
  async play(midi,volume=0.35,timbre='piano') {
    if(!Number.isInteger(midi) || midi<0 || midi>127) return;
    this.stop();const sequence=this.sequence;
    if(!Number.isFinite(volume) || volume<=0)return;
    this.context ||= this.createContext();
    await this.context.resume();
    if(sequence!==this.sequence) return;
    const ctx=this.context,t=ctx.currentTime,gain=ctx.createGain();
    const guitar=timbre==='guitar',bass=timbre==='bass',plucked=guitar || bass;
    const duration=plucked?1.1:0.7,frequency=440*2**((midi-69)/12);
    // Compensación por timbre: el bajo necesita más nivel que el piano.
    const level=bass?0.62:guitar?0.38:0.32;
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(Math.max(0,Math.min(1,volume))*level,t+(plucked?0.003:0.012));
    gain.gain.exponentialRampToValueAtTime(0.0001,t+duration-0.05);
    gain.connect(ctx.destination);
    // Los armónicos altos se apagan antes que el cuerpo de la cuerda.
    // En bajo, el ataque breve y brillante aproxima el golpe del slap.
    const weights=guitar?[1,0.48,0.26,0.15,0.08,0.04]:bass?[1,0.5,0.32,0.22,0.17,0.13,0.1,0.08]:[1];
    const total=weights.reduce((sum,value)=>sum+value,0);
    const voice={sources:[],gain};this.voice=voice;
    let remaining=weights.length;
    for(let i=weights.length-1;i>=0;i--) {
      const osc=ctx.createOscillator(),partial=ctx.createGain();
      osc.type=plucked?'sine':'triangle';osc.frequency.value=frequency*(i+1);
      partial.gain.setValueAtTime(weights[i]/total,t);
      if(plucked) partial.gain.exponentialRampToValueAtTime(0.0001,t+(i===0?duration:guitar?0.75/(1+i*0.4):0.18/(1+i*0.3)));
      osc.connect(partial);partial.connect(gain);voice.sources.push(osc);
      osc.onended=()=>{osc.disconnect();partial.disconnect();if(--remaining===0){gain.disconnect();if(this.voice===voice)this.voice=null;}};
      osc.start(t);osc.stop(t+duration);
    }
  }
}
if(typeof module!=='undefined' && module.exports) module.exports={NotePreview};
if(typeof document!=='undefined') (()=>{
  const preview=new NotePreview();
  document.addEventListener('click',event=>{
    const key=event.target.closest('[data-pitch]'),note=event.target.closest('[data-midi]');
    if(!key && !note) return;
    const midi=note?Number(note.dataset.midi):(instrument==='bass'?36:60)+Number(key.dataset.pitch);
    preview.play(midi,Number(document.querySelector('#player-volume').value)/100,note?instrument:'piano').catch(()=>{console.warn('No se pudo escuchar la nota.');});
  });
  window.addEventListener('pagehide',()=>{preview.stop();preview.context?.close();});
})();
