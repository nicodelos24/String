// PLAYWRIGHT_PATH debe apuntar a Playwright instalado localmente.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { createServer } = require('../../server.cjs');
(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless: true});
  try {
    for (const width of [375, 801, 1280]) for (const theme of ['light', 'dark']) for (const row of [false, true]) {
      const page = await browser.newPage({viewport: {width, height: 768}, reducedMotion: 'reduce'});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.evaluate(({theme, row}) => {
        document.documentElement.dataset.theme = theme;
        document.body.dataset.mobileTab = "progresion";
        while (document.querySelectorAll('.progression-card').length < 24) document.querySelector('#legend-add-chord').click();
        if (row) document.querySelector('#progression-view').click();
        const list = document.querySelector('#progression'); list.scrollTop = 0; list.scrollLeft = 0;
      }, {theme, row});
      const visible = async index => page.evaluate(index => {
        const list = document.querySelector('#progression'), card = list.querySelector(`[data-index="${index}"]`);
        const a = list.getBoundingClientRect(), b = card.getBoundingClientRect();
        return {card: b.toJSON(), bounds: a.toJSON(), playing: list.querySelector(".playing")?.dataset.index, visible: b.left >= a.left - 1 && (b.right <= a.right + 1 || b.width > a.width) && b.top >= a.top - 1 && (b.bottom <= a.bottom + 1 || b.height > a.height), top: list.scrollTop, left: list.scrollLeft};
      }, index);
      await page.evaluate(() => selectProgressionChord(20));
      let state = await visible(20);
      assert.ok(state.visible && (state.top > 0 || state.left > 0), `selección lejana ${width} ${theme} fila=${row}: ${JSON.stringify(state)}`);
      // El mismo punto de entrada es usado por cada cambio del reproductor.
      for (const index of [21, 22, 23, 0, 1]) {
        await page.evaluate(index => showProgressionChord(progression[index], index), index);
        assert.ok((await visible(index)).visible, `seguimiento ${index} ${width} ${theme} fila=${row}`);
      }
      await page.evaluate(() => { document.querySelector('#player-card-start').checked = false; });
      await page.locator('.progression-card[data-index="0"] strong').click();
      assert.ok((await visible(0)).visible, 'el clic manual mantiene la tarjeta visible');
      await page.evaluate(() => { document.body.dataset.mobileTab = 'progresion'; const list = document.querySelector('#progression'); list.scrollTop = 0; list.scrollLeft = 0; list.scrollIntoView({block: 'start'}); });
      const point = await page.evaluate(() => {
        const el = document.querySelector('#progression .progression-card');
        const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + 15;
        const hit = document.elementFromPoint(x, y);
        return {x, y, hit: hit?.outerHTML.slice(0, 160), reachable: hit === el || el.contains(hit)};
      });
      assert.ok(point.reachable, `tarjeta accesible ${width} ${theme} fila=${row}: ${JSON.stringify(point)}`);
      await page.mouse.move(point.x, point.y);
      await page.mouse.wheel(0, 220);
      await page.waitForTimeout(100);
      if (!row) assert.ok(await page.evaluate(() => document.querySelector('#progression').scrollTop > 0), 'rueda desplaza la banda');
      if (width === 1280 && theme === 'light' && !row) {
        await page.evaluate(() => {
          document.querySelector('#player-card-start').checked = true;
          document.querySelector('#player-bpm').value = 120;
          progression.forEach(item => { item.beats = 4; });
          selectProgressionChord(22);
        });
        await page.locator('.progression-card[data-index="22"] strong').click();
        for (const index of [22, 23, 0]) {
          await page.waitForFunction(index => document.querySelector('.progression-card.playing')?.dataset.index === String(index), index, {timeout: 15000});
          const reproduccion = await visible(index);
          assert.ok(reproduccion.visible, `reproducción real y vuelta: ${index} ${JSON.stringify(reproduccion)}`);
        }
        await page.locator('#player-toggle').click();
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('T-62: 12 combinaciones Chromium verificadas');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
