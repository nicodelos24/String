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
    // Evidencia T-69: caja interior del transporte y su última fila visible
    // (contenido inferior), para explicar posición/ancho y anclaje medidos.
    const box = rect('.panel-strip .progression-view-controls') ||
      rect('.progression-view-controls');
    const firstRow = box ? box : null;
    const lastChild = document.querySelector('.panel-strip .progression-view-controls')?.lastElementChild || null;
    const innerBottom = lastChild ? lastChild.getBoundingClientRect().toJSON() : null;
    const band = rect('.cards-band');
    const workspace = rect('.workspace');
    const panelNode = document.querySelector('.panel-scroll');
    const panelClip = panelNode && panelNode.classList.contains('is-panel-recortado')
      ? parseFloat(getComputedStyle(panelNode).getPropertyValue('--panel-recorte')) || 0 : 0;
    const statusNode = document.querySelector('.player-compact-status');
    const playbackNode = document.querySelector('.progression-playback');
    const parentRect = rect('.workspace > .progression-workspace');
    const statusRect = statusNode?.getBoundingClientRect().toJSON() || null;
    const playbackRect = playbackNode?.getBoundingClientRect().toJSON() || null;
    const row = document.querySelector('.transport-row');
    const floating = row.classList.contains('is-floating');
    const composed = row.classList.contains('is-pill-composed');
    const capture = document.querySelector('.capture-row');
    const captureInPill = !!capture && capture.parentElement?.classList.contains('transport-pill');
    const minimized = row.classList.contains('is-transport-minimized');
    const pillWrapped = !!document.querySelector('.transport-pill')?.classList.contains('is-pill-wrapped');
    const selectors = ['#progression-view', '#accompaniment-mute', '#tempo-play', '#tempo-tap',
      '#tempo-tap-bpm', '#transport-minimize', '#improvisation-toggle', '#tempo-tap-mic',
      '#enter-on-note', '#follow-midi'];
    const surfaceOf = node => node.matches('input[type=checkbox]') ? node.closest('label') : node;
    const ctlHeights = ['#tempo-play', '#tempo-stop', '#accompaniment-mute', '#tempo-tap',
      '#improvisation-toggle', '#enter-on-note', '#follow-midi', '#transport-minimize'].map(sel => {
      const node = document.querySelector(sel);
      if (!node) return {selector: sel, hidden: true};
      const r = surfaceOf(node).getBoundingClientRect();
      return {selector: sel, hidden: !r.height, h: +r.height.toFixed(2), t: +r.top.toFixed(2)};
    });
    const hits = selectors.map(selector => {
      const control = document.querySelector(selector);
      if (!control) return {selector, hidden: true};
      const surface = surfaceOf(control);
      const r = surface.getBoundingClientRect();
      if (!r.width || !r.height) return {selector, hidden: true};
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return {selector, reachable: hit === surface || surface.contains(hit)};
    });
    return {state, scroll: scrollY, docHeight: document.documentElement.scrollHeight,
      docWidth: document.documentElement.scrollWidth, viewport: innerWidth,
      viewportHeight: innerHeight,
      theme: document.documentElement.dataset.theme, floating, composed, captureInPill, minimized, pillWrapped,
      stripClasses: strip ? [...strip.classList] : null,
      rowClasses: [...document.querySelector('.transport-row').classList],
      box, innerBottom, firstRow,
      panelVisibleTop: workspace ? workspace.top + panelClip : null,
      panelPillGap: workspace && box ? +(workspace.top + panelClip - box.bottom).toFixed(2) : null,
      statusRect, playbackRect, parentRect,
      statusStyle: statusNode ? [getComputedStyle(statusNode).visibility, getComputedStyle(statusNode).display] : null,
      padding: strip ? [getComputedStyle(strip).paddingTop, getComputedStyle(strip).paddingBottom] : null,
      // T-69 (reposo sin recuadro 8-nov): color de borde y fondo del strip.
      stripVisual: strip ? [getComputedStyle(strip).borderTopColor, getComputedStyle(strip).backgroundColor] : null,
      boxPadding: (() => {const bq = document.querySelector('.panel-strip .progression-view-controls');
          if (!bq) return null; const cs = getComputedStyle(bq);
          return [cs.paddingTop, cs.paddingBottom, cs.borderTopWidth, cs.borderBottomWidth];})(),
      fontsLoaded: document.fonts.status,
      strip: rect('.panel-strip'), pill, band, workspace: rect('.workspace'),
      ctlHeights, upperGap: pill.top - band.bottom,
      lowerGap: strip ? strip.getBoundingClientRect().bottom - pill.bottom : null,
      innerGap: strip && innerBottom ? strip.getBoundingClientRect().bottom - innerBottom.bottom : null, hits};
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
    if (width > 800 && !before && ['reposo', 'scroll-40'].includes(name)) {
      near(state.panelPillGap, 6, `${name}: panel visible a 6 px de la cápsula`);
      assert.ok(state.statusRect && state.statusRect.width <= 1 && state.statusRect.height <= 1,
        `${name}: texto «Detenido» sin rectángulo visible (${JSON.stringify(state.statusRect)})`);
      near(state.playbackRect?.height || 0, 0, `${name}: sin caja vacía del estado`);
      near(state.parentRect?.height || 0, 0, `${name}: sin fila padre vacía`);
    }
    if (width > 800 && state.floating) {
      assert.ok(state.pill.top >= state.band.bottom && state.pill.bottom <= 740, `${name}: cápsula dentro de página`);
      assert.ok(state.hits.every(hit => hit.hidden || hit.reachable), `${name}: controles sin recorte: ${JSON.stringify(state.hits)}`);
      assert.ok(state.lowerGap >= 0, `${name}: reserva inferior`);
    }
    states.push(state);
    if (process.env.T69_DEBUG) console.log('DBG', width, theme, state,
      JSON.stringify({up: state.upperGap, down: state.lowerGap, pillH: state.pill?.height, stripH: state.strip?.height, pad: state.padding}));
    if (screenshot && evidence) await page.screenshot({path: path.join(evidence,
      `${before ? 'antes' : 'despues'}-${width}-${theme}-${name}.png`)});
  }
    try {
      await page.goto(origin);
      // Las fuentes externas (T69_EXTERNAL=1) cargan tras el primer repintado;
      // esperar de nuevo tras un respiro evita medir con la reserva variada.
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      await page.evaluate(() => document.fonts.ready);
      // Anchoring del navegador mueve scrollY tras los toggles y desalinea
      // las dos rondas (+6 px); se desactiva antes de medir desplazamiento.
      await page.addStyleTag({content: 'html, html * { overflow-anchor: none !important; }'});
      if (width <= 800) await page.locator('[data-mobile-tab="progresion"]').click();
    await record('reposo', true);
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({content: 'html, html * { overflow-anchor: none !important; }'});
    await record('recarga');
    for (const y of [40, 200, 600, 900, 999999, 600]) {
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
        if (width > 800 && !a.minimized) {
          assert.equal(a.composed, true, `${width} ${a.state}: composición compacta permanente`);
          assert.equal(a.captureInPill, true, `${width} ${a.state}: captura dentro de la cápsula`);
          near(a.pill.width, after[0].pill.width, `${width} ${a.state}: ancho estable al anclar`);
          near(a.pill.height, after[0].pill.height, `${width} ${a.state}: alto estable al anclar`);
        }
        // Sin saltos nuevos: la entrega no puede desalinear más que la base.
        // Se compara la deriva propia del estado: el documento es más bajo por
        // retirar la fila «Detenido», también estando minimizada.
        const aDrift = Math.abs(a.docHeight - after[0].docHeight);
        const bDrift = Math.abs(b.docHeight - before[0].docHeight);
        if (!a.minimized) assert.ok(aDrift <= bDrift,
          `${width} ${a.state}: sin saltos nuevos (deriva ${aDrift} vs base ${bDrift})`);
        else near(a.scroll, b.scroll, `${width} minimizada: sin salto de scroll`);
        if (a.docHeight === b.docHeight) {
          near(a.scroll, b.scroll, `${a.state}: mismo desplazamiento`);
        } else if (b.state === 'scroll-999999') {
          // La entrega acorta el documento en flotante: el tope del scroll
          // baja con él; se exige llegar al fondo de cada documento propio.
          near(a.scroll - (a.docHeight - a.viewportHeight), 0, `${a.state}: entrega al fondo`);
          near(b.scroll - (b.docHeight - b.viewportHeight), 0, `${a.state}: base al fondo`);
        }
        if (width <= 800 || a.minimized) {
          // El respaldo móvil y la barra minimizada conservan el régimen previo.
          near(a.pill.height, b.pill.height, `${a.state}: píldora intacta en respaldo/minimizada`);
        }
        if (width > 800 && a.floating && !a.minimized) {
          compact++;
          assert.deepEqual(a.padding, ['0px', '0px']);
          // R3 (pedido de Nico 7-nov 04:17): MUY POCO aire arriba Y abajo.
          // Bilateral frente a main: ambos huecos bajan, no sólo la suma.
          assert.ok(a.upperGap < b.upperGap, `aire superior menor que main (${a.upperGap} ≥ ${b.upperGap})`);
          assert.ok(a.upperGap + a.lowerGap < b.upperGap + b.lowerGap,
            'aire total menor que la base');
          if (process.env.T69_EXTERNAL === '1') {
            // Con las fuentes reales (la pantalla del dueño, según Kaia
            // 16/9 en el candidato previo) invade el bilateral completo:
            // cada hueco también por debajo del candidato previo 0e28f8c
            // (arriba 18 / abajo 11 en esta configuración). Esas cifras no
            // son objetivos del dueño, son la referencia a superar.
            assert.ok(a.lowerGap < b.lowerGap, `${width} ${theme} ${a.state}: aire inferior menor que main (${a.lowerGap} ≥ ${b.lowerGap})`);
            assert.ok(a.upperGap < 18 && a.lowerGap < 11,
              `${width} ${theme} ${a.state}: aire menor que el candidato previo (arriba ${a.upperGap} / abajo ${a.lowerGap})`);
          }
          // La captura permanente cambia la altura natural de la cápsula: no
          // se impone la antigua reserva de 56/70 px. Se comprueba la caja real
          // medida desde el reposo y la continuidad entre los dos estados.
          assert.ok(a.strip.height >= a.pill.height,
            `${width} ${theme} ${a.state}: cápsula dentro de la reserva real`);
          assert.ok(a.lowerGap >= 0, `${a.state}: sin hueco invertido/solapamiento`);
          // T-69 (pedido 20:22): el compacto conserva el ancho del recuadro de
          // reposo (caja del transporte con sus 2 finos), borde a borde.
          if (!a.pillWrapped) assert.ok(Math.abs(a.pill.width - a.box.width) < 0.6,
            `${width} ${theme} ${a.state}: ancho compacto distinto del recuadro de reposo (${a.pill.width} vs ${a.box.width})`);
          // T-69 (alto previo F′): la reserva ya no vive en el min-height sino
          // en strip 56 + margin-bottom calc(franja-alto − 56); el documento
          // no cambiar de altura frente a la base sustituye a “no reservar
          // más que la base” (incluye el margen, es más fuerte).
          // La cápsula no invade la banda ni se sale de la franja.
          assert.ok(a.pill.top >= a.band.bottom, 'cápsula pegada bajo la banda');
          assert.ok(a.pill.bottom <= a.strip.bottom, 'cápsula dentro de la franja');
        } else if (width <= 800 || a.minimized) {
          assert.deepEqual(a.padding, b.padding, `${a.state}: CSS del respaldo/minimizada intacto`);
          for (const key of ['pill', 'strip', 'band'])
            assert.deepEqual(a[key], b[key], `${width} ${a.state}: geometría respaldo/minimizada (${key})`);
        }
        // T-69 (reposo sin recuadro, orden del dueño 8-nov): en reposo la
        // franja no dibuja recuadro exterior — sólo la cápsula, sin achicarse.
        // Guarda focal: borde y fondo transparentados, padding y geometría
        // intactos. La base (before) conserva su recuadro; minimizada no entra.
        if (width > 800 && a.state === 'reposo' && a.strip && !a.minimized) {
          assert.ok(a.stripVisual[0] === 'transparent' || a.stripVisual[0] === 'rgba(0, 0, 0, 0)',
            `${width} reposo: borde del recuadro vigente (${a.stripVisual[0]})`);
          assert.ok(a.stripVisual[1] === 'transparent' || a.stripVisual[1] === 'rgba(0, 0, 0, 0)',
            `${width} reposo: fondo del recuadro vigente (${a.stripVisual[1]})`);
        }
        if (a.floating && !a.minimized) {
          // T-69 (19:45): los CONTROLES conservan su tamaño aunque la cápsula
          // ocupe su holgura; la reserva de la franja no cambia tampoco.
          for (const c of a.ctlHeights) {
            const d = b.ctlHeights.find(x => x.selector === c.selector);
            assert.ok(d, `${a.state}: control ${c.selector} medido en ambas rondas`);
            if (c.hidden || d.hidden) assert.equal(!!c.hidden, !!d.hidden, `${a.state}: ${c.selector}: visibilidad igual en ambas`);
            else assert.ok(Math.abs(c.h - d.h) < 0.6, `${a.state}: control ${c.selector}: altura intacta (${c.h} vs ${d.h})`);
          }
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
