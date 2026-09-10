const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {ProgressionPlayer, chordToMidi, midiToFrequency, accompanimentStyles, chordLevels} = require('../progression-player.js');

const chords = [{name: 'C', notes: [48,52,55]}, {name: 'Fm7', notes: [53,56,60,63]}];
function setup() {
  const oscillators = [], gains = [], heard = [], states = [], buffers = [];
  const timers = new Set();
  const context = {
    currentTime: 0, state: 'running', destination: {}, sampleRate:44100, async resume() {},
    createPeriodicWave() {return {};},
    createDynamicsCompressor() {return {threshold:{},knee:{},ratio:{},attack:{},release:{},connect(){}};},
    createBiquadFilter() {return {frequency:{},Q:{},connect(){},disconnect(){}};},
    createBuffer(channels,length) {return {getChannelData:()=>new Float32Array(length)};},
    createBufferSource() {
      const node = {connect(){},disconnect(){},start(time){this.time=time;},stop(){this.stopped=true;}};
      buffers.push(node); return node;
    },
    createOscillator() {
      const node = {frequency: {setValueAtTime(){},exponentialRampToValueAtTime(){}}, setPeriodicWave() {}, connect() {}, disconnect() {},
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
  return {player, context, oscillators, gains, heard, states, timers, buffers};
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
  assert(Math.abs(sustain.time - 1.44) < 1e-9);
  assert(Math.abs(sustain.value - chordLevels(chords[0].notes)[0] * 0.65) < 1e-9);
  assert.equal(envelope.at(-1).kind,'exponential');
  assert.equal(envelope.at(-1).value,0.0001);
  player.stop();
});

test('RIT-01: pop backbeat, jazz swing and trap half-time have distinct beat positions', () => {
  assert.deepEqual(accompanimentStyles.pop.snare,[1,3]);
  assert.deepEqual(accompanimentStyles.trap.snare,[2]);
  assert.equal(accompanimentStyles.jazz.hat[1],2/3);
  assert.equal(accompanimentStyles.trap.hat.length,16);
  for (const pattern of Object.values(accompanimentStyles)) {
    for (const kind of ['kick','snare','hat']) assert(pattern[kind].every(beat=>beat>=0 && beat<4));
    assert(pattern.chords.every(([beat,duration])=>beat>=0 && duration>0 && beat+duration<=4));
  }
});

test('RIT-02: chord and drum attacks share the same BPM clock', async () => {
  const {player,context} = setup();
  const hits = [], drums = [];
  player.scheduleChord = (chord,time,duration) => hits.push({time,duration});
  player.scheduleDrum = (kind,time) => drums.push({kind,time});
  await player.start(chords,{bpm:120,style:'pop'});
  assert.deepEqual(hits,[{time:0.04,duration:0.9},{time:1.04,duration:0.9}]);
  assert.deepEqual(drums.filter(hit=>hit.kind==='snare').map(hit=>hit.time),[0.54,1.54]);
  context.currentTime=2; player.tick();
  assert.deepEqual(hits.slice(2),[{time:2.04,duration:0.9},{time:3.04,duration:0.9}]);
  context.currentTime=4; player.tick();
  assert.equal(hits[4].time,4.04);
  assert.deepEqual(drums.filter(hit=>hit.kind==='snare').slice(-2).map(hit=>hit.time),[4.54,5.54]);
  player.stop();
});

test('RIT-03: disabling percussion preserves rhythmic chords; stop cancels drum sources', async () => {
  const {player,buffers,oscillators} = setup();
  await player.start(chords,{style:'pop',percussion:false});
  assert.equal(oscillators.length,6);
  assert.equal(buffers.length,0);
  player.stop();
  await player.start(chords,{style:'trap'});
  assert.equal(buffers.length,17);
  player.stop();
  assert(buffers.every(source=>source.stopped));
  assert.equal(player.voices.size,0);
  assert.equal(player.queue.length,0);
});

test('RIT-04: percussion volume is bounded and independent of general volume', async () => {
  const {player} = setup();
  await player.start(chords,{style:'jazz'});
  player.setDrumVolume(0);
  assert.equal(player.drumBus.gain.value,0);
  assert.equal(player.master.gain.value,0.35);
  assert.equal(player.setDrumVolume(9),1);
  assert.equal(player.setDrumVolume(-2),0);
  assert.equal(player.setDrumVolume(''),0);
  assert.equal(player.setDrumVolume(NaN),0);
  player.stop();
});

test('RIT-05: unknown styles fail before starting audio', async () => {
  const {player,oscillators} = setup();
  await assert.rejects(player.start(chords,{style:'unknown'}));
  assert.equal(oscillators.length,0);
});

test('MIX-01: triads and extended chords use equal squared gain with moderate treble compensation', () => {
  for (const notes of [[48,52,55],[53,56,60,63],[48,52,55,59,62],[72,76,79]]) {
    const levels = chordLevels(notes);
    assert(Math.abs(levels.reduce((sum,value)=>sum+value*value,0)-0.32**2)<1e-9);
    assert(levels[0]>=levels.at(-1));
    assert(levels.every(value=>value>0 && value<0.32));
  }
});

test('new styles schedule distinct complete bars with cancellable percussion',async()=>{
  for(const [style,attacks,noiseHits] of [['funk',5,14],['bossa',4,11],['reggaeton',4,12]]) {
    const {player,buffers,oscillators}=setup();
    await player.start(chords,{bpm:240,style});
    assert.equal(oscillators.length,attacks*3+accompanimentStyles[style].kick.length);
    assert.equal(buffers.length,noiseHits);
    player.stop();
    assert(buffers.every(source=>source.stopped));
    assert.equal(player.voices.size,0);
  }
});
