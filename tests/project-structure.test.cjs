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

// A-5 (T-43): el interruptor «Reproducir desde la tarjeta pulsada» vuelve
// visible y marcado por defecto. Si una preferencia vieja no trae la clave, el
// estado es el marcado, así que el HTML debe nacer con `checked`.
test('el interruptor de la tarjeta pulsada está en el HTML, marcado por defecto',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  const input=html.match(/<input[^>]*id="player-card-start"[^>]*>/);
  assert(input,'falta el control #player-card-start en index.html');
  assert(/\bchecked\b/.test(input[0]),'#player-card-start debe venir marcado (activado por defecto)');
  assert(html.match(/<label[^>]*for="player-card-start"[^>]*>[\s\S]*?Reproducir desde la tarjeta pulsada[\s\S]*?<\/label>/),
    'la etiqueta visible hace falta para poder verla y activarla');
});
