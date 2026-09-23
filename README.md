# String · Explorador de escalas

Aplicación web para estudiar escalas en guitarra y bajo, crear progresiones y practicar con acompañamiento, archivos MIDI y videos de YouTube.

## Proyecto con asistencia de IA

String, antes Traste, es un proyecto de aprendizaje y portfolio desarrollado con ayuda de IA para implementar, revisar, probar y documentar. Los reportes distinguen las comprobaciones automáticas de las pruebas manuales del autor. La aplicación no genera canciones mediante IA.

## Iniciar

Con Node.js y npm instalados:

```sh
npm start
```

Abre [String local](http://127.0.0.1:8000). No requiere `npm install`: el servidor usa módulos nativos. En PowerShell también puedes usar `node server.cjs`.

Como alternativa, si ya tienes Python:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Ejecuta un solo servidor a la vez y detenlo con Ctrl+C. Live Server también funciona. Abrir index.html con doble clic permite explorar y escuchar audio local; para YouTube y un guardado más consistente usa HTTP.

Las fuentes de Google Fonts y YouTube requieren conexión. Las herramientas históricas de QA están archivadas; Python y openpyxl no son dependencias de la aplicación.

## Uso

### Explorar notas y escalas

- Guitarra de seis cuerdas E–A–D–G–B–E o bajo de cuatro E–A–D–G, con 22 trastes.
- Selección de raíz con el piano o el mástil. El candado permite tocar y marcar una nota sin cambiar la escala; el piano sigue cambiando la raíz.
- Modos diatónicos, pentatónicas, escala adicional y vistas de intervalos, tríada, séptima y acorde modal.
- **Acorde** y **Acorde 7ma** colorean los componentes con el color del grado modal. La vista pentatónica global muestra cinco notas según la calidad del acorde y puede desactivarse.
- En acordes disminuidos la pentatónica menor es solo una referencia: no incluye su quinta disminuida. En suspendidos se usa la mayor.
- La escucha del mástil usa timbres sintetizados de cuerda pulsada o bajo tipo slap; el piano conserva su timbre suave. No son muestras de instrumentos reales.
- El selector **Mástil / Teclado / Ambos** junto al teclado miniatura elige la disposición del piano de cuatro octavas. **Mástil**: solo el mástil, y las teclas del PC lo tocan con el sonido del instrumento. **Teclado**: el piano reemplaza el mástil. **Ambos**: el piano se muestra encima del mástil a todo lo ancho y las teclas del PC tocan solo el piano; el mástil sigue mostrando en tiempo real las notas del micrófono y, con «Acorde en vivo» activado, cambia su escala al acorde que formes en el piano. Se toca con el puntero o con el teclado físico: fila media `a s d f g h j k l ñ` = la si do re mi fa sol la si do (a suena una octava más alta que el la de la 5.ª cuerda, A3); fila grave `z x c v b n m , . -` = mi fa sol la si do re mi fa sol (z usa el mi de la 6.ª cuerda); accidentales en las columnas de la fila superior `q w e r t y u i o p` (q=ab/g#, w=a#/bb, …, t=d#/eb) y las posiciones del teclado latam `´ + }` = c#/db, d#/eb y e. **Shift izquierdo** baja una octava y **Shift derecho** la sube. El switch **♯/♭** del piano cambia cómo se nombran las teclas negras y los acordes. Ofrece sintetizador con timbres Piano, Guitarra, Bajo, Órgano y Lead, y efectos Delay y Reverb.
- El switch sol/luna guarda el tema de interfaz. No cambia los colores musicales ni la madera del mástil.
- Los controles visibles se guardan en el navegador y se recuperan al volver a abrir la página: instrumento, nota raíz y armadura, calidad y modo, vista pentatónica, fuente de reproducción (Backtrack/MIDI/Metrónomo), vista y etiquetas de las tarjetas y el mástil, disposición de las tarjetas, Mástil/Teclado/Ambos, acorde en vivo y escala en vivo, tempos, estilos y volúmenes del acompañamiento, metrónomo y sintetizador, «Seguir acorde MIDI», bloqueo de escala y video flotante.

En móvil, el mástil se desplaza horizontalmente sin comprimir sus proporciones. El acorde seleccionado y la armadura aparecen cerca del mástil. Las explicaciones se abren mediante botones **?**; los errores y estados siguen visibles.

### Tarjetas y secciones

1. Elige un acorde y pulsa **Añadir acorde**.
2. Arrastra las tarjetas para ordenar, haz doble clic para duplicar o usa clic derecho / × para eliminar. El selector de cada tarjeta ajusta su duración (¼, ½, ¾, 1, 1½, 2, 3 o 4 compases). Puedes eliminar todas las tarjetas y empezar de cero; sin tarjetas no hay nada que reproducir.
3. Con teclado, Enter o Espacio seleccionan; Alt + flechas mueve el acorde y mantiene el foco.
4. La flecha de vista alterna entre filas y una sola fila horizontal.
5. Abre la burbuja **Secciones del tema**, a la derecha de las tarjetas de progresión. Dentro de **Crear sección**, elige nombre, rango de números de tarjeta y repeticiones.
6. Pulsa una tarjeta de sección para ver sus acordes. **Todos los acordes** recupera la lista completa. Arrastra el asa de una sección o usa sus flechas para cambiar el orden.

Con secciones, el acompañamiento sigue esa lista y sus repeticiones, sin duplicar tarjetas. Cambia automáticamente de sección y muestra el acorde y la vuelta debajo de las tarjetas. Sin secciones, reproduce la progresión completa.

En la vista de una sección, ordenar acordes cambia su orden interno; añadir o duplicar los incorpora a la sección activa. En la vista completa, mover acordes no altera los órdenes internos capturados. Eliminar una tarjeta la retira de todas sus secciones. La ejecución de audio mantiene una copia hasta reiniciar.

Límites: 4096 tarjetas, 64 secciones, entre 1 y 8 repeticiones por sección y 32768 entradas en la ejecución expandida. Los índices dentro de una sección deben ser únicos; las repeticiones se expresan con ×N. Para cambiar nombre, rango o repeticiones, quita la sección y créala nuevamente.

### Acompañamiento y MIDI

La cabecera conserva el selector **Progresión / MIDI** y el control del reproductor elegido, incluso plegada. El triángulo inicia; el cuadrado detiene. Volver a reproducir comienza desde el inicio: estos motores no tienen pausa reanudable.

Junto a las tarjetas hay un acceso rápido con el mismo selector y control de reproducción. Ambos accesos se mantienen sincronizados; MIDI se habilita al cargar un archivo válido. Ese selector incluye una tercera fuente, **Metrónomo**, y el botón de reproducción pasa a iniciar/pausar el metrónomo mientras esté activa.

El botón **Tempo** junto a ese acceso estima el BPM con dos o más pulsaciones al ritmo de la canción y lo fija en el acompañamiento; el número que lo acompaña es editable a mano (30–240) y se mantiene sincronizado con el acompañamiento y, con un video cargado, con el BPM para generar sus marcas. Solo cuando la fuente activa es **Metrónomo**, tocar o editar tempo fija también el tempo del metrónomo y, al dar play con esa fuente, se le aplica el tempo mostrado. El MIDI conserva su propio tempo y no cambia.

- Cambiar de fuente detiene la anterior. Volver a pulsar la fuente activa no detiene.
- Plegar Acompañamiento no detiene el audio.
- Cada tarjeta dura un compás de cuatro pulsos por defecto; su selector ajusta la duración y el acompañamiento la respeta. BPM entre 30 y 240.
- Estilos: Sin ritmo, Pop / rock, Jazz suave, Trap suave, Funk, Bossa suave, Reggaetón suave, Reggae, Disco y Balada.
- Plantillas: **Mi progresión** (se guarda sola al editar las tarjetas y siempre se puede volver a elegir), jazz ii–V–I, blues de 12 compases (La y Fa con turnaround), Autumn Leaves, turnaround I–vi–ii–V, pop, balada, reggae y disco. Usarlas reemplaza las tarjetas y ajusta estilo y tempo, salvo «Mi progresión», que solo restaura las tarjetas.
- Volumen general y percusión se pueden ajustar; el metrónomo es independiente.

En **Acompañamiento → Importar acordes MIDI**, elige un archivo de hasta 2 MB. El importador lee MIDI estándar de formato 0/1 con división PPQ y reconoce grupos de notas que empiezan juntas. No deduce acordes de arpegios.

Puedes añadir las tarjetas o iniciar **Reproducir MIDI**, que las añade si todavía están pendientes. Si las tarjetas iniciales siguen intactas, se sustituyen; si ya editaste la progresión, se añaden al final.

MIDI reproduce las notas y sus tiempos originales, no los instrumentos, efectos ni percusión originales. El mástil sigue los acordes reconocidos; **Seguir acorde MIDI** desplaza las tarjetas cuando hace falta. Detener limpia el resaltado. El seguimiento por archivo se conserva solo mientras ese MIDI permanece cargado.

El catálogo MIDI anterior ya no se carga en la página. Los archivos en assets/midi y sus créditos en midi-catalog.js permanecen como fixtures de prueba.

### Mis progresiones

Guarda nombre, acordes, modos, secciones, ajustes del acompañamiento y enlace opcional de YouTube. Abrir reemplaza las tarjetas actuales; los cambios posteriores se guardan con **Actualizar**.

- Almacenamiento local, sin cuenta ni servidor de datos.
- Hasta 200 progresiones. Formato JSON versión 1 con campo opcional sections; se aceptan respaldos anteriores sin secciones.
- Límite de respaldo: 20 MB, coherente entre guardado, exportación e importación. La cuota local del navegador puede ser menor; si falla, se conserva lo que había.
- Importar crea copias con identificadores nuevos. JSON inválido, referencias duplicadas y límites excedidos se rechazan antes de escribir.
- No se guardan el archivo MIDI, sus tiempos ni el audio. Exporta un respaldo para trasladar tus progresiones a otro navegador.

La clave histórica traste.songs.v1 se conserva para mantener compatibilidad. No borres los datos del navegador sin exportar primero.

### YouTube

Carga un enlace válido para reproducir el video, pausar/reanudar, desplazarte por su tiempo y usar la vista flotante al plegar. Algunos videos pueden impedir la reproducción embebida.

Guardar el enlace con una progresión no sincroniza automáticamente sus acordes ni analiza el audio. YouTube sigue siendo independiente del acompañamiento y MIDI. No hay integración con una cuenta de YouTube Music.

En **YouTube → Sincronizar acordes**, selecciona una tarjeta y pulsa **Marcar acorde aquí** cuando comience en el video. Repite con los cambios y activa **Seguir marcas del video**. Puedes pausar el video para colocar las marcas. Usa **Guardar nueva** o **Actualizar** en Mis progresiones para conservarlas junto al enlace. Cambiar de video descarta las marcas actuales sin guardar. El seguimiento se desactiva al iniciar MIDI o acompañamiento.

Para sincronizar sin marcar cada acorde, indica el BPM (o pulsa **Marcar pulso** al ritmo de la canción), elige los pulsos por acorde y pulsa **Empezar progresión aquí** en el momento inicial. Se generan marcas para toda la progresión, respetando secciones y repeticiones, y se reemplazan las anteriores. Requiere tempo constante y la misma duración por acorde; no detecta el ritmo del audio automáticamente.

## Verificación y documentación

```sh
npm test
```

Se conservan las pruebas rápidas de Node, sin dependencias adicionales. Comprueban la lógica musical, MIDI, guardado, secciones y estructura básica. No sustituyen la revisión visual o auditiva.

Si PowerShell bloquea `npm.ps1`, usa `npm.cmd test` (o `npm.cmd start` para iniciar), sin cambiar la política del sistema.

Los reportes, casos manuales, Excel, evidencias y scripts de navegador se separaron en un [archivo de QA recuperable](archivo-qa/README.md). No hace falta abrirlo para desarrollar. La documentación de QA se retomará cuando sea necesaria o se solicite.

- [Guía del proyecto y portfolio](docs/GUIA-DEL-PROYECTO.md)
- [Revisión técnica y pendientes](docs/REVISION-TECNICA.md)
- [Ritmos y sonido](docs/RITMOS-Y-SONIDO.md)

## Próximos pasos

Completar la prueba manual y auditiva, medir rendimiento con progresiones grandes, mejorar la edición de secciones y diseñar ejemplos propios. El micrófono puede resaltar notas monofónicas y, en modo experimental, reconocer acordes simultáneos. La tarjeta «Acorde en vivo» permite añadir el acorde detectado o activar «Auto añadir»; «Escala en vivo» (Apagado / Nota / Acorde) decide si el mástil sigue al micrófono: en «Nota» una sola nota usa la calidad elegida y al captar un acorde se aplica el real; en «Acorde» solo los acordes captados cambian la escala. Esta fase requiere validación con instrumento real y no reemplaza una transcripción profesional.
