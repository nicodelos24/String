# Contraste de superficies · medición de `T-36` (ronda 1)

Fecha: 2026-10-25 · rama `agente1/contraste-superficies` · base `main` `f96cd2a` · autor de la
medición: Agente Desarrollador · verificación: Agente QA · decisión de carácter: autor.

**Esta ronda mide y no cambia colores.** `TAREAS.md` §`T-36` deja la línea 1 *«bloqueada en lo
estético por decisión del autor»*, así que acá va la medición con números y el menú de opciones;
la paleta la elige el autor y se aplica en la ronda siguiente. Lo único que se escribe es este
documento.

## Qué se midió y con qué

Sonda propia sobre la página real en Chromium 155 por CDP (`sonda-contraste.mjs`, evidencia al
pie). Recorre **cada elemento con texto propio**, compone el fondo subiendo por los ancestros
—mezclando capas semitransparentes, incluidas las de `color(srgb …)` y `color-mix()`— y calcula
el ratio WCAG 2.1. Tres reglas sin las cuales la medición miente, heredadas de
`docs/AUDITORIA-CONTRASTE.md`: transiciones y animaciones anuladas antes de leer, parser que
entiende `color(srgb …)`, y opacidad de grupo aplicada a la tinta (un panel plegado con
`opacity: 0` no se mide como si su texto fuera invisible: se mide aparte y se informa aparte).

Vistas: **1366×650** —el pliegue real del autor, `A-12`—, 1366×768 y 320×740; claro y oscuro.
Texto grande según WCAG: ≥24 px, o ≥18,66 px con peso ≥700.

**Validación del instrumento** (9/9): reproduce exactamente los siete números publicados en
`docs/AUDITORIA-CONTRASTE.md` (`#78807b`/`#f1e8dc` 3,35 · `#78807b`/`#1d2521` 3,86 ·
`#666666`/`#bbbbbb` 2,99 · `#f3f0e8`/`#e6b800` 1,64 · `#f3f0e8`/`#4caf50` 2,44 ·
`#f3f0e8`/`#e53935` 3,71 · `#c95735`/`#f1e8dc` 3,54) y los dos candidatos que esa auditoría
proponía (`#5d6560` y `#a94227` sobre `#f1e8dc` = 4,95).

**Lo que no mide:** estados que escribe JavaScript (micrófono encendido, progresión cargada,
tarjeta activa, YouTube, vista pentatónica), `:hover`, fondo con imagen (se marca y su ratio no
es concluyente), Safari/Firefox, ni la tipografía real — las capturas usan fuentes de respaldo,
así que esto **no cierra `DEF-02`/`DEF-03`**.

## Resultado sobre `main` `f96cd2a`

| Vista | Textos | Visibles | Bajo mínimo (AA) | Visibles bajo mínimo |
| --- | --- | --- | --- | --- |
| 1366×650 claro | 370 | 270 | 234 | **189** |
| 1366×650 oscuro | 370 | 270 | 117 | **90** |
| 1366×768 claro | 370 | 270 | 234 | 189 |
| 320×740 claro | 170 | 157 | 152 | 142 |

«Visibles» excluye lo que está dentro de paneles plegados (`opacity: 0`, alto 0). Se midieron
igual: el autor los abre, y los números completos quedan en la evidencia.

## Dónde falla, en claro y visible (189)

| Grupo | n | Peor ratio | Superficies | Línea de `T-36` |
| --- | --- | --- | --- | --- |
| `--muted` (#78807b) | **77** | **3,35** | `#faf9f5` 24 · `#eeeade` 30 · `#f3f0e8` 16 · `#ffffff` 4 · `#efebdf` 2 · `#f1e8dc` 1 | **1 (esta ronda)** |
| Tinta del mástil (48 con `#666666` + 36 con `--paper`) | 84 | 1,64 | notas del mástil, paleta clara forzada | 2 |
| `--rust` como texto (#c95735) | **18** | **3,54** | `#faf9f5` 11 · `#f3f0e8` 4 · `#f1e8dc` 3 · `#eeeade` 2 · `#f7efe9` 1 | **1 (esta ronda)** |
| Texto claro sobre fondo `--rust` (control activo, insignias, marca) | 5 | 3,76 | `#c95735` | 1 (de paso) |
| Glifos decorativos `aria-hidden` (⠿, ♯) | 5 | 1,94 | tarjetas / toggle de tema | exentos (1.4.3) |

En oscuro los 90 se reparten así: **84 del mástil** (la paleta clara forzada, igual que en
claro), **1 del número de octava** (1,71 sobre `#4f4917`, línea 3), **4 glifos decorativos** ⠿
(2,85–3,24, `aria-hidden`) y **1 control activo** «Acorde» con texto blanco sobre el cobre claro
(2,23). `--muted`, `--ink` y `--rust` oscuros dan **0 fallos visibles** con los valores actuales,
y el gris oscuro tiene holgura: mínimo **5,75**.

## Corrección de una premisa de la auditoría del 17-10

La auditoría concluía que `--muted` «no se puede arreglar oscureciéndolo» porque se usaba sobre
superficies claras **y** sobre `#1d2521`, y que el arreglo era separar dos variables.

**Eso ya no es cierto, y se midió:** el tema oscuro **redefine** `--muted` (`#b1b8af`, mínimo
5,75 contra sus seis superficies) y en el tema claro **no hay ni un solo uso visible de `--muted`
sobre una superficie oscura** (0 de 77). La separación que la auditoría proponía ya existe de
hecho —está partida por tema—; lo que falta es **el valor claro**, que hoy no llega a 4,5 en
ninguna de sus seis superficies.

Consecuencia práctica: la decisión se reduce a **una línea** (`:root`), no a tocar decenas de
usos uno por uno.

## Menú para el autor (lo estético lo elige él)

| Opción | Cambio | Arregla | Deja | Costo visual |
| --- | --- | --- | --- | --- |
| **A** | `:root` → `--muted: #5d6560` | 77 (quedan 112 en claro) | — | el gris secundario se vuelve más oscuro en toda la app clara; en oscuro **no cambia nada** (medido: 90 fallos antes y después) |
| **B1** | `--rust` solo como **texto** → `var(--rust-dark)` en sus 18 rótulos | 18 (quedan 94 en claro con A) | las 5 piezas con texto claro sobre el cobre | los rótulos de sección y la ceja pasan de cobre claro a cobre hondo; botones y presets intactos |
| **B2** | `--rust` global `#c95735 → #a94227` | 23 (quedan **89** con A) | — | cambia la marca: botones, presets, insignias y `ARMADURA` |
| **C** | no tocar y dejar la medición como registro | 0 | 189 | ninguno |

Números medidos para A y A+B2, con el mismo instrumento y la misma vista (1366×650 claro,
visibles bajo mínimo): **189 → 112 (A) → 89 (A+B2)**; en oscuro **90 → 90 → 90**. A+B1 no se
renderizó (B1 no toca fondos): se calcula de los ratios, `--rust-dark` da 4,95 en el peor caso,
así que deja **94**: los 84 del mástil, las 5 piezas con texto claro sobre `--rust` y los 5 glifos decorativos.

**Recomendación del Desarrollador:** **A + B1**. Arregla 95 de los 189 fallos visibles en claro
sin mover la marca ni un botón, y deja el mástil (84) a su propia línea, que es donde está el
peor número (1,64) y donde la tinta la escribe `app.js` en línea — el camino de `T-21`.

Los cinco glifos decorativos no se tocan: son `aria-hidden` y WCAG 1.4.3 no les exige 4,5.
Quedan anotados, no ocultos.

**Aparte, y no lo arregla ninguna de las opciones de arriba:** el control activo «Acorde» —texto
claro sobre insignia `--rust`— falla en los dos temas (4,29 en claro y **2,23** en oscuro, que es
el peor número de un control real). En claro lo taparía B2; en oscuro el cobre es claro
(`#ed9978`) y ahí la salida es tinta oscura sobre el cobre, no blanco. Es una decisión de una
pieza y va en su propia ronda: acá queda medida y con nombre, no arreglada a ciegas.

## Comparación visual

Misma vista, mismo desplazamiento (`#fretboard` al tope), claro y oscuro:

- `preview/1366x650-claro-base.png` · `-A.png` · `-AB2.png`
- `preview/1366x650-oscuro-base.png` · `-A.png` · `-AB2.png`

Y el detalle 2× del encabezado, que es donde se ve el carácter: la ceja
`GUITARRA / MAPA ARMÓNICO` (en `--rust`) y la copia de entrada (en `--muted`).

- `preview/detalle-encabezado-base.png` · `-A.png` (solo el gris se oscurece) ·
  `-AB2.png` (además el cobre se hunde). En tema oscuro las tres variantes salen
  **idénticas**: la inyección de A no toca `--muted` oscuro porque el tema lo redefine.

Las variantes se inyectaron **solo en la sonda** (`:root{--muted:#5d6560}` y
`:root{--muted:#5d6560;--rust:#a94227}`); ningún archivo de la app cambió.

## Cómo se re-verifica

```
node agenteDesarrollador/evidencias/ronda-t36-base-f96cd2a-2026-10-25/servidor.mjs   # :8001
chromium --headless=new --remote-debugging-port=9225 …                              # CDP
EV=<salida> node …/sonda-contraste.mjs                                              # mide y captura
node …/analisis.mjs                                                                 # ratios de candidatos
```

`analisis.mjs` calcula los ratios de cada candidato contra **las superficies observadas**, no
contra una lista escrita a mano: si mañana una superficie cambia, el número lo dice.
