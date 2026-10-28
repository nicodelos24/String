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
      await page.evaluate(() => { document.querySelector('#panel-scroll').scrollTop = 550; });
      await page.waitForTimeout(100);
      const button = page.locator('#transport-minimize');
      const rect = await button.boundingBox();
      await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
      await page.waitForTimeout(300);
      const hit = await page.evaluate(() => {
        const el = document.querySelector('#tempo-tap-mic');
        const r = el.getBoundingClientRect();
        const target = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return { pressed: document.querySelector('#transport-minimize').getAttribute('aria-pressed'), accessible: target === el || el.contains(target), target: target && target.id };
      });
      assert.ok(hit.pressed === 'true' && hit.accessible, `captura minimizada: ${JSON.stringify(hit)}`);
      await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
      await page.waitForTimeout(100);
      assert.equal(await button.getAttribute('aria-pressed'), 'false');
      const restored = await page.locator('.transport-pill').boundingBox();
      assert.ok(restored.y >= 0 && restored.y + restored.height <= height);
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
