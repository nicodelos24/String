// Verificación en navegador real de: switch de tema (luna/sol), transporte con iconos
// a la izquierda con el panel plegado, y vista pentatónica por calidad de acorde.
const fs=require('node:fs'), os=require('node:os'), path=require('node:path'), http=require('node:http');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  const dump=path.join(os.tmpdir(),'traste-view-features');
  fs.mkdirSync(dump,{recursive:true});
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
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'traste-features-'));
  const executable=process.argv.includes('--edge')?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser=spawn(executable,['--headless=new','--mute-audio','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
  let socket;
  const pending=new Map();
  try {
    const portFile=path.join(profile,'DevToolsActivePort');
    let port;
    for(let i=0;i<300;i++) {
      try {const value=fs.readFileSync(portFile,'utf8').split('\n')[0].trim();if(/^\d+$/.test(value)) {port=value;break;}}
      catch {await delay(100);}
    }
    assert(port,'El navegador no publicó su puerto de depuración.');
    const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    let id=0;
    socket.onmessage=event=>{const data=JSON.parse(event.data), task=pending.get(data.id);if(task){pending.delete(data.id);clearTimeout(task.timer);data.error?task.reject(new Error(data.error.message)):task.resolve(data.result);}};
    const send=(method,params={})=>new Promise((resolve,reject)=>{const request=++id;const timer=setTimeout(()=>{pending.delete(request);reject(new Error('Timeout '+method));},20000);pending.set(request,{resolve,reject,timer});socket.send(JSON.stringify({id:request,method,params}));});
    const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
    const shoot=async name=>{const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});const file=path.join(dump,name);fs.writeFileSync(file,Buffer.from(shot.data,'base64'));return file;};
    await send('Page.enable');
    await send('Page.navigate',{url:address});
    for(let i=0;i<200;i++){if(await evaluate("!!document.querySelector('#theme-toggle .theme-sky') && !!document.querySelector('#pentatonic-view')"))break;await delay(50);}
    assert(await evaluate("!!document.querySelector('#theme-toggle .theme-sky')"),'La app no terminó de iniciar.');

    // 1) Switch de tema: role switch, cielo/luna/sol y persistencia.
    const theme=await evaluate(`(()=>{
      const button=document.querySelector('#theme-toggle');
      const before={theme:document.documentElement.dataset.theme,checked:button.getAttribute('aria-checked'),sky:getComputedStyle(button.querySelector('.theme-sky')).backgroundImage};
      button.click();
      return {before,after:{theme:document.documentElement.dataset.theme,checked:button.getAttribute('aria-checked'),stored:localStorage.getItem('string.theme'),sky:getComputedStyle(button.querySelector('.theme-sky')).backgroundImage,label:button.getAttribute('aria-label')}};
    })()`);
    assert.equal(theme.before.theme,'light');
    assert.equal(theme.after.theme,'dark');
    assert.equal(theme.after.checked,'true');
    assert.equal(theme.after.stored,'dark');
    assert(theme.before.sky!==theme.after.sky);
    const shotLight=await shoot('1-tema-oscuro.png');
    await evaluate("document.querySelector('#theme-toggle').click();");
    assert.equal(await evaluate("document.documentElement.dataset.theme"),'light');
    const shotLight2=await shoot('1-tema-claro.png');

    // 2) Transporte: iconos de play/pausa a la izquierda y visibles al plegar Acompañamiento.
    const transport=await evaluate(`(()=>{
      const disclosure=document.querySelector('#player-disclosure');
      if(disclosure.getAttribute('aria-expanded')!=='false')disclosure.click();
      const toggle=document.querySelector('#player-toggle');
      const midi=document.querySelector('#midi-play');
      return {collapsed:disclosure.getAttribute('aria-expanded'),contentInert:document.querySelector('#player-content').inert,
        playHeight:toggle.getBoundingClientRect().height, playIcon:!!toggle.querySelector('svg path'),
        midiIcon:!!midi.querySelector('svg path'), youtubeIcon:!!document.querySelector('#youtube-toggle').querySelector('svg path'),
        playLeftOf:disclosure.getBoundingClientRect().left>toggle.getBoundingClientRect().left};
    })()`);
    assert.equal(transport.collapsed,'false');
    assert.equal(transport.contentInert,true);
    assert(transport.playHeight>=30 && transport.playIcon && transport.midiIcon && transport.youtubeIcon);
    assert(transport.playLeftOf);
    await delay(300);
    const shotTransport=await shoot('2-transporte-plegado.png');

    // 3) Vista pentatónica según calidad de cada acorde, con switch y título/armadura coherentes.
    const pentatonic=await evaluate(`(()=>{
      progression=[{root:0,type:'maj',mode:'ionian',rootNoteName:'C'},{root:9,type:'m',mode:'aeolian',rootNoteName:'A'}];
      selectProgressionChord(0);
      const normal=document.querySelector('#board-title').textContent;
      document.querySelector('#pentatonic-view').click();
      const major=document.querySelector('#board-title').textContent;
      const signatureMajor=document.querySelector('#key-signature-display').textContent;
      selectProgressionChord(1);
      const minor=document.querySelector('#board-title').textContent;
      const signatureMinor=document.querySelector('#key-signature-display').textContent;
      selectProgressionChord(0);
      const backMajor=document.querySelector('#board-title').textContent;
      document.querySelector('#pentatonic-view').click();
      const off=document.querySelector('#board-title').textContent;
      return {normal,major,signatureMajor,minor,signatureMinor,backMajor,off,checked:document.querySelector('#pentatonic-view').checked};
    })()`);
    assert(pentatonic.normal.includes('Jónico'));
    assert(pentatonic.major.includes('Pentatónica mayor'));
    assert(pentatonic.signatureMajor.startsWith('C Mayor'));
    assert(pentatonic.minor.includes('Pentatónica menor'));
    assert(pentatonic.signatureMinor.startsWith('C Mayor'));
    assert(pentatonic.backMajor.includes('Pentatónica mayor'));
    assert(!pentatonic.checked);
    assert(pentatonic.off.includes('Jónico'));
    await evaluate("document.querySelector('#pentatonic-view').click();");
    await delay(300);
    const shotPentatonic=await shoot('3-pentatonica-por-acorde.png');

    console.log(JSON.stringify({result:'PASS',theme,transport,pentatonic,screenshots:{light:[shotLight,shotLight2],transport:shotTransport,pentatonic:shotPentatonic}},null,2));
  } finally {
    for(const task of pending.values())clearTimeout(task.timer);
    socket?.close();browser.kill();server.closeAllConnections();server.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});