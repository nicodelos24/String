// Prueba con Chrome/Edge real mediante CDP, sin dependencias de npm.
// Ejecutar: node scripts/check-player-browser.cjs
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {pathToFileURL} = require('node:url');
const assert = require('node:assert/strict');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const root = path.resolve(__dirname, '..');

(async () => {
  const executable = process.env.CHROME_PATH || (process.argv.includes('--edge')
    ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  ].find(file => fs.existsSync(file)));
  if (!executable) throw new Error('Definir CHROME_PATH con la ruta a Chrome o Edge.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'traste-browser-'));
  const browser = spawn(executable, ['--headless=new', '--mute-audio', '--no-first-run',
    '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
    {windowsHide:true, stdio:['ignore','ignore','pipe']});
  let browserLog = '';
  browser.stderr.on('data', data => {browserLog += data.toString();});
  let socket;
  const pending = new Map();
  try {
    const portFile = path.join(profile,'DevToolsActivePort');
    for (let i=0; i<300 && !fs.existsSync(portFile) && browser.exitCode === null; i++) await delay(100);
    if (!fs.existsSync(portFile)) throw new Error(`No inició el navegador (${browser.exitCode}): ${browserLog}`);
    const port = fs.readFileSync(portFile,'utf8').split('\n')[0];
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve,reject) => {socket.onopen = resolve; socket.onerror = reject;});
    let id = 0;
    socket.onmessage = event => {
      const data = JSON.parse(event.data);
      const request = pending.get(data.id);
      if (request) {pending.delete(data.id); clearTimeout(request.timeout);
        data.error ? request.reject(new Error(data.error.message)) : request.resolve(data.result);}
    };
    const send = (method,params = {}) => new Promise((resolve,reject) => {
      const requestId = ++id;
      const timeout = setTimeout(() => {pending.delete(requestId); reject(new Error(`Timeout: ${method}`));},15000);
      pending.set(requestId,{resolve,reject,timeout});
      socket.send(JSON.stringify({id:requestId,method,params}));
    });
    const evaluate = async expression => {
      const response = await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});
      if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
      return response.result.value;
    };
    await send('Page.navigate',{url:pathToFileURL(path.join(root,'index.html')).href});
    for (let i=0;i<100;i++) {
      if (await evaluate("typeof ProgressionPlayer !== 'undefined' && !!document.querySelector('#player-toggle')")) break;
      await delay(100);
    }
    const version = await send('Browser.getVersion');
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    if (process.argv.includes('--progression')) {
      const editing = await evaluate(`(() => {
        document.querySelector('input[name="mode"][value="mixolydian"]').click();
        document.querySelector('#add-chord').click();
        document.querySelector('#root-piano [data-pitch="2"]').click();
        document.querySelector('input[name="quality"][value="minor"]').click();
        document.querySelector('input[name="mode"][value="dorian"]').click();
        document.querySelector('#add-chord').click();
        for(let i=0;i<4;i++) document.querySelector('[data-remove="0"]').click();
        const saved=progression.map(item=>({root:item.root,type:item.type,mode:item.mode}));
        document.querySelector('#progression [data-index="1"]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',altKey:true,bubbles:true}));
        const moved=progression.map(item=>item.root);
        document.querySelector('#progression [data-index="0"]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',altKey:true,bubbles:true}));
        window.boardStates=[];
        new MutationObserver(()=>boardStates.push(document.querySelector('#board-title').textContent))
          .observe(document.querySelector('#board-title'),{childList:true});
        document.querySelector('#player-bpm').value='240';
        document.querySelector('#player-loop').checked=false;
        document.querySelector('#player-toggle').click();
        return {saved,moved,order:progression.map(item=>item.root)};
      })()`);
      assert.deepEqual(editing.saved,[{root:0,type:'7',mode:'mixolydian'},{root:2,type:'m7',mode:'dorian'}]);
      assert.deepEqual(editing.moved,[2,0]);
      assert.deepEqual(editing.order,[0,2]);
      for(let i=0;i<120;i++) {
        if(await evaluate("document.querySelector('#player-status').textContent==='Detenido'")) break;
        await delay(100);
      }
      const following=await evaluate(`({titles:boardStates,status:document.querySelector('#player-status').textContent,
        active:activeProgression,mode:selectedMode,playing:playingProgressionItem})`);
      assert(following.titles.some(title=>title.includes('C7') && title.includes('Mixolidio')));
      assert(following.titles.some(title=>title.includes('Dm7') && title.includes('Dórico')));
      assert.equal(following.status,'Detenido');
      assert.equal(following.active,1);
      assert.equal(following.playing,null);
      console.log(JSON.stringify({browser:version.product,editing,following,result:'PASS'},null,2));
      return; // Esta comprobación no escribe documentación ni evidencia en docs/.
    }
    await evaluate(`
      window.trace = {notes:[], states:[]};
      const originalOscillator = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function() {
        const node = originalOscillator.call(this);
        const start = node.start.bind(node);
        node.start = time => {trace.notes.push({frequency:node.frequency.value,time}); return start(time);};
        return node;
      };
      new MutationObserver(() => trace.states.push(document.querySelector('#player-status').textContent))
        .observe(document.querySelector('#player-status'),{childList:true});
      document.querySelector('#player-bpm').value = '240';
      document.querySelector('#player-loop').checked = true;
      document.querySelector('#player-toggle').click();
    `);
    // Esperar el estado real: activar AudioContext puede llevar más tiempo en algunos equipos.
    for (let i=0;i<150;i++) {
      if (await evaluate(`trace.states.filter(state => state.includes('acorde 1 de 4')).length >= 2
        || document.querySelector('#player-status').textContent.includes('No se pudo')`)) break;
      await delay(100);
    }
    const playback = await evaluate(`({status:document.querySelector('#player-status').textContent,
      button:document.querySelector('#player-toggle').textContent, notes:trace.notes, states:trace.states})`);
    const diagnostic = await evaluate(`(async () => {
      const probe = new ProgressionPlayer();
      try {await probe.start([{name:'C',notes:[48,52,55]}],{bpm:240}); probe.stop(); return 'OK';}
      catch(error) {return error.stack;}
    })()`);
    await evaluate("document.querySelector('#player-toggle').click()");
    const stopped = await evaluate("document.querySelector('#player-status').textContent");
    let edited;
    if (!process.argv.includes('--baseline')) {
      await evaluate(`
        progression = [{root:6,rootNoteName:'F#',type:'m'}]; renderProgression();
        trace.notes = []; trace.states = [];
        document.querySelector('#player-loop').checked = false;
        document.querySelector('#player-toggle').click();
      `);
      for (let i=0;i<100;i++) {
        if (await evaluate("document.querySelector('#player-status').textContent === 'Detenido'")) break;
        await delay(100);
      }
      edited = await evaluate(`({notes:trace.notes, states:trace.states,
        status:document.querySelector('#player-status').textContent})`);
    }
    let rhythms, audioLevels;
    if (process.argv.includes('--rhythms')) {
      await evaluate(`
        const originalBufferSource = AudioContext.prototype.createBufferSource;
        AudioContext.prototype.createBufferSource = function() {
          const node = originalBufferSource.call(this);
          const start = node.start.bind(node);
          node.start = time => {trace.drums.push(time); return start(time);};
          return node;
        };
      `);
      rhythms = [];
      for (const style of ['pop','jazz','trap','funk','bossa','reggaeton']) {
        await evaluate(`
          trace.notes=[]; trace.drums=[]; trace.states=[];
          document.querySelector('#player-style').value='${style}';
          document.querySelector('#player-toggle').click();
        `);
        const locked = await evaluate("document.querySelector('#player-style').disabled");
        for (let i=0;i<100;i++) {
          if (await evaluate("document.querySelector('#player-status').textContent === 'Detenido'")) break;
          await delay(100);
        }
        const result = await evaluate(`({style:'${style}',notes:trace.notes.length,drums:trace.drums.length,
          status:document.querySelector('#player-status').textContent,unlocked:!document.querySelector('#player-style').disabled})`);
        rhythms.push({...result,locked});
        assert.equal(result.status,'Detenido');
        assert.equal(result.drums,({pop:10,jazz:10,trap:17,funk:14,bossa:11,reggaeton:12})[style]);
        assert.equal(result.notes,({pop:8,jazz:11,trap:6,funk:18,bossa:16,reggaeton:14})[style]);
        assert(locked && result.unlocked);
      }
      audioLevels = await evaluate(`(async () => {
        const results=[];
        const inputs = Array.from({length:12},(_,root)=>({name:'root-'+root,notes:chordToMidi(root,[0,4,7]),style:'none'}));
        inputs.push(...['pop','jazz','trap','funk','bossa','reggaeton'].map(style=>({name:style,notes:[48,52,55,59],style})));
        for (const input of inputs) {
          const ctx = new OfflineAudioContext(1,44100*2,44100);
          const player = new ProgressionPlayer();
          player.context=ctx; player.duration=1; player.style=input.style; player.percussion=true;
          player.connectOutput(); player.master.gain.value=0.35;
          player.scheduleBar(input,0.04);
          const buffer=await ctx.startRendering();
          const samples=buffer.getChannelData(0);
          let peak=0,energy=0;
          for(let i=4410;i<35280;i++){peak=Math.max(peak,Math.abs(samples[i]));energy+=samples[i]*samples[i];}
          let tail=0; for(let i=57330;i<samples.length;i++) tail=Math.max(tail,Math.abs(samples[i]));
          results.push({name:input.name,peak,rms:Math.sqrt(energy/(35280-4410)),tail});
        }
        return results;
      })()`);
      assert(audioLevels.every(level=>Number.isFinite(level.rms) && level.rms>0.001 && level.peak<0.95 && level.tail<0.00001));
      const chordRms = audioLevels.slice(0,12).map(level=>level.rms);
      assert(Math.max(...chordRms)/Math.min(...chordRms)<2);
      if (!process.argv.includes('--no-artifacts')) {
        const screenshot = await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
        fs.writeFileSync(path.join(root,`docs/qa/evidencia/ritmos-${process.argv.includes('--edge')?'edge':'chrome'}.png`),Buffer.from(screenshot.data,'base64'));
      }
    }
    const report = {date:new Date().toISOString(),browser:version.product,mode:'headless, file://, audio silenciado',
      playback,diagnostic,stopped,edited,rhythms,audioLevels};
    const suffix = process.argv.includes('--rhythms') ? (process.argv.includes('--edge')?'ritmos-edge':'ritmos-chrome')
      : process.argv.includes('--baseline') ? 'antes' : process.argv.includes('--edge') ? 'despues-edge' : 'despues';
    if (!process.argv.includes('--no-artifacts')) fs.writeFileSync(path.join(root,`docs/qa/evidencia/reproductor-${suffix}.json`),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
    if (!process.argv.includes('--baseline')) {
      assert.equal(diagnostic,'OK');
      assert.equal(playback.button,'Detener');
      assert(playback.states.some(state => state.includes('Fm7')));
      assert(playback.states.some(state => state.includes('G7')));
      assert(playback.states.filter(state => state.includes('acorde 1 de 4')).length >= 2);
      assert.equal(stopped,'Detenido');
      assert.equal(edited.notes.length,3);
      assert(Math.abs(edited.notes[0].frequency - 184.997) < 0.01);
      assert(edited.states.some(state => state.includes('F#m')));
      assert.equal(edited.status,'Detenido');
    }
  } finally {
    for (const request of pending.values()) clearTimeout(request.timeout);
    if (socket) socket.close();
    browser.kill();
    // Se conserva el perfil temporal aislado; nunca se usa el perfil personal.
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
