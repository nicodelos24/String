const {test}=require('node:test');
const assert=require('node:assert/strict');
const {SongLibrary}=require('../song-library.js');
function setup() {
  const data=new Map();
  const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
  const validate=song=>{if(!song?.id || !song.title) throw new Error('Invalid');return structuredClone(song);};
  return {library:new SongLibrary(storage,validate),storage};
}
test('songs persist across instances, update by id and preserve saved copies',()=>{
  const {library,storage}=setup(); const song={id:'one',title:'Blues',chords:[{root:0}]};
  library.save(song);song.chords[0].root=5;
  assert.equal(new SongLibrary(storage,library.validate).read()[0].chords[0].root,0);
  library.save({...song,title:'Blues editado'});assert.equal(library.read().length,1);
  library.remove('one');assert.deepEqual(library.read(),[]);
});
test('export/import adds independent copies and rejects invalid backups without data loss',()=>{
  const {library}=setup();library.save({id:'one',title:'Blues'});
  const backup=library.export();assert.equal(library.import(backup),1);
  assert.equal(library.read().length,2);assert.notEqual(library.read()[0].id,library.read()[1].id);
  const before=library.export();
  for(const raw of ['invalid','{"version":2,"songs":[]}','{"version":1,"songs":[{}]}']) assert.throws(()=>library.import(raw));
  assert.equal(library.export(),before);
});
test('storage failures and corrupt data are reported without silently overwriting',()=>{
  const {library,storage}=setup();library.save({id:'one',title:'Blues'});
  const before=library.export();storage.setItem=()=>{throw new Error('QuotaExceeded');};
  assert.throws(()=>library.save({id:'two',title:'Jazz'}),/QuotaExceeded/);assert.equal(library.export(),before);
  storage.getItem=()=>'{broken';assert.throws(()=>library.save({id:'three',title:'Rock'}));
});
