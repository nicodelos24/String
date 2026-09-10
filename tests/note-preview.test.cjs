const {test}=require('node:test');const assert=require('node:assert/strict');
const {NotePreview}=require('../note-preview.js');
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
