// UI real con CDP. YouTube usa un doble salvo al pasar --live-youtube.
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
    if(!live) await send('Page.addScriptToEvaluateOnNewDocument',{source:`
      window.YT={Player:class {
        constructor(host,options) {
          this.options=options; this.time=0; window.testYoutube=this;
          const frame=document.createElement('iframe');frame.title='Doble de YouTube';host.replaceWith(frame);
          this.frame=frame;setTimeout(()=>options.events.onReady(),0);
        }
        getCurrentTime(){return this.time;}
        getDuration(){return 180;}
        getPlayerState(){return this.paused ? 2 : (this.state ?? 1);}
        seekTo(time){this.time=time;}
        pauseVideo(){this.paused=true;}
        destroy(){this.frame.remove();}
      }};
    `});
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:address});
    for(let i=0;i<100;i++) {if(await evaluate("typeof SongTimeline!=='undefined' && document.readyState==='complete'")) break;await delay(100);}
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
    const beforeHeight=await evaluate("document.querySelector('.chord-player').getBoundingClientRect().height");
    await evaluate("document.querySelector('#player-disclosure').click()");await delay(350);
    const collapsed=await evaluate(`({height:document.querySelector('.chord-player').getBoundingClientRect().height,inert:document.querySelector('#player-content').inert,toggle:document.querySelector('#player-toggle').getBoundingClientRect().height})`);
    assert(collapsed.height<beforeHeight && collapsed.inert && collapsed.toggle>0);
    await evaluate("document.querySelector('#player-disclosure').click()");await delay(350);
    assert.equal(await evaluate("document.querySelectorAll('[data-move]').length"),0);
    const rects=await evaluate(`(()=>{document.querySelector('#progression').scrollIntoView({block:'center'});return [...document.querySelectorAll('.progression-card')].map(card=>{const r=card.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});})()`);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:rects[1].x,y:rects[1].y});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,x:rects[1].x,y:rects[1].y});
    for(let i=1;i<=8;i++){await send('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,x:rects[1].x+(rects[0].x-25-rects[1].x)*i/8,y:rects[1].y});await delay(25);}
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:rects[0].x-25,y:rects[0].y});
    await delay(250);
    assert.equal(await evaluate('progression[0].root'),5);
    await evaluate(`document.querySelector('#youtube-url').value='https://www.youtube.com/watch?v=M7lc1UVf-VE';document.querySelector('#youtube-form').requestSubmit();`);
    for(let i=0;i<220;i++) {if(await evaluate("!document.querySelector('#youtube-mark').disabled")) break;await delay(100);}
    const connection=await evaluate(`({status:document.querySelector('#youtube-status').textContent,ready:!document.querySelector('#youtube-mark').disabled,iframe:document.querySelector('#youtube-video-wrap iframe')?.src})`);
    if(!live) {
      assert.equal(connection.ready,true);
      await evaluate(`selectProgressionChord(0);document.querySelector('#youtube-cue-time').value='0';document.querySelector('#youtube-mark').click();selectProgressionChord(1);document.querySelector('#youtube-cue-time').value='10';document.querySelector('#youtube-mark').click();document.querySelector('#youtube-follow').click();testYoutube.time=12;`);
      await delay(150);assert.equal(await evaluate('root'),0);
      await evaluate('testYoutube.time=3');await delay(150);assert.equal(await evaluate('root'),5);
      await evaluate(`testYoutube.seekTo(12);document.querySelector('#youtube-use-time').click();`);
      assert.equal(await evaluate("document.querySelector('#youtube-cue-time').value"),'12.0');
      await evaluate(`document.querySelector('#youtube-cues [data-remove-cue="10"]').click();`);
      assert.equal(await evaluate("document.querySelectorAll('#youtube-cues li').length"),1);
      await evaluate(`document.querySelector('#youtube-record').click();testYoutube.time=20;document.querySelector('.progression-card[data-index="1"]').click();`);
      assert.equal(await evaluate("document.querySelectorAll('#youtube-cues li').length"),2);
      assert.equal(await evaluate("document.querySelector('#youtube-follow').checked"),false);
      assert.equal(await evaluate('Boolean(testYoutube.paused)'),false);
      await evaluate(`testYoutube.time=30;document.querySelector('.progression-card[data-index="0"]').click();document.querySelector('#youtube-record').click();testYoutube.time=22;`);
      await delay(150);assert.equal(await evaluate('root'),0);
      await evaluate('testYoutube.time=32');await delay(150);assert.equal(await evaluate('root'),5);
      await evaluate(`testYoutube.state=0;testYoutube.options.events.onStateChange({data:0});`);
      await delay(150);assert.equal(await evaluate('playingProgressionItem'),null);
      await evaluate('testYoutube.state=1');
      await evaluate(`document.querySelector('#player-toggle').click();`);await delay(150);
      assert.equal(await evaluate('testYoutube.paused'),true);
      assert.equal(await evaluate("document.querySelector('#youtube-follow').checked"),false);
      await evaluate(`testYoutube.options.events.onStateChange({data:1});`);
      assert.equal(await evaluate("document.querySelector('#player-toggle').textContent"),'Reproducir');
      await evaluate(`testYoutube.options.events.onError({data:150});`);
      assert((await evaluate("document.querySelector('#youtube-status').textContent")).includes('no permite'));
    }
    const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    fs.writeFileSync(path.join(os.tmpdir(),`traste-interface-${edge?'edge':'chrome'}.png`),Buffer.from(screenshot.data,'base64'));
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await delay(150);
    const mobile=await evaluate(`(()=>{const r=document.querySelector('.chord-player').getBoundingClientRect();return {width:r.width,viewport:innerWidth};})()`);
    assert(mobile.width<=390);
    assert(await evaluate(`(()=>{const r=document.querySelector('#youtube-video-wrap').getBoundingClientRect();return r.width>=200 && r.height>=200 && r.right<=innerWidth;})()`));
    const screenshotMobile=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    fs.writeFileSync(path.join(os.tmpdir(),`traste-interface-mobile-${edge?'edge':'chrome'}.png`),Buffer.from(screenshotMobile.data,'base64'));
    console.log(JSON.stringify({browser:(await send('Browser.getVersion')).product,dimensions,collapsed,mobile,youtube:live?'API real':'Doble controlado',connection,result:(!live || connection.ready)?'PASS':'CONEXIÓN EXTERNA NO CONFIRMADA'},null,2));
    if(live && !connection.ready) process.exitCode=2;
  } finally {
    for(const task of pending.values())clearTimeout(task.timer);
    socket?.close();browser.kill();server.closeAllConnections();server.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
