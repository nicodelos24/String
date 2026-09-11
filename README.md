# String · Explorador de escalas

Aplicación web para explorar escalas, modos e intervalos sobre el mástil de una guitarra o un bajo. Permite elegir una nota base y una calidad de acorde, visualizar sus relaciones musicales y armar una idea de progresión armónica.

## Proyecto desarrollado con asistencia de IA

String (antes Traste) es un proyecto de aprendizaje y portfolio desarrollado con ayuda de inteligencia artificial para explorar ideas, implementar funciones, revisar errores, crear pruebas y documentar avances. El proceso incluye revisión del código y pruebas manuales del autor para entender lo construido y mejorar el producto a partir del uso real. La lógica musical y la síntesis de audio se ejecutan localmente en el navegador.

## Cómo ejecutarlo

1. Descargá o cloná este repositorio.
2. Abrí una terminal en la carpeta del proyecto.
3. Elegí **una** de estas opciones para iniciar el servidor local.

El explorador y el audio sintetizado no requieren instalar dependencias, compilar ni configurar un servidor. Para usar **YouTube**, abrí el proyecto mediante Live Server o un servidor local HTTP; la app muestra una indicación si se abrió con doble clic.

**Opción principal: Node.js** (incluye npm). No hace falta ejecutar `npm install`, porque el servidor usa solamente módulos incluidos en Node:

```sh
npm start
```

También podés ejecutar `node server.cjs` directamente, por ejemplo si PowerShell bloquea el comando `npm`.

**Alternativa: Python**, si ya lo tenés instalado:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Después abrí [String en el servidor local](http://127.0.0.1:8000). La terminal debe permanecer abierta mientras lo usás. No se instala ninguna dependencia del proyecto.

Para detener el servidor, presioná `Ctrl+C` en esa terminal. Ambos comandos usan el puerto 8000: ejecutá uno a la vez. También podés usar Live Server. Si solo querés explorar escalas y reproducir acordes locales, sigue funcionando abrir `index.html` con doble clic.

Node y Python cumplen la misma función aquí: entregar los archivos al navegador por HTTP. La música y la interfaz siguen ejecutándose en el navegador; Python no es necesario para iniciar la aplicación con Node. El script opcional que genera los Excel de QA sigue usando Python y `openpyxl`.

Las tipografías Manrope y DM Mono se cargan desde Google Fonts y requieren conexión a Internet. La lógica de la aplicación se ejecuta localmente en el navegador.

## Funciones

- Mástil interactivo con 22 trastes.
- Guitarra de seis cuerdas en afinación estándar: E–A–D–G–B–E, de grave a agudo.
- Bajo de cuatro cuerdas en afinación estándar: E–A–D–G, de grave a agudo.
- Selección de nota base mediante un teclado, con opciones de sostenidos y bemoles.
- Selección de acorde mayor, menor y disminuido.
- Visualización de modos y escalas pentatónicas.
- Colores para identificar los intervalos respecto de la raíz.
- Visualización de la armadura de clave calculada.
- Superposición de una escala adicional mediante notas semitransparentes.
- Controles para mostrar nombres de notas y alternar el resaltado de grados, tríada o séptima.
- Panel de progresión para agregar, seleccionar y quitar acordes.
- Reordenamiento animado de tarjetas sin flechas visibles: arrastre con mouse, asa de puntos en pantallas táctiles y Alt + flechas con teclado.
- Seguimiento automático del acorde que suena: raíz, modo, escala adicional y mástil se actualizan con la reproducción.
- Selección de séptimas diatónicas al elegir un modo, con nombre de modo visible en cada tarjeta.
- Reproductor local de la progresión con BPM, volumen y repetición; un acorde cada cuatro pulsos.
- Estilos Sin ritmo, Pop / rock, Jazz suave, Trap suave, Funk, Bossa suave y Reggaetón suave, con percusión opcional y volumen independiente.
- Panel «Escuchá tu progresión» plegable con animación; Reproducir/Detener queda visible.
- Recuadros de acorde y armadura con altura fija para evitar saltos durante el estudio.
- Reproductor compacto de YouTube con controles independientes.
- Biblioteca local de canciones, progresiones y ajustes de ritmo, con respaldo JSON.
- Consulta del nombre y el intervalo de una nota al hacer clic sobre el mástil.
- Diseño adaptable a móvil y tablet: los paneles y controles se redistribuyen según el ancho disponible. El mástil conserva sus proporciones y tamaños originales; cuando no cabe, se recorre horizontalmente junto con sus números y cuerdas al aire.
- En móvil y tablet, el acorde seleccionado, la armadura y la escala adicional aparecen debajo del mástil, antes de los reproductores. El piano tiene un ancho limitado para evitar teclas demasiado anchas. En escritorio, el resumen vuelve a su columna lateral conservando la selección.
- Verificación responsive automatizada en Chrome con anchos de 320, 390, 768 y 1024 píxeles: sin desbordamiento horizontal de la página y con 22 trastes por cuerda. Esta comprobación complementa la prueba manual en un teléfono real.

## Modos disponibles

Los controles ofrecen estos modos según la calidad seleccionada:

| Calidad | Modos |
| --- | --- |
| Mayor | Jónico, lidio y mixolidio |
| Menor | Dórico, eólico y frigio |
| Disminuido | Locrio |

Las pentatónicas mayor y menor están disponibles en las tres calidades. La disponibilidad en el selector permite explorar combinaciones; no representa una validación automática de su compatibilidad armónica.

## Uso

1. Elegí **Guitarra** o **Bajo** en el selector de instrumento.
2. Seleccioná la **Nota Base** y la **Calidad** del acorde.
3. Elegí un **Modo** para visualizar sus notas sobre el mástil.
4. Usá el botón **notas / escala / todas** para alternar entre ocultar los nombres, mostrar los de la escala y el acorde, o mostrar todos.
5. Usá **grados / triada / 7ma** para cambiar el resaltado de intervalos.
6. En **Seleccionar escala adicional**, elegí otra escala para compararla visualmente con la principal.
7. Hacé clic en una nota para consultar su nombre e intervalo en el pie del mástil.
8. Presioná **añadir acorde** para incorporar el acorde actual a la progresión. Podés seleccionar sus tarjetas o quitar acordes con el botón de cierre; siempre queda al menos uno.
9. Arrastrá una tarjeta hasta otra posición: la tarjeta se eleva y sus vecinas se desplazan para mostrar el lugar. En móvil, usá el asa de puntos. Con teclado, enfocá una tarjeta y usá **Alt + ←/→**. Enter o Espacio seleccionan la tarjeta. La selección y el modo guardado viajan con el acorde.

## Acordes según el modo

Al elegir un modo diatónico, la app propone el acorde de séptima construido sobre su raíz:

| Modo elegido | Tipo guardado | Ejemplo con raíz C |
| --- | --- | --- |
| Jónico o lidio | Mayor con séptima mayor | Cmaj7 |
| Mixolidio | Séptima dominante | C7 |
| Dórico, frigio o eólico | Menor con séptima menor | Cm7 |
| Locrio | Semidisminuido | Cm7♭5 |

La raíz elegida se mantiene: C mixolidio guarda C7. Dórico y eólico comparten el acorde m7, pero tienen escalas diferentes; por eso se conserva y se muestra el modo en la tarjeta. Cambiar solo la calidad propone una tríada mayor, menor o disminuida. Las pentatónicas mantienen esa tríada según la calidad, sin deducir una séptima que no definen por sí solas. También podés pulsar el modo ya seleccionado para aplicar su séptima.

Los acordes guardados anteriormente conservan su tipo. Elegir otro modo crea un borrador; **añadir acorde** lo incorpora como una tarjeta nueva.

Por ejemplo, seleccioná guitarra, nota C, calidad mayor y modo jónico para explorar las notas de Do mayor. Luego comparalo con el modo lidio usando el selector de escala adicional.

## Tecnologías

- **HTML5:** estructura y controles de la interfaz.
- **CSS3:** presentación visual y distribución de los paneles.
- **JavaScript:** datos musicales, cálculo de intervalos, generación del mástil y eventos de interacción.
- **Google Fonts:** tipografías de la interfaz.

No utiliza frameworks ni un backend de aplicación. Incluye un servidor de desarrollo con Node.js sin dependencias externas y comandos de npm para iniciar la página y ejecutar pruebas. Python queda como alternativa para servir los mismos archivos.

## Estructura del proyecto

```text
Proyecto-guitar-IA/
├── index.html      # Página principal
├── style.css       # Estilos de la interfaz
├── app.js          # Lógica y datos musicales
├── metronome.js    # Motor de audio y controles del metrónomo
├── progression-player.js # Motor de reproducción de acordes
├── player-ui.js    # Conexión entre reproductor y controles
├── progression-interactions.js # Arrastre animado y controles de teclado
├── player-disclosure.js # Panel de audio plegable
├── youtube-url.js # Validación de enlaces de YouTube
├── youtube-player.js # Controles de video y ventana flotante
├── note-preview.js # Escucha breve de notas
├── instrument-picker.js # Selector visual de guitarra/bajo
├── midi-import.js # Lectura SMF y reconocimiento de acordes en bloque
├── midi-player.js # Reproducción MIDI con reloj de audio
├── midi-ui.js # Vista previa, seguimiento e importación a tarjetas
├── song-library.js # Biblioteca versionada y almacenamiento local
├── song-library-ui.js # Guardar, abrir y respaldar canciones
├── tests/          # Pruebas de progresiones, lógica musical y metrónomo
├── docs/           # Guía de aprendizaje, requisitos, casos y bugs
├── README.md       # Documentación
└── version 1.0/    # Copia adicional del proyecto
```

La aplicación principal se ejecuta desde los archivos de la raíz.

## Estado actual

El proyecto se presenta como un MVP de exploración visual. Las selecciones y la progresión se mantienen en memoria y se reinician al recargar la página.

Al pulsar una nota se muestra su intervalo y se escucha brevemente su altura. La importación y reproducción de MIDI está disponible como función experimental; el reconocimiento con micrófono queda para una etapa posterior.

Seleccionar una tarjeta restaura la raíz, la calidad y el tipo de acorde; los acordes añadidos también conservan su escritura, modo y escala adicional. Los números de las tarjetas indican su posición, sin análisis armónico. El resaltado de tríada muestra los tres primeros componentes del acorde y excluye séptimas y novenas. La armadura de la pentatónica mayor usa la tonalidad mayor de su raíz; la pentatónica menor usa su relativa mayor como referencia (por ejemplo, La pentatónica menor muestra Do mayor).

## Desarrollo

Para modificar la interfaz, editá `index.html` y `style.css`. Los instrumentos, afinaciones, modos, intervalos, colores y eventos están definidos en `app.js`.

Después de realizar cambios, recargá la página y comprobá el cambio de instrumento, nota base, calidad y modo, los controles de visualización, la escala adicional y la edición de la progresión.

## Metrónomo

El panel de metrónomo permite iniciar y pausar el pulso, ajustar el tempo entre 30 y 240 BPM, elegir de 1 a 8 pulsos por compás, acentuar el primero y regular el volumen. Cada pulso tiene la duración de una negra; la selección de pulsos no interpreta compases compuestos. Al reiniciar vuelve al primer pulso.

El audio se genera localmente con Web Audio en `metronome.js` y se activa al presionar Iniciar. Por ahora es independiente de la progresión: no reproduce los acordes guardados.

## Reproductor de acordes y ritmos

1. Agregá los acordes que quieras escuchar a la progresión.
2. Elegí el **Estilo**, el tempo entre 30 y 240 BPM y las opciones **Repetir** y **Percusión** antes de iniciar.
3. Presioná **Reproducir**. Cada acorde ocupa cuatro pulsos; a 120 BPM dura dos segundos.
4. Ajustá **Volumen general** y **Volumen percusión** mientras suena. El estado muestra el nombre y la posición del acorde.
5. Presioná **Detener** para cancelar la reproducción. Al iniciar nuevamente vuelve al primer acorde.

Pulsá el título **Escuchá tu progresión** para plegar o desplegar los ajustes. La animación respeta la preferencia de movimiento reducido del sistema. Reproducir/Detener y el estado siguen visibles, y plegar el panel no interrumpe el audio.

Se usa un sonido sintetizado sencillo generado con Web Audio, sin cuentas, muestras descargadas ni servicios pagos. La reproducción toma una copia de la progresión: las ediciones se escuchan al detener y volver a iniciar. BPM y Repetir se configuran antes de reproducir. El metrónomo funciona por separado.

Al sonar cada acorde, el mástil muestra su raíz, modo y escala adicional guardados, y la tarjeta correspondiente se marca como **sonando**. Si movés una tarjeta durante la reproducción, el seguimiento conserva la identidad del acorde; el audio mantiene el orden de la copia hasta reiniciar. Si quitás una tarjeta que todavía forma parte de esa copia, su escala se sigue mostrando al sonar aunque ya no haya una tarjeta que seleccionar. Al detener, el mástil queda en el último acorde mostrado.

Los patrones son acompañamientos sintetizados simples en 4/4. **Sin ritmo** toca acordes sostenidos, **Pop / rock** usa un pulso recto, **Jazz suave** incorpora swing y **Trap suave** usa caja a medio tiempo y hi-hats rápidos. Se sumaron **Funk** con ataques cortos y sincopados, **Bossa suave** con acompañamiento liviano a contratiempo y **Reggaetón suave** con un patrón inspirado en dembow. Son aproximaciones para practicar, sin cambiar las notas guardadas. Desactivar Percusión mantiene los ataques de acordes del estilo. El timbre tiene armónicos suaves, normalización de ganancias y compresión de la mezcla; la comodidad del balance está en validación manual.

No hay sincronización con el metrónomo independiente ni conexión con YouTube Music. El mástil sigue mostrando información al hacer clic sobre una nota. Ver [Ritmos y sonido](docs/RITMOS-Y-SONIDO.md) para aprender cómo funcionan los patrones y la mezcla.

## Canciones guardadas y YouTube

YouTube usa la [IFrame Player API oficial](https://developers.google.com/youtube/iframe_api_reference) para reproducir/pausar y mostrar tiempo y barra de posición. Sus controles y los del acompañamiento están arriba del espacio de trabajo, en paneles compactos y plegables. No hay marcas ni sincronización automática con la progresión. YouTube y el metrónomo se controlan de forma independiente.

### Guardar una práctica

1. Abre la aplicación con Node o Python en **http://127.0.0.1:8000**.
2. Prepara las tarjetas y ajusta el estilo, BPM, percusión, repetición y volúmenes.
3. Si quieres asociar un video, pega su enlace en YouTube. Puedes dejar el campo vacío para guardar solo el acompañamiento local. El enlace del campo es el que se guarda.
4. Escribe un nombre en **Mis progresiones** y pulsa **Guardar como nueva**.
5. Selecciona una canción de la biblioteca y pulsa **Abrir** para recuperar sus tarjetas y ajustes. Esto reemplaza la progresión que estás editando y detiene el sintetizador; guarda primero los cambios que quieras conservar. El video asociado se carga sin reproducción automática.
6. Usa **Actualizar canción abierta** para guardar cambios sobre la canción que abriste o acabas de guardar. **Guardar como nueva** crea otra copia. Cambiar la selección de la lista no abre ni modifica una canción por sí solo.

Cada canción contiene un identificador, nombre, enlace opcional, copia de los acordes (incluidos sus modos) y configuración del acompañamiento. La biblioteca guarda hasta 200 canciones, con hasta 4096 acordes cada una. No guarda archivos de audio ni descarga videos: los ritmos se generan nuevamente al reproducir. La asociación canción–progresión no implica sincronización temporal ni detección automática de acordes.

### Dónde quedan los datos y cómo respaldarlos

Se usa [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), almacenamiento del navegador que conserva datos entre sesiones. No necesita una base de datos remota, cuenta ni servidor de pago. Node/Python solo sirve los archivos de la aplicación; la biblioteca no se guarda en el servidor ni en el repositorio.

Usa siempre el mismo navegador, perfil y dirección. Chrome y Edge tienen bibliotecas separadas; localhost y 127.0.0.1 también, al igual que puertos diferentes. El modo privado, borrar los datos del sitio o las restricciones de almacenamiento pueden hacer que los datos desaparezcan o no se puedan guardar. Abrir index.html con doble clic no ofrece garantías de persistencia entre navegadores.

**Exportar respaldo** descarga un archivo string-canciones.json. **Importar respaldo** lo valida y añade las canciones como copias sin sobrescribir las existentes. Se admiten archivos de hasta 2 MB. Exporta periódicamente y antes de cambiar de navegador o dirección. La aplicación informa los errores de formato o almacenamiento en lugar de presentar el guardado como exitoso.

### Próximos pasos

Esta etapa permite aprender persistencia, validación, separación entre datos e interfaz y pruebas de recuperación sin contratar servicios. El siguiente paso puede ser organizar la biblioteca con búsqueda y etiquetas. Si luego necesitamos cuentas o sincronización automática entre equipos, podremos incorporar un backend y evaluar sus límites de uso gratuito en ese momento. La versión del formato JSON permite preparar futuras migraciones.

YouTube requiere Internet y videos que permitan reproducción incrustada. Si un video está restringido, usa **Abrir video en YouTube**. La barra y el botón de pausa se habilitan cuando responde la API. Si falla, queda disponible el enlace externo.

## Espacio de trabajo String

El nombre une las cuerdas del instrumento con las cadenas de texto del código. Se retiraron «modo exploración» y el bloque promocional inferior. Guitarra y bajo se eligen mediante tarjetas con dibujos y botones de opción accesibles; solo puede seleccionarse un instrumento.

Al pulsar el piano se conserva la nota suave de unos 0,7 segundos. Los trastes y las cuerdas al aire usan una cuerda pulsada sintetizada para guitarra y un ataque brillante y breve tipo slap para bajo, con una duración máxima de 1,1 segundos. Son aproximaciones sintetizadas, no grabaciones de instrumentos reales. En el mástil se usa su altura real (cuerda + traste); en el piano se usa una octava de referencia, más grave para el bajo. La escucha usa el volumen general del acompañamiento y la nueva nota libera la anterior, incluidos todos sus armónicos. Las notas tienen una compensación de volumen por instrumento: mayor para el bajo y más moderada para guitarra y piano, sin modificar el volumen de las pistas de acompañamiento.

Al minimizar YouTube, **Video flotante al minimizar** conserva el mismo reproductor en una esquina de la página. **Restaurar video** devuelve el panel a su tamaño normal. Si desactivas esa opción y minimizas, el video se pausa al ocultarlo; no sigue reproduciéndose en segundo plano. La ventana flotante pertenece a la página, no es una ventana independiente del sistema. Mantiene al menos 200 × 200 píxeles para los controles oficiales.

La biblioteca ahora está separada del video. Guarda el enlace del campo superior junto con las tarjetas y ajustes actuales, como antes. La clave interna de almacenamiento sigue siendo `traste.songs.v1` para conservar las canciones existentes; los respaldos antiguos continúan siendo compatibles. El nuevo nombre de descarga es `string-canciones.json`.

## Importación y escucha MIDI · experimental

1. Abre **Importar acordes MIDI** debajo de la biblioteca y selecciona un archivo .mid o .midi.
2. Revisa los acordes reconocidos y los grupos omitidos.
3. Pulsa **Reproducir MIDI**: suenan las notas importadas y el mástil sigue los acordes reconocidos. El indicador resalta el acorde actual en la vista previa. **Detener MIDI** corta las notas pendientes; al reproducir otra vez comienza desde el principio.
4. Usa **Añadir acordes a la progresión** si quieres editar sus tarjetas y guardarlas con el video.

Se admiten archivos Standard MIDI File de formato 0 o 1 con división PPQ, hasta 2 MB. Las notas conservan su altura, velocidad, inicio y duración; se aplican los cambios de tempo (120 BPM si no se especifica ninguno). El reloj del AudioContext sirve tanto para programar notas como para actualizar el acorde; la interfaz se consulta cada 25 ms y puede retrasarse si el navegador limita la pestaña.

El reconocimiento compara las notas que empiezan en el mismo tick con los tipos de acorde disponibles. Admite inversiones, pero un conjunto de notas puede tener varios nombres: revisa la propuesta. No deduce arpegios ni añade notas sostenidas desde instantes anteriores; mantiene el último acorde reconocido hasta el siguiente. La reproducción sí incluye notas melódicas aunque no formen un acorde reconocido.

El timbre es un sintetizador sencillo, con hasta 64 voces simultáneas. Esta etapa omite el canal de percusión, programas de instrumentos, pedal sustain y pitch bend. No pretende sonar igual que un reproductor General MIDI. Las notas sin cierre se liberan al final de su pista o tras un pulso, lo que ocurra después. Archivos más complejos pueden requerir otra etapa del importador.

La reproducción MIDI y el acompañamiento se detienen mutuamente para no competir por el mástil. YouTube conserva sus controles independientes. Añadir las tarjetas no conserva la duración MIDI en el acompañamiento: este sigue usando cuatro pulsos por acorde. La biblioteca guarda las tarjetas importadas, no el archivo MIDI ni su pista temporal; para volver a escuchar el original tras recargar debes seleccionarlo de nuevo.

La detección con micrófono queda para una etapa posterior, según la prioridad elegida de empezar por MIDI.

## Pruebas y documentación de portfolio

Pruebas de regresión (requieren Node.js):

```sh
npm test
```

La suite de Node no requiere paquetes y usa audio y DOM simulados. Hay además una comprobación con Chrome/Edge real, abriendo el archivo local: `node scripts/check-player-browser.cjs` (agregá `--edge` para Edge). El navegador se ejecuta sin ventana y silenciado; la escucha del sonido y revisión visual manual siguen pendientes.

- [Guía de aprendizaje y etapas del portfolio](docs/GUIA-DEL-PROYECTO.md): cómo funciona el reproductor, decisiones y próximos pasos.
- [Plan de pruebas y requisitos](docs/qa/PLAN-DE-PRUEBAS.md): qué se verifica y cómo se relaciona cada requisito con sus casos.
- [Casos de prueba manuales](docs/qa/CASOS-MANUALES.md): pasos, resultados esperados y plantilla de ejecución.
- [Registro de bugs](docs/qa/BUGS.md): defectos encontrados, soluciones y plantilla para nuevos reportes.
- [Resultados de ejecución](docs/qa/RESULTADOS.md): evidencia resumida y comprobaciones pendientes.
- [Reporte de bugs en Excel](docs/qa/excel/Reporte_de_bugs_Traste.xlsx): registro, fichas y plantilla editable.
- [Casos de prueba en Excel](docs/qa/excel/Casos_de_prueba_Traste.xlsx): casos, historial y guía para completar resultados.
- [Bugs — edición Ritmos](docs/qa/excel/Reporte_de_bugs_Traste_Ritmos.xlsx) y [casos — edición Ritmos](docs/qa/excel/Casos_de_prueba_Traste_Ritmos.xlsx): incluyen el nuevo reporte de balance y los casos de percusión. Se conservan las planillas anteriores.

La suite actual tiene **57 pruebas automatizadas**. Los estilos también se verifican con `node scripts/check-player-browser.cjs --rhythms` (y `--edge` para Edge), incluyendo renderizado OfflineAudioContext y mediciones de nivel. Agregar `--no-artifacts` evita reemplazar los registros anteriores de docs/. El flujo de modos y seguimiento del mástil se comprueba con `node scripts/check-player-browser.cjs --progression`, que reordena mediante eventos de teclado.

`node scripts/check-interface-browser.cjs` verifica arrastre, plegado, ventana flotante, controles de YouTube con un doble de la API, dimensiones, biblioteca y restauración tras recargar. También comprueba las frecuencias de las notas al pulsar el piano y las cuerdas del bajo, e importa/reproduce un MIDI de prueba siguiendo sus acordes en el mástil. Con `--edge` usa Edge; `--live-youtube` habilita la API real, pero no demuestra escucha humana. Las pruebas unitarias cubren persistencia, validación, errores, tiempos MIDI con cambios de tempo, notas y cancelación de audio.

En este avance se actualizó únicamente el README como documentación. Las planillas y los documentos de QA conservan el estado de etapas anteriores; los cambios de interfaz, variantes rítmicas y YouTube quedan pendientes de incorporarse allí.

## Próximos pasos recomendados

1. Ejecutar y documentar los casos manuales del reproductor antes de ampliar el audio.
2. Ejecutar MAN-14 a MAN-18 para evaluar los estilos y el balance con escucha real.
3. Probar la biblioteca con canciones propias y respaldos; después añadir búsqueda y etiquetas si resultan necesarias.
4. Incorporar pruebas de navegador y ejecución automática de la suite en GitHub.
5. Ampliar los tipos de acorde disponibles y unificar la lógica de notas del mástil y las cuerdas al aire.
6. Preparar una demo y un caso de estudio con decisiones, pruebas y límites conocidos.

## Ajustes iniciales y edición rápida

Al recargar, YouTube, Acompañamiento, Mis progresiones e Importar acordes MIDI aparecen plegados. Abre cada encabezado para acceder a sus controles. El mástil empieza resaltando la tríada y mostrando los nombres de las notas de la escala. La S del logo usa cursiva.

Un doble clic sobre una tarjeta crea una copia independiente justo después, incluidos el tipo de acorde, nombre de nota y modos. El clic derecho elimina la tarjeta; se conserva al menos una. El botón × continúa disponible. El arrastre sigue reordenando sin duplicar. Las copias permiten repetir compases; el acompañamiento conserva cuatro pulsos por tarjeta. Se pueden duplicar hasta alcanzar 4096 tarjetas.

## Importación MIDI local

### Secciones del tema

Las secciones están ahora dentro de **Acompañamiento**. Los botones Intro, Verso, Estribillo y Parte A/B rellenan el nombre; puedes personalizarlo. La cabecera conserva el selector **Progresión / MIDI** y el botón de reproducción y detención de la fuente elegida incluso al plegar. Cambiar de fuente detiene la reproducción anterior; plegar el panel no la detiene. MIDI se habilita al cargar un archivo y muestra su tiempo junto al botón.

Los paneles y las ayudas tienen transiciones cancelables y respetan la preferencia de movimiento reducido. Las flechas de los paneles aparecen a la izquierda del título.

Debajo de las tarjetas, abre **Secciones del tema**. Indica un nombre (Verso, Estribillo, Parte A…), el número de la primera y última tarjeta y de 1 a 8 repeticiones. **Añadir sección** crea una entrada en el orden de reproducción; las flechas la suben o bajan y × la quita sin borrar acordes. Se admiten hasta 64 secciones.

El acompañamiento reproduce las secciones de arriba abajo e indica sección y vuelta. Sin secciones, reproduce todas las tarjetas como antes. Las repeticiones usan las mismas tarjetas, sin duplicarlas. Mover una tarjeta conserva la pertenencia y el orden capturado por la sección; eliminarla la retira de las secciones. Una copia nueva no se incorpora automáticamente. En esta primera versión, para editar nombre, rango o repeticiones debes quitar la sección y crearla de nuevo.

**Mis progresiones** guarda la estructura en el campo opcional `sections` del formato existente; las progresiones antiguas sin ese campo siguen funcionando. Los archivos MIDI conservan su reproducción original: sus tiempos no se convierten en secciones ni se repiten por esta opción. Esta primera versión agrupa rangos; aún no dispone de un catálogo de secciones reutilizables ni duraciones variables por acorde.

La importación, la vista previa, **Añadir acordes** y **Reproducir MIDI** están dentro de **Acompañamiento → Importar acordes MIDI**. El mismo panel agrupa las plantillas y los controles de ritmo y mezcla. El botón superior reproduce las tarjetas con el ritmo elegido; **Reproducir MIDI** conserva los tiempos del archivo. Ambos reproductores se detienen mutuamente.

Se añaden patrones simplificados de **reggae**, **disco** y **balada**, todos en cuatro pulsos, y plantillas editables de pop (I–V–vi–IV), balada (vi–IV–I–V), reggae (I–IV–V–IV) y disco (i–iv). Usar una plantilla sustituye las tarjetas y establece su ritmo y tempo inicial; puedes cambiarlos después.

La flecha junto a **Seguir acorde MIDI** permite desplegar las tarjetas en filas (vista predeterminada) o recogerlas en una sola fila horizontal, con una transición suave que respeta la preferencia de movimiento reducido. Ambas vistas conservan el orden, el arrastre y el seguimiento MIDI; cambiar la vista no modifica los acordes.

Al reproducir un MIDI, sus acordes se añaden a la progresión si aún no los añadiste. Las tarjetas vinculadas se resaltan al sonar, siguiendo los tiempos originales. Moverlas conserva el vínculo; eliminar una evita su resaltado, aunque su nota sigue sonando en el MIDI. El vínculo dura mientras ese archivo está cargado: la biblioteca sigue guardando las tarjetas, no el archivo ni sus tiempos.

Las tarjetas se distribuyen en filas, con desplazamiento vertical dentro de un panel de altura limitada. **Seguir acorde MIDI** desplaza ese panel cuando el acorde actual queda fuera de vista; puedes desactivarlo para explorar libremente. El seguimiento no desplaza toda la página. El arrastre permite reorganizar las tarjetas entre filas.

El catálogo incluido se retiró de la interfaz. Puedes importar tus propios archivos MIDI de hasta 2 MB y trabajar con progresiones de hasta 4096 acordes, también al guardarlas en Mis progresiones. Los archivos musicales de ejemplo que permanecen en `assets/midi/` conservan sus créditos en midi-catalog.js (metadatos utilizados solo en pruebas) y se utilizan en pruebas; la página ya no los carga como catálogo.

## Elegir la raíz desde el mástil y estudiar acordes del modo

Al pulsar una nota de un traste o una cuerda al aire, se escucha su altura y se selecciona su clase de nota como nueva raíz, igual que en el piano. Se conserva el modo y no se modifican las tarjetas ya guardadas. Si está activo un seguimiento de audio, este puede volver a mostrar el acorde reproducido.

El botón de visualización recorre **grados → tríada → 7ma → Acorde → Acorde 7ma**. Las vistas anteriores siguen disponibles; las dos nuevas se calculan desde el modo de siete notas, independientemente del tipo de acorde elegido.

- **Acorde:** grados 1, 3 y 5 del modo.
- **Acorde 7ma:** grados 1, 3, 5 y 7 del modo.

Por ejemplo, en Do jónico se colorean Do–Mi–Sol y se añade Si en la segunda vista. En Do dórico son Do–Mi♭–Sol y Si♭; en Do locrio, Do–Mi♭–Sol♭ y Si♭. En estas dos vistas, todas las notas del acorde usan el color del grado del modo respecto de su escala mayor de referencia (I jónico, II dórico, III frigio, IV lidio, V mixolidio, VI eólico, VII locrio). La séptima usa el mismo color. Las notas restantes de la escala quedan grises y la escala adicional no introduce colores ajenos al acorde en estas vistas.

Las pentatónicas tienen cinco notas, por lo que estas dos vistas no se ofrecen al seleccionarlas. Si se cambia a una pentatónica desde una de ellas, se vuelve a **tríada**.

## Escala fija, importación y plantillas

**Mantener escala al tocar el mástil** está desactivado inicialmente. Al activarlo, pulsar un traste o una cuerda al aire reproduce la nota y la marca con un contorno, sin cambiar raíz, modo ni acorde del editor. El piano sigue cambiando la raíz, incluso con el bloqueo activo. El interruptor limita los clics del mástil; no detiene el seguimiento de una reproducción.

Al añadir los acordes de un MIDI, las cuatro tarjetas de ejemplo se sustituyen si siguen siendo la progresión inicial intacta. Si ya añadiste, duplicaste, moviste o eliminaste tarjetas, o abriste una canción, se conservan y el MIDI se añade al final. Importar otro MIDI después también añade sus acordes. El límite sigue siendo de 4096 tarjetas.

El selector **Plantillas** ofrece:

| Plantilla | Acordes por compás | BPM | Ritmo |
| --- | --- | --- | --- |
| Jazz ii–V–I en Do | Dm7 · G7 · Cmaj7 · Cmaj7 | 100 | Jazz suave |
| Jazz I–vi–ii–V en Do | Cmaj7 · Am7 · Dm7 · G7 | 110 | Jazz suave |
| Blues de 12 compases en La | A7 · A7 · A7 · A7 · D7 · D7 · A7 · A7 · E7 · D7 · A7 · E7 | 90 | Jazz suave |

**Usar plantilla** reemplaza las tarjetas actuales, detiene el audio MIDI/acompañamiento y activa percusión y repetición. No inicia audio ni modifica YouTube o los volúmenes. Cada tarjeta dura cuatro pulsos. El blues usa el patrón con swing ya disponible de Jazz suave; no se añadió un motor de blues distinto.

Las plantillas son puntos de partida editables. Guarda los cambios previos antes de aplicarlas y usa **Guardar como nueva** para conservar la nueva práctica sin sobrescribir otra canción abierta.

## Interfaz compacta de acompañamiento y ayuda

Las plantillas están dentro del panel plegable **Acompañamiento**. El selector y **Usar** reemplazan la explicación permanente; aplicar una plantilla sigue sustituyendo las tarjetas y ajustando el ritmo.

La ayuda de las tarjetas está en el círculo **?** junto al encabezado de la progresión. Se abre con clic o con Enter/Espacio y se cierra de la misma forma. Los nombres de modo en las tarjetas usan letra más pequeña y discreta.

El bloqueo del mástil utiliza el mismo interruptor deslizante que las alteraciones del piano, acompañado de un candado y su propio **?**. Activado, tocar el mástil escucha y marca la nota, manteniendo raíz y escala; el piano conserva su selección independiente.

En **Acorde** y **Acorde 7ma**, el color representa el grado del modo, no el intervalo individual de cada nota. Por ejemplo, Re dórico resalta Re–Fa–La con el color del grado II; al incluir séptima, Do usa ese mismo color. Las vistas anteriores mantienen sus colores por intervalo.

## Revisión y evolución

Consulta [la revisión técnica](docs/REVISION-TECNICA.md) para ver los problemas corregidos, la deuda técnica y la propuesta de secciones, repeticiones y seguimiento de YouTube. Las explicaciones de uso se agrupan en botones de ayuda «?», mientras que los resultados y errores permanecen visibles. El cambio de nombre a Mis progresiones mantiene los datos guardados anteriormente.
