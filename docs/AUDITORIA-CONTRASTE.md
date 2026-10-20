# Auditoría de contraste y lectura

Ronda de Agente 2 sobre `T-04`. Fecha: 2026-10-17. Rama: `agente2/visual-contraste-mastil`.

## Cómo se midió

Con Chromium 152 sobre la **página real** (`index.html` con su `style.css` y sus scripts), no
sobre una maqueta: se recorrió cada elemento con texto propio, se tomó su color calculado, se
subió por los ancestros componiendo las capas semitransparentes hasta llegar a un fondo opaco,
y se calculó el ratio WCAG. Se midió en tema claro y en tema oscuro, a 1440 px.

Dos detalles que sin ellos la medición miente:

- **Transiciones y animaciones anuladas antes de medir.** Con ellas activas,
  `getComputedStyle` devuelve el valor interpolado y se miden colores que no existen.
  Ya pasó en este repo con `.fret-note`, que tiene `transition: all .2s`.
- **El parser tuvo que aprender `color(srgb ...)`.** `color-mix()` no resuelve como `rgb()`,
  y un parser que solo entiende `rgb()` se salta el elemento **en silencio**: el total sale más
  bajo y no se nota. El CSS ya usaba `color-mix` tres veces antes de este trabajo, así que la
  primera medición tenía ese punto ciego. Los números de abajo son de después de corregirlo.

Base: **350 textos medidos por tema**. Antes de este trabajo: **206 bajo el mínimo en claro y
89 en oscuro**. Después: **203 y 86**.

## Lo que se arregló en esta ronda

### 1. El span del botón pulsado, invisible en oscuro

`.icon-button span` usaba `var(--muted)`. El botón pulsado invierte su fondo a `var(--ink)`, así
que `--muted` se invertía con el tema y en oscuro quedaba un gris claro sobre un fondo casi
blanco.

| | Antes | Después |
| --- | --- | --- |
| Claro | 3.86 | **8.35** |
| Oscuro | **1.69** | **5.37** |

El span ahora se mezcla con el fondo del botón en vez de seguir al tema:
`color-mix(in srgb, var(--paper-light) 72%, var(--ink))`.

### 2. El rótulo del modo seleccionado, invisible en oscuro

`.mode-option:has(input:checked)` pinta un fondo **claro fijo** (`#f1e8dc`) que no se
re-tematiza, pero su rótulo sí seguía a `--muted`. Mismo error que el anterior.

| | Antes | Después |
| --- | --- | --- |
| Claro | 3.35 | **4.95** |
| Oscuro | **1.67** | **4.95** |

Como el fondo es el mismo en los dos temas, alcanza un valor fijo: se agregó `--muted-chip`
(`#5d6560`), que **no** se redefine en el tema oscuro, a propósito.

### 3. `.workspace` seguía animando con movimiento reducido

Este no lo encontró esta auditoría: lo trajo Agente QA al revisar `T-02`. `.workspace` anima
550 ms con `rise` y era el único contenedor animado sin relevo, entre once bloques
`prefers-reduced-motion`. Con la preferencia activa, el video flotante de YouTube queda
anclado al contenedor en vez del viewport durante la animación.

```
@media (prefers-reduced-motion: reduce) { .workspace { animation: none; } }
```

No cambia el contraste: solo aplica con la preferencia encendida.

## Los dos hallazgos de fondo, que no se arreglan aquí

### `--muted` no se puede arreglar oscureciéndolo

`--muted` (`#78807b`) aparece en 82 textos y falla en casi todos: de 3.35 a 4.06. Pero **no
existe un solo valor que llegue a 4,5 en todos los fondos donde se usa**, y la razón es
estructural: se usa tanto sobre superficies claras (`#faf9f5`, `#f3f0e8`, `#f1e8dc`) como
sobre `#1d2521`, que es oscuro. Un valor más oscuro arregla lo primero y empeora lo segundo.

Medido:

| Valor | Peor caso | Sobre `#f1e8dc` | Sobre `#1d2521` |
| --- | --- | --- | --- |
| `#78807b` (el actual) | 3.35 | 3.35 | 3.86 |
| `#6f7772` | 3.40 | 3.80 | 3.40 |
| `#666e69` | 2.99 | 4.33 | 2.99 |
| `#5d6560` | 2.61 | 4.95 | 2.61 |

**El arreglo es separar dos variables** —un muted para superficies claras y otro para
oscuras— y eso cambia el carácter de la interfaz en toda la app. Es una decisión de diseño, no
un parche. Propuesta, con números, para el autor y QA.

### `--rust` como texto de rótulo

`#c95735` sobre fondo claro da 3.54 como mínimo. El proyecto **ya tiene** el valor que
funciona: `--rust-dark` (`#a94227`) llega a 4.95 en todos los fondos donde aparece. El cambio
es de una línea por rótulo, pero `--rust` es el color de marca y tocarlo cambia el aspecto de
botones, presets y la etiqueta `ARMADURA DE CLAVE`. No se tocó.

## Lo que no es de Agente 2

Las notas del mástil son el grupo más grande que queda fuera, y la tinta la escribe `app.js`
en un estilo en línea, no el CSS:

| Tinta | Fondo | Ratio | Apariciones |
| --- | --- | --- | --- |
| `#f3f0e8` | `#e6b800` (grado 5) | **1.64** | 12 |
| `#f3f0e8` | `#4caf50` (grado 3) | 2.44 | 12 |
| `#666666` | `#bbbbbb` (fuera de escala) | 2.99 | 48 |
| `#f3f0e8` | `#e53935` (raíz) | 3.71 | 12 |

El commit `b77564d` ya atacó el rótulo que escribe el micrófono sobre esas notas, y mejoró lo
que pudo sin romper el color propio. Lo que queda es la tinta base, y es `T-21`, de Agente 1.
Además hay que tener en cuenta lo que ese commit escribió: `app.js` pone la tinta en línea, así
que **`!important` desde el CSS reintroduce el problema que ya se corrigió una vez**.

## Un defecto para decidir, no para arreglar solo

`.octave-number` mide **1.71** en tema oscuro: `#1d2521` sobre `#4f4917`. La causa no es un
error suelto sino una contradicción de la que alguien tiene que decidir:

`.fretboard-layout` fuerza su propia paleta clara en ambos temas (por eso el mástil se ve
igual en oscuro, que es lo decidido). Pero `.fretboard-section`, su contenedor, **se queda
oscuro** (`#1c241f`). El número de octava usa la tinta clara forzada sobre un fondo que
resulta oscuro. O se le da fondo al `.fretboard-layout`, o la tinta de las octavas se aparta
de la paleta forzada. Esesthetics del mástil en oscuro: **decisión del autor.**

## El patrón que quedó a medias

`#f1e8dc` está escrito **9 veces** en `style.css` y `#eeeade` una, siempre como superficie
clara que no se re-tematiza. Con `--muted-chip` ya definido, el resto puede seguirlo. Solo se
arregló el caso que la auditoría medía como roto: donde el texto de la ficha clara era
`--muted`. Los demás usan `--ink` o `--paper`, que sí se invierten con el tema y funcionan
bien en oscuro.

## Lo que esta auditoría no demuestra

- **Solo el estado inicial.** No midió con el micrófono encendido, con una progresión cargada,
  con una tarjeta activa, con YouTube, con la vista pentatónica ni con el modo oscuro real de
  cada componente: son estados que escribe JavaScript y hay que medirlos aparte.
- **No midió a 320 ni a 768 px.** Solo a 1440.
- **Fondo con imagen no es medible.** Aquí no apareció ninguno, pero si aparece, el cálculo da
  un número sin sentido y hay que mirarlo a ojo.
- **`npm test` no Midió nada de esto.** Siguió dando verde con los tres fallos de contraste
  arreglados y sin ver ninguno. Los 290/290 dicen que no se rompió la funcionalidad; no dicen
  nada de si algo se lee.

## Revalidación QA — 2026-10-20

Base revisada: `main` `b698f11`. Se volvió a ejecutar la suite y se revisó la página real en
Chromium: escritorio a 1440 px en tema claro y oscuro, y móvil a 375 px. No se observó
desbordamiento horizontal ni regresión estática en la consolidación de CSS de `T-05`; el botón
**Tempo** de `DEF-02` conserva una jerarquía y fuente coherentes en ambos temas.

Esta pasada **no cierra** las tareas que requieren estados que no pueden simularse honestamente
sin instrumento o servicio externo:

- `DEF-01` y `T-03`: falta comprobar el halo y la lectura del grado con el micrófono y la
  guitarra reales.
- Los contrastes abiertos de esta auditoría siguen abiertos; esta pasada no volvió a medirlos
  ni cambia su severidad.
- El botón `↺` del Tempo y los cuatro botones `×` de tarjetas siguen en `DEF-03`: no declaran
  `font: inherit` y se revisarán por componente, no como parte de `DEF-02`.

La evidencia visual confirma ausencia de regresión en las vistas inspeccionadas; no sustituye
la aceptación auditiva, la validación en Safari/Firefox ni la prueba del autor con instrumento.
