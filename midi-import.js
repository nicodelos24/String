// SMF 0/1 con PPQ: primera importación de acordes en bloque, sin inferir arpegios.
function readMidiChords(buffer,types) {
  const bytes=new Uint8Array(buffer);let p=0,limit=bytes.length;
  if(bytes.length>2*1024*1024) throw new Error('El archivo supera 2 MB.');
  const fail=()=>{throw new Error('Archivo MIDI inválido o incompleto.');};
  const byte=()=>{if(p>=limit)fail();return bytes[p++];};
  const number=n=>{let value=0;while(n--)value=value*256+byte();return value;};
  const text=n=>String.fromCharCode(...Array.from({length:n},byte));
  const skip=n=>{if(n<0 || p+n>limit)fail();p+=n;};
  const vlq=()=>{let value=0;for(let i=0;i<4;i++){const b=byte();value=value*128+(b&127);if(!(b&128))return value;}fail();};
  if(text(4)!=='MThd')fail();const header=number(4);if(header<6)fail();
  const format=number(2),tracks=number(2),division=number(2);
  if(format>1 || !tracks || tracks>128 || (format===0 && tracks!==1) || !division || division&0x8000) throw new Error('Se admiten MIDI formato 0 o 1 con tiempo PPQ.');
  skip(header-6);const groups=new Map(),notes=[],tempos=[{tick:0,tempo:500000}];let events=0,lastTick=0;
  for(let track=0;track<tracks;track++) {
    limit=bytes.length;if(text(4)!=='MTrk')fail();const length=number(4),end=p+length;if(end>limit)fail();limit=end;
    let tick=0,running=0;const active=new Map();
    const release=(key,end)=>{const queue=active.get(key);if(queue?.length){const note=queue.shift();note.end=end;notes.push(note);}};
    while(p<end) {
      if(++events>100000)throw new Error('El MIDI contiene demasiados eventos.');
      tick+=vlq();let status=byte();
      if(status<128){if(!running)fail();p--;status=running;}
      if(status===255) {running=0;const kind=byte(),length=vlq();
        if(kind===81){if(length!==3)fail();const tempo=number(3);if(!tempo)fail();tempos.push({tick,tempo});}
        else skip(length);
        if(kind===47){if(length!==0)fail();p=end;}continue;}
      if(status===240 || status===247) {running=0;skip(vlq());continue;}
      if(status>=240)fail();running=status;
      const kind=status>>4,channel=status&15;
      const first=byte(),second=(kind===12 || kind===13)?0:byte();if(first>127 || second>127)fail();
      if(kind===9 && second>0 && channel!==9) {
        if(!groups.has(tick))groups.set(tick,new Set());groups.get(tick).add(first);
        const key=channel*128+first;if(!active.has(key))active.set(key,[]);
        active.get(key).push({tick,midi:first,velocity:second});
      }
      if(channel!==9 && (kind===8 || (kind===9 && second===0)))release(channel*128+first,tick);
    }
    for(const queue of active.values())for(const note of queue)notes.push({...note,end:Math.max(tick,note.tick+division)});
    lastTick=Math.max(lastTick,tick);
  }
  // Convertir ticks con todos los cambios de tempo, compartiendo reloj entre notas y acordes.
  tempos.sort((a,b)=>a.tick-b.tick);let seconds=0,previousTick=0,tempo=500000;
  for(const entry of tempos){seconds+=(entry.tick-previousTick)*tempo/division/1000000;entry.time=seconds;previousTick=entry.tick;tempo=entry.tempo;}
  const timeAt=tick=>{let low=0,high=tempos.length;while(low<high){const mid=(low+high)>>1;if(tempos[mid].tick<=tick)low=mid+1;else high=mid;}
    const entry=tempos[Math.max(0,low-1)];return entry.time+(tick-entry.tick)*entry.tempo/division/1000000;};
  const chords=[];let skipped=0;
  for(const [tick,pitches] of [...groups].sort((a,b)=>a[0]-b[0])) {
    const ordered=[...pitches].sort((a,b)=>a-b),pcs=new Set(ordered.map(note=>note%12));let match;
    for(const root of [...new Set(ordered.map(note=>note%12))]) {
      const type=types.find(type=>type.intervals.length===pcs.size && type.intervals.every(interval=>pcs.has((root+interval)%12)));
      if(type){match={root,type:type.value};break;}
    }
    if(match)chords.push({...match,tick,time:timeAt(tick)});else skipped++;
  }
  if(chords.length>256)throw new Error('Se reconocieron más de 256 acordes. Importa un fragmento más corto.');
  const timedNotes=notes.filter(note=>note.end>note.tick).map(note=>({midi:note.midi,velocity:note.velocity,time:timeAt(note.tick),duration:timeAt(note.end)-timeAt(note.tick)})).sort((a,b)=>a.time-b.time);
  const duration=timedNotes.reduce((end,note)=>Math.max(end,note.time+note.duration),timeAt(lastTick));
  return {chords,skipped,notes:timedNotes,duration};
}
if(typeof module!=='undefined' && module.exports)module.exports={readMidiChords};
