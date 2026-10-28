// Ejecutar con PLAYWRIGHT_PATH apuntando al paquete Playwright instalado localmente.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { createServer } = require('../../server.cjs');
(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [801, 1024, 1100, 1101, 1280, 1366]) for (const height of [768]) for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      await page.waitForTimeout(300);
      const rest = await page.evaluate(() => {
        const rect = s => document.querySelector(s).getBoundingClientRect().toJSON();
        return { intro: rect('.intro'), box: rect('.progression-view-controls') };
      });
      assert.ok(Math.abs(rest.intro.y - 78) < 1, `intro en reposo: ${rest.intro.y}`);
      if (width === 1024 || width === 1366) {
        const expected = width === 1024 ? { x: 46.59, y: 491.06, width: 916.8, height: 112 } : { x: 55.16, y: 505.03, width: 1241.69, height: 59 };
        for (const key of Object.keys(expected)) assert.ok(Math.abs(rest.box[key] - expected[key]) < 2, `reposo ${width} ${key}: ${JSON.stringify(rest.box)}`);
      }
      for (const position of [150, 300, 450, 550, 600]) {
      await page.evaluate(position => { document.querySelector('#panel-scroll').scrollTop = position; }, position);
      await page.waitForTimeout(100);
      const expanded = await page.evaluate(() => {
        const pill = document.querySelector('.transport-pill');
        const capture = document.querySelector('.capture-row');
        const rect = pill.getBoundingClientRect();
        return { height: rect.height, top: rect.top, bottom: rect.bottom, inside: pill.contains(capture) };
      });
      assert.ok(expanded.inside && (width < 1366 || expanded.height < 59) && expanded.top >= 0 && expanded.bottom <= height, `cápsula expandida: ${JSON.stringify(expanded)}`);
      }
      const button = page.locator('#transport-minimize');
      for (const position of [150, 300, 450, 550, 600]) {
        await page.evaluate(position => { document.querySelector('#panel-scroll').scrollTop = position; }, position);
        await page.waitForTimeout(100);
        let rect = await button.boundingBox();
        await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
        await page.waitForTimeout(100);
        assert.equal(await button.getAttribute('aria-pressed'), 'true');
        const hits = await page.evaluate(() => [...document.querySelector('.capture-row').querySelectorAll('button,input,summary')].map(el => {
          const surface = el.matches('input') && el.closest('label') || el;
          const r = surface.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return { control: el.id || el.getAttribute('aria-label'), reachable: hit === surface || surface.contains(hit) };
        }));
        assert.ok(hits.every(hit => hit.reachable), `captura ${width} ${position}: ${JSON.stringify(hits)}`);
        for (const selector of ['#enter-on-note', '#follow-midi']) {
          const before = await page.locator(selector).isChecked();
          const label = page.locator(selector).locator('..');
          const bounds = await label.boundingBox();
          await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
          assert.notEqual(await page.locator(selector).isChecked(), before, `clic ${selector} ${width} ${position}`);
        }
        rect = await button.boundingBox();
        await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
        await page.waitForTimeout(100);
        assert.equal(await button.getAttribute('aria-pressed'), 'false');
        const restored = await page.locator('.transport-pill').boundingBox();
        assert.ok(restored.y >= 0 && restored.y + restored.height <= height);
      }
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
