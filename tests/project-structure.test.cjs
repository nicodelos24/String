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
  // Los rótulos de los botones cíclicos se pintan desde app.js, pero el nombre
  // fijo que los acompaña vive aquí: «AA» y «MÁSTIL». Si se añadiera otra
  // palabra, en pantalla saldría «VER AA NOTAS» en vez de «AA NOTAS».
  const notasButton=html.match(/<button[^>]*id="toggle-notes"[^>]*>([\s\S]*?)<\/button>/);
  const mastilButton=html.match(/<button[^>]*id="toggle-degrees"[^>]*>([\s\S]*?)<\/button>/);
  assert(notasButton,'the NOTAS button is missing');
  assert(mastilButton,'the MÁSTIL button is missing');
  // Lo que hay antes del <span> es el nombre fijo, y lo de dentro es la fase
  // que pinta app.js. El estado de arranque es AA GRADOS.
  assert(/^AA\s*<span>grados<\/span>$/.test(notasButton[1].trim()),'the first button is AA and starts on AA GRADOS');
  assert(/^MÁSTIL\s*<span><\/span>$/.test(mastilButton[1].trim()),'the MÁSTIL button is MÁSTIL and starts off');
});
