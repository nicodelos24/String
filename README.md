# Traste · Explorador de escalas

Aplicación web para explorar escalas, modos e intervalos sobre el mástil de una guitarra o un bajo. Permite elegir una nota base y una calidad de acorde, visualizar sus relaciones musicales y armar una idea de progresión armónica.

## Proyecto desarrollado con asistencia de IA

Traste es un proyecto de aprendizaje y portfolio desarrollado con ayuda de inteligencia artificial para explorar ideas, implementar funciones, revisar errores, crear pruebas y documentar avances. El proceso incluye revisión del código y pruebas manuales del autor para entender lo construido y mejorar el producto a partir del uso real. La lógica musical y la síntesis de audio se ejecutan localmente en el navegador.

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

Después abrí [Traste en el servidor local](http://127.0.0.1:8000). La terminal debe permanecer abierta mientras lo usás. No se instala ninguna dependencia del proyecto.

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
├── youtube-player.js # Carga del video, sin sincronización
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

Al hacer clic en una nota se muestra información textual; todavía no se reproduce sonido. La importación de progresiones MIDI y la detección de acordes con micrófono aparecen en la interfaz como funciones futuras.

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

YouTube solo carga un [reproductor incrustado oficial](https://developers.google.com/youtube/player_parameters). El video usa sus propios controles: se retiraron las marcas de tiempo, el seguimiento del video y las pausas automáticas. El audio sintetizado y el metrónomo son independientes. Si se inician varias fuentes, pueden sonar a la vez; cada una se detiene desde sus controles.

### Guardar una práctica

1. Abre la aplicación con Node o Python en **http://127.0.0.1:8000**.
2. Prepara las tarjetas y ajusta el estilo, BPM, percusión, repetición y volúmenes.
3. Si quieres asociar un video, pega su enlace en YouTube. Puedes dejar el campo vacío para guardar solo el acompañamiento local. El enlace del campo es el que se guarda.
4. Escribe un nombre en **Mis canciones** y pulsa **Guardar como nueva**.
5. Selecciona una canción de la biblioteca y pulsa **Abrir** para recuperar sus tarjetas y ajustes. Esto reemplaza la progresión que estás editando y detiene el sintetizador; guarda primero los cambios que quieras conservar. El video asociado se carga sin reproducción automática.
6. Usa **Actualizar canción abierta** para guardar cambios sobre la canción que abriste o acabas de guardar. **Guardar como nueva** crea otra copia. Cambiar la selección de la lista no abre ni modifica una canción por sí solo.

Cada canción contiene un identificador, nombre, enlace opcional, copia de los acordes (incluidos sus modos) y configuración del acompañamiento. La biblioteca guarda hasta 200 canciones, con hasta 256 acordes cada una. No guarda archivos de audio ni descarga videos: los ritmos se generan nuevamente al reproducir. La asociación canción–progresión no implica sincronización temporal ni detección automática de acordes.

### Dónde quedan los datos y cómo respaldarlos

Se usa [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), almacenamiento del navegador que conserva datos entre sesiones. No necesita una base de datos remota, cuenta ni servidor de pago. Node/Python solo sirve los archivos de la aplicación; la biblioteca no se guarda en el servidor ni en el repositorio.

Usa siempre el mismo navegador, perfil y dirección. Chrome y Edge tienen bibliotecas separadas; localhost y 127.0.0.1 también, al igual que puertos diferentes. El modo privado, borrar los datos del sitio o las restricciones de almacenamiento pueden hacer que los datos desaparezcan o no se puedan guardar. Abrir index.html con doble clic no ofrece garantías de persistencia entre navegadores.

**Exportar respaldo** descarga un archivo traste-canciones.json. **Importar respaldo** lo valida y añade las canciones como copias sin sobrescribir las existentes. Se admiten archivos de hasta 2 MB. Exporta periódicamente y antes de cambiar de navegador o dirección. La aplicación informa los errores de formato o almacenamiento en lugar de presentar el guardado como exitoso.

### Próximos pasos

Esta etapa permite aprender persistencia, validación, separación entre datos e interfaz y pruebas de recuperación sin contratar servicios. El siguiente paso puede ser organizar la biblioteca con búsqueda y etiquetas. Si luego necesitamos cuentas o sincronización automática entre equipos, podremos incorporar un backend y evaluar sus límites de uso gratuito en ese momento. La versión del formato JSON permite preparar futuras migraciones.

YouTube requiere Internet y videos que permitan reproducción incrustada. Si un video está restringido, usa **Abrir video en YouTube**. La página no consulta el estado interno del video ni afirma que haya comenzado a reproducirse.

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

La suite actual tiene **42 pruebas automatizadas**. Los estilos también se verifican con `node scripts/check-player-browser.cjs --rhythms` (y `--edge` para Edge), incluyendo renderizado OfflineAudioContext y mediciones de nivel. Agregar `--no-artifacts` evita reemplazar los registros anteriores de docs/. El flujo de modos y seguimiento del mástil se comprueba con `node scripts/check-player-browser.cjs --progression`, que reordena mediante eventos de teclado.

`node scripts/check-interface-browser.cjs` verifica arrastre, plegado, dimensiones, vista móvil, carga del iframe y guardado/apertura de canciones después de recargar. Bloquea la red de YouTube para que la prueba no dependa del servicio externo. Con `--edge` usa Edge; `--live-youtube` permite cargar el iframe externo, pero no demuestra reproducción ni escucha humana. Las pruebas unitarias cubren persistencia, actualización, respaldo, importación y errores de almacenamiento.

En este avance se actualizó únicamente el README como documentación. Las planillas y los documentos de QA conservan el estado de etapas anteriores; los cambios de interfaz, variantes rítmicas y YouTube quedan pendientes de incorporarse allí.

## Próximos pasos recomendados

1. Ejecutar y documentar los casos manuales del reproductor antes de ampliar el audio.
2. Ejecutar MAN-14 a MAN-18 para evaluar los estilos y el balance con escucha real.
3. Probar la biblioteca con canciones propias y respaldos; después añadir búsqueda y etiquetas si resultan necesarias.
4. Incorporar pruebas de navegador y ejecución automática de la suite en GitHub.
5. Ampliar los tipos de acorde disponibles y unificar la lógica de notas del mástil y las cuerdas al aire.
6. Preparar una demo y un caso de estudio con decisiones, pruebas y límites conocidos.
