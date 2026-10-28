// Ejecutar con PLAYWRIGHT_PATH apuntando al paquete Playwright instalado localmente.
// Guarda de comportamiento T-56 r5 (A-55): reposo contra una copia
// de la base 0c199e5 (T56_BASE_ROOT), con las mismas fuentes y viewport,
// rueda real desde cuatro zonas, cruce del tope en ambas direcciones y cápsula
// A-46 a la vista durante el recorrido; clics reales de todos los
// controles del transporte y la captura en varios estados. No forma parte de
// `npm test`: exige Chromium y servidor local.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { createServer } = require('../../server.cjs');
const evidencias = [];

const cercano = (a, esperado, tol) => Math.abs(a - esperado) < tol;
const medirReposo = page => page.evaluate(() => {
  const rect = s => { const el = document.querySelector(s); return el ? el.getBoundingClientRect().toJSON() : null; };
  return { intro: rect('.intro'), banda: rect('.cards-band'), box: rect('.progression-view-controls'),
    strip: rect('.panel-strip'), workspace: rect('.workspace'), playback: rect('.progression-playback'),
    status: rect('#player-status') };
});

async function abrir(browser, server, width, height, theme) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  page.errores = [];
  page.on('pageerror', error => page.errores.push(error.message));
  const url = `http://127.0.0.1:${server.address().port}`;
  await page.route('**/*', route => route.request().url().startsWith(url) ? route.continue() : route.abort());
  await page.goto(url);
  await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
  await page.waitForTimeout(100);
  return page;
}

async function comprobarRecorte(page, contexto) {
  // Esperar el fin de la transición del recuadro, independiente del rendimiento.
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.progression-view-controls')).backgroundColor === 'rgba(0, 0, 0, 0)');
  const medidas = await page.evaluate(() => {
    const pill = document.querySelector('.transport-pill');
    const box = document.querySelector('.progression-view-controls');
    const strip = document.querySelector('.panel-strip');
    return { documento: scrollY, pill: pill.getBoundingClientRect().toJSON(),
      top: strip.getBoundingClientRect().top,
      caja: getComputedStyle(box).backgroundColor, franja: getComputedStyle(strip).backgroundColor,
      borde: getComputedStyle(strip).borderLeftColor, animacion: getComputedStyle(pill).animationName };
  });
  assert.ok(medidas.documento > 0, `documento desplaza ${contexto}`);
  assert.ok(Math.abs(medidas.top) < 1 && medidas.pill.top >= 0,
    `franja fija al llegar arriba ${contexto}: ${JSON.stringify(medidas)}`);
  assert.equal(medidas.caja, 'rgba(0, 0, 0, 0)', `exterior caja ${contexto}`);
  assert.equal(medidas.franja, 'rgba(0, 0, 0, 0)', `exterior franja ${contexto}`);
  assert.equal(medidas.borde, 'rgba(0, 0, 0, 0)', `borde franja ${contexto}`);
  assert.equal(medidas.animacion, 'none', `movimiento reducido ${contexto}`);
}

(async () => {
  assert.ok(process.env.T56_BASE_ROOT, 'T56_BASE_ROOT debe apuntar a una copia de 0c199e5');
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseServer = require(process.env.T56_BASE_ROOT + '/server.cjs').createServer();
  await new Promise(resolve => baseServer.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [801, 1024, 1100, 1101, 1280, 1366]) for (const height of [650, 768]) for (const theme of ['light', 'dark']) {
      const basePage = await abrir(browser, baseServer, width, height, theme);
      const esperado = await medirReposo(basePage);
      await basePage.close();
      const page = await abrir(browser, server, width, height, theme);
      // A-55: comprobar eventos de rueda reales antes de cualquier scroll programático.
      for (const selector of ['.intro', '.cards-band', '.panel-strip', '.panel-scroll']) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(100);
        const point = await page.locator(selector).evaluate(el => {
          const r = el.getBoundingClientRect();
          const x = r.left + r.width / 2;
          const y = Math.min(innerHeight - 12, r.top + 12);
          const hit = document.elementFromPoint(x, y);
          return { x, y, hit: hit && (hit.id || hit.className), reachable: el === hit || el.contains(hit) };
        });
        assert.ok(point.reachable, `zona de rueda accesible ${selector}: ${JSON.stringify(point)}`);
        await page.mouse.move(point.x, point.y);
        await page.mouse.wheel(0, 220);
        await page.waitForTimeout(150);
        const despues = await page.evaluate(() => scrollY);
        evidencias.push({ width, height, theme, selector, point, despues });
        assert.ok(despues > 0, `rueda desplaza el documento sobre ${selector} ${width} ${theme}`);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(150);
      const rest = await medirReposo(page);
      for (const pieza of ['intro', 'banda', 'box', 'playback', 'status']) {
        for (const clave of ['x', 'y', 'width', 'height']) {
          const margen = ['box', 'playback', 'status'].includes(pieza) && clave === 'y' ? 8 : 0;
          assert.ok(cercano(rest[pieza][clave], esperado[pieza][clave] + margen, 1),
            `reposo ${pieza}.${clave} ${width}×${height} ${theme}: ${JSON.stringify({ actual: rest[pieza], base: esperado[pieza] })}`);
        }
      }
      assert.ok(rest.strip, 'la franja del transporte existe (armado del marco)');
      // La franja lee la cabecera de la caja grande: 8 px (autorizados, A-46 ·5)
      // después de la banda, y la caja a 21 px dentro de ella, como en la base.
      assert.ok(cercano(rest.strip.y, rest.banda.y + rest.banda.height + 8, 1) &&
        cercano(rest.strip.x, rest.box.x - 21, 2) &&
        rest.strip.right >= rest.box.right &&
        rest.strip.bottom >= rest.box.bottom - 1,
        `franja y caja en reposo ${width} ${theme}: ${JSON.stringify({ strip: rest.strip, box: rest.box })}`);
      // La caja grande continúa bajo la franja. El estado conserva la posición
      // medida en la base, incluido su margen negativo en anchos intermedios.
      assert.ok(cercano(rest.workspace.y, rest.box.bottom - 10, 2) &&
        rest.workspace.left <= rest.box.left && rest.workspace.right >= rest.box.right &&
        rest.workspace.bottom >= rest.playback.bottom &&
        cercano(rest.strip.x, esperado.workspace.x, 1) &&
        cercano(rest.strip.y, esperado.workspace.y + 8, 1) &&
        cercano(rest.strip.width, esperado.workspace.width, 1) &&
        cercano(rest.playback.x, rest.box.x, 2),
        `marco y estado en reposo ${width} ${theme}: ${JSON.stringify(rest)}`);
      // El cruce se provoca con rueda, no cambiando scrollTop del elemento.
      await page.evaluate(y => window.scrollTo(0, y - 20), rest.strip.y);
      await page.waitForTimeout(100);
      assert.equal(await page.locator('.transport-row').evaluate(el => el.classList.contains('is-floating')), false,
        'antes del borde sigue en flujo');
      await page.mouse.move(width / 2, height - 20);
      await page.mouse.wheel(0, 80);
      await page.waitForTimeout(150);
      await comprobarRecorte(page, `${width} ${theme} cruce con rueda`);
      await page.mouse.wheel(0, -80);
      await page.waitForTimeout(150);
      assert.equal(await page.locator('.transport-row').evaluate(el => el.classList.contains('is-floating')), false,
        'al subir por el borde se descuelga');
      for (const position of [550, 600, 900, 100000]) {
      await page.evaluate(position => { window.scrollTo(0, position); }, position);
      await page.waitForTimeout(250);
      const expanded = await page.evaluate(() => {
        const pill = document.querySelector('.transport-pill');
        const capture = document.querySelector('.capture-row');
        const rect = pill.getBoundingClientRect();
        return { height: rect.height, top: rect.top, bottom: rect.bottom, inside: pill.contains(capture) };
      });
      assert.ok(expanded.inside && (width < 1366 || expanded.height < 59) && expanded.top >= 0 && expanded.bottom <= height, `cápsula expandida: ${JSON.stringify(expanded)}`);
      await comprobarRecorte(page, `${width}×${height} ${theme} expandida ${position}`);
      // Resto de los controles del transporte en el estado clavado y expandido:
      // Silencio, Play y Tempo (arranca y se descarta, como en base).
      for (const selector of ['#accompaniment-mute', '#tempo-play']) {
        const antes = await page.locator(selector).getAttribute('aria-pressed');
        const pulso = async () => {
          const b = await page.locator(selector).boundingBox();
          await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
          await page.waitForTimeout(250);
        };
        await pulso();
        const despues = await page.locator(selector).getAttribute('aria-pressed');
        assert.notEqual(despues, antes, `clic ${selector} ${width} ${position}`);
        for (let i = 0; i < 3; i++) {
          if (await page.locator(selector).getAttribute('aria-pressed') === antes) break;
          await pulso();
        }
        assert.equal(await page.locator(selector).getAttribute('aria-pressed'), antes, `vuelta ${selector} ${width} ${position}`);
      }
      const tempo = page.locator('#tempo-tap');
      let bounds = await tempo.boundingBox();
      await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      const descarte = page.locator('#tempo-tap-discard');
      bounds = await descarte.boundingBox();
      await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      assert.equal(await page.locator('#tempo-tap-bpm').inputValue(), '100', `tempo vuelve ${width} ${position}`);
      }
      const button = page.locator('#transport-minimize');
      for (const position of [550, 600, 900, 100000]) {
        await page.evaluate(position => { window.scrollTo(0, position); }, position);
        await page.waitForTimeout(100);
        let rect = await button.boundingBox();
        await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
        await page.waitForTimeout(100);
        assert.equal(await button.getAttribute('aria-pressed'), 'true');
        await comprobarRecorte(page, `${width}×${height} ${theme} minimizada ${position}`);
        const hits = await page.evaluate(() => [...document.querySelector('.capture-row').querySelectorAll('button,input,summary')].map(el => {
          const surface = el.matches('input') && el.closest('label') || el;
          const r = surface.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return { control: el.id || el.getAttribute('aria-label'), reachable: hit === surface || surface.contains(hit) };
        }));
        assert.ok(hits.every(hit => hit.reachable), `captura ${width} ${position}: ${JSON.stringify(hits)}`);
        for (const selector of ['#tempo-tap-mic', '.improvisation-control summary', '.mic-follow-control summary']) {
          const control = page.locator(selector);
          await control.evaluate(el => { el.dataset.pruebaClic = '0'; el.addEventListener('click', () => { el.dataset.pruebaClic = '1'; }, { once: true }); });
          const bounds = await control.boundingBox();
          await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
          assert.equal(await control.getAttribute('data-prueba-clic'), '1', `clic ${selector} ${width} ${position}`);
          if (selector.endsWith('summary')) await control.evaluate(el => { el.parentElement.open = false; });
        }
        for (const selector of ['#improvisation-toggle', '#enter-on-note', '#follow-midi']) {
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
        assert.ok(restored.y >= 0 && restored.y + restored.height <= height,
          `desplegada ${width}×${height} ${theme} ${position}: ${JSON.stringify(restored)}`);
      }
      await page.evaluate(() => { window.scrollTo(0, 0); });
      await page.waitForTimeout(100);
      const vuelta = await medirReposo(page);
      assert.deepEqual(page.errores, [], `sin errores de página ${width} ${theme}`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin desborde horizontal');
      evidencias.push({ width, height, theme, reposo: rest, vuelta });
      for (const pieza of ['box', 'strip', 'playback', 'status']) for (const clave of ['x', 'y', 'width', 'height']) {
        assert.ok(cercano(vuelta[pieza][clave], rest[pieza][clave], 1), `vuelta al reposo ${pieza}.${clave} ${width}×${height} ${theme}: ${JSON.stringify({ vuelta: vuelta[pieza], rest: rest[pieza] })}`);
      }
      // Con una progresión larga el scrollbar local no debe consumir la rueda.
      await page.evaluate(() => {
        const agregar = document.querySelector('#legend-add-chord');
        while (document.querySelectorAll('.progression-card').length < 24) agregar.click();
        window.scrollTo(0, 0);
        document.querySelector('#progression').scrollTop = 0;
      });
      await page.waitForTimeout(150);
      const tarjeta = await page.locator('.progression-card').first().boundingBox();
      await page.mouse.move(tarjeta.x + tarjeta.width / 2, tarjeta.y + 15);
      await page.mouse.wheel(0, 220);
      await page.waitForTimeout(150);
      const larga = await page.evaluate(() => ({ documento: scrollY, lista: document.querySelector('#progression').scrollTop }));
      assert.ok(larga.documento > 0 && larga.lista === 0, `rueda sobre 24 tarjetas ${width} ${theme}: ${JSON.stringify(larga)}`);
      evidencias.push({ width, height, theme, tarjetas: 24, ...larga });
      console.log(`OK ${width}×${height} ${theme}: reposo, rueda, sticky, controles y vuelta`);
      await page.close();
    }
    // La franja nueva se retira al entrar en el respaldo móvil y se arma una
    // sola vez al volver a escritorio, sin perder caja ni fila de captura.
    const page = await abrir(browser, server, 1366, 768, 'light');
    const errores = [];
    page.on('pageerror', error => errores.push(error.message));
    await page.evaluate(() => { window.scrollTo(0, 550); });
    await page.waitForTimeout(250);
    await page.setViewportSize({ width: 768, height: 1366 });
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.panel-strip, #panel-scroll').count(), 0, 'respaldo sin franja ni ventana');
    assert.equal(await page.locator('.progression-stack > .progression-view-controls > .capture-row').count(), 1,
      'caja y captura recuperan su hogar móvil');
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.panel-strip > .progression-view-controls').count(), 1, 'una sola franja al rearmar');
    assert.deepEqual(errores, [], 'sin errores al cambiar de régimen');
    await page.close();
    console.log('OK escritorio → móvil → escritorio: restauración del DOM');
  } finally {
    if (process.env.T56_EVIDENCE_PATH) require('node:fs').writeFileSync(process.env.T56_EVIDENCE_PATH, JSON.stringify(evidencias, null, 2));
    await browser.close(); server.close(); baseServer.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
