const {test}=require('node:test');const assert=require('node:assert/strict');
const {readMidiChords}=require('../midi-import.js');
const types=[{value:'maj',intervals:[0,4,7]},{value:'m',intervals:[0,3,7]},{value:'7',intervals:[0,4,7,10]}];
test('imports all chords beyond the old 256 limit',()=>{
  const events=[];
  for(let i=0;i<300;i++)events.push(i?96:0,0x90,60,90,0,0x90,64,90,0,0x90,67,90,1,0x80,60,0,0,0x80,64,0,0,0x80,67,0);
  events.push(0,255,47,0);
  const result=readMidiChords(midi([events]),types);
  assert.equal(result.chords.length,300);assert.equal(result.notes.length,900);
  assert(result.chords.at(-1).time>result.chords[0].time);
});
const chunk=(name,data)=>[...Buffer.from(name),0,0,data.length>>8,data.length&255,...data];
function midi(tracks){return Uint8Array.from([...chunk('MThd',[0,tracks.length>1?1:0,0,tracks.length,0,96]),...tracks.flatMap(data=>chunk('MTrk',data))]).buffer;}
test('MIDI recognizes simultaneous inverted chords and ignores percussion / velocity-zero notes',()=>{
  const data=midi([[0,0x90,64,90,0,67,90,0,72,90,0,70,0,0,0x99,35,100,96,0x90,62,90,0,65,90,0,69,90,0,255,47,0]]);
  const result=readMidiChords(data,types);
  assert.deepEqual(result.chords,[{root:0,type:'maj',tick:0,time:0},{root:2,type:'m',tick:96,time:0.5}]);assert.equal(result.skipped,0);
});
test('format 1 merges tracks by tick and reports unsupported note groups',()=>{
  const result=readMidiChords(midi([[0,0x90,60,90,96,60,90],[0,0x91,64,90,0,67,90]]),types);
  assert.equal(result.chords[0].root,0);assert.equal(result.skipped,1);
});
test('truncated files, unsupported formats and corrupt running status fail safely',()=>{
  assert.throws(()=>readMidiChords(new ArrayBuffer(0),types));
  assert.throws(()=>readMidiChords(midi([[0,60,90]]),types));
  const data=new Uint8Array(midi([[0,0x90,60,90]]));data[9]=2;
  assert.throws(()=>readMidiChords(data.buffer,types),/formato/);
  assert.throws(()=>readMidiChords(data.slice(0,16).buffer,types));
});
test('notes and chords share timing across tempo changes and note-off durations',()=>{
  const result=readMidiChords(midi([[0,0x90,60,100,0,64,100,0,67,100,96,255,81,3,15,66,64,96,0x80,60,0,0,64,0,0,67,0,0,0x90,62,100,0,65,100,0,69,100,96,0x80,62,0,0,65,0,0,69,0]]),types);
  assert.equal(result.chords[1].time,1.5);assert.equal(result.notes[0].duration,1.5);assert.equal(result.notes[3].time,1.5);assert.equal(result.duration,2.5);
});
