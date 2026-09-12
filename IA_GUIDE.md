Errores actuales a corregir por pruebas manuales exploratorias de regresión

- Cambiar los colores de los acordes: raíz roja y resto verde para todos los acordes.
  - Ajuste solicitado: Acorde y Acorde 7ma ocultan las notas ajenas al acorde, incluidas sus etiquetas. En guitarra solo las raíces de las cuerdas 6, 5 y 4 son rojas; las de las cuerdas 3, 2 y 1 son verdes. Se aplica también a las cuerdas al aire. El bajo conserva sus raíces rojas.
  - Implementado en las vistas Acorde y Acorde 7ma, incluidas pentatónicas, tanto en trastes como en cuerdas al aire. Texto blanco para facilitar la lectura en ambos temas.
  - Las vistas de intervalos, tríada y séptima conservan sus colores por intervalo. Pendiente de revisión visual.

+Al colocar el switch para ver las escalas en modo de pentatónica, cuando el acorde cambia, no se muestra en la sección "Pentatonicas"(debajo de los modos de la escala) que se está seleccionando, si se muestran arriba para ver si la escala es Jonica, dorica, etc, pero abajo donde aparece pentatonica mayor y menor no se marca la que está sonando o mostrandose en el mastil actualmente.
+Tampoco se cambia la escala a pentatonica mayor o menor al seleccionar la pentatonica en esa sección

+También hay notas random que aparecen en el mastil en algunas situaciones, por ejemplo si pongo para ver la pentatonica de CMAJ7 se muestran notas random en el mastil que ni siquiera van con la escala como un F.


- Corrección adicional: las vistas Tríada, Séptima, Acorde y Acorde 7ma ahora filtran el resaltado pentatónico. Las vistas Acorde usan un color común. Solo se resaltan notas presentes: la pentatónica mayor no contiene séptima; la menor sí contiene séptima menor.
- Implementado: el selector marca la pentatónica que se muestra al cambiar de acorde o activar el switch.
- Implementado: seleccionar manualmente pentatónica mayor o menor respeta esa elección. Al seguir acordes con modos diatónicos, la vista se adapta a su calidad.
- Corregido: en la opción de nombres «escala», las notas del acorde que no pertenecen a la pentatónica ya no muestran etiquetas, tanto en trastes como en cuerdas al aire. La opción «todas» sigue mostrando todas las notas intencionalmente.
- Comprobación puntual: 22 pruebas relacionadas aprobadas. Pendiente tu confirmación visual del caso Cmaj7 y la nota F; no se da por reproducido ese caso exacto.
- Siguiente pendiente: distribución de controles de reproducción. YouTube flotante y biblioteca de canciones continúan pendientes.


+-Me gustaría reorganizar los botones de reproducir el acompañamiento, me gustaría que esa sección tenga su propio botón de reproducir y detener, pero que arriba cerca de las cartas de los acordes se muestre ese símbolo de reproducción que tiene actualmente, además me gustaría que ese "acceso directo" a reproducir tambien tenga la opción de seleccionar entre la progresion y el midi.

- Implementado: acceso junto a las tarjetas con selector Progresión/MIDI, icono reproducir/detener y tiempo MIDI.
- Acompañamiento conserva sus controles, ahora con texto visible Reproducir/Detener. Ambos accesos comparten fuente y estado, incluso con el panel plegado.
- Pendiente de tu revisión visual; puedes marcar este pedido con «+» cuando lo confirmes. No se modificaron tus marcas anteriores.


- Me gustaría reorganizar la sección de "secciones del tema" para que se vean a la derecha de las tarjetas de acordes, también como una burbuja que despliegue un menú hacia abajo

  - Implementado: burbuja a la derecha de las tarjetas en escritorio; al abrirla, las secciones y su editor se despliegan hacia abajo en una columna lateral.
  - En móvil se coloca arriba, alineada a la derecha, y abierta ocupa el ancho disponible para no comprimir los acordes.
  - Se conservan los controles, el arrastre y la animación plegable existentes. Pendiente de tu revisión visual; se mantiene sin «+».
  - Corrección posterior: las tarjetas de Intro, Verso, Estribillo, etc. ahora son filas compactas, con información a la izquierda y controles a la derecha. Los nombres largos se recortan visualmente para no ensanchar el panel.
  - La lista tiene un alto máximo de 250 px y desplazamiento interno: añadir más secciones ya no hace crecer indefinidamente el panel. Pendiente de tu revisión visual.
  - Ajuste solicitado: ahora se muestran dos tarjetas de sección por fila, cada una con aproximadamente la mitad del ancho anterior; información arriba y controles abajo, conservando el límite de altura.

- Otro error es el reproductor de youtube en modo ventana flotante, este queda abajo en la página y no se puede ni siquiera mover.



- Ahora quiero implementar un gran cambio visual en la parte del acompañamiento, me gustaría que en la seccion "secciones del tema" haya como una forma de "maximizar" esa sección, y esta se expanda ocultando la sección de las tarjetas de las progresiones, así puedo ver sólo las tarjetas de cada sección del tema como intro, verso, etc (me gustaría que cada acorde también muestre su grado o modo bajo cada acorde como en las tarjetas del acompañamiento).
Quiero que se vea lindo y las tarjetas tengan un tamaño mas parecido a las tarjetas del acompañamiento pero mas chicas asi cabe todo sin desplazar mucho la pantalla, pero aprovechando el espacio extra.

Pero además noto que hay un boton que dice "Todos los acordes" y quisiera que ese botón adapte la función de expandir la sección de las tarjetas del acompañamiento principal, entonces ahí se puedan ver los acordes ya de todo el tema también, pero más amplio, quisiera que haya una animación al desplegar y ocultar estas dos secciones.

  - Implementado: «Ampliar secciones» ocupa el ancho disponible y oculta las tarjetas principales. «Vista compacta» recupera la distribución lateral.
  - En la vista ampliada cada sección muestra sus acordes y el modo debajo de cada uno, en pequeñas tarjetas. La lista conserva un límite de altura.
  - «Todos los acordes» elimina el filtro, pliega el panel de secciones y muestra la progresión completa a ancho completo. El cambio tiene un fundido breve que respeta movimiento reducido.
  - Pendiente de revisión visual del autor; no se añade «+» automáticamente.

-Me gustaría además saber si se puede implementar algun vinculo con alguna pagina que ya muestre los acordes de canciones

  - Implementado: campo opcional «Página de acordes» en Mis progresiones y enlace «Consultar acordes». Se guarda, actualiza y viaja en los respaldos; las progresiones anteriores sin ese campo siguen siendo compatibles.
  - Es una referencia externa: no importa acordes ni tiempos automáticamente. Solo admite enlaces HTTP/HTTPS.
  - Investigación: Chordify documenta un reproductor insertable, que no equivale a una API de importación para las tarjetas de String: https://support.chordify.net/hc/en-us/articles/360002155838-How-to-embed-Chordify-on-your-website-or-blog

-De esta forma podía tener una biblioteca de canciones conocidas con sus acompañamientos. Y hasta su video de youtube con la canción original, me gustaría saber si hay forma de implementar algo así

- Averiguar más sobre la implementacion de tener canciones en una biblioteca con su video de youtube y que se puedan ver los cambios de acorde a medida que avanza la cancion, puede ser con youtube o cualquier otra cosa como el programa Nuclear que es musica libre creo

  - Implementado: YouTube → Sincronizar acordes permite marcar el acorde seleccionado en el tiempo actual del video y activar el seguimiento. Las marcas se pueden eliminar y se guardan con Mis progresiones y sus respaldos. No detecta acordes automáticamente.
  - Reordenar tarjetas conserva su vínculo; eliminar una tarjeta excluye sus marcas del seguimiento y del próximo guardado. Una tarjeta puede aparecer en distintos tiempos. Cambiar de video descarta las marcas actuales sin guardar.
  - MIDI y acompañamiento desactivan el seguimiento para evitar que dos fuentes cambien el mástil simultáneamente. Abrir una progresión recupera sus marcas, con seguimiento desactivado.
  - Pendiente de probar con un video real: marcar varios cambios, guardar, volver a abrir y adelantar/retroceder. El seguimiento consulta el tiempo cada 250 ms; no es sincronización de audio de precisión.
  - Referencia: https://developers.google.com/youtube/iframe_api_reference

- Quiero correjir esta funcionalidad porque no tiene sentido pausar el video para poner acordes, no hay una manera de conseguir que en los videos se pueda mostrar una sección donde yo coloque qué acorde va? No se puede integrar alguna IA libre o con el micrófono o algo así que detecte al menos el tiempo de la canción así luego los acordes que agrego van cambiando al ritmo de la canción del video? Y luego podría agregar esa progresión vinculada al video a una biblioteca que sirva para que varios usuarios vean eso en un futuro

