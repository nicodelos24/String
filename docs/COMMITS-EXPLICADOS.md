# Quién cambió qué · commits integrados de T-64 y T-67, y qué queda pendiente

Documento para el dueño, en palabras claras. Explica **solo lo que ya está publicado**
en la versión de la app que se usa hoy, commit por commit, y separa con una línea bien
firme lo que **todavía no se publicó** (tips de trabajo, ramas viejas) y los
**mecanismos de taller** que no son producto.

- **Base revisada:** `String/main` = `origin/main` `27f688a528023101f4b64fb321cf95626195e622`
  (confirmada al abrir esta unidad el 21-11-2026).
- **Alcance:** historial **integrado** de T-64 y T-67, incluida la corrección de CI.
  No es código nuevo ni una revisión visual: nadie tocó el funcionamiento de la app acá.
- **Cómo leer la tabla:** por cada commit, *por qué se hizo*, *qué ve/usa el dueño*,
  *qué prueba lo respalda* y *qué queda pendiente*. Los SHA son de 7 caracteres, suficientes
  para ubicarlos en `git log`.

---

## 1 · LOS DOS PEDIDOS QUE ORIGINARON ESTOS CAMBIOS

| Pedido | Fecha | Qué pidió Nico, resumido |
| --- | --- | --- |
| **A-74** · `PEDIDOS-AUTOR.md` §53 | 1-11-2026 | «El pianito nuevo para las tonalidades es funcional, pero se ve un poco mal y no puso la opción de elegir entre bemoles y sostenidos (como el switch del pianito de la izquierda), sólo el de mayor/menor, y la vista del pianito y ese switch está un poquito rota. ¿Empezamos por eso?» → abre **T-64**. Decisión visual ya dada: dos switches independientes (mayor/menor y ♯/♭), sin cambiar la altura sonora. |
| **A-75** · `PEDIDOS-AUTOR.md` §54 | 1-11-2026 | Menos margen lateral aprovechando el ancho, sin perder la sombra; en móvil quitar el recuadro; compactar el espacio entre tarjetas, barra y sección; mantener los switches en horizontal y las notas sobre las teclas negras legibles; arreglar que la barra aparece cortada al empezar a hacer scroll (antes de volverse compacta); y que el cuadro de nota del micrófono no deforme la página al pasar de «esperando nota…» a una nota. → abre **T-67**. |

El pianito de tonalidad venía del **T-59** (`255ae26`, en `main`): ahí se agregó por primera vez.

---

## 2 · TABLA · commit → motivo → qué ve el usuario → evidencia → pendiente

Todos los commits de esta tabla están **dentro de `main`** (comprobado con
`git merge-base --is-ancestor` sobre `origin/main`). Es el producto publicado.

| Commit | Motivo (por qué) | Qué botón / recorrido ve el dueño | Evidencia | Pendiente |
| --- | --- | --- | --- | --- |
| `5af9d1b` · 1-11 **T-64** «Completa y ajusta pianito de tonalidad» | Cumplir A-74: agregar el switch **Sostenidos / Bemoles** del pianito de tonalidad, que faltaba, y hacer que la armadura del tema cargada respete la grafía elegida. | Bajo «TONALIDAD DEL TEMA» aparece un nuevo interruptor **Sostenidos / Bemoles** al lado del de **Mayor / Menor**. Al moverlo cambian las etiquetas ♯/♭ de las teclas del pianito pequeño. | 6 archivos (`app.js`, `index.html`, `preferences.js`, `style.css` y tests `t59-pianito.cjs`, `song-tonality.test.cjs`). Corrección de un tip anterior sobre T-59. | Fue superado por el siguiente commit del mismo tip; no se entregó solo. |
| `7172fca` · 1-11 **T-64** «Mantiene preferencia de grafía independiente» | Corrección dentro de T-64: la preferencia ♯/♭ tiene que ser **independiente y persistente**, no la pisa la armadura canónica. Cuando la grafía pedida no existe (ej. Do♯ menor en bemoles), conservar la tonalidad y explicar el limite. | Elegir **Bemoles** y una tonalidad sin armadura enarmónica: el pianito sigue en bemoles, la tonalidad no cambia y aparece un aviso en letra chica: «Bemoles activados en el pianito; Do♯ menor no tiene armadura enarmónica disponible. Se conserva su tonalidad y armadura». El switch se guarda con el respaldo y vuelve al reabrir. | Tip revisado por QA R2 en checkout aislado: suite focal **97/97**, Chromium **8/8** (320/390/768/1366 × claro/oscuro), recorrido guardar/reabrir y **616/616** tests. Registrado en `TAREAS.md` T-64. | Ninguno dentro de T-64: aprobado, integrado en `6e8d03e`. La aceptación física de micrófono es T-65, aparte. |
| `6e8d03e` · 1-11 **T-64** «Integra el pianito de tonalidad corregido» | Merge de integración: mete en `main` la rama con `5af9d1b` + `7172fca` (padres `fef4713` y `7172fca`). Es el acto de publicación del pianito arreglado. | Es lo que ya ves en la app: pianito de tonalidad con los dos switches independientes y el aviso de limite cuando corresponde. | Diff amplio (6 archivos, +211/−23) que consolida el tip corregido; `main` y `origin/main` quedaron iguales. | Ninguno para T-64. Base usada luego por T-67. |
| `f73e54c` · 1-11 **T-67** «Pulir layout y switches del panel» | Primera vuelta de A-75: ajustes visuales sin tocar el orden ni el comportamiento de los controles. Menos alto el bloque de tarjetas; el mástil conserva sombra en escritorio pero se funde con la página en móvil; switches del pianito en horizontal y notas negras legibles. | En escritorio, la sección principal usa más ancho y sigue teniendo sombra; en móvil se fue el recuadro exterior. Los switches **Sostenidos/Bemoles** y **Mayor/Menor** del pianito se ven en una fila y las teclas negras muestran su nota en blanco legible. | 2 archivos: `style.css` (+98) y el test de navegador nuevo `tests/browser/t67-pulido-visual.cjs` (+145), con recorridos en varios anchos y temas. | Esta vuelta todavía no bastaba: vino `2039a67`. |
| `2039a67` · 1-11 **T-67** «Mantener switches legibles en pliegues estrechos» | Segunda vuelta: en ventanas angostas el bloque de tonalidad se saltaba de columna y las etiquetas quedaban chicas. Poner el control a todo el ancho, subir el tamaño de las notas negras (8→9 px) y del texto del switch (8→9 px), y agregar control de errores de página. | Al achicar la ventana (p. ej. 768 px), el bloque «TONALIDAD DEL TEMA» ocupa toda la fila y los switches y las letras de las teclas negras se siguen leyendo. | `style.css` (+8/−4) y `t67-pulido-visual.cjs` (agrega `pageerror`, exige `font-size ≥ 9`). **QA aprobó este tip exacto** sobre `6e8d03e` (`TAREAS.md` T-67). | Ninguno en el tip visual. Fue el que se integró primero (`f8f9d92`). |
| `f8f9d92` · 2-11 **T-67** «Merge: T-67 (QA aprobado)» | Primera integración del tip aprobado `2039a67` en `main` (padres `6e8d03e` y `2039a67`). GitHub Pages publicó con este contenido. | La interfaz visual pulida de T-67 estuvo disponible en la página pública desde acá. | Diff de integración: `style.css` +99 y test +148. | Apareció un problema **de tests en CI**, no visual: ver fila siguiente. |
| `0f97810` · 2-11 **T-67** «Preserve selector lookup for workspace sizing» | Corrección de CI. El test estático `tests/encabezado-zona-tocar.test.cjs` tomaba los overrides visuales `.workspace` como si fueran una regla estructural y fallaba. Se cambiaron **solo dos selectores CSS** a `:is(.workspace)` — misma especificidad y cascada, **ningún cambio visual**. | Ninguno: el aspecto y el comportamiento son idénticos. Es un arreglo para que el control automático pase. | `style.css` 2 líneas (+2/−2), en la rama `agente1/t67-ci-selector-fix`. QA aprobó el tip corregido. | Ninguno; se integró en `077eeb3`. |
| `077eeb3` · 2-11 **T-67** «Merge: T-67 fix CI workspace selector lookup» | Integración final (padres `f8f9d92` y `0f97810`). Cierra T-67 y deja `main`/`origin/main` en este SHA durante el resto del período documentado. | Versión publicada y verificada: pianito con dos switches + aviso de limite; panel con menos márgenes, sin recuadro móvil, switches en fila, notas negras legibles y ancho estable del indicador de nota del micrófono; barra sin el corte del tramo inicial de scroll. | `npm test` local **616/616** al cerrar; workflow remoto Suite exitoso; Pages build/deploy exitoso; comprobación pública **HTTP 200** y CSS servido con el tip final. Registrado en `TAREAS.md` T-67. | Solo la **aceptación física T-65** y el ojo del dueño. No se desplegó a Cloudflare. |

**Total del historial publicado de T-64/T-67:** 3 commits de T-64 (dos de desarrollo + uno de
integración) y 5 de T-67 (dos de desarrollo + integración + corrección CI + integración final).
Ocho commits, todos alcanzables desde `origin/main`.

**Límite de la evidencia:** los números de tests y navegador de las filas son los que
registraron los informes de QA y el workflow *en su momento* (616/616, 97/97, 8/8). La
comprobación propia de hoy es la base sin regresiones (`npm test` **637/637**, ver §6); el
número subió porque se agregaron pruebas en rondas posteriores. Ninguna suite garantiza
que «nada se va a romper» en el futuro ni sustituye la prueba con hardware real.

---

## 3 · LO QUE NO ES PRODUCTO PUBLICADO (no llamarlo «publicado»)

Estas tres cajas son **tips de trabajo o mecanismos de taller**. Ninguno está en `main`
en la base revisada; se nombran para que no se confundan con lo de la tabla anterior.

### (a) Tips NO integrados de T-68 / T-69

- **T-68** (margen mínimo de la cápsula compacta, A-78): rama histórica `agente1/t68-margenes`
  con avances `cf15330`→`00bada5` (más `51f876b`/`de52d92` de la ronda A-77, esta última
  un *revert*). Sin veredicto QA ni integración; hay cambios staged sin autoría verificable.
  La ronda nueva de Nova en `agente1/t68-nova-compacto` quedó limpia en `077eeb3`, sin commit.
- **T-69** (aire arriba y abajo de la barra al compactar): una sucesión de tips en ramas
  propias — desde `2967821` (`agente1/t69-aire-r2`) hasta `a8a1264` y las versiones de
  `agente1/perf-scroll-anclado` — con idas y vueltas de QA (hubo un fallo
  `T69_EXTERNAL`: margen superior 16 px frente a 18 esperados a 1280). Nico cerró el task
  APX de la primera ronda; la ronda quedó **detenida pendiente de decisión expresa**.
  Ninguno de estos SHA está en `main`.
- En resumen: **son intentos en ramas, no mejoras que ya tengas en la app**. No se integran
  ni se publican sin QA aprobatorio, mirada visual y tu OK.

### (b) Rama histórica residual de T-64 (NO integrada)

Los tips `2fea11f` (ajuste visual del pianito), `0f2e5d2` (reconcilia banda de tarjetas)
y `cc3d025` (legibilidad del pianito en móvil) viven en
`agente1/t64-pianito-ajuste`, aparteados el 4-11 por decisión del dueño (A-77) cuando
`String/` volvió a `origin/main` `077eeb3`. El T-64 que sí se publicó es el de la tabla
(`5af9d1b`/`7172fca`/`6e8d03e`), **no** esta ronda sin commitear. Confirmado: ninguno de
los tres SHA es ancestro de `origin/main`.

### (c) Cadena T-66 · mecanismo retirado, no producto

T-66 fue el experimento de **orquestación nativa por roles** (QA=`qa`, Coordinación=
`agentecoordinador`, Desarrollo=`desarrollador`). Producía documentación de proceso —
por ejemplo el tip `faeb4778` integrado como `8b0f335` (`CADENA/ORQUESTACION-NATIVA.md`),
que hoy **tampoco está en `main`** — y receipts de sesión todavía no reconciliados en un
manifiesto durable. A-76 la mantuvo fuera del runner `./continuar`. Tras el retiro del
Flow y la CADENA del 17-11, T-66 es **historia del taller, no una función de la app**:
no le cambia ningún botón al dueño y no debe reactivarse sin decisión expresa.

---

## 4 · GUÍA de prueba física · T-65 (sin certificar hardware)

T-65 sigue **PENDIENTE**. La detección de pitch y acordes está implementada y las rondas
T-57/T-60 cubren señales simuladas y casos ambiguos, pero **los tests automáticos no
prueban tu micrófono ni tu instrumento reales**. QA no declara ese hardware certificado.
Esta guía es para que lo compruebes vos, cuando quieras; no es un certificado.

1. **Preparación:** abrí la app publicada en tu navegador y dispositivo habituales.
   Activá el **Micrófono** y dale permiso. Usá un instrumento real (o tu voz) afinado.
2. **Nota suelta:** tocá/cantá una nota sostenida y mirá el mástil y el indicador de nota.
   Anotá si la nota que aparece coincide con lo que tocaste y si tarda en estabilizarse.
3. **Acorde:** tocá un acorde y comprobá qué acorde se reconoce y se dibuja. Probá uno
   ambiguo (por ejemplo con armónicos) para ver cómo se comporta.
4. **Estabilidad del cuadro (A-75):** alterná entre «esperando nota…» y una nota detectada,
   incluso una larga. El cuadro del micrófono **no debe mover** los controles vecinos ni
   deformar la página: eso es justamente lo que arregló T-67 en la versión publicada.
5. **Sin desplazamientos:** confirmá que mirar el micrófono no hace saltar el scroll ni
   oculta la barra de transporte, en móvil y en escritorio.
6. **Registro:** anotá qué pasó en cada punto (con qué nota/acorde, en qué navegador y
   dispositivo). Esos hallazgos se registran **antes** de abrir cualquier cambio nuevo.

Si algo falla, **no se arregla acá**: se propone como tarea nueva a Coordinación. Si todo
va bien, T-65 se cierra con tu comprobación; hasta entonces sigue pendiente.

---

## 5 · Límites de este documento

- Solo explica el historial **ya integrado** sobre la base `27f688a`. No audita el
  funcionamiento en vivo ni repite la revisión visual de Kaia/QA.
- Los números de tests/navegador citados son los de los informes originales; la corrida
  local de hoy se reporta aparte (§6). Ninguna prueba garantiza ausencia futura de fallas.
- No certifica micrófono, hardware, YouTube externo ni otros navegadores (ver §4).
- No modifica `TAREAS.md`, `PACTO.md`, `PEDIDOS-AUTOR.md` ni `GUIA-QUE-ES-QUE.md`,
  y no toca `main`, el espejo del dueño ni worktrees ajenos.

## 6 · Comprobaciones hechas para esta entrega

| Control | Resultado |
| --- | --- |
| `git rev-parse origin/main` (SHA base) | `27f688a528023101f4b64fb321cf95626195e622` |
| Pertenencia a `main` de los 8 commits de la tabla | los 8 son ancestros de `origin/main` (`git merge-base --is-ancestor`) |
| Pertenencia de tips T-64 residual / T-66 / T-68 / T-69 | ninguno es ancestro de `origin/main` (comprobado SHA por SHA) |
| `npm test` (base, sin cambios de app) | exit 0 · 637 tests, 637 pass, 0 fail |
| `git diff --check` | sin errores de whitespace |

Fuentes cotejadas: `git log`/`git show` de los 8 commits, `TAREAS.md` (T-64, T-65, T-66,
T-67 y T-73), `PEDIDOS-AUTOR.md` (§53/A-74, §54/A-75, A-76 a A-80) y `GUIA-QUE-ES-QUE.md`.
