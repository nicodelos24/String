const {test}=require('node:test');const assert=require('node:assert/strict');const {progressionPresets}=require('../progression-presets.js');
test('templates contain the intended jazz changes and twelve-bar dominant blues',()=>{
  assert.deepEqual(progressionPresets.jazz.chords.map(c=>[c.root,c.type]),[[2,'m7'],[7,'7'],[0,'maj7'],[0,'maj7']]);
  assert.deepEqual(progressionPresets.blues.chords.map(c=>c.root),[9,9,9,9,2,2,9,9,4,2,9,4]);
  assert(progressionPresets.blues.chords.every(c=>c.type==='7'));
  assert.deepEqual(progressionPresets.turnaround.chords.map(c=>c.root),[0,9,2,7]);
});
