const {test}=require('node:test');const assert=require('node:assert/strict');
const {validateSections}=require('../sections.js');
test('older progressions have no sections and section data round-trips',()=>{
  assert.deepEqual(validateSections(undefined,4),[]);
  const data=[{name:'Verso',repeat:2,indices:[0,1,2,3]},{name:'Estribillo',repeat:1,indices:[2,3]}];
  assert.deepEqual(validateSections(JSON.parse(JSON.stringify(data)),4),data);
});
test('invalid section references and repetitions are rejected',()=>{
  assert.throws(()=>validateSections([{name:'A',repeat:1,indices:[0,0]}],4),/misma tarjeta/);
  for(const s of [{name:'',repeat:1,indices:[0]},{name:'A',repeat:0,indices:[0]},{name:'A',repeat:9,indices:[0]},{name:'A',repeat:1,indices:[4]},{name:'A',repeat:1,indices:[]}])assert.throws(()=>validateSections([s],4));
});
