const {test}=require('node:test');const assert=require('node:assert/strict');
const {NotePreview}=require('../note-preview.js');
test('string previews use harmonic voices and stop every partial when switching back to piano',async()=>{
  const oscillators=[];
  const parameter=()=>({setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}});
  const ctx={currentTime:0,resume:async()=>{},createGain:()=>({gain:parameter(),connect(){},disconnect(){}}),createOscillator:()=>{
    const osc={frequency:{},connect(){},disconnect(){},start(){},stop(time){this.stopTime=time;}};oscillators.push(osc);return osc;
  }};
  const preview=new NotePreview(()=>ctx);
  await preview.play(69,0.35,'guitar');
  assert.equal(oscillators.length,6);assert(oscillators.every(o=>o.type==='sine' && o.frequency.value%440===0));
  await preview.play(45,0.35,'bass');
  assert(oscillators.slice(0,6).every(o=>o.stopTime===0.04));
  assert.equal(oscillators.length,14);assert.equal(oscillators.at(-1).frequency.value,110);
  await preview.play(69);
  assert(oscillators.slice(6,14).every(o=>o.stopTime===0.04));
  assert.equal(oscillators.at(-1).type,'triangle');assert.equal(oscillators.at(-1).frequency.value,440);
});
test('note preview uses exact MIDI pitch and releases the previous voice',async()=>{
  const oscillators=[];
  const parameter={setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}};
  const ctx={currentTime:0,resume:async()=>{},createGain:()=>({gain:parameter,connect(){},disconnect(){}}),createOscillator:()=>{
    const osc={frequency:{},connect(){},disconnect(){},start(){},stop(time){this.stopTime=time;}};oscillators.push(osc);return osc;
  }};
  const preview=new NotePreview(()=>ctx);await preview.play(69);assert.equal(oscillators[0].frequency.value,440);
  await preview.play(57);assert.equal(oscillators[0].stopTime,0.04);assert.equal(oscillators[1].frequency.value,220);
  await preview.play(-1);assert.equal(oscillators.length,2);
});
test('stop cancels a preview waiting for audio permission',async()=>{
  let resume;const ctx={resume:()=>new Promise(resolve=>resume=resolve),createOscillator(){throw new Error('Unexpected audio');}};
  const preview=new NotePreview(()=>ctx),pending=preview.play(60);preview.stop();resume();await pending;
});
