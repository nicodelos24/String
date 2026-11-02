// T-67 · revisión visual del panel en Chromium, ambos temas y pliegues.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { createServer } = require('../../server.cjs');

(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const evidence = '/tmp/t67-pulido-visual';
  fs.mkdirSync(evidence, { recursive: true });
  try {
    for (const theme of ['light', 'dark']) {
      for (const size of [
        { width: 320, height: 740, mobile: true },
        { width: 390, height: 844, mobile: true },
        { width: 768, height: 900, mobile: true },
        { width: 1024, height: 768, mobile: false },
        { width: 1366, height: 900, mobile: false },
        { width: 1366, height: 650, mobile: false },
      ]) {
        const page = await browser.newPage({ viewport: size, reducedMotion: 'reduce' });
        const pageErrors = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
        await page.goto(origin);
        await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
        if (size.mobile) await page.locator('[data-mobile-tab="progresion"]').click();
        const layout = await page.evaluate(() => {
          const rect = selector => {
            const el = document.querySelector(selector);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
          };
          const workspace = document.querySelector('.workspace');
          const style = getComputedStyle(workspace);
          const doc = document.documentElement;
          return {
            viewport: { width: innerWidth, height: innerHeight },
            document: { width: doc.scrollWidth, height: doc.scrollHeight },
            shell: rect('.shell'), band: rect('.cards-band'), strip: rect('.panel-strip'),
            workspace: rect('.workspace'), pill: rect('.transport-pill'),
            shadow: style.boxShadow, borderWidth: style.borderTopWidth, border: style.border,
            switchBoxes: [...document.querySelectorAll('.song-tonality-switch')].map(el => {
              const labels = [...el.children].filter(c => c.tagName === 'SPAN' && !c.classList.contains('spelling-track'));
              return { rect: rectOf(el), labelRects: labels.map(rectOf), track: rectOf(el.querySelector('.spelling-track')) };
            }),
            blackKeys: [...document.querySelectorAll('.song-tonality-piano .piano-black')].map(el => {
              const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
              return { text: el.innerText, width: r.width, height: r.height, fontSize: cs.fontSize, color: cs.color, background: cs.backgroundColor };
            }),
          };
          function rectOf(el) {
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
          }
        });
        let controls = layout;
        if (size.mobile) {
          controls = await page.evaluate(() => ({
            switchBoxes: (() => {
              document.body.dataset.mobileTab = 'mastil';
              return [...document.querySelectorAll('.song-tonality-switch')].map(el => {
              const labels = [...el.children].filter(c => c.tagName === 'SPAN' && !c.classList.contains('spelling-track'));
              const rectOf = node => { const r = node.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom }; };
              return { labelRects: labels.map(rectOf), track: rectOf(el.querySelector('.spelling-track')) };
              });
            })(),
            blackKeys: [...document.querySelectorAll('.song-tonality-piano .piano-black')].map(el => {
              const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
              return { text: el.innerText, width: r.width, height: r.height, fontSize: cs.fontSize, color: cs.color };
            }),
          }));
        }
        assert.ok(layout.document.width <= size.width, `${theme} ${size.width}: desborde horizontal ${JSON.stringify(layout.document)}`);
        assert.deepEqual(pageErrors, [], `${theme} ${size.width}: errores JavaScript de página`);
        assert.ok(layout.shell.x >= 0 && layout.shell.right <= size.width + 1, 'shell dentro del viewport');
        if (size.mobile) {
          assert.equal(layout.borderWidth, '0px', 'móvil sin marco');
          assert.equal(layout.shadow, 'none', 'móvil sin sombra de marco');
        } else {
          assert.ok(layout.shell.x > 0 && size.width - layout.shell.right > 0, 'márgenes desktop');
          assert.notEqual(layout.shadow, 'none', 'marco con sombra desktop');
        }
        assert.equal(controls.switchBoxes.length, 2, `${theme} ${size.width}: están los dos switches de tonalidad`);
        for (const sw of controls.switchBoxes) {
          assert.ok(sw.track.width >= 20, `switch con pista visible ${JSON.stringify(sw)}`);
          assert.ok(Math.abs(sw.labelRects[0].y - sw.track.y) < 14 && Math.abs(sw.labelRects[1].y - sw.track.y) < 14,
            `leyendas de switch en línea horizontal: ${JSON.stringify(sw)}`);
        }
        assert.ok(controls.blackKeys.length > 0, 'hay teclas negras etiquetadas');
        for (const key of controls.blackKeys) {
          assert.ok(key.width >= 10 && key.height > 20 && parseFloat(key.fontSize) >= 9, `tecla negra legible ${JSON.stringify(key)}`);
          assert.equal(key.color, 'rgb(255, 255, 255)');
        }

        // El readout del micrófono no debe desplazar sus vecinos entre una nota
        // corta y una respuesta larga; no se solicita permiso de micrófono.
        const readout = page.locator('#microphone-readout');
        const mic = page.locator('#microphone-toggle');
        const before = await mic.boundingBox();
        await readout.evaluate(el => { el.hidden = false; el.style.display = 'inline-flex'; el.textContent = 'C'; });
        const shortWidth = (await readout.boundingBox()).width;
        const micShort = await mic.boundingBox();
        await readout.evaluate(el => { el.textContent = 'C♯ · 440 Hz'; });
        const longWidth = (await readout.boundingBox()).width;
        const micLong = await mic.boundingBox();
        assert.equal(shortWidth, longWidth, 'ancho estable del readout');
        assert.ok(Math.abs(micShort.x - micLong.x) < 1 && Math.abs(micShort.y - micLong.y) < 1,
          'el readout no mueve el botón de micrófono');
        await readout.evaluate(el => { el.hidden = true; el.style.removeProperty('display'); });
        if (size.mobile) await page.locator('[data-mobile-tab="progresion"]').click();

        if (size.width === 1366 && size.height === 650) {
          // Se captura la barra expandida antes de minimizar: no debe quedar
          // recortada por el marco durante el scroll inicial.
          await page.mouse.move(100, 580);
          await page.mouse.wheel(0, 800);
          await page.waitForTimeout(200);
          const bar = await page.locator('.transport-pill').evaluate(el => {
            const r = el.getBoundingClientRect();
            const hit = document.elementFromPoint(Math.min(innerWidth - 2, r.left + 12), Math.max(1, r.top + 8));
            const row = el.closest('.transport-row');
            return { top: r.top, bottom: r.bottom, x: r.x, right: r.right, client: [el.clientWidth, el.clientHeight], scroll: scrollY,
              floating: row.classList.contains('is-floating'), minimized: row.classList.contains('is-transport-minimized'),
              hit: !!hit && (hit === el || el.contains(hit)) };
          });
          assert.ok(bar.scroll > 0 && bar.floating && !bar.minimized && bar.top >= -1 && bar.bottom <= size.height + 1,
            `barra visible sin minimizar en primer desplazamiento: ${JSON.stringify(bar)}`);
          assert.ok(bar.hit, `barra sin recorte/hit-target: ${JSON.stringify(bar)}`);
          await page.screenshot({ path: `${evidence}/${theme}-desktop-1366x650-scrolled.png`, fullPage: false });
        }
        if ((size.width === 390 && theme === 'light') || (size.width === 1366 && size.height === 900 && theme === 'dark')) {
          await page.screenshot({ path: `${evidence}/${theme}-${size.width}x${size.height}.png`, fullPage: false });
        }
        console.log(`${theme} ${size.width}x${size.height}: ok`, JSON.stringify({ shell: layout.shell, workspace: layout.workspace, horizontal: layout.document.width }));
        await page.close();
      }
    }
    console.log('T-67: matriz visual Chromium aprobada; evidencia en /tmp/t67-pulido-visual');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
