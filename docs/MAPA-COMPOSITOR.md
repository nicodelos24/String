# T-38 · Mapa de dependencias del compositor

Estado: mapa de QA para aprobación de Coordinación. Basado en `main` `6ef5b3c` (2026-10-20).
No modifica el comportamiento de la aplicación ni decide el diseño visual de los bloques.

## Propósito y frontera

El compositor solicitado no es otra vista de las secciones actuales: debe permitir definir un
bloque una vez (por ejemplo, «Verso»), referirlo muchas veces en el arreglo, editarlo sin
duplicar accidentalmente sus acordes y, cuando se duplique de forma explícita, crear un bloque
independiente. El cambio se divide para conservar los contratos que ya funcionan:

```text
T-38 mapa ───────────────────────────────────> T-39 modelo puro de bloques
T-44 contrato tonal puro ─┬──────────────────> T-39
                           └──────────────────> T-45 integración tonal
T-39 ─> T-40 adaptador/persistencia/playback ─> T-41 UI ─> T-42 aceptación
                                                  ▲
                                                  └── T-45 debe integrarse antes de su cierre
```

`T-35` entrega el contrato de duraciones antes de que una ronda de datos vuelva a tocar ese
campo. `T-37` y `T-43` recorren antes, de forma serial, la zona de teclado/tarjetas. No son
prerrequisitos lógicos del modelo puro, pero `T-43` deja disponible la selección silenciosa
que necesita editar tarjetas o bloques con comodidad.

No se autoriza en estas rondas una reescritura de `app.js`, una dependencia nueva, ni cambiar
el significado de datos v1 existentes.

## Estado actual: qué representa cada cosa

| Concepto actual | Dueño y forma | Límite que impide usarlo como bloque reutilizable |
| --- | --- | --- |
| Progresión | `app.js`: arreglo global `progression` de objetos de acorde | Es una lista plana, ordenada por índice; una tarjeta es una entrada independiente. |
| Tarjeta visible | `renderProgression()` y `progression-interactions.js`, con `data-index` | El foco, borrar, arrastrar y los selectores operan sobre el índice de la lista plana. |
| Sección | `sections.js`: `{name, repeat, items}` con referencias a objetos de `progression` | En memoria es una vista/rango de tarjetas; al guardar se serializa como `{name, repeat, indices}`. No tiene ID estable ni persiste en «Mi progresión». |
| Repetición | `sections.js`: `repeat` de 1 a 8 | Repite una sección, no una entidad reutilizable que pueda aparecer en distintos lugares del arreglo. |
| Reproducción | `player-ui.js` convierte la progresión/secciones en entradas; `progression-player.js` programa audio | Recibe una lista plana de acordes y conserva una copia de ejecución; no conoce bloques. |
| Tonalidad que se pinta hoy | `app.js`: `selectedTonality` | Es estado de vista recalculado desde el acorde/modo actual; no es tonalidad fija de canción ni se puede persistir como tal. |

La forma de acorde vigente, que debe seguir siendo compatible mientras exista la interfaz
actual, es:

```js
{
  root, rootNoteName?, type, mode?, ghostMode?, variants?, beats
}
```

`variants` puede contener objetos anidados por vuelta. Cualquier copia que vaya a ejecución
debe copiar también esos objetos internos: T-20 ya fijó que una edición durante reproducción
no modifica el snapshot que está sonando.

## Carga, dependencias y contratos públicos actuales

El orden de `index.html` importa porque los scripts son clásicos y comparten globales. En la
base actual, la cadena relevante es:

```text
app.js (estado y mutaciones globales)
  ├─ progression-interactions.js (DOM, foco, arrastre)
  ├─ progression-player.js (motor de audio)
  ├─ sections.js (vista, orden y expansión de secciones)
  │    └─ player-ui.js (snapshot y puente al motor)
  ├─ song-library.js (almacén/versionado)
  │    └─ song-library-ui.js (guardar, abrir, importar/exportar)
  ├─ midi-ui.js / progression-presets.js / keyboard-section.js (productores de tarjetas)
  └─ preferences.js (controles visibles persistentes)
```

Cuando T-35 se integre, `progression-duration.js` se carga antes de `app.js` y de los lectores
que normalizan `beats`. Cuando T-45 conecte T-44 a la página, el módulo tonal también debe
cargarse antes de cualquier consumidor de su contrato; T-44 por sí solo no toca el HTML.

| Módulo | Lee / posee | Escribe o provoca | Contrato que T-39–T-41 deben respetar |
| --- | --- | --- | --- |
| `app.js` | `progression`, acorde activo, `activeProgression`, `playingProgressionItem`, estado visual | `saveCustomProgression`, `renderProgression`, seleccionar/agregar/mover/duplicar/quitar | No convertirlo todavía en el modelo de bloques. T-40 debe adaptarse a sus operaciones o migrarlas de una sola vez, no dejar dos autoridades. |
| `sections.js` | Referencias a acordes vivos; sección activa | `StringSections.serialize/visible/adjacent/move/include/load/playback` | Los índices y referencias son legado. El adaptador debe preservar navegación y snapshots hasta que la UI deje de depender de ellos. |
| `progression-interactions.js` | Tarjetas DOM y `StringSections.visible()` | Reordenar, borrar y restaurar foco | El orden visible es un contrato de accesibilidad. T-41 no puede usar el orden global cuando se muestre un subconjunto/arreglo. |
| `player-ui.js` | `StringSections.playback()` o `progression`; acordes guardados | `playProgressionFrom`, estado de tarjeta sonando, eventos de arranque | Consume una lista plana con `source` y una copia `saved`; T-40 debe producir un puente equivalente y conservar la copia inmutable de ejecución. |
| `progression-player.js` | Acordes `{notes, beats}` | Audio, temporización y callback por acorde | Sigue siendo motor de bajo nivel. No debe saber de DOM, bloques, biblioteca o tonalidad. |
| `song-library.js` | `traste.songs.v1`, envoltorio `{version: 1, songs}` | Parsear, guardar, importar/exportar | El envoltorio v1 se conserva. T-40/T-45 deben aceptar la forma antigua y no perder campos nuevos al validar/copiar. |
| `song-library-ui.js` | Snapshot de progresión, secciones y ajustes | Abrir canción, disparar `traste:load-song` / `traste:load-video` | Es el borde de serialización de canción; no debe validar ni aplanar la lógica de bloques por su cuenta. |
| `keyboard-section.js`, MIDI y presets | Acorde detectado/importado/predefinido | Añaden o reemplazan tarjetas y llaman a render/guardado | Durante la transición deben entrar por un único adaptador de edición; no deben crear bloques implícitos diferentes entre sí. |
| `preferences.js` | Controles de interfaz visibles | `traste.preferences.v1` | Sólo preferencias de UI, no el arreglo ni la tonalidad de canción. T-43 usa este patrón para `playerCardStart`. |

## Datos y persistencia que no se pueden romper

| Almacén / formato | Forma actual | Regla para la transición |
| --- | --- | --- |
| `traste.customProgression.v1` | Arreglo plano de acordes; puede ser `[]` | Debe seguir leyéndose tal cual. No inferir bloques, tonalidad o secciones y sobrescribir el arreglo silenciosamente. |
| `traste.songs.v1` | `{version: 1, songs: [...]}`; cada canción trae `chords`, `settings`, `sections`, vídeo | Las canciones v1 deben abrir, exportarse e importarse sin pérdida. El envoltorio sigue en versión 1; cualquier extensión es opcional y validada de forma retrocompatible. |
| Secciones dentro de biblioteca | `{name, repeat, indices}`; índices de `chords` | Son un formato legado válido. T-40 define un adaptador explícito, no intenta tratar índices como IDs de bloque. |
| `traste.preferences.v1` | Snapshot de controles visibles | No usarlo para datos musicales de canción. Las ausencias conservan su valor por defecto de UI. |

Hay una asimetría importante: `saveCustomProgression()` no guarda secciones, mientras que una
canción de biblioteca sí. T-40 debe resolver la composición persistida con una ruta versionada
y probada, sin cambiar a escondidas el significado del slot v1. Antes de implementar, debe
quedar escrita la política de lectura/escritura: una lectura v1 puede adaptarse a un documento
en memoria, pero una escritura no puede destruir el original ni convertirlo en otro formato sin
una operación explícita del usuario.

## Eventos y secuencias que cruzan módulos

| Secuencia | Flujo actual | Riesgo que debe evitar el adaptador |
| --- | --- | --- |
| Editar tarjeta | UI/interacción → mutación de `progression` → `saveCustomProgression()` → `renderProgression()` | Que una edición actualice sólo una copia plana y deje el bloque/arreglo desfasado. |
| Seleccionar tarjeta | `selectProgressionChord()` → mástil/editor; hoy el clic también llama `playProgressionFrom()` | T-43 permite separar selección de audio. T-41 debe conservar selección aun cuando el audio esté apagado. |
| Reproducir | `StringSections.playback()` → snapshot `saved` → `player-ui` → `ProgressionPlayer` | No aplanar en tarjetas duplicadas persistentes ni perder `variants` o la procedencia necesaria para seguir el acorde que suena. |
| Abrir canción | `song-library-ui` → `traste:load-song` → sustituye `progression` → `StringSections.load()` | Debe detener audio, cargar una sola autoridad de datos y restaurar la vista/foco de forma segura. |
| Reordenar sección | `sections.js` reordena referencias y emite `traste:load-song` | Durante coexistencia, no permitir que sección y arreglo nuevo compitan por el orden de reproducción. |
| Arranque de progresión | `traste:progression-start` avisa a otras fuentes | Mantener exclusión de MIDI/vídeo/metrónomo; el modelo puro no emite eventos. |

Los custom events son borde de UI. `T-39` no los conoce; `T-40` decide cuándo emitirlos una vez
que una operación de adaptación haya quedado validada.

## Frontera propuesta para el modelo puro de T-39

T-39 crea un módulo Node directo, sin `document`, `window`, `localStorage`, audio, eventos ni
lectura de los globales de `app.js`. Sus entradas y salidas son objetos planos y copias nuevas.
La forma objetivo mínima es:

```js
{
  blocks: [
    { id: 'estable', name: 'Intro', chords: [/* acorde compatible */] }
  ],
  arrangement: [
    { blockId: 'estable', repeat: 2 }
  ],
  // contexto tonal opcional de canción, con la forma definida y validada por T-44
  tonality: undefined
}
```

Esta forma es una frontera, no una autorización para escoger ahora una sintaxis tonal distinta
de T-44. `tonality` vive en la canción/composición, nunca en el índice de una tarjeta, una
vuelta del arreglo o una instancia de bloque. Si está ausente, se conserva el comportamiento
v1 actual; no se usa `findClosestMode()` ni se adivina una tonalidad desde el primer acorde.

Reglas que debe codificar el modelo:

1. `arrangement[i].blockId` debe referir a un bloque existente; repetir es un entero positivo
   acotado. Un bloque referido dos veces es **la misma referencia**.
2. Editar un bloque modifica todas sus apariciones. «Duplicar bloque» crea nuevo ID y copia
   profunda de acordes/`variants`; editar la copia no toca el original.
3. Reordenar mueve entradas de `arrangement`, no reescribe acordes de los bloques.
4. La expansión para audio devuelve copias y metadatos de procedencia; no muta la composición.
   El adaptador decidirá cómo los traduce al formato de `player-ui`.
5. Validar nombres, IDs únicos, acorde compatible, referencias, límites y tamaño expandido
   antes de devolver una composición. No fiarse de IDs, índices o objetos de una importación.

Los límites del modelo deben ser explícitos y testeados. Como referencia de compatibilidad,
las secciones admiten hasta 64 secciones, repetición 1–8 y 32 768 entradas expandidas; la
progresión y biblioteca hoy limitan tarjetas/acordes a 4 096. Un arreglo repetido no debe
materializar miles de tarjetas sólo para mostrarse: T-40/T-41 deben mantener bloques y arreglo
compactos, y aplicar un límite de expansión compatible en reproducción.

## Reparto seguro de las rondas

| Ronda | Dueña de | Puede tocar | No debe hacer todavía | Salida verificable |
| --- | --- | --- | --- | --- |
| T-44 | Contrato tonal exacto | Módulo y test nuevos | DOM, guardado, `app.js`, inferencia aproximada | C/Dm/Em/F/G/Am/Bdim y negativos prestados/cromáticos; `null` fuera de tonalidad. |
| T-39 | Entidades, referencias, copia y expansión puros | Módulo y test nuevos | DOM, `localStorage`, audio, eventos, migración | Repetir/duplicar/editar/reordenar y límites por Node. Depende del contrato T-44 aprobado. |
| T-40 | Adaptador entre modelo y legado; persistencia/reproducción | Lectores, biblioteca, secciones/player según el puente elegido | Rediseño visual amplio o dos fuentes de verdad | Abrir/guardar/importar/exportar v1 sin pérdida, snapshot de audio y transición de datos. |
| T-41 | UI de bloques y arreglo | HTML/CSS/interacciones y adaptador público | Cambiar semántica de audio/persistencia ya aprobada | Crear, repetir, referir, duplicar, ordenar y editar con foco accesible y móvil. |
| T-45 | Tonalidad de canción en UI/persistencia | Selector, mástil, guardado/biblioteca y puente | Inferir un acorde ajeno o alterar v1 sin selección | Contexto estable, modo exacto en diatónicos y distinción clara de ajenos. Debe entrar antes de cerrar T-41. |
| T-42 | Aceptación y pulido | Correcciones acotadas tras pruebas del autor | Reabrir el modelo/persistencia sin una reproducción nueva | Matriz manual firmada por autor y QA. |

T-40 debe escoger una autoridad por documento cargado: el adaptador puede mostrar una canción
v1 mediante la progresión/secciones antiguas o una composición mediante bloques/arreglo, pero
no dejar ambas mutables en paralelo. La conversión entre ellas es una función explícita y
probada, con copias profundas donde haya `variants`.

## Matriz de aceptación que deja preparada este mapa

### T-39 y T-44 (Node)

- Referencia repetida: un «Verso» de cuatro acordes aparece dos veces y una edición del bloque
  se ve en ambas expansiones.
- Duplicado independiente: duplicar «Verso» genera otro ID; editarlo no cambia el original.
- Reordenar entradas cambia el orden sin cambiar el contenido de los bloques.
- IDs ausentes/repetidos, referencias inválidas, `repeat` inválido y expansiones excesivas se
  rechazan sin mutar la entrada.
- Tonalidad de Do mayor: C/Dm/Em/F/G/Am/Bdim infieren jónico/dórico/frigio/lidio/mixolidio/
  eólico/locrio; D mayor y B♭ devuelven `null`.

### T-40 y T-45 (integración)

- Un arreglo nuevo se reproduce con duración, orden y vueltas correctos sin crear tarjetas
  persistentes duplicadas; editar durante audio no altera la copia activa.
- Un `traste.customProgression.v1` plano y una biblioteca `traste.songs.v1` antigua se abren
  sin datos inventados ni pérdida al guardar/exportar/importar.
- Una canción con contexto tonal elegido conserva ese contexto al cambiar tarjeta, guardar,
  abrir y exportar/importar; una canción v1 sin él conserva su comportamiento anterior.
- Las fuentes MIDI/metrónomo/vídeo siguen respetando los eventos de carga y arranque.

### T-41, T-42 y prueba manual del autor

1. Crear «Intro», «Verso» y «Estribillo» con nombres claros y cuatro acordes por bloque.
2. Poner «Verso» dos veces con repeticiones sin arrastrar tarjetas individuales; ordenar las
   entradas del arreglo.
3. Editar un acorde de «Verso» y comprobar que sus referencias cambian; duplicarlo, editar la
   copia y comprobar independencia.
4. Con reproducción desde tarjeta apagada, seleccionar/editar no produce sonido; los Play
   explícitos aún funcionan.
5. Recargar, guardar/abrir e importar/exportar: se conservan bloques, arreglo, variantes,
   duraciones y tonalidad opcional. En Do natural, confirmar el modo de Dm, Am, F y G, y que un
   acorde ajeno no se convierte silenciosamente.

## Riesgos y decisiones que este mapa deja explícitas

- No usar índices de tarjeta como identidad de bloque: cambian al borrar, arrastrar o abrir.
- No usar objetos vivos de `progression` como persistencia de bloque: son referencias de UI y
  hacen que una copia aparente sea una edición compartida accidental.
- No usar el `selectedTonality` actual como tonalidad de canción; cambia con la tarjeta.
- No transformar automáticamente el slot local o un respaldo v1 a otro formato al leerlo.
- No reproducir directamente desde objetos editables: conservar la copia profunda de ejecución
  que ya protege T-20.
- No hacer que el arreglo grande se convierta en una lista DOM plana de 32 768 tarjetas.

Con estas fronteras, T-39 puede abrirse una vez que T-44 esté aprobado y Coordinación acepte
este mapa; T-40 recibe un único lugar para migración, reproducción y compatibilidad; T-41 puede
concentrarse en una interacción clara para el autor.
