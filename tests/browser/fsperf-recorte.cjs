// FS-PERF-02. Chromium real: herencia local, borde y hit-test conservados.
// PLAYWRIGHT_PATH=/ruta/playwright node tests/browser/fsperf-recorte.cjs
// FSPERF_EVIDENCE_DIR opcional; sin él no produce capturas.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const {createServer} = require('../../server.cjs');
const base = '44c15c7d646c868dc9b1ae93767c45eadaf2ab9e';
const root = path.join(__dirname, '../..');
const baseCSS = execFileSync('git', ['show', `${base}:style.css`], {cwd: root, encoding: 'utf8'});
const evidence = process.env.FSPERF_EVIDENCE_DIR;
const measurements = [];
const near = (a,b,label) => assert.ok(Math.abs(a-b)<0.1, `${label}: ${a} != ${b}`);
const settle = page => page.waitForTimeout(180);
async function measure(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('.panel-scroll');
    const cs = panel && getComputedStyle(panel);
    const before = panel && getComputedStyle(panel, '::before');
    const rect = selector => {
      const r = document.querySelector(selector)?.getBoundingClientRect();
      return r && {top:r.top,left:r.left,width:r.width,height:r.height};
    };
    const y = panel?.getBoundingClientRect().top + (parseFloat(cs?.getPropertyValue('--panel-recorte'))||0);
    // Probar el hit test en el margen lateral, fuera de banda/franja pero
    // dentro del área horizontal del panel (el viejo contenido no debe pasar).
    const hit = y>4 && y<innerHeight ? document.elementFromPoint(14,y-2) : null;
    return {scroll:scrollY,doc:document.documentElement.scrollHeight,
      panel:rect('.panel-scroll'),strip:rect('.panel-strip'),pill:rect('.transport-pill'),band:rect('.cards-band'),
      clip:cs?.clipPath,recorte:parseFloat(cs?.getPropertyValue('--panel-recorte'))||0,
      childRecorte:panel && getComputedStyle(panel.querySelector('.workspace')).getPropertyValue('--panel-recorte').trim(),
      borderTop:parseFloat(before?.top)||0,hiddenHit:!!hit && panel?.contains(hit),
      floating:document.querySelector('.transport-row').classList.contains('is-floating')};
  });
}
async function scene(browser,url,width,theme,isBase) {
  const context = await browser.newContext({viewport:{width,height:900},colorScheme:theme});
  const page = await context.newPage();const errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
  if(isBase) await page.route(/\/style\.css(?:\?.*)?$/,r=>r.fulfill({contentType:'text/css',body:baseCSS}));
  try {
    await page.goto(url,{waitUntil:'networkidle'});await settle(page);
    if(await page.locator('html').getAttribute('data-theme')!==theme) await page.locator('#theme-toggle').click();
    if(width<=800) {await page.locator('[data-mobile-tab="progresion"]').click();await settle(page);}
    const states=[];
    const sequence = width>800
      ? [['arriba',0,false],['anclado',600,false],['minimizado',600,true],['restaurado',600,true],['regreso',0,false]]
      : [['arriba',0,false],['respaldo-scroll',600,false],['regreso',0,false]];
    for(const [name,y,minimize] of sequence) {
      if(minimize) await page.locator('#transport-minimize').click();
      await page.evaluate(y=>scrollTo(0,y),y);await settle(page);
      const state={name,...await measure(page)};states.push(state);
      if(width>800 && y>0) {
        assert.ok(state.floating, 'conservar anclaje');
        assert.ok(state.clip.startsWith('inset('), 'conservar recorte visual y hit-test');
        assert.equal(state.hiddenHit,false,'contenido recortado no recibe clic');
        near(state.borderTop,state.recorte,'el borde acompaña exactamente el recorte');
        if(!isBase) assert.equal(state.childRecorte,'0px','el recorte NO se hereda al contenido');
      }
      if(evidence && !isBase && width===1366 && theme==='light' && ['arriba','anclado'].includes(name)) {
        await page.screenshot({path:path.join(evidence,`${name}.png`)});
      }
    }
    assert.deepEqual(errors,[],'sin errores JavaScript');
    return states;
  } finally {await context.close();}
}
(async()=>{
  if(evidence)fs.mkdirSync(evidence,{recursive:true});
  const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;
  try {
    browser=await chromium.launch({headless:true});
    const url=`http://127.0.0.1:${server.address().port}/`;
    for(const width of [1366,801,390])for(const theme of ['light','dark']) {
      const before=await scene(browser,url,width,theme,true);
      const after=await scene(browser,url,width,theme,false);
      for(let i=0;i<before.length;i++) {
        for(const key of ['scroll','doc','recorte','borderTop'])near(after[i][key],before[i][key],`${width}/${theme}/${before[i].name}/${key}`);
        for(const selector of ['panel','strip','pill','band']) {
          assert.equal(!!after[i][selector],!!before[i][selector]);
          if(before[i][selector])for(const key of ['top','left','width','height']) near(after[i][selector][key],before[i][selector][key],`${width}/${theme}/${before[i].name}/${selector}/${key}`);
        }
        assert.equal(after[i].clip,before[i].clip,'mismo clip calculado');
      }
      measurements.push({width,theme,before,after});
    }
    console.log('FS-PERF: aislamiento de herencia, recorte/hit-test y geometría base/candidato OK (1366/801/390 × claro/oscuro)');
  } finally {
    if(evidence)fs.writeFileSync(path.join(evidence,'guard-measurements.json'),JSON.stringify({base,measurements},null,2));
    if(browser)await browser.close();await new Promise(r=>server.close(r));
  }
})().catch(e=>{console.error(e);process.exitCode=1});
