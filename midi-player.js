class MidiPlayer {
  constructor({createContext=()=>new (window.AudioContext || window.webkitAudioContext)(),onTime=()=>{},onState=()=>{},setTimer=(fn,ms)=>setInterval(fn,ms),clearTimer=id=>clearInterval(id)}={}) {
    Object.assign(this,{createContext,onTime,onState,setTimer,clearTimer});this.voices=new Set();this.generation=0;this.running=false;
  }
  stop() {
    this.generation++;this.running=false;this.starting=false;this.clearTimer(this.timer);this.timer=null;
    for(const voice of this.voices){voice.osc.stop();voice.osc.disconnect();voice.gain.disconnect();}this.voices.clear();this.onState(false);
  }
  async start(song) {
    this.stop();this.starting=true;const generation=this.generation;this.context ||= this.createContext();await this.context.resume();if(generation!==this.generation)return;this.starting=false;
    this.song=song;this.index=0;this.origin=this.context.currentTime+0.05;this.running=true;this.onState(true);
    this.timer=this.setTimer(()=>this.tick(),25);this.tick();
  }
  tick() {
    if(!this.running)return;
    const ctx=this.context,elapsed=ctx.currentTime-this.origin;
    while(this.index<this.song.notes.length && this.song.notes[this.index].time<elapsed+0.15) {
      const note=this.song.notes[this.index++],end=this.origin+note.time+note.duration;
      if(end<=ctx.currentTime || this.voices.size>=64)continue;
      const start=Math.max(ctx.currentTime,this.origin+note.time),osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type='triangle';osc.frequency.value=440*2**((note.midi-69)/12);
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(0.02*(note.velocity/127),Math.min(start+0.01,end));
      gain.gain.setTargetAtTime(0,end,0.015);osc.connect(gain);
      this.master ||= ctx.createGain();this.master.gain.value=0.7;
      if(!this.connected){this.master.connect(ctx.destination);this.connected=true;}
      gain.connect(this.master);const voice={osc,gain};this.voices.add(voice);
      osc.onended=()=>{this.voices.delete(voice);osc.disconnect();gain.disconnect();};osc.start(start);osc.stop(end+0.1);
    }
    if(elapsed>=0)this.onTime(Math.min(elapsed,this.song.duration));
    if(elapsed>=this.song.duration+0.12)this.stop();
  }
}
if(typeof module!=='undefined' && module.exports)module.exports={MidiPlayer};
