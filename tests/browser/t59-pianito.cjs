// Control focalizado de T-59; requiere Playwright local, sin capturas ni reportes.
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const {createServer} = require('../../server.cjs');
(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless:true});
    for (const width of [320, 1366]) for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({viewport:{width,height:740},reducedMotion:'reduce'});
      const errors=[];
      page.on('pageerror', error=>errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;document.body.dataset.mobileTab='mastil';},theme);
      const piano=page.locator('#song-tonality-piano');
      const key=pitch=>piano.locator(`[data-song-pitch="${pitch}"]`);
      await key(9).click();
      assert.equal(await page.locator('#song-tonality').inputValue(),'A');
      assert.equal(await key(9).getAttribute('aria-pressed'),'true');
      assert.equal(await page.evaluate(()=>document.activeElement.dataset.songPitch),'9');
      await page.locator('#song-tonality-minor').focus();
      await page.keyboard.press('Space');
      assert.equal(await page.locator('#song-tonality').inputValue(),'A:minor');
      assert.match(await page.locator('#key-signature-display').textContent(),/A Menor/);
      assert.equal(await page.evaluate(()=>document.activeElement.id),'song-tonality-minor');
      await key(3).focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#song-tonality').inputValue(),'D#:minor');
      await page.locator('#song-tonality').selectOption('Eb:minor');
      assert.equal(await key(3).getAttribute('aria-label'),'E♭ menor');
      assert.equal(await page.locator('#song-tonality-minor').isChecked(),true);
      await page.evaluate(()=>{document.querySelector('#song-title').value='Pianito T-59';document.querySelector('#song-save').click();});
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('traste.songs.v1')).songs[0]);
      assert.equal(saved.tonality,'Eb:minor');
      await page.locator('#song-tonality').selectOption('G');
      await page.evaluate(id=>{document.querySelector('#song-list').value=id;document.querySelector('#song-open').click();},saved.id);
      assert.equal(await page.locator('#song-tonality').inputValue(),'Eb:minor');
      assert.equal(await page.locator('#song-tonality-minor').isChecked(),true);
      assert.equal(await key(3).getAttribute('aria-pressed'),'true');
      assert.match(await page.locator('#key-signature-display').textContent(),/Eb Menor/);
      await page.locator('#song-tonality').selectOption('');
      assert.equal(await piano.locator('[aria-pressed="true"]').count(),0);
      assert.equal(await page.locator('#song-tonality-current').textContent(),'Sin tonalidad fija');
      const geometry=await page.evaluate(()=>{
        const p=document.querySelector('#song-tonality-piano').getBoundingClientRect();
        const r=document.querySelector('#root-piano').getBoundingClientRect();
        return {width:p.width,height:p.height,rootWidth:r.width,overflow:document.documentElement.scrollWidth>innerWidth};
      });
      assert.ok(geometry.width<=182 && geometry.height===84,JSON.stringify(geometry));
      if(width>800) assert.ok(geometry.width<geometry.rootWidth,'piano más reducido');
      assert.equal(geometry.overflow,false,`${width} ${theme}: sin desborde`);
      assert.deepEqual(errors,[]);
      console.log(`T-59: ${width}×740 ${theme}, clic, teclado, selector, mástil y guardar/reabrir OK`);
      await page.close();
    }
  } finally { if(browser) await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
