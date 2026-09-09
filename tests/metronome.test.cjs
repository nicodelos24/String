const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Metronome} = require('../metronome.js');
function setup() {
  const oscillators = [];
  const context = {
    currentTime: 0, state: 'running', destination: {}, async resume() {},
    createOscillator() {
      const node = {frequency: {}, connect() {}, disconnect() {}, start(time) {this.time = time;}, stop() {this.stopped = true;}};
      oscillators.push(node); return node;
    },
    createGain() {return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  };
  return {context, oscillators, metro: new Metronome({createContext:()=>context})};
}
test('tempo validation keeps values between 30 and 240', () => {
  const {metro} = setup();
  assert.equal(metro.setTempo(10),30);
  assert.equal(metro.setTempo(999),240);
  assert.equal(metro.setTempo(''),240);
  assert.equal(metro.setTempo('invalid'),240);
  assert.equal(metro.setTempo(120),120);
});
test('audio clock schedules the tempo and first beat accent; stop cancels queued clicks', async () => {
  const {metro,context,oscillators} = setup();
  metro.setTempo(120);
  try {
    await metro.start();
    assert.equal(oscillators[0].time,0.04);
    assert.equal(oscillators[0].frequency.value,1200);
    context.currentTime = 0.5;
    metro.tick();
    assert.equal(oscillators[1].time,0.54);
    assert.equal(oscillators[1].frequency.value,800);
    metro.stop();
    assert.equal(metro.running,false);
    assert.equal(metro.voices.size,0);
    assert.equal(metro.queue.length,0);
    assert(oscillators.every(o=>o.stopped));
  } finally {metro.stop();}
});
test('changing meter restarts on its first beat; delayed ticks do not burst', async () => {
  const {metro,context,oscillators} = setup();
  try {
    await metro.start();
    metro.setBeats(3);
    assert.equal(metro.beats,3);
    assert.equal(oscillators.at(-1).frequency.value,1200);
    const count = oscillators.length;
    context.currentTime = 100;
    metro.tick();
    assert.equal(oscillators.length,count+1);
    assert(oscillators.at(-1).time >= 100);
  } finally {metro.stop();}
});
test('stop during audio permission/resume prevents a late start', async () => {
  const {metro,context} = setup();
  let resolve;
  context.resume = () => new Promise(r=>{resolve=r;});
  const starting = metro.start();
  metro.stop();
  resolve();
  await starting;
  assert.equal(metro.running,false);
  assert.equal(metro.voices.size,0);
});
