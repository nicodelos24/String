const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {ProgressionPlayer, chordToMidi, midiToFrequency} = require('../progression-player.js');

const chords = [{name: 'C', notes: [48,52,55]}, {name: 'Fm7', notes: [53,56,60,63]}];
function setup() {
  const oscillators = [], gains = [], heard = [], states = [];
  const timers = new Set();
  const context = {
    currentTime: 0, state: 'running', destination: {}, async resume() {},
    createOscillator() {
      const node = {frequency: {}, connect() {}, disconnect() {},
        start(time) {this.time = time;}, stop(time) {this.stopTime = time; this.stopped = true;}};
      oscillators.push(node);
      return node;
    },
    createGain() {
      const node = {connect() {}, disconnect() {this.disconnected = true;}, gain: {
        events: [],
        setValueAtTime(value, time) {this.value = value; this.events.push({kind:'set',value,time});},
        setTargetAtTime(value) {this.value = value;},
        linearRampToValueAtTime(value,time) {this.events.push({kind:'linear',value,time});},
        exponentialRampToValueAtTime(value,time) {this.events.push({kind:'exponential',value,time});}
      }};
      gains.push(node);
      return node;
    }
  };
  const player = new ProgressionPlayer({createContext: () => context,
    setTimer: fn => {timers.add(fn); return fn;}, clearTimer: fn => timers.delete(fn),
    onChord: (...args) => heard.push(args), onState: state => states.push(state)});
  return {player, context, oscillators, gains, heard, states, timers};
}

test('PLY-01: known pitches and chord extensions have the intended register', () => {
  assert.equal(midiToFrequency(69), 440);
  assert.equal(midiToFrequency(81), 880);
  assert.deepEqual(chordToMidi(0,[0,4,7]), [48,52,55]);
  assert.deepEqual(chordToMidi(0,[0,4,7,11,2]), [48,52,55,59,62]);
  assert.deepEqual(chordToMidi(11,[0,3,6,9]), [59,62,65,68]);
});

test('PLY-02: each chord lasts four beats; display follows audio time', async () => {
  const {player, context, oscillators, heard} = setup();
  await player.start(chords, {bpm:120, loop:false});
  assert.equal(oscillators.length,3);
  assert(oscillators.every(o => o.time === 0.04));
  assert.equal(heard.length,0);
  context.currentTime = 0.05; player.tick();
  assert.deepEqual(heard[0], [0,'C',2]);
  context.currentTime = 2; player.tick();
  assert.equal(oscillators.length,7);
  assert.equal(oscillators[3].time,2.04);
  context.currentTime = 2.05; player.tick();
  assert.deepEqual(heard[1], [1,'Fm7',2]);
  context.currentTime = 4.05; player.tick();
  assert.equal(player.running,false);
});

test('PLY-03: looping returns to the first chord', async () => {
  const {player,context,oscillators,heard} = setup();
  await player.start(chords, {bpm:120});
  for (const time of [0.05,2,2.05,4,4.05]) {context.currentTime = time; player.tick();}
  assert.equal(oscillators.length,10);
  assert.deepEqual(heard.at(-1),[0,'C',2]);
  assert.equal(player.running,true);
  player.stop();
});

test('PLY-04: stop clears scheduled sound and restart begins at chord one', async () => {
  const {player,oscillators,timers} = setup();
  await player.start(chords);
  player.stop(); player.stop();
  assert.equal(player.voices.size,0);
  assert.equal(player.queue.length,0);
  assert.equal(timers.size,0);
  assert(oscillators.every(o => o.stopped && o.stopTime === undefined));
  await player.start(chords);
  assert.equal(oscillators.length,6);
  assert.equal(oscillators[3].frequency.value,midiToFrequency(48));
  player.stop();
});

test('PLY-05: stop during resume prevents a late start', async () => {
  const {player,context,oscillators,timers} = setup();
  let resolve;
  context.resume = () => new Promise(done => {resolve = done;});
  const starting = player.start(chords);
  player.stop(); resolve(); await starting;
  assert.equal(player.running,false);
  assert.equal(player.starting,false);
  assert.equal(oscillators.length,0);
  assert.equal(timers.size,0);
});

test('PLY-06: invalid tempo or empty/invalid notes create no audio', async () => {
  const {player,oscillators} = setup();
  for (const bpm of [0,29,241,Infinity,'',NaN]) await assert.rejects(player.start(chords,{bpm}));
  for (const bad of [[],[{notes:[]}],[{notes:[128]}],[{notes:[NaN]}]]) await assert.rejects(player.start(bad));
  assert.equal(oscillators.length,0);
});

test('PLY-07: active playback uses a copy of the edited progression', async () => {
  const {player,context,oscillators,heard} = setup();
  const draft = structuredClone(chords);
  await player.start(draft,{bpm:120});
  draft[1].notes[0] = 80; draft[1].name = 'Changed'; draft.pop();
  context.currentTime = 2; player.tick();
  assert.equal(oscillators[3].frequency.value,midiToFrequency(53));
  context.currentTime = 2.05; player.tick();
  assert.deepEqual(heard.at(-1),[1,'Fm7',2]);
  player.stop();
});

test('PLY-08: volume is bounded and mute affects already scheduled notes', async () => {
  const {player,gains} = setup();
  await player.start(chords);
  assert.equal(player.setVolume(0),0);
  assert.equal(gains[0].gain.value,0);
  assert.equal(player.setVolume(5),1);
  assert.equal(player.setVolume(-1),0);
  assert.equal(player.setVolume('invalid'),0);
  player.stop();
});

test('PLY-09: a delayed tick schedules only one chord instead of a burst', async () => {
  const {player,context,oscillators} = setup();
  await player.start(chords);
  context.currentTime = 100; player.tick();
  assert.equal(oscillators.length,7);
  assert.equal(oscillators[3].time,100.04);
  player.stop();
});

test('PLY-10: audio failure resets state and allows a retry', async () => {
  const {player,context,timers} = setup();
  context.resume = async () => {throw new Error('Unavailable');};
  await assert.rejects(player.start(chords));
  assert.equal(player.running,false);
  assert.equal(player.starting,false);
  assert.equal(timers.size,0);
  context.resume = async () => {};
  await player.start(chords);
  assert.equal(player.running,true);
  player.stop();
});

test('PLY-11: repeated start creates only one timer and ended notes disconnect', async () => {
  const {player,oscillators,gains,timers} = setup();
  await player.start(chords); await player.start(chords);
  assert.equal(timers.size,1);
  assert.equal(oscillators.length,3);
  oscillators[0].onended();
  assert.equal(player.voices.size,2);
  assert.equal(gains[1].disconnected,true);
  player.stop();
});

test('PLY-14: default timers preserve the Window receiver on start and stop', async () => {
  const {context} = setup();
  const sandbox = vm.createContext({audio:context});
  vm.runInContext(`
    let timerCalls = 0, clearCalls = 0;
    function setInterval(callback, delay) {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      timerCalls++; return 1;
    }
    function clearInterval(timer) {
      if (this !== globalThis) throw new TypeError('Illegal invocation');
      clearCalls++;
    }
  `,sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../progression-player.js'),'utf8'),sandbox);
  await vm.runInContext(`
    const player = new ProgressionPlayer({createContext:()=>audio});
    player.start([{name:'C',notes:[48,52,55]}]);
  `,sandbox);
  assert.equal(vm.runInContext('player.running',sandbox),true);
  vm.runInContext('player.stop()',sandbox);
  assert.equal(vm.runInContext('timerCalls',sandbox),1);
  assert.equal(vm.runInContext('clearCalls',sandbox),1);
  assert.equal(vm.runInContext('player.voices.size',sandbox),0);
});

test('PLY-15: chord envelope sustains its level until the final release', async () => {
  const {player,gains} = setup();
  await player.start(chords,{bpm:120});
  const envelope = gains[1].gain.events;
  const sustain = envelope.find(event => event.kind === 'set' && event.time > 0.1);
  assert(Math.abs(sustain.time - 1.86) < 1e-9);
  assert(Math.abs(sustain.value - (0.7 / 3 * 0.65)) < 1e-9);
  assert.equal(envelope.at(-1).kind,'exponential');
  assert.equal(envelope.at(-1).value,0.0001);
  player.stop();
});
