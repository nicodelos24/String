// Una voz breve: pulsar otra nota libera la anterior sin acumular volumen.
// Tres cosas evitan que suene un chasquido, sobre todo en la primera nota:
//  1. Un margen antes de que programen las fuentes. Un nodo de ganancia nace con
//     gain = 1.0, y si la envolvente se programa justo en el instante actual el
//     primer tramo de audio puede salir a tope por ese valor por defecto, antes
//     de que llegue la automatización. Por eso la ganancia se pone a cero en el
//     acto y la envolvente arranca unos milisegundos después. Como el valor a
//     tope no depende del volumen, el pico tampoco: por eso se oía más fuerte
//     que el volumen máximo con los controles bajos.
//  2. La voz anterior baja a cero de verdad antes de cortar el oscilador. Si se
//     detiene con la ganancia todavía alta, el corte se oye.
//  3. Un bus maestro con un techo suave, por si se acumulan voces. Se hace con
//     WaveShaper y no con DynamicsCompressor porque el compresor de Chrome no es
//     transparente: medido con OfflineAudioContext, con umbral −3 dB sube la
//     señal 1,7 dB y con umbral −6 dB la sube 3,4 dB. Aquí hace falta un techo
//     que no change el sonido por debajo del tope.
const PREVIEW_HEADROOM = 0.006;  // s de margen antes de que suene nada
const PREVIEW_RELEASE = 0.03;    // s de caída al liberar la voz anterior
const PREVIEW_CEILING = 0.7;     // ≈ −3 dBFS: a partir de aquí la curva redondea

// Curva de saturación suave: identidad por debajo del techo y rolloff con
// tangente hiperbólica por encima, sin pasar nunca de 1. Es transparente para lo
// que ya está en un nivel normal, así que una nota sola suena igual que sin ella.
function previewClipCurve(points, ceiling) {
  points = points || 2048; ceiling = ceiling || PREVIEW_CEILING;
  const curve = new Float32Array(points);
  const room = 1 - ceiling;
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * 2 - 1;   // −1 … 1
    const a = Math.abs(x);
    curve[i] = a <= ceiling ? x : Math.sign(x) * (ceiling + room * Math.tanh((a - ceiling) / room));
  }
  return curve;
}

class NotePreview {
  constructor(createContext=()=>new (window.AudioContext || window.webkitAudioContext)()) {this.createContext=createContext;this.sequence=0;}
  // Bus maestro: ganancia → techo suave → salida. Se crea una sola vez por
  // contexto.
  master() {
    if(this.bus)return this.bus;
    const ctx=this.context,out=ctx.createGain(),clip=ctx.createWaveShaper();
    out.gain.value=1;
    clip.curve=previewClipCurve();
    clip.oversample='none';
    out.connect(clip);clip.connect(ctx.destination);
    this.bus=out;this.clip=clip;
    return out;
  }
  stop() {
    this.sequence++;
    if(this.voice) {
      const {sources,gain}=this.voice,t=this.context.currentTime;
      const level=gain.gain.value;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(level,t);
      gain.gain.linearRampToValueAtTime(0,t+PREVIEW_RELEASE);
      sources.forEach(osc=>osc.stop(t+PREVIEW_RELEASE+0.01));
      this.voice=null;
    }
  }
  async play(midi,volume=0.35,timbre='piano') {
    if(!Number.isInteger(midi) || midi<0 || midi>127) return;
    this.stop();const sequence=this.sequence;
    if(!Number.isFinite(volume) || volume<=0)return;
    this.context ||= this.createContext();
    await this.context.resume();
    if(sequence!==this.sequence) return;
    const ctx=this.context,t=ctx.currentTime+PREVIEW_HEADROOM,gain=ctx.createGain();
    // A cero ya, sin depender de la automatización: así no hay ni un instante
    // en el que la ganancia valga 1.0.
    gain.gain.value=0;
    const guitar=timbre==='guitar',bass=timbre==='bass',plucked=guitar || bass;
    const duration=plucked?1.1:0.7,frequency=440*2**((midi-69)/12);
    // Compensación por timbre: el bajo necesita más nivel que el piano.
    const level=bass?0.62:guitar?0.38:0.32;
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(Math.max(0,Math.min(1,volume))*level,t+(plucked?0.003:0.012));
    gain.gain.exponentialRampToValueAtTime(0.0001,t+duration-0.05);
    // Terminar en cero exacto: si el oscilador se para con la ganancia sin
    // llegar a cero, el corte se oye.
    gain.gain.linearRampToValueAtTime(0,t+duration);
    gain.connect(this.master());
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
if(typeof module!=='undefined' && module.exports) module.exports={NotePreview,previewClipCurve};
if(typeof document!=='undefined') (()=>{
  const preview=new NotePreview();
  // Esta voz breve solo corresponde al piano raíz y al mástil. Las teclas del
  // piano expandible (`kp-key`) ya suenan con el sintetizador (KeySynth) desde su
  // propio manejador de puntero, con el timbre y el volumen del panel: si este
  // delegado las recogiera, al tocar una tecla se oirían dos notas a la vez, el
  // piano y la del instrumento.
  // Los selectores son del propio elemento y no de sus ancestros a propósito:
  // al pulsar una tecla del piano raíz, `app.js` repinta el piano durante la
  // propagación y para cuando el delegado mira el nodo, este ya está
  // desconectado. Con `#root-piano [data-pitch]` el selector dejaría de
  // coincidir y el piano raíz se quedaría mudo; `[data-pitch]` sigue valiendo
  // porque no depende de dónde esté el elemento.
  const keySelector='[data-pitch]';
  const noteSelector='.fret-note, .open-string-note';
  document.addEventListener('click',event=>{
    const target=event.target;
    if(!target||!target.closest)return;
    const key=target.closest(keySelector),note=target.closest(noteSelector);
    if(!key&&!note)return;
    const midi=note?Number(note.dataset.midi):(instrument==='bass'?36:60)+Number(key.dataset.pitch);
    preview.play(midi,Number(document.querySelector('#player-volume').value)/100,note?instrument:'piano').catch(()=>{console.warn('No se pudo escuchar la nota.');});
  });
  window.addEventListener('pagehide',()=>{preview.stop();preview.context?.close();});
})();
