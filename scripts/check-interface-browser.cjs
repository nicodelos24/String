// UI real con CDP. Bloquea la red de YouTube salvo con --live-youtube; no afirma reproducci?n.
const fs=require('node:fs'), os=require('node:os'), path=require('node:path'), http=require('node:http');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  const edge=process.argv.includes('--edge'), live=process.argv.includes('--live-youtube');
  const server=http.createServer((request,response)=>{
    try {
      const pathname=new URL(request.url,'http://localhost').pathname;
      const file=path.resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
      if(!file.startsWith(root+path.sep)) {response.writeHead(403).end();return;}
      response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)] || 'application/octet-stream');
      response.end(fs.readFileSync(file));
    } catch {response.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=`http://127.0.0.1:${server.address().port}`;
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'traste-interface-'));
  const executable=edge?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser=spawn(executable,['--headless=new','--mute-audio','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
  let socket;
  const pending=new Map();
  try {
    const portFile=path.join(profile,'DevToolsActivePort');
    let port;
    for(let i=0;i<300;i++) {
      try {const value=fs.readFileSync(portFile,'utf8').split('\n')[0].trim();if(/^\d+$/.test(value)) {port=value;break;}}
      catch(error) {if(!['ENOENT','EBUSY','EACCES'].includes(error.code)) throw error;}
      await delay(100);
    }
    assert(port,'El navegador no publicó su puerto de depuración.');
    const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    let id=0;
    socket.onmessage=event=>{const data=JSON.parse(event.data), task=pending.get(data.id);if(task){pending.delete(data.id);clearTimeout(task.timer);data.error?task.reject(new Error(data.error.message)):task.resolve(data.result);}};
    const send=(method,params={})=>new Promise((resolve,reject)=>{const request=++id;const timer=setTimeout(()=>{pending.delete(request);reject(new Error('Timeout '+method));},20000);pending.set(request,{resolve,reject,timer});socket.send(JSON.stringify({id:request,method,params}));});
    const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
    await send('Page.enable');
    await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.previewFrequencies=[];const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){const osc=original.call(this),start=osc.start;osc.start=function(...args){window.previewFrequencies.push(osc.frequency.value);return start.apply(this,args);};return osc;};`});
    if(!live) {await send('Network.enable');await send('Network.setBlockedURLs',{urls:['*youtube.com/*','*googlevideo.com/*']});}
    if(!live) await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.YT={Player:class {
      constructor(host,options){this.options=options;this.time=0;this.state=2;window.testYoutube=this;this.frame=document.createElement('iframe');this.frame.src='https://www.youtube.com/embed/'+options.videoId;host.replaceWith(this.frame);setTimeout(()=>options.events.onReady(),0);}
      getCurrentTime(){return this.time;}getDuration(){return 180;}getPlayerState(){return this.state;}
      pauseVideo(){this.state=2;}playVideo(){this.state=1;}seekTo(time){this.time=time;}destroy(){this.frame.remove();}
    }};`});
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    // Las medidas de distribución no deben depender del tiempo de una animación.
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await send('Page.navigate',{url:address});
    for(let i=0;i<100;i++) {if(await evaluate("typeof SongLibrary!=='undefined' && document.readyState==='complete'")) break;await delay(100);}
    const dimensions=await evaluate(`(()=>{
      const sizes=[];
      for(const [pitch,name,mode] of [[0,'C','ionian'],[6,'F#','lydian'],[1,'Db','minorPentatonic']]){
        root=pitch;rootNoteName=name;selectedMode=mode;updateView();
        const a=document.querySelector('.key-signature-info').getBoundingClientRect(),b=document.querySelector('.chord-readout').getBoundingClientRect();
        sizes.push([a.width,a.height,b.width,b.height]);
      }
      selectProgressionChord(0);return sizes;
    })()`);
    assert(dimensions.every(size=>JSON.stringify(size)===JSON.stringify(dimensions[0])));
    assert.equal(await evaluate("document.querySelector('#player-disclosure').getAttribute('aria-expanded')"),'false');
    assert.equal(await evaluate("document.querySelectorAll('details[open]').length"),0);
    assert.equal(await evaluate('showNotes===1 && displayModeIndex===1'),true);
    await evaluate("document.querySelector('#player-disclosure').click();document.querySelector('#youtube-disclosure').click();");await delay(350);
    const beforeHeight=await evaluate("document.querySelector('.chord-player').getBoundingClientRect().height");
    await evaluate("document.querySelector('#player-disclosure').click()");await delay(350);
    const collapsed=await evaluate(`({height:document.querySelector('.chord-player').getBoundingClientRect().height,inert:document.querySelector('#player-content').inert,toggle:document.querySelector('#player-toggle').getBoundingClientRect().height})`);
    assert(collapsed.height<beforeHeight && collapsed.inert && collapsed.toggle>0,JSON.stringify({beforeHeight,collapsed}));
    await evaluate("document.querySelector('#player-disclosure').click()");await delay(350);
    assert.equal(await evaluate("document.querySelectorAll('[data-move]').length"),0);
    const rects=await evaluate(`(()=>{document.querySelector('#progression').scrollIntoView({block:'center'});return [...document.querySelectorAll('.progression-card')].map(card=>{const r=card.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});})()`);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:rects[1].x,y:rects[1].y});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,x:rects[1].x,y:rects[1].y});
    for(let i=1;i<=8;i++){await send('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,x:rects[1].x+(rects[0].x-25-rects[1].x)*i/8,y:rects[1].y});await delay(25);}
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:rects[0].x-25,y:rects[0].y});
    await delay(250);
    assert.equal(await evaluate('progression[0].root'),5);
    const cardPoint=await evaluate("(()=>{const r=document.querySelector('.progression-card').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()");
    for(const clickCount of [1,2]) {
      await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount,...cardPoint});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount,...cardPoint});
    }
    assert.equal(await evaluate('progression.length'),5);
    assert.equal(await evaluate('progression[0]!==progression[1] && progression[1].root===5'),true);
    await evaluate("document.querySelector('.progression-card[data-index=\"1\"]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));");
    assert.equal(await evaluate('progression.length'),4);
    await evaluate(`document.querySelector('#youtube-url').value='https://www.youtube.com/watch?v=M7lc1UVf-VE';document.querySelector('#youtube-form').requestSubmit();`);
    for(let i=0;i<200;i++){if(await evaluate("!document.querySelector('#youtube-toggle').disabled"))break;await delay(100);}
    if(!live) {
      await evaluate("document.querySelector('#youtube-toggle').click();document.querySelector('#youtube-disclosure').click();");
      assert.equal(await evaluate('testYoutube.state'),1);
      assert.equal(await evaluate("document.querySelector('#youtube-video-wrap').classList.contains('is-floating')"),true);
      await evaluate("document.querySelector('#youtube-seek').value='45';document.querySelector('#youtube-seek').dispatchEvent(new Event('change'));document.querySelector('#youtube-toggle').click();");
      assert.equal(await evaluate('testYoutube.time'),45);assert.equal(await evaluate('testYoutube.state'),2);
      await evaluate("document.querySelector('.video-restore').click();");
      assert.equal(await evaluate("document.querySelector('#youtube-video-wrap').classList.contains('is-floating')"),false);
    }
    const connection=await evaluate("({iframe:document.querySelector('#youtube-video-wrap iframe')?.src})");
    assert(connection.iframe.includes('/embed/M7lc1UVf-VE'));
    assert.equal(await evaluate("document.querySelector('#youtube-follow')"),null);
    await evaluate("document.querySelector('#song-title').value='Práctica de prueba';document.querySelector('#player-style').value='bossa';document.querySelector('#player-bpm').value='85';document.querySelector('#song-save').click();");
    assert.equal(await evaluate("document.querySelectorAll('#song-list option').length"),2);
    await evaluate("progression[0].root=9;document.querySelector('#song-open').click();");
    assert.equal(await evaluate('progression[0].root'),5);
    await send('Page.reload');await delay(1000);
    assert.equal(await evaluate("document.querySelectorAll('#song-list option').length"),2);
    await evaluate("document.querySelector('#song-list').selectedIndex=1;document.querySelector('#song-open').click();");
    await delay(100);
    assert.equal(await evaluate('progression[0].root'),5);
    assert.equal(await evaluate("document.querySelector('#player-style').value"),'bossa');
    assert.equal(await evaluate("document.querySelector('#player-bpm').value"),'85');
    await evaluate("document.querySelector('#player-toggle').click();");await delay(150);
    assert.equal(await evaluate("document.querySelector('#player-toggle').getAttribute('aria-label')"),'Detener');
    await evaluate("document.querySelector('#youtube-form').requestSubmit();");
    assert.equal(await evaluate("document.querySelector('#player-toggle').getAttribute('aria-label')"),'Detener');
    await evaluate("document.querySelector('#player-toggle').click();");
    await evaluate(`(()=>{const input=document.querySelector('#song-import'),transfer=new DataTransfer();transfer.items.add(new File([localStorage.getItem('traste.songs.v1')],'backup.json',{type:'application/json'}));input.files=transfer.files;input.dispatchEvent(new Event('change'));})()`);
    await delay(150);assert.equal(await evaluate("document.querySelectorAll('#song-list option').length"),3);
    await evaluate(`(()=>{const data=JSON.parse(localStorage.getItem('traste.songs.v1'));data.songs[0].chords[0].rootNoteName='<img src=x onerror=alert(1)>';const input=document.querySelector('#song-import'),transfer=new DataTransfer();transfer.items.add(new File([JSON.stringify(data)],'invalid.json'));input.files=transfer.files;input.dispatchEvent(new Event('change'));})()`);
    await delay(150);assert.equal(await evaluate("document.querySelectorAll('#song-list option').length"),3);
    assert((await evaluate("document.querySelector('#song-status').textContent")).startsWith('No se importó'));
    await evaluate("document.querySelector('#root-piano [data-pitch=\"9\"]').click();");await delay(100);
    assert(Math.abs((await evaluate('previewFrequencies.at(-1)'))-440)<0.001);
    await evaluate("document.querySelector('#instrument-picker [value=\"bass\"]').click();document.querySelector('#open-strings .open-string-row:last-child [data-midi]').click();");await delay(100);
    assert.equal(await evaluate("document.querySelectorAll('#open-strings .open-string-row').length"),4);
    assert(Math.abs((await evaluate('previewFrequencies.at(-1)'))-41.20344)<0.001);
    await evaluate("document.querySelector('#instrument-picker [value=\"guitar\"]').click();");
    const track=[0,144,60,100,0,64,100,0,67,100,96,128,60,0,0,64,0,0,67,0,0,144,62,100,0,65,100,0,69,100,96,128,62,0,0,65,0,0,69,0,0,255,47,0];
    const midi=[77,84,104,100,0,0,0,6,0,0,0,1,0,96,77,84,114,107,0,0,0,track.length,...track];
    await evaluate(`(()=>{const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array(${JSON.stringify(midi)})],'chords.mid'));const input=document.querySelector('#midi-file');input.files=transfer.files;input.dispatchEvent(new Event('change'));})()`);
    await delay(150);assert.equal(await evaluate("document.querySelectorAll('#midi-preview li').length"),2);
    await evaluate("document.querySelector('#midi-play').click();");
    for(let i=0;i<160;i++){if(await evaluate('root===0'))break;await delay(25);}
    assert.equal(await evaluate('root'),0,await evaluate("document.querySelector('#midi-status').textContent+' / '+document.querySelector('#midi-play').textContent"));
    for(let i=0;i<100;i++){if(await evaluate('root===2'))break;await delay(25);}
    assert.equal(await evaluate('root'),2);
    assert.equal(await evaluate("document.querySelector('#progression .playing').dataset.index"),'5');
    assert.equal(await evaluate("document.querySelector('#progression .playing strong').textContent"),'Dm');
    await evaluate("document.querySelector('#midi-play').click();document.querySelector('#midi-add').click();");
    assert.equal(await evaluate('progression.length'),6);
    assert.equal(await evaluate("document.querySelectorAll('#progression .playing').length"),0);
    await evaluate("selectedMode='dorian';displayModeIndex=3;updateView();document.querySelector('#fretboard [data-midi=\"66\"]').click();");
    assert.equal(await evaluate('root'),6);assert.equal(await evaluate('selectedMode'),'dorian');
    assert.equal(await evaluate("document.querySelector('#display-label').textContent"),'Acorde');
    assert.equal(await evaluate("document.querySelector('#player-content').contains(document.querySelector('#progression-preset'))"),true);
    assert.equal(await evaluate("document.querySelector('#player-content').contains(document.querySelector('#midi-file'))"),true);
    for(const modeIndex of [3,4]) {
      const colors=await evaluate(`(()=>{root=2;selectedMode='dorian';displayModeIndex=${modeIndex};updateView();const pitches=${modeIndex===3?'[2,5,9]':'[2,5,9,0]'};return [...document.querySelectorAll('#fretboard [data-midi],#open-strings [data-midi]')].filter(n=>pitches.includes(Number(n.dataset.midi)%12)).map(n=>n.style.backgroundColor);})()`);
      assert(colors.length>0);assert(colors.every(color=>color==='rgb(0, 188, 212)'));
    }
    await evaluate("root=6;displayModeIndex=3;updateView();");
    await evaluate("document.querySelector('#fret-scale-lock').checked=true;document.querySelector('#fretboard [data-midi=\"67\"]').click();");
    assert.equal(await evaluate('root'),6);assert.equal(await evaluate('selectedFretMidi'),67);
    assert.equal(await evaluate("document.querySelectorAll('.is-picked').length"),1);
    await evaluate("document.querySelector('#root-piano [data-pitch=\"9\"]').click();");assert.equal(await evaluate('root'),9);
    await evaluate("document.querySelector('#progression-preset').value='blues';document.querySelector('#apply-preset').click();");
    assert.equal(await evaluate('progression.length'),12);assert.equal(await evaluate("document.querySelector('#player-bpm').value"),'90');
    assert(await evaluate(`(()=>{const original=progression.map(chord=>({...chord}));const result=appendMidiChords(Array.from({length:300},()=>({root:0,type:chordTypes[0].value})));if(!result)return false;document.querySelector('#song-title').value='MIDI largo';document.querySelector('#song-save').click();const saved=JSON.parse(localStorage.getItem('traste.songs.v1')).songs.some(song=>song.title==='MIDI largo' && song.chords.length===312);progression=original;updateView();return saved;})()`));
    assert(await evaluate(`(()=>{const before=JSON.stringify(progression),view=document.querySelector('#progression-view'),list=document.querySelector('#progression');view.click();const horizontal=getComputedStyle(list).display==='flex' && list.scrollWidth>list.clientWidth;view.click();return horizontal && getComputedStyle(list).display==='grid' && JSON.stringify(progression)===before;})()`));
    assert(await evaluate(`(()=>{document.querySelector('#section-name').value='Verso';document.querySelector('#section-from').value='1';document.querySelector('#section-to').value='4';document.querySelector('#section-repeat').value='2';document.querySelector('#section-add').click();const items=StringSections.playback();return items.length===8 && items[0].source===items[4].source && progression.length===12;})()`));
    await evaluate("document.querySelector('#song-title').value='Tema con secciones';document.querySelector('#song-save').click();StringSections.load([]);document.querySelector('#song-open').click();");
    assert.equal(await evaluate('StringSections.playback().length'),8);
    assert.equal(await evaluate('StringSections.serialize()[0].name'),'Verso');
    await evaluate('StringSections.load([]);');
    assert(await evaluate(`(()=>{const content=document.querySelector('#player-content');return !content.contains(document.querySelector('.sections-panel')) && !content.contains(document.querySelector('#midi-play')) && !content.contains(document.querySelector('#player-toggle'));})()`));
    await evaluate("document.querySelector('#player-disclosure').setAttribute('aria-expanded','false');document.querySelector('#player-content').classList.add('is-collapsed');document.querySelector('#player-content').inert=true;document.querySelector('[data-source=midi]').click();");
    assert(await evaluate("document.querySelector('#midi-play').getBoundingClientRect().height>0 && document.querySelector('#progression-transport').hidden"));
    await evaluate("document.querySelector('[data-source=progression]').click();");
    assert(await evaluate("document.querySelector('#player-toggle').getBoundingClientRect().height>0 && document.querySelector('#midi-transport').hidden"));
    assert(await evaluate(`(()=>{const colors=()=>[...document.querySelectorAll('.fret-note')].map(n=>[getComputedStyle(n).backgroundColor,getComputedStyle(n).color]);const before=JSON.stringify(colors());document.querySelector('#theme-toggle').click();return document.documentElement.dataset.theme==='dark' && JSON.stringify(colors())===before && localStorage.getItem('string.theme')==='dark';})()`));
    await evaluate("document.querySelector('#theme-toggle').click();");
    const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    fs.writeFileSync(path.join(os.tmpdir(),`traste-interface-${edge?'edge':'chrome'}.png`),Buffer.from(screenshot.data,'base64'));
    for (const width of [320,390,768,1024]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      await delay(100);
      assert(await evaluate(`(()=>{const piano=document.querySelector('.root-piano').getBoundingClientRect();const summary=document.querySelector('.scale-summary');return piano.width<=220 && summary.previousElementSibling.matches('.board-footer') && summary.getBoundingClientRect().bottom<=document.querySelector('.chord-player').getBoundingClientRect().top;})()`));
      for (const kind of ['guitar','bass']) {
        const layout=await evaluate(`(()=>{instrument='${kind}';updateView();const wrap=document.querySelector('.fretboard-wrap');wrap.scrollLeft=wrap.scrollWidth;return {page:document.documentElement.scrollWidth,viewport:innerWidth,scrolled:wrap.scrollLeft,needsScroll:wrap.scrollWidth>wrap.clientWidth,rows:[...document.querySelectorAll('.string-row')].map(r=>r.querySelectorAll('.fret').length),circles:[...document.querySelectorAll('.fret-note')].every(n=>{const r=n.getBoundingClientRect();return Math.abs(r.width-r.height)<1 && r.width>=25;})};})()`);
        assert(layout.page<=width+1,JSON.stringify({width,kind,layout}));
        assert(!layout.needsScroll || layout.scrolled>0);
        assert(layout.rows.length===(kind==='guitar'?6:4) && layout.rows.every(n=>n===22));
        assert(layout.circles,JSON.stringify({width,kind,layout}));
      }
    }
    await evaluate("instrument='guitar';updateView();document.querySelector('.fretboard-wrap').scrollLeft=0;");
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await delay(150);
    const mobile=await evaluate(`(()=>{const r=document.querySelector('.chord-player').getBoundingClientRect();return {width:r.width,viewport:innerWidth};})()`);
    assert(mobile.width<=390);
    assert(await evaluate(`(()=>{const r=document.querySelector('#youtube-video-wrap').getBoundingClientRect();return r.width>=200 && r.height>=200 && r.right<=innerWidth;})()`));
    const screenshotMobile=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    fs.writeFileSync(path.join(os.tmpdir(),`traste-interface-mobile-${edge?'edge':'chrome'}.png`),Buffer.from(screenshotMobile.data,'base64'));
    console.log(JSON.stringify({browser:(await send('Browser.getVersion')).product,dimensions,collapsed,mobile,youtube:live?'Iframe externo; reproducción manual pendiente':'Iframe con red bloqueada',connection,result:'PASS'},null,2));

  } finally {
    for(const task of pending.values())clearTimeout(task.timer);
    socket?.close();browser.kill();server.closeAllConnections();server.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
