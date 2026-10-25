# Contraste de superficies · medición de `T-36` (ronda 1)

Fecha: 2026-10-25 · rama `agente1/contraste-superficies` · base `main` `f96cd2a` · autor de la
medición: Agente Desarrollador · verificación: Agente QA · decisión de carácter: autor.

**Esta ronda mide y no cambia colores.** `TAREAS.md` §`T-36` deja la línea 1 *«bloqueada en lo
estético por decisión del autor»*, así que acá va la medición con números y el menú de opciones;
la paleta la elige el autor y se aplica en la ronda siguiente. Lo único que se escribe es este
documento.

**Ronda 1 corregida (2026-10-25, devolución de QA):** la sonda que acompañaba la entrega no
ejecutaba las cuatro vistas que esta tabla declara. Está corregida, con prueba propia, y las
cuatro vistas se regeneraron **sin cambiar ningún número** — ver §Reproducibilidad.

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

## Reproducibilidad (corrección de la ronda 1)

QA devolvió la primera entrega (`a47cbcc`) por un defecto del instrumento, no de la medición:
`sonda-contraste.mjs` hacía `const VISTAS = (…).split(',')` y después comparaba
`VISTAS === 'todas'` —un arreglo contra un string, siempre falso—, así que `VISTAS=todas`
ejecutaba sólo las dos vistas de 1366×650. Las filas de 1366×768 y 320×740 no tenían
instrumento que las produjera.

Corregido en la misma rama, sin tocar paleta, CSS, JS ni HTML:

- La selección vive en **`vistas.mjs`** (catálogo único de las cuatro vistas) y la usa tanto la
  sonda como **`vistas.test.mjs`**, 6 casos con `node --test` que **nacieron rojos** contra un
  puerto fiel de la lógica devuelta (2/6; la roja es exactamente «todas cae en escritorio») y
  quedan verdes 6/6. `node vistas.mjs --plan todas` imprime el plan sin abrir Chromium.
- La sonda escribe **`manifiesto.json`** con las vistas que corrió y los totales de cada una:
  la evidencia dice qué se ejecutó, no sólo qué archivos quedaron.
- El tema ya no se cambia por un clic: se pide por `localStorage` + recarga y cada vista
  **falla en voz alta** si el tema medido no es el declarado. Sin eso, una corrida quedó con
  tres vistas en oscuro y el número salía plausible pero falso.

Las cuatro vistas se regeneraron desde el tip corregido y dan **los mismos números de la tabla
de arriba, uno a uno** (`base/manifiesto.json`). Dos corridas completas seguidas dan idéntico.
La roja y las salidas están en `red-first.txt` de la evidencia.

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

Misma vista, mismo desplazamiento (`#fretboard` al tope), claro y oscuro. En `preview/` de la
evidencia corregida:

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

Evidencia corregida: `agenteDesarrollador/evidencias/ronda-t36-fix-sonda-2026-10-25/`
(la carpeta original `ronda-t36-base-f96cd2a-2026-10-25/` queda como historia de la entrega
devuelta; la sonda vieja está congelada ahí como `sonda-devuelta-a47cbcc.mjs`).

```
node vistas.mjs --plan todas                        # 4 vistas, sin Chromium
node --test vistas.test.mjs                         # 6/6 · la selección probada
node agenteDesarrollador/evidencias/ronda-t36-fix-sonda-2026-10-25/servidor.mjs   # :8001
chromium --headless=new --remote-debugging-port=9225 …                            # CDP
EV=<salida> VISTAS=todas node …/sonda-contraste.mjs                               # 4 vistas + manifiesto
node …/validacion.mjs                               # 9/9 del medidor
EV=<salida> node …/analisis.mjs                     # ratios de candidatos
```

`manifiesto.json` deja escrito qué vistas corrió y sus totales: si un día vuelve a ejecutarse
menos de lo que el informe declara, se ve ahí y no en la buena voluntad de quien lee.
`analisis.mjs` calcula los ratios de cada candidato contra **las superficies observadas**, no
contra una lista escrita a mano: si mañana una superficie cambia, el número lo dice.

---

# Ronda 2 · los 84 rótulos del mástil (línea 2 de `T-36`)

Fecha: 2026-10-25 · rama `agente1/rotulos-mastil` · base `main` `bd04529` · autor de la
medición: Agente Desarrollador · verificación: Agente QA.

**Esta ronda sí cambia la app**, a diferencia de la ronda 1: la línea 2 no dependía de la
paleta (`D-8`) y su tinta no es una decisión de carácter sino un número que no llegaba a AA.

## El defecto, y por qué era uno solo

La tinta del rótulo la eligíaba la **clase** de la nota: `#f3f0e8` para la raíz y las notas del
acorde, `#1d2521` para las de escala y `#666` sobre el gris `#bbb` de las no resaltadas. Una
sola tinta por clase no puede cubrir todos los rellenos de la tabla de intervalos, que son 16
colores muy distintos: los 84 rótulos visibles del arranque (Do mayor, tríada, AA GRADOS) daban
**1,64 / 2,44 / 2,99 / 3,71**.

## El arreglo

1. **`note-ink.js` es la única autoridad** del par relleno/tinta: calcula la luminancia WCAG y
   devuelve, entre negro (`#000000`) y blanco (`#ffffff`), el de más contraste sobre ese
   relleno. Todo relleno de la tabla llega a 4,5; el más justo es el 7ª mayor (`#AB47BC`, 4,82
   con blanco) y le siguen el 4ª justa (`#00897B`, 4,86 con negro) y la raíz (`#E53935`, 4,97
   con negro).
2. **No se toca ningún relleno.** El color del intervalo es el lenguaje de la escala y vive en
   una sola tabla (`intervalClasses` de `app.js`); adapta la tinta, no la paleta. Por eso esta
   ronda no invade `D-8`.
3. **El micrófono usa la misma autoridad.** `micFretColor` (`microphone-ui.js`, la ruta de
   `T-21`) elegía la tinta por clase y repetía el defecto en vivo: `#f3f0e8` sobre la raíz
   (3,71) y `#1d2521` sobre el violeta del 7ª menor (2,49). Ahora pide la tinta a `note-ink.js`.
4. **El halo de la nota que suena sigue a la tinta, no a la clase.** `app.js` escribe
   `ink-dark`/`ink-light` junto con el color y `style.css` elige el halo al revés de esa clase.
   Sin eso, la raíz y las notas del acorde habrían quedado con tinta oscura y halo oscuro.

## Resultado (misma sonda de la ronda 1, cuatro vistas)

| Vista | Visibles bajo AA antes | Ahora | Rótulos del mástil |
| --- | --- | --- | --- |
| 1366×650 claro | 189 | **105** | 84 medidos, **0 fallan** |
| 1366×650 oscuro | 90 | **6** | 84 medidos, **0 fallan** |
| 1366×768 claro | 189 | **105** | 84 con 0 fallan |
| 320×740 claro | 142 | **58** | 84 con 0 fallan |

Los cuatro pares medidos del arranque, ya con la tinta nueva:

| Relleno | Tinta antes | Ratio antes | Tinta ahora | Ratio ahora |
| --- | --- | --- | --- | --- |
| `#e6b800` (5ª) | `#f3f0e8` | 1,64 | `#000000` | **11,22** |
| `#4caf50` (3ª mayor) | `#f3f0e8` | 2,44 | `#000000` | **7,56** |
| `#bbbbbb` (escala sin resaltar) | `#666666` | 2,99 | `#000000` | **10,94** |
| `#e53935` (raíz) | `#f3f0e8` | 3,71 | `#000000` | **4,97** |

**Los 84 que se van son exactamente los del mástil**: 189 − 84 = 105 en claro y 90 − 84 = 6 en
oscuro, sin que ningún otro grupo cambiara de número.

## Los rellenos que el arranque no muestra

La sonda mide el estado de arranque (Do mayor), que solo enseña cuatro rellenos. `estados.mjs`
cambia el acorde y la vista en la página real y mide los siete estados que interesan, incluidos
los oscuros que ahora piden tinta clara:

| Estado | Rótulos | Rellenos | Mínimo | Fallan |
| --- | --- | --- | --- | --- |
| arranque (Do mayor) | 84 | 4 | 4,97 | 0 |
| Do m7, vista Acorde 7ma | 84 | 5 | **4,82** | 0 |
| Do maj7, vista Acorde 7ma | 84 | 5 | 4,82 | 0 |
| Fa mayor, tríada | 83 | 4 | 4,97 | 0 |
| Do dim7, vista Acorde 7ma | 84 | 5 | 4,82 | 0 |
| Re aumentado, tríada | 93 | 4 | 4,97 | 0 |
| La menor, vista grados | 84 | 7 | 4,86 | 0 |

## Lo que esta ronda no arregla, y por qué

- **El número de octava** (`.octave-number`, 1,71 en oscuro): es la **línea 3** de la ficha y
  es una decisión del autor (¿se muestra la octava?). Coordinación la pregunta cuando esta
  ronda cierre; no se toca sin su palabra.
- **`--muted` (77) y `--rust` como texto (18), más las 5 piezas con texto claro sobre el cobre
  y los 5 glifos decorativos**: son la línea 1 y siguen esperando **`D-8`**. Los 6 que quedan
  en oscuro son esos: 4 glifos `aria-hidden`, el control activo «Acorde» (2,23, su propia
  ronda) y la octava.
- **La tinta de la nota fantasma** (`rgba(29,37,33,.5)`) y la de la **nota fuera de escala
  sobre la madera** (`#999`, solo visible con MÁSTIL encendido): la primera es la identidad del
  modo fantasma; la segunda se apoya en un fondo con degradado, que el propio instrumento marca
  como no concluyente. Quedan anotadas, medidas en su contexto y sin cambio, para que la
  decisión sea explícita y no un olvido.

## Cómo se re-verifica

Evidencia: `agenteDesarrollador/evidencias/ronda-t36-r2-rotulos-mastil-2026-10-25/`.

```
node --test tests/rotulos-mastil-contraste.test.cjs   # la guarda nueva (5 casos, nació roja)
npm test                                              # 475/475
node servidor.mjs &                                   # sirve wt-agente1
chromium --headless=new --remote-debugging-port=9225 --user-data-dir=<perfil> about:blank &
EV=<salida> VISTAS=todas node sonda-contraste.mjs     # las cuatro vistas
EV=<salida> node estados.mjs                          # los siete estados del mástil
```

La guarda no usa `note-ink.js` para calcular: mide con su propia aritmética WCAG y barre los 23
tipos de acorde × los modos × tres vistas × los dos instrumentos, así que un relleno nuevo en
la tabla entra en la medición sin que nadie se acuerde de anotarlo.
