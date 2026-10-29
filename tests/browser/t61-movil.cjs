// T-61: rueda real y accesibilidad de Improvisar en móvil.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { createServer } = require('../../server.cjs');
(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width: 320, height: 740 }, reducedMotion: 'reduce' });
      const url = `http://127.0.0.1:${server.address().port}`;
      await page.route('**/*', route => route.request().url().startsWith(url) ? route.continue() : route.abort());
      await page.goto(url);
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      await page.locator('[data-mobile-tab="progresion"]').click();
      await page.mouse.move(160, 500);
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(250);
      const hit = await page.locator('.improvisation-switch').evaluate(el => {
        const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
        const target = document.elementFromPoint(x, y);
        return { x, y, scroll: scrollY, target: target && (target.id || target.className), ok: target === el || el.contains(target) };
      });
      assert.ok(hit.scroll > 0 && hit.y >= 0 && hit.y < 740 && hit.ok, `${theme}: ${JSON.stringify(hit)}`);
      let clicks = 0;
      await page.exposeFunction('t61Click', () => { clicks++; });
      await page.locator('.improvisation-switch').evaluate(el => el.addEventListener('click', e => { if (e.isTrusted) window.t61Click(); }));
      await page.mouse.click(hit.x, hit.y);
      assert.ok(clicks > 0, `clic real en Improvisar ${theme}`);
      for (const selector of ['#tempo-tap-mic', '#enter-on-note', '#follow-midi', '#accompaniment-mute', '#tempo-tap', '#transport-minimize']) {
        const reachable = await page.locator(selector).evaluate(el => {
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return !!hit && (hit === el || el.contains(hit));
        });
        assert.ok(reachable, `${theme}: ${selector} accesible`);
      }
      await page.locator('#transport-minimize').click();
      await page.waitForTimeout(100);
      const mini = await page.locator('.improvisation-switch').evaluate(el => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!hit && (hit === el || el.contains(hit));
      });
      assert.ok(mini, `${theme}: Improvisar accesible con barra minimizada`);
      await page.locator('#transport-minimize').click();
      await page.mouse.move(160, 650);
      await page.mouse.wheel(0, -600);
      await page.waitForTimeout(250);
      assert.equal(await page.evaluate(() => scrollY), 0, `${theme}: vuelta al reposo`);
      assert.equal(await page.locator('.transport-row').evaluate(el => el.classList.contains('is-floating')), false);
      await page.close();
    }
    console.log('T-61: rueda y clic móvil aprobados');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
