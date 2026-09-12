const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
test('active HTML has unique IDs, unique scripts and existing local entrypoints',()=>{
  const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<!--[\s\S]*?-->/g,'');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,'Duplicate active HTML IDs');
  const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(scripts).size,scripts.length,'Script loaded twice');
  for(const script of scripts)assert(fs.existsSync(path.join(root,script)),script);
  assert(!scripts.includes('midi-catalog.js'),'Historical MIDI fixtures must not be loaded by the app');
});
