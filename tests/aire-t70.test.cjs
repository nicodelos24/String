// T-70 · A-75 (8-nov-2026): márgenes laterales de la sección principal y
// recuadro exterior móvil.
//
// El pedido del dueño: reducir los márgenes laterales de la sección principal
// (la caja `.workspace`, que vive en `.shell`) PRESERVANDO la sombra
// (12px 12px, desplazada a la derecha: para que caiga completa el margen
// derecho no puede quedar por debajo de 12 px), y retirar el recuadro
// exterior móvil (la banda de 12 px por lado del shell en ≤800 px).
//
// Estas guardas leen el CSS como texto, igual que el resto de la batería; el
// aspecto real se verifica en el navegador (PACTO.md §5).

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

// Primera regla completa con el selector dado, limpiada de comentarios.
function regla(selector) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const todas = [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map(m => ({selector: m[1].trim(), body: m[2]}))
    .filter(r => r.selector === selector);
  return todas[0];
}

// Bloques @media full-body: condición + cuerpo sangrado a cero para buscar
// reglas dentro con el mismo par de llaves.
function reglasDe(condRegex) {
  const bloques = [];
  const open = /@media([^{]*)\{/g;
  let match;
  while (match = open.exec(css)) {
    let depth = 1;
    let i = open.lastIndex;
    for (; i < css.length && depth > 0; i += 1) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') depth -= 1;
    }
    const cond = match[1].trim();
    const body = css.slice(open.lastIndex, i - 1);
    if (condRegex.test(cond)) bloques.push({cond, body});
    open.lastIndex = i;
  }
  return bloques;
}

const tiene = (cuerpo, propiedad, valor) =>
  new RegExp('(^|;)\\s*' + propiedad + '\\s*:\\s*' + valor + '\\s*(;|$)', 'i').test(cuerpo);

test('T-70: el shell de escritorio deja margen por lado mayor que la sombra (10px offset)', () => {
  // La regla vigente del escritorio es la de A-74 (min-width 801px): ahí
  // también vive el ajuste de sombra a 10px 10px que manda en ≥801 px.
  const bloques = reglasDe(/min-width\s*:\s*801px/);
  assert.ok(bloques.length >= 1, 'existe el @media de escritorio de A-74');
  const escritorio = bloques.flatMap(b =>
    [...b.body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .map(m => ({selector: m[1].trim(), body: m[2]})));
  const shell = escritorio.find(r => r.selector === '.shell');
  assert.ok(shell, 'el escritorio declara su ancho');
  assert.ok(tiene(shell.body, 'width', 'min\\(1480px,\\s*calc\\(100%\\s*-\\s*26px\\)\\)'),
    'el ancho del shell es min(1480px, calc(100% - 26px)): 13 px por lado, más que el offset de sombra');
  assert.ok(!/calc\(\s*100%\s*-\s*64px\s*\)/.test(shell.body),
    'los 32 px por lado de A-74 ya no aplican');

  const caja = regla('.workspace');
  assert.ok(caja, 'existe la regla de la caja de la sección principal');
  assert.ok(tiene(caja.body, 'box-shadow', '12px\\s+12px\\s+0\\s+rgba\\(44,\\s*50,\\s*40,\\s*\\.06\\)'),
    'la sombra base de la caja se conserva (12px 12px)');
  const sombra = escritorio.find(r => r.selector === ':is(.workspace)');
  assert.ok(sombra && tiene(sombra.body, 'box-shadow', '10px\\s+10px\\s+0\\s+rgba\\(44,\\s*50,\\s*40,\\s*\\.08\\)'),
    'la sombra de escritorio se conserva entera (10px 10px): la guarda de A-75');
});

test('T-70: en móvil el shell va borde a borde, sin recuadro exterior', () => {
  const bloques = reglasDe(/max-width\s*:\s*800px/);
  assert.ok(bloques.length >= 1, 'existe el @media de 800 px para la caja móvil');
  // En todos los bloques de 800 px, .shell declara 100%: sin banda de 12 px.
  const declarados = [];
  for (const bloque of bloques) {
    for (const m of bloque.body.replace(/\/\*[\s\S]*?\*\//g, '')
      .matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const sel = m[1].trim();
      const body = m[2].replace(/\s+/g, ' ').trim();
      if (sel === '.shell') declarados.push({body, bloque: bloque.cond});
    }
  }
  assert.ok(declarados.length >= 1, 'el shell móvil declara su ancho');
  for (const d of declarados) {
    assert.ok(tiene(d.body, 'width', '100%'),
      'el shell móvil ocupa todo el ancho: sin banda de 12 px por lado');
    assert.ok(!/calc\(\s*100%\s*-\s*24px\s*\)/.test(d.body),
      'el recuadro exterior de 24 px ya no está');
  }
});
