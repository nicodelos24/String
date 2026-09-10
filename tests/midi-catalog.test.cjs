const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const {midiCatalog}=require('../midi-catalog.js');const {readMidiChords}=require('../midi-import.js');
test('bundled MIDI files parse with the app chord types and include source credits',()=>{
  const types=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8').match(/const chordTypes = (\[[\s\S]*?\n\]);/)[1]);
  for(const entry of midiCatalog){const bytes=fs.readFileSync(path.join(__dirname,'..',entry.file));
    const result=readMidiChords(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),types);
    assert(result.notes.length>0);assert(result.duration>0);assert(result.chords.length>0);assert(entry.credit);assert(new URL(entry.source).hostname==='www.mutopiaproject.org');
  }
});
