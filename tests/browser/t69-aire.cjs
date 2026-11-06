// T-69 · Chromium real, base exacta 077eeb3 contra el CSS de esta entrega.
// PLAYWRIGHT_PATH=/ruta/playwright node tests/browser/t69-aire.cjs
// T69_EVIDENCE_DIR opcional: capturas antes/después y medidas.json.
// T69_BASE_ROOT opcional: copia de 077eeb3; por defecto se lee con git show.
// T69_EXTERNAL=1: repetir con las fuentes externas reales (sin bloqueo de red).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const {createServer} = require('../../server.cjs');
const base = '077eeb3cd80d71a06f495c0eee4c48d6149ba58a';
const baseCSS = process.env.T69_BASE_ROOT
  ? fs.readFileSync(path.join(process.env.T69_BASE_ROOT, 'style.css'), 'utf8')
  : execFileSync('git', ['show', `${base}:style.css`], {cwd: path.join(__dirname, '../..'), encoding: 'utf8'});
const evidence = process.env.T69_EVIDENCE_DIR;
const measurements = [];
if (evidence) fs.mkdirSync(evidence, {recursive: true});
const settle = page => page.waitForTimeout(250);
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 0.6,
  `${message}: ${actual} ≠ ${expected}`);

async function measure(page, state) {
  return page.evaluate(state => {
    const rect = selector => document.querySelector(selector)?.getBoundingClientRect().toJSON() || null;
    const strip = document.querySelector('.panel-strip');
    const pill = rect('.transport-pill');
    const band = rect('.cards-band');
    const floating = document.querySelector('.transport-row').classList.contains('is-floating');
    const minimized = document.querySelector('.transport-row').classList.contains('is-transport-minimized');
    const selectors = ['#progression-view', '#accompaniment-mute', '#tempo-play', '#tempo-tap',
      '#tempo-tap-bpm', '#transport-minimize', '#improvisation-toggle', '#tempo-tap-mic',
      '#enter-on-note', '#follow-midi'];
    const hits = selectors.map(selector => {
      const control = document.querySelector(selector);
      const surface = control.matches('input[type=checkbox]') ? control.closest('label') : control;
      const r = surface.getBoundingClientRect();
      if (!r.width || !r.height) return {selector, hidden: true};
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return {selector, reachable: hit === surface || surface.contains(hit)};
    });
    return {state, scroll: scrollY, docHeight: document.documentElement.scrollHeight,
      docWidth: document.documentElement.scrollWidth, viewport: innerWidth,
      theme: document.documentElement.dataset.theme, floating, minimized,
      padding: strip ? [getComputedStyle(strip).paddingTop, getComputedStyle(strip).paddingBottom] : null,
      strip: rect('.panel-strip'), pill, band, workspace: rect('.workspace'),
      upperGap: pill.top - band.bottom,
      lowerGap: strip ? strip.getBoundingClientRect().bottom - pill.bottom : null, hits};
  }, state);
}

async function controls(page) {
  // Clic real y activación por teclado en los controles que suben 10 px.
  const mute = page.locator('#accompaniment-mute');
  const before = await mute.getAttribute('aria-pressed');
  await mute.click();
  assert.notEqual(await mute.getAttribute('aria-pressed'), before, 'clic Silencio');
  await mute.focus();
  await page.keyboard.press('Space');
  assert.equal(await mute.getAttribute('aria-pressed'), before, 'teclado Silencio');
  assert.ok(await mute.evaluate(el => el === document.activeElement), 'foco conservado');
  const bpm = page.locator('#tempo-tap-bpm');
  const original = await bpm.inputValue();
  await bpm.click();
  await page.keyboard.press('ArrowUp');
  assert.equal(Number(await bpm.inputValue()), Number(original) + 1, 'BPM editable');
  await page.keyboard.press('ArrowDown');
  assert.equal(await bpm.inputValue(), original, 'BPM restaurado');
  const play = page.locator('#tempo-play');
  const stopped = await play.getAttribute('aria-pressed');
  await play.click();
  await settle(page);
  assert.notEqual(await play.getAttribute('aria-pressed'), stopped, 'Play accesible');
  await play.click();
  await settle(page);
  assert.equal(await play.getAttribute('aria-pressed'), stopped, 'Stop accesible');
  const follow = page.locator('#follow-midi');
  const checked = await follow.isChecked();
  await follow.click();
  assert.equal(await follow.isChecked(), !checked, 'captura accesible');
  await follow.click();
}

async function collect(browser, origin, width, theme, before) {
  const page = await browser.newPage({viewport: {width, height: 740}, reducedMotion: 'reduce'});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // Fuentes/recursos externos no deben introducir diferencias entre las dos páginas.
  await page.route('**/*', route => {
    const url = route.request().url();
    if (!url.startsWith(`${origin}/`)) return process.env.T69_EXTERNAL === '1' ? route.continue() : route.abort();
    if (before && new URL(url).pathname === '/style.css')
      return route.fulfill({contentType: 'text/css', body: baseCSS});
    return route.continue();
  });
  await page.addInitScript(theme => localStorage.setItem('string.theme', theme), theme);
  const states = [];
  async function record(name, screenshot = false) {
    await settle(page);
    const state = await measure(page, name);
    assert.equal(state.theme, theme, 'tema real de la app, no sólo prefers-color-scheme');
    assert.ok(state.docWidth <= width, `${name}: sin overflow horizontal`);
    if (width > 800 && state.floating) {
      assert.ok(state.pill.top >= state.band.bottom && state.pill.bottom <= 740, `${name}: cápsula dentro de página`);
      assert.ok(state.hits.every(hit => hit.hidden || hit.reachable), `${name}: controles sin recorte: ${JSON.stringify(state.hits)}`);
      assert.ok(state.lowerGap >= 0, `${name}: reserva inferior`);
    }
    states.push(state);
    if (screenshot && evidence) await page.screenshot({path: path.join(evidence,
      `${before ? 'antes' : 'despues'}-${width}-${theme}-${name}.png`)});
  }
  try {
    await page.goto(origin);
    await page.evaluate(() => document.fonts.ready);
    if (width <= 800) await page.locator('[data-mobile-tab="progresion"]').click();
    await record('reposo', true);
    for (const y of [200, 600, 900, 999999, 600]) {
      await page.evaluate(y => window.scrollTo(0, y), y);
      await record(`scroll-${y}`, y === 900);
    }
    if (width > 800) {
      await controls(page);
      await page.locator('#transport-minimize').click();
      assert.equal(await page.locator('#transport-minimize').getAttribute('aria-pressed'), 'true');
      await record('minimizada', true);
      await controls(page);
      await page.locator('#transport-minimize').click();
      assert.equal(await page.locator('#transport-minimize').getAttribute('aria-pressed'), 'false');
      await record('desplegada');
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await record('vuelta');
    if (width > 800) {
      await page.setViewportSize({width: 390, height: 740});
      await settle(page);
      assert.equal(await page.locator('.panel-strip').count(), 0, 'respaldo móvil sin franja');
      await page.setViewportSize({width, height: 740});
      await settle(page);
      assert.equal(await page.locator('.panel-strip').count(), 1, 'una sola franja al volver');
    } else assert.equal(await page.locator('.panel-strip').count(), 0, 'móvil sin franja');
    assert.deepEqual(errors, [], 'sin errores JavaScript de página');
    return states;
  } finally { await page.close(); }
}

(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless: true});
    for (const width of [1366, 1280, 390]) for (const theme of ['light', 'dark']) {
      const origin = `http://127.0.0.1:${server.address().port}`;
      const before = await collect(browser, origin, width, theme, true);
      const after = await collect(browser, origin, width, theme, false);
      let compact = 0;
      for (let i = 0; i < before.length; i++) {
        const a = after[i], b = before[i];
        assert.equal(a.state, b.state);
        assert.equal(a.floating, b.floating, `${a.state}: mismo régimen`);
        assert.equal(a.minimized, b.minimized, `${a.state}: mismo minimizado`);
        assert.equal(a.docHeight, b.docHeight, `${width} ${a.state}: no agregar saltos respecto de la base`);
        near(a.scroll, b.scroll, `${a.state}: mismo desplazamiento`);
        near(a.pill.height, b.pill.height, `${a.state}: altura de controles intacta`);
        if (width > 800 && a.floating && !a.minimized) {
          compact++;
          assert.deepEqual(a.padding, ['0px', '10px']);
          near(a.upperGap, 16, 'respiro superior compacto');
          near(b.upperGap - a.upperGap, 10, '10 px menos sobre la cápsula');
          near(a.lowerGap - b.lowerGap, 10, 'reserva inferior absorbe el cambio');
          near(a.strip.height, b.strip.height, 'franja conserva su altura');
        } else {
          assert.deepEqual(a.padding, b.padding, `${a.state}: CSS fuera del compacto intacto`);
          for (const key of ['pill', 'strip', 'band', 'workspace'])
            assert.deepEqual(a[key], b[key], `${width} ${a.state}: geometría intacta (${key})`);
        }
      }
      if (width > 800) assert.ok(compact >= 4, 'scroll y desplegado compacto cubiertos');
      const delta = list => list.find(s => s.state === 'scroll-900').docHeight - list[0].docHeight;
      measurements.push({width, theme, base, before, after});
      console.log(`✓ ${width} ${theme}: ${after.length} estados; altura reposo→scroll base=${delta(before)} px, entrega=${delta(after)} px`);
    }
    console.log(`T-69: matriz antes/después, clic/foco, minimizada y respaldo móvil OK; Chromium ${browser.version()}`);
  } finally {
    if (evidence) fs.writeFileSync(path.join(evidence, 'medidas.json'), JSON.stringify(measurements, null, 2));
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
