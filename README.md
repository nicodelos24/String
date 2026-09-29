# String · Explorador de escalas

Aplicación web para estudiar escalas en guitarra y bajo, crear progresiones y practicar con acompañamiento, archivos MIDI y videos de YouTube.

## Proyecto con asistencia de IA

String, antes Traste, es un proyecto de aprendizaje y portfolio desarrollado con ayuda de IA para implementar, revisar, probar y documentar. Los reportes distinguen las comprobaciones automáticas de las pruebas manuales del autor. La aplicación no genera canciones mediante IA.

## Derechos y permisos de reutilización

Las nuevas aportaciones originales de String están sujetas a **derechos reservados**: su reutilización requiere autorización previa y por escrito de **nicodelos24**. Se permite consultar el código para evaluar el proyecto. Las condiciones completas y sus excepciones están en [LICENSE](LICENSE); las solicitudes de permiso se dirigen mediante los canales publicados en [el perfil del titular](https://github.com/nicodelos24).

El material anteriormente publicado bajo MIT conserva los permisos ya concedidos, incluso cuando siga incluido en versiones posteriores. El texto anterior está en [MIT-legacy.txt](licenses/MIT-legacy.txt). Los [materiales de terceros](THIRD_PARTY_NOTICES.md) mantienen sus propias condiciones.

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
- El selector **Mástil / Teclado / Ambos** junto al teclado miniatura elige la disposición del piano de cuatro octavas. **Mástil**: solo el mástil, y las teclas del PC lo tocan con el sonido del instrumento. **Teclado**: el piano reemplaza el mástil. **Ambos**: el piano se muestra debajo del mástil a todo lo ancho y las teclas del PC tocan solo el piano; el mástil sigue mostrando en tiempo real las notas del micrófono y, con «Acorde en vivo» activado, cambia su escala al acorde que formes en el piano. Se toca con el puntero o con el teclado físico: fila media `a s d f g h j k l ñ {` = do re mi fa sol la si do re mi fa (la tecla `a` es el do central, C4); fila grave `z x c v b n m , . -` = mi fa sol la si do re mi fa sol (empieza en mi3, así que en modo **Mástil** con guitarra `z` es la sexta cuerda al aire y `v` la quinta); fila superior `w e t y u o p` y las posiciones del teclado latam `´ +` = los sostenidos ascendentes, de do#4 a sol#5. Las teclas `n m , . -` suenan lo mismo que `a s d f g` y por eso el piano no les pone letra: solo se rotula la primera de cada par. En el modo **Mástil** con guitarra, las teclas suenan **una octava más abajo** que en el piano (`a` = do3), que es donde se toca una guitarra cómodamente; el bajo mantiene la base del piano. La nota que suena y la que se marcan en el mástil son la misma. **Re Pág** mantenida baja una octava y **Av Pág** la sube. El switch **♯/♭** del piano cambia cómo se nombran las teclas negras y los acordes. Ofrece sintetizador con timbres Piano, Guitarra, Bajo, Órgano y Lead, y efectos Delay y Reverb.
- El switch sol/luna guarda el tema de interfaz. No cambia los colores musicales ni la madera del mástil.
- **Atajos para crear progresiones:** **Enter** o **Espacio** agregan a las tarjetas el acorde que el mástil está reconociendo — con «Acorde en vivo» activo, el que forman las teclas que estés pulsando; si no, el acorde que esté seleccionado. Funcionan con el micrófono encendido, en vivo. Un toque de **Shift** alterna «Escala en vivo» del micrófono entre **Nota** y **Acorde**; con el micrófono apagado también, para dejar la fase preparada. Las dos teclas se apartan cuando el foco está en un campo de texto o en un botón, para poder escribir y activar controles como siempre.
- Los controles visibles se guardan en el navegador y se recuperan al volver a abrir la página: instrumento, nota raíz y armadura, calidad y modo, vista pentatónica, fuente de reproducción (Backtrack/MIDI/Metrónomo), vista y etiquetas de las tarjetas y el mástil, disposición de las tarjetas, Mástil/Teclado/Ambos, acorde en vivo, escala en vivo y rótulo del micrófono (Nota/Grado), «Solo pulso» o «Reiniciar», silencio del Acompañamiento, tempos, estilos y volúmenes del acompañamiento, metrónomo y sintetizador, «Seguir acorde MIDI», bloqueo de escala y video flotante.

Los dos botones del pie del mástil rotulan dos zonas distintas y no se cruzan. **AA** escribe en la escala dibujada (las notas del modo y, con la pentatónica apagada, las del acorde) y va alternando apagado (solo **AA**) → **AA NOTAS** → **AA GRADOS**; **MÁSTIL** escribe en el resto del mástil, lo que queda fuera de la escala, y va alternando apagado (solo **MÁSTIL**) → **MÁSTIL NOTAS** → **MÁSTIL GRADOS**. Con el botón apagado solo se ve su nombre, sin palabra: es la forma de decir que no está escribiendo nada, y es el único estado que no se resalta. La primera vez que abres la página, **AA** arranca en **AA GRADOS** y **MÁSTIL** apagado, así que un clic en AA lo deja apagado; a partir de ahí se guarda la fase que dejes, como los demás controles. Así, con AA apagado y MÁSTIL NOTAS, la escala calla y el resto del mástil sigue con su nombre de nota. Las notas que MÁSTIL escribe siguen el switch **♯/♭**, y el switch se coloca solo en la armadura de lo que está sonando (Re mayor → sostenidos, Fa mayor → bemoles); en Do, que no tiene accidentales, se queda donde lo dejes hasta que cambies de acorde o de escala. En móvil, el mástil se desplaza horizontalmente sin comprimir sus proporciones. El acorde seleccionado y la armadura aparecen cerca del mástil. Las explicaciones se abren mediante botones **?**; los errores y estados siguen visibles. La página se divide en cuatro secciones con una barra fija abajo, al alcance del pulgar: **Mástil** (diapasón, controles del mástil y lecturas de escala), **Progresión** (tarjetas y tempo), **Acompañar** (Acompañamiento, YouTube, metrónomo y Mis progresiones) y **Más** (controles, leyenda de intervalos y modos, YouTube, metrónomo y biblioteca). Solo se ve una sección a la vez. En escritorio la barra no aparece y la rejilla de tres columnas es la de siempre.

### Tarjetas y secciones

1. Elige un acorde y pulsa **Añadir acorde**.
2. Arrastra las tarjetas para ordenar, haz doble clic para duplicar (dos clics con menos de 0,25 s entre ellos) o usa clic derecho / × para eliminar. El selector de cada tarjeta ajusta su duración (¼, ½, ¾, 1, 1½, 2, 3 o 4 compases). Puedes eliminar todas las tarjetas y empezar de cero; sin tarjetas no hay nada que reproducir.
3. Al pulsar una tarjeta, el Acompañamiento arranca en ella. Si ya está sonando, el interruptor **Reiniciar** (opción por defecto) vuelve a empezar en la tarjeta pulsada y con **Solo pulso** la música sigue sin cortarse. Las tarjetas no cambian el tempo. Con la fuente MIDI o Metrónomo activa el clic no hace nada. Con secciones, la tarjeta se busca dentro de la lista que se está reproduciendo; si no está en ella, empieza por el principio de esa lista.
4. Alt + flechas mueve el acorde y mantiene el foco. Enter y Espacio ya no seleccionan la tarjeta:agregan el acorde reconocido (ver «Atajos para crear progresiones»).
5. La flecha de vista alterna entre filas y una sola fila horizontal.
6. Abre la burbuja **Secciones del tema**, a la derecha de las tarjetas de progresión. Dentro de **Crear sección**, elige nombre, rango de números de tarjeta y repeticiones.
7. Pulsa una tarjeta de sección para ver sus acordes. **Todos los acordes** recupera la lista completa. Arrastra el asa de una sección o usa sus flechas para cambiar el orden.

Con secciones, el acompañamiento sigue esa lista y sus repeticiones, sin duplicar tarjetas. Cambia automáticamente de sección y muestra el acorde y la vuelta debajo de las tarjetas. Sin secciones, reproduce la progresión completa.

En la vista de una sección, ordenar acordes cambia su orden interno; añadir o duplicar los incorpora a la sección activa. En la vista completa, mover acordes no altera los órdenes internos capturados. Eliminar una tarjeta la retira de todas sus secciones. La ejecución de audio mantiene una copia hasta reiniciar.

Límites: 4096 tarjetas, 64 secciones, entre 1 y 8 repeticiones por sección y 32768 entradas en la ejecución expandida. Los índices dentro de una sección deben ser únicos; las repeticiones se expresan con ×N. Para cambiar nombre, rango o repeticiones, quita la sección y créala nuevamente.

### Improvisar

Para armar la progresión mientras tocas, sin parar a pulsar «añadir acorde». La página indica el orden: **1. Enciende el micrófono. 2. Marca el tempo con el botón Tempo**, al ritmo de la canción. Con eso, enciende **Improvisar** (está en la columna de al lado de las tarjetas, bajo el Tempo).

En cada primer tiempo se abre la escucha y el primer acorde que el micrófono confirme desde ahí se añade como tarjeta nueva, y el mástil pasa a mostrarlo con su modo. La cuadrícula arranca donde empezaste a marcar el tempo, así que el primer tiempo es el primero de verdad. Un compás añade **una sola** tarjeta: si en el primer tiempo no ha sonado nada nuevo, ese compás no añade ninguna, y hay que rasguear en el tiempo. Mantener un acorde sin volver a rasguearlo no añade una segunda tarjeta idéntica, porque no se puede saber si la querías.

El compás es de 4/4. El interruptor se apaga solo al recargar la página, para que no empiece a escribir tarjetas solo; las tarjetas que añada sí se conservan, como las demás, en «Mi progresión» y en «Mis progresiones». No reproduce el Acompañamiento: arma las tarjetas y luego le das a Reproducir.

### Seguir la canción con el micrófono

Dos controles más en la misma columna, debajo de **Improvisar**:

- **♪ Tempo con notas** — enciéndelo y toca dos o más notas al ritmo de la canción, una por pulso. La cuenta se cierra sola y el tempo se aplica al Acompañamiento, al metrónomo si lo tienes seleccionado y al video. Es el mismo cálculo que el botón Tempo, con la misma pausa para reiniciar la cuenta, y la ancla en la primera nota, de modo que la cuadrícula de Improvisar queda alineada con la canción. Mientras cuenta, el BPM es una previsualización. Volver a pulsarlo cancela y devuelve el tempo anterior. El micrófono es monofónico, así que un rasgueo cuenta como un golpe.
- **Entrar al tocar** — en cuanto el micrófono capta la primera nota, arranca **con sonido** lo que estés usando: el Acompañamiento o el metrónomo. El MIDI no se toca. Entra una sola vez: si paras la música a mano, no se vuelve a encender sola, hay que desmarcar y volver a marcar el interruptor. No cambia el Silencio que tengas puesto.

Los dos necesitan el micrófono encendido. La nota tiene que llegar a confirmarse (unos 470 ms), así que si tocas muy flojo no cuentan.

### Acompañamiento y MIDI

La cabecera conserva el selector **Progresión / MIDI** y el control del reproductor elegido, incluso plegada. El triángulo inicia; el cuadrado detiene. Volver a reproducir comienza desde el inicio: estos motores no tienen pausa reanudable.

Junto a las tarjetas hay un acceso rápido con el mismo selector y control de reproducción. Ambos accesos se mantienen sincronizados; MIDI se habilita al cargar un archivo válido. Ese selector incluye una tercera fuente, **Metrónomo**, y el botón de reproducción pasa a iniciar/pausar el metrónomo mientras esté activa.

El botón **Tempo**, en la columna de la derecha de las tarjetas y por encima del interruptor **Seguir acorde MIDI**, estima el BPM con dos o más pulsaciones al ritmo de la canción y lo fija en el acompañamiento; el número que lo acompaña es editable a mano (30–240) y se mantiene sincronizado con el acompañamiento y, con un video cargado, con el BPM para generar sus marcas. Mientras cuentas, el BPM solo se previsualiza en el número y el Acompañamiento no se toca: el tempo se aplica una sola vez al dejar de pulsar, para que el ritmo que esté sonando no dé un tirón con cada golpe. El botón **↺** (o la tecla Escape) descarta la cuenta y devuelve el último tempo aplicado. La estimación se apoya en la mediana de los intervalos, así que una pausa o un golpe fallido no la falsean, y una pausa larga empieza la cuenta de nuevo. Solo cuando la fuente activa es **Metrónomo**, tocar o editar tempo fija también el tempo del metrónomo y, al dar play con esa fuente, se le aplica el tempo mostrado. El MIDI conserva su propio tempo y no cambia. Con la música en marcha, el tempo se aplica sin cortarla: el compás que ya suena termina con su duración y el siguiente entra con el tempo nuevo.

Justo encima del botón **Tempo** está el interruptor **Silencio**, para armar la secuencia sin sonido sobre una canción de fondo o un video enlazado. No detiene la reproducción: las tarjetas siguen cambiando, el mástil se sigue actualizando y el tempo se sigue aplicando; solo se calla la mezcla del Acompañamiento, acordes y percusión. Es un estado aparte del volumen, no un volumen a cero, así que al quitarlo el sonido vuelve al nivel que ya tuvieras. Silencia el Acompañamiento, no el MIDI ni el metrónomo.

- Cambiar de fuente detiene la anterior. Volver a pulsar la fuente activa no detiene.
- Plegar Acompañamiento no detiene el audio.
- Cada tarjeta dura un compás de cuatro pulsos por defecto; su selector ajusta la duración y el acompañamiento la respeta. BPM entre 30 y 240.
- Estilos: Sin ritmo, Pop / rock, Jazz suave, Trap suave, Funk, Bossa suave, Reggaetón suave, Reggae, Disco y Balada.
- Plantillas: **Mi progresión** (se guarda sola al editar las tarjetas, con la escala fantasma de cada acorde, y siempre se puede volver a elegir; si borras todas las tarjetas, la lista vacía también se conserva), jazz ii–V–I, blues de 12 compases (La y Fa con turnaround), Autumn Leaves, turnaround I–vi–ii–V, pop, balada, reggae y disco. Usarlas reemplaza las tarjetas y ajusta estilo y tempo, salvo «Mi progresión», que solo restaura las tarjetas.
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

### Testing y QA

El control de calidad de este proyecto está documentado aparte, en **[nicodelos24/portfolio-qa-string](https://github.com/nicodelos24/portfolio-qa-string)**: historias de usuario, casos de prueba, reportes de defectos y registro de ejecuciones, cada documento en CSV (tabla interactiva en GitHub), Markdown y Excel. A fecha de 2026-09-28 son 45 historias, 162 casos (114 automatizados y 48 manuales), 40 reportes y 9 ejecuciones. La carpeta `archivo-qa/` de ese repositorio guarda el histórico comprimido: capturas, evidencias, scripts de navegador y casos manuales anteriores. No hace falta abrir nada de eso para desarrollar.

Los dos repositorios se reparten el trabajo:

| | En este repositorio | En `portfolio-qa-string` |
| --- | --- | --- |
| Qué es | El código de String y sus pruebas de Node | La documentación de QA: qué se pidió, qué se probó, qué falló y en qué estado queda |
| Cómo se prueba | `npm test`, sin dependencias, en cada commit | Casos automatizados y manuales con evidencia, entorno y revisión de la aplicación |
| Qué no incluye | La revisión visual, la percepción auditiva y el instrumento real | El código de la aplicación |

Los dos repositorios editan `IA_GUIDE.md`: aquí se registra cada pedido con su implementación y sus pruebas, y en el otro la evidencia de las comprobaciones manuales. Si los dos se tocan a la vez, conviene terminar un cambio y hacer `git pull` en el otro antes de seguir, porque el archivo se edita desde los dos lados.

- [Guía del proyecto y portfolio](docs/GUIA-DEL-PROYECTO.md)
- [Revisión técnica y pendientes](docs/REVISION-TECNICA.md)
- [Ritmos y sonido](docs/RITMOS-Y-SONIDO.md)

## Próximos pasos

Completar la prueba manual y auditiva, medir rendimiento con progresiones grandes, mejorar la edición de secciones y diseñar ejemplos propios. El micrófono puede resaltar notas monofónicas y, en modo experimental, reconocer acordes simultáneos: mayores, menores, con séptima, sexta, novena, suspendidos, disminuidos, aumentados y también cuartas y sextas (11, m11, 13 y maj13). Junto al botón del micrófono aparecen dos interruptores, y solo con el micrófono encendido: «Escala en vivo» (Apagado / Nota / Acorde) decide si el mástil sigue al micrófono —en «Nota» una sola nota usa la calidad elegida y al captar un acorde se aplica el real; en «Acorde» solo los acordes captados cambian la escala— y el interruptor **Nota / Grado** decide qué se escribe en las posiciones que están sonando: el nombre de la nota (Fa#, con la grafía de la armadura de esa posición) o su grado respecto a la escala actual (1, ♭3, 5, ♭7, el mismo vocabulario del botón AA GRADOS). Ese interruptor solo escribe en las notas resaltadas por el micrófono; el resto del mástil sigue hablando con AA y MÁSTIL, y al soltar la nota cada una recupera su rótulo. Arranca en «Grado».

Cuando el micrófono reconoce un acorde, **se resaltan todas sus notas a la vez**, no solo una: de cada nota se dibuja la posición más cercana a la más grave que suena, dentro del alcance del instrumento, así que se ve la forma que estás tocando y no las mismas notas repetidas por las seis cuerdas. Mientras hay un acorde estable, la forma manda y la nota que marca el detector monofónico no se dibuja (con un acorde sonando casi nunca es la que tocas); al soltar el acorde, la nota única vuelve. El conjunto de notas se muestra cuando hay un acorde confirmado: un arpegio o un voicing que no llega a nombrarse no dibuja nada nuevo. La tarjeta «Acorde en vivo» permite añadir el acorde detectado o activar «Auto añadir». Esta fase requiere validación con instrumento real y no reemplaza una transcripción profesional.

.Actualmente me gustaría que en el mástil, cuando se utiliza el micrófono y se dibujan las notas que se captan me gustaría que el contenido (sea nota o grado) se vea mejor, ya que no se distingue bien, y quizá darle un poquito más de opacidad al dorado, que se siga notando bien el color de fondo de la nota pero que se vea un poquitito mas el dorado de la nota también

.Poder aumentar un poco la velocidad con la que se reconocen y dibujan las notas/acordes, quizá usando una "predicción" que facilite lo que se muestra, ejemplo en los acordes primero mostrar un acorde simple mayor/menor y luego poner bien que acorde se captó, más que nada al momento de dibujar en el mastil el acorde que se está captando y el que se dibuja también con la entrada de micrófono