const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateVideoMarks}=require('../video-sync.js');
test('video marks accept old saves and repeated chords at different times',()=>{
  assert.deepEqual(validateVideoMarks(undefined,4),[]);
  const marks=[{time:0,index:0},{time:3.5,index:1},{time:7,index:0}];
  assert.deepEqual(validateVideoMarks(marks,2),marks);
});
test('video marks reject ambiguous times and missing chord references',()=>{
  for(const marks of [[{time:-1,index:0}],[{time:NaN,index:0}],[{time:1,index:2}], [{time:2,index:0},{time:2,index:1}],[{time:3,index:0},{time:1,index:0}]])assert.throws(()=>validateVideoMarks(marks,2));
});
