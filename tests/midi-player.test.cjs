const {test}=require('node:test');const assert=require('node:assert/strict');const {MidiPlayer}=require('../midi-player.js');
test('MIDI playback schedules exact notes, follows audio time and stops queued voices',async()=>{
  const nodes=[],times=[];let callback;
  const param={setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}};
  const ctx={currentTime:10,resume:async()=>{},createGain:()=>({gain:{...param},connect(){},disconnect(){}}),createOscillator:()=>{
    const osc={frequency:{},connect(){},disconnect(){},start(time){this.startTime=time;},stop(time){this.stopTime=time;this.stopped=true;}};nodes.push(osc);return osc;
  }};
  const player=new MidiPlayer({createContext:()=>ctx,setTimer:fn=>{callback=fn;return 1;},clearTimer:()=>{},onTime:t=>times.push(t)});
  await player.start({notes:[{midi:69,time:0,duration:1,velocity:100},{midi:72,time:1,duration:1,velocity:90}],duration:2});
  assert.equal(nodes.length,1);assert.equal(nodes[0].frequency.value,440);assert.equal(nodes[0].startTime,10.05);
  ctx.currentTime=11;callback();assert.equal(nodes.length,2);assert(Math.abs(times.at(-1)-0.95)<0.00001);
  player.stop();assert.equal(player.voices.size,0);assert.equal(player.running,false);assert(nodes.every(node=>node.stopped));
});
test('stopping while MIDI audio resumes prevents a delayed start',async()=>{
  let resolve;const player=new MidiPlayer({createContext:()=>({resume:()=>new Promise(r=>resolve=r)}),setTimer:()=>{throw new Error('Unexpected timer');}});
  const pending=player.start({notes:[],duration:0});player.stop();resolve();await pending;assert.equal(player.running,false);
});
