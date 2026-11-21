# Mapa de módulos de String · T-72 (A-80)

Auditoría documental: inventario **módulo → suite → uso**, cotejado contra la base
vigente `main` / `origin/main` = `27f688a528023101f4b64fb321cf95626195e622`
(confirmada el 21-11-2026). No se refactorizó nada: este documento es el único
archivo nuevo.

**Origen y autoría del borrador.** Este mapa retoma el borrador
`docs/MAPA-MODULOS.md` escrito por **Ari** el 06-11-2026 (06:45 local) en
`String/wt-apx-t72-auditoria`, rama `agente1/t72-auditoria` @ `077eeb3`, sin
trackear. La autoría queda acreditada por el expediente en `TAREAS.md` (entradas
06-11 06:44 y 06:54, líneas 4339 y 4355) y por el `birth time` del fichero. El
borrador se basó en `077eeb3` y no era entrega verificable: sus recuentos
(42 módulos / 62 suites / 5 pruebas de navegador) y su cifra de `npm test`
(616/616) correspondían a esa base anterior. La presente versión preserva su
estructura y sus deudas propuestas, y **recuentos y cobertura se recalcularon
desde cero sobre `27f688a`** en un worktree aparte (`feat/t72-mapa-modulos`).
El worktree de Ari no fue modificado.

**Verificación reproducible de esta ronda:** `npm test` → 637/637 (ver §6);
recuentos tomados de las etiquetas `<script src>` de `index.html`, de `grep` del nombre de
cada módulo en `tests/*.test.cjs` y `tests/browser/*.cjs`, y de `wc`. Método
detallado en §6.

## 1. Cómo carga la aplicación

No hay módulos ES ni `import`s: todo el código vive en IIFE/globales y se carga en
orden fijo por `<script>` en `index.html` (línea 12 en `<head>`, líneas 319-341 en
el cuerpo). El orden importa: las dependencias de domino van antes
(`music-model.js` → `progression-duration.js` → `tonal-context.js` →
`note-ink.js` → `app-state.js` → `fretboard-render.js` → `app.js` abre la fila;
los consumidores de UI van después). `theme.js` se carga primero, en `<head>`.
`tests/project-structure.test.cjs` vigila parte de esa estructura: exige IDs de
HTML únicos, guiones (`<script src>`) no duplicados, que cada entrada local
exista y que `midi-catalog.js` **no** se cargue en el DOM.

| Grupo | Scripts (en orden) |
| --- | --- |
| Tema (en `<head>`, primero) | `theme.js` |
| Modelo / núcleo | `music-model.js`, `progression-duration.js`, `tonal-context.js`, `note-ink.js`, `app-state.js`, `fretboard-render.js`, `app.js` |
| Rejilla / pestañas / transporte | `responsive-layout.js`, `mobile-tabs.js`, `transport-pill.js`, `progression-interactions.js`, `metronome.js`, `progression-player.js`, `sections.js`, `player-ui.js`, `player-disclosure.js` |
| Video | `youtube-url.js`, `video-sync.js`, `youtube-player.js` |
| Biblioteca y estructura | `song-library.js`, `song-structure.js`, `song-structure-adapter.js`, `song-library-ui.js` |
| Micrófono | `note-preview.js`, `pitch-detection.js`, `chord-detection.js`, `microphone.js`, `microphone-ui.js`, `improvisation.js`, `beat-ball.js`, `mic-follow.js` |
| Instrumento / MIDI | `instrument-picker.js`, `midi-import.js`, `midi-player.js`, `midi-ui.js` |
| Ajustes | `progression-presets.js`, `panel-controls.js`, `tempo-tap.js`, `keyboard-section.js`, `preferences.js` |

## 2. Cobertura declarada por suite

Fichero → suites que lo refieren por nombre (`grep -l <stem> tests/*.test.cjs`,
recuento reproducible). «Suite dedicada» es la que lleva el nombre del módulo;
muchos módulos se cubren solo de forma indirecta, a través de `app.js` o de las
pruebas de estilo/markup que los cargan como `require`. La columna es la
referencia **por nombre**: una suite que no lo nombra puede ejecutar el código
de todos modos al cargar el DOM.

| Fichero | Suites (`tests/`…) | Suite dedicada propia |
| --- | --- | --- |
| `app.js` | app-estado, keyboard-section, mastil-enfasis-discreto, mastil-render, mic-follow, microphone-ui, midi-catalog, modelo-musical, note-preview, preferences, progression-duration, progression-interactions, progression-player-modular, progression-presets, progression, project-structure, rotulos-mastil-contraste, sections-composer, sections-edicion, sections-indices, song-library, song-structure, song-tonality, tempo-tap, tonal-context, transporte-pildora, transporte-scroll-propio, variants-vuelta, video-salto, youtube-player | (no: se cubre a través de los demás) |
| `app-state.js` | app-estado, mastil-enfasis-discreto, mastil-render, progression, rotulos-mastil-contraste, song-library, song-tonality, variants-vuelta, video-salto | `app-estado.test.cjs` |
| `beat-ball.js` | beat-ball | `beat-ball.test.cjs` |
| `chord-detection.js` | chord-detection, keyboard-section, microfono-acordes-dibujo, microphone | `chord-detection.test.cjs` |
| `fretboard-render.js` | mastil-enfasis-discreto, mastil-render, microfono-acordes-dibujo, progression, rotulos-mastil-contraste, song-library, song-tonality, teclado-limite-bajo, variants-vuelta, video-salto | (vía `app.js` y CSS) |
| `improvisation.js` | beat-ball, controles-filas, improvisation | `improvisation.test.cjs` |
| `instrument-picker.js` | preferences | (vía `preferences.test.cjs`) |
| `keyboard-section.js` | keyboard-section, note-preview, style-css, teclado-limite-bajo | `keyboard-section.test.cjs` |
| `metronome.js` | keyboard-section, metronome, panel-controls, preferences, presupuesto-alto, progression, tempo-tap | `metronome.test.cjs` |
| `mic-follow.js` | controles-filas, mic-follow, tempo-tap | `mic-follow.test.cjs` |
| `microphone.js` | beat-ball, mastil-enfasis-discreto, microfono-acordes-dibujo, microphone, microphone-ui, rotulos-mastil-contraste | `microphone.test.cjs` |
| `microphone-ui.js` | mastil-enfasis-discreto, microfono-acordes-dibujo, microphone-ui, rotulos-mastil-contraste | `microphone-ui.test.cjs` |
| `midi-catalog.js` | midi-catalog, project-structure | `midi-catalog.test.cjs` (no se carga en el DOM) |
| `midi-import.js` | midi-catalog, midi-import | `midi-import.test.cjs` |
| `midi-player.js` | midi-player | `midi-player.test.cjs` |
| `midi-ui.js` | progression-duration (referencia indirecta) | — ⚠️ |
| `mobile-tabs.js` | ninguna por nombre de módulo | — ⚠️ |
| `music-model.js` | app-estado, mastil-enfasis-discreto, midi-catalog, modelo-musical, progression, rotulos-mastil-contraste, song-library, song-structure, song-tonality, tonal-context, variants-vuelta, video-salto | `modelo-musical.test.cjs` |
| `note-ink.js` | mastil-enfasis-discreto, mastil-render, mastil-tipografia, microfono-acordes-dibujo, microphone-ui, note-ink-cache, progression, rotulos-mastil-contraste, song-library, song-tonality, variants-vuelta, video-salto | `note-ink-cache.test.cjs` (parcial) |
| `note-preview.js` | note-preview | `note-preview.test.cjs` |
| `panel-controls.js` | keyboard-section, panel-controls | `panel-controls.test.cjs` |
| `pitch-detection.js` | microphone, pitch-detection | `pitch-detection.test.cjs` |
| `player-disclosure.js` | ninguna por nombre de módulo | — ⚠️ |
| `player-ui.js` | beat-ball, preferences, progression-player-modular, progression, variants-vuelta | (vía `progression.test.cjs`) |
| `preferences.js` | microphone-ui, preferences, presupuesto-alto, progression | `preferences.test.cjs` |
| `progression-duration.js` | mastil-enfasis-discreto, player, progression-duration, progression-player-modular, progression, rotulos-mastil-contraste, song-library, song-tonality, variants-vuelta, video-salto | `progression-duration.test.cjs` |
| `progression-interactions.js` | progression-interactions | `progression-interactions.test.cjs` |
| `progression-player.js` | player, progression-duration, progression-player-modular, progression-presets, progression, variants-vuelta | (vía `progression.test.cjs`) |
| `progression-presets.js` | progression-presets | `progression-presets.test.cjs` |
| `responsive-layout.js` | ninguna por nombre de módulo | — ⚠️ |
| `sections.js` | banda-tarjetas-fija, encabezado-zona-tocar, progression-interactions, sections-composer, sections-edicion, sections-indices, sections, song-library, song-structure-adapter, variants-vuelta, video-salto | `sections.test.cjs` y familias |
| `song-library.js` | progression-duration, song-library, song-structure | `song-library.test.cjs` |
| `song-library-ui.js` | progression-duration, song-library, song-structure | (vía `song-library.test.cjs`) |
| `song-structure.js` | song-library, song-structure-adapter, song-structure | `song-structure.test.cjs` |
| `song-structure-adapter.js` | song-library, song-structure-adapter | `song-structure-adapter.test.cjs` |
| `tempo-tap.js` | beat-ball, controles-filas, mic-follow, preferences, silencio-tempo-gemelos, tempo-tap, transporte-clavado, transporte-pildora, transporte-scroll-propio | `tempo-tap.test.cjs` |
| `theme.js` | barras-estilo, keyboard-section, paneles-tarjetas, tema-simbolos | `tema-simbolos.test.cjs` |
| `tonal-context.js` | mastil-enfasis-discreto, microphone-ui, progression, rotulos-mastil-contraste, song-library, song-structure, song-tonality, tonal-context, variants-vuelta, video-salto | `tonal-context.test.cjs` |
| `transport-pill.js` | transporte-clavado, transporte-pildora, transporte-scroll-propio | familia `transporte-*` |
| `video-sync.js` | video-salto, video-sync | `video-sync.test.cjs` |
| `youtube-player.js` | video-salto, youtube-player | `youtube-player.test.cjs` |
| `youtube-url.js` | video-salto, youtube-player, youtube-url | `youtube-url.test.cjs` |

Suites Node añadidas respecto al borrador (presentes en `27f688a`, ausentes en
`077eeb3`): `aire-t70`, `fsperf-recorte`, `grado-04-layout`, `note-ink-cache`.
Todas las diferencias de cobertura que aparecen arriba (`note-ink.js`, `app.js`,
etc.) se derivan de esas cuatro suites y del crecimiento natural de las familias.

Pruebas de navegador (`tests/browser/`, 7): `fsperf-recorte.cjs`,
`t59-pianito.cjs`, `t61-movil.cjs`, `t62-foco.cjs`, `t67-pulido-visual.cjs`,
`t69-aire.cjs`, `transporte-regresion.cjs`. Son regresión focal de tareas
cerradas (T-59, T-61, T-62, T-67, T-69) y de rendimiento (fsperf); se ejecutan
aparte de `npm test` (que corre solo `tests/*.test.cjs`). Ninguna nombra a
`mobile-tabs.js`, `player-disclosure.js`, `responsive-layout.js` ni `midi-ui.js`.

## 3. Casos a distinguir (cargados a propósito, sin `import`, o con hueco)

1. **`midi-catalog.js` — fixture declarado, no huérfano.** No está en `index.html`
   pero es proyecto conocido: catálogo de los dos MIDIs de Mutopia en
   `assets/midi/`. `project-structure.test.cjs` exige explícitamente que **no**
   se cargue en el DOM («Historical MIDI fixtures must not be loaded by the
   app»); los tests lo piden por Node (`midi-catalog.test.cjs`,
   `project-structure.test.cjs`). No hay que cargarlo al DOM.
2. **`mobile-tabs.js`, `player-disclosure.js`, `responsive-layout.js` — pequeños
   y sin suite propia ni grep por nombre en ninguna prueba (Node ni browser).**
   Están cargados en `index.html` y hacen trabajo real (pestañas móviles, aria
   del reproductor, realojo del resumen tonal), pero no hay regresión que los
   nombre. **Deuda propuesta D1**: una pequeña suite Node o de navegador por
   módulo (o al menos una que active pestañas móviles y el botón del
   reproductor) para que un cambio tácito no quede sin guarda.
3. **`midi-ui.js` — no tiene suite que la pida por nombre.** Solo hay una
   referencia indirecta en `progression-duration.test.cjs`. Parte del trato v1
   de MIDI llega vía el UI. **Deuda propuesta D2**: cobertura focal de
   `midi-ui.js` (importar, rótulos de duración, refresco tras cambio de
   selección), separada del resto.

No se clasificó ningún otro módulo como huérfano: los 41 scripts de
`index.html` están todos referenciados por al menos una suite Node por nombre,
salvo los tres del punto 2.

## 4. Qué sigue concentrado en `app.js`

`app.js` pesa **49 283 bytes** (`wc -c`, ≈ 49 KB) y sigue siendo el único fichero
“pegamento” que toca casi todo el estado visible: 30 suites Node lo nombran (la
cifra del borrador, 24, quedó desactualizada por las nuevas suites). Dentro,
sigue concentrando:

- arranque y obligatoriedad del estado global de progresión/tarjetas (mood e
  interacción UI), con persistencia en `localStorage` bajo la clave
  `traste.songs.v1` (`app.js:59-80`);
- control del mástil y `renderFretboard()` (6 llamadas), vía
  `fretboard-render.js`;
- arranque de transportes, sincronización de tonalidad (`setSongTonality`,
  5 llamadas; 17 menciones de «tonalidad») y refresco del readout del
  micrófono (`globalThis.StringMicrophone?.refreshReadout?.()`, añadido en
  `27f688a`, antes `077eeb3`).

Medido: **36 declaraciones `function`** de primer nivel (`grep -cE '^(async )?function '`) y ningún `require`: no hay test de rol propio, se cubre a
través de los demás módulos (las suites valen como red global, no como mapa por
responsabilidad). La deuda histórica **T-01** sigue siendo el desglose. No
corresponde ampliarla en esta ronda (documental); se nombra para el backlog de
desgloses (“deudas separadas”), no se abre.

## 5. Deudas separadas propuestas (documental, no abre ronda de código)

| # | Deuda | Origen verificado |
| --- | --- | --- |
| D1 | Guarda focal para `mobile-tabs.js`, `player-disclosure.js`, `responsive-layout.js` (0 suites Node ni browser las nombran) | §3.2 |
| D2 | Cobertura focal de `midi-ui.js` (nombrada solo por `progression-duration.test.cjs`) | §3.3 |
| D3 | Desglose de `app.js` (T-01), ya fichada en `TAREAS.md` | §4 |

## 6. Recuento reproducible y límites

Comandos ejecutados sobre el worktree en `27f688a` (`String/.worktrees/t72-mapa-modulos`):

```sh
git rev-parse HEAD                                   # 27f688a528023101f4b64fb321cf95626195e622
grep -o '<script src="[^"]*"' index.html | wc -l     # 41 módulos cargados
ls -1 *.js | wc -l                                   # 42 ficheros .js en raíz
comm -23 <(ls -1 *.js|sort) <(grep -o '<script src="[^"]*"' index.html \
  | sed 's/.*src="//;s/"$//'|sort)                    # midi-catalog.js (fuera del DOM, a propósito)
ls -1 tests/*.test.cjs | wc -l                       # 64 suites Node
ls -1 tests/browser/*.cjs | wc -l                    # 7 pruebas de navegador
for f in *.js; do grep -l "${f%.js}" tests/*.test.cjs; done   # columna «Suites» de §2
grep -cE '^(async )?function ' app.js                # 36
wc -c app.js                                         # 49283
```

**Resultado de `npm test` (21-11-2026, sobre `27f688a`, Node v26.13.1):**
**637 pass / 0 fail / 0 cancelled / 0 skipped**, 64 suites, ≈ 31 s
(`node --test tests/*.test.cjs`). El borrador de Ari registraba 616/616 sobre
`077eeb3`; la subida a 637 refleja las cuatro suites nuevas y los casos añadidos
en `27f688a`. El
recuento de §2 es por mención del nombre del fichero en el texto de la suite:
es una medida de cobertura **declarada**, no una garantía de que la suite ejecute
el módulo. Las 7 pruebas de navegador no corren con `npm test` y esta auditoría
no las ejecutó (no hay revisión visual en T-72; no se usó Chrome).

**Límites.** Solo documentación bajo `String/docs/`. No se tocó JS/CSS/HTML de
producto, persistencia, `main`, el espejo del dueño ni los worktrees ajenos
(H-02, H-02c, T-73, T-74, ni el `wt-apx-t72-auditoria` de Ari). Sin push, merge
ni publicación. Las deudas D1-D3 y T-01 quedan como propuestas para el backlog;
no abren ronda de código. Si QA coteja el inventario, hacerlo contra la base
exacta `27f688a`.
