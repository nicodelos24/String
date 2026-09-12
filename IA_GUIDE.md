Errores actuales a corregir por pruebas manuales exploratorias de regresión

## Avance: pentatónicas

- Implementado: el selector marca la pentatónica que se muestra al cambiar de acorde o activar el switch.
- Implementado: seleccionar manualmente pentatónica mayor o menor respeta esa elección. Al seguir acordes con modos diatónicos, la vista se adapta a su calidad.
- Corregido: en la opción de nombres «escala», las notas del acorde que no pertenecen a la pentatónica ya no muestran etiquetas, tanto en trastes como en cuerdas al aire. La opción «todas» sigue mostrando todas las notas intencionalmente.
- Comprobación puntual: 22 pruebas relacionadas aprobadas. Pendiente tu confirmación visual del caso Cmaj7 y la nota F; no se da por reproducido ese caso exacto.
- Siguiente pendiente: distribución de controles de reproducción. YouTube flotante y biblioteca de canciones continúan pendientes.

## Observaciones originales (conservadas)


+Al colocar el switch para ver las escalas en modo de pentatónica, cuando el acorde cambia, no se muestra en la sección "Pentatonicas"(debajo de los modos de la escala) que se está seleccionando, si se muestran arriba para ver si la escala es Jonica, dorica, etc, pero abajo donde aparece pentatonica mayor y menor no se marca la que está sonando o mostrandose en el mastil actualmente.
+Tampoco se cambia la escala a pentatonica mayor o menor al seleccionar la pentatonica en esa sección

+También hay notas random que aparecen en el mastil en algunas situaciones, por ejemplo si pongo para ver la pentatonica de CMAJ7 se muestran notas random en el mastil que ni siquiera van con la escala como un F.

-Me gustaría reorganizar los botones de reproducir el acompañamiento, me gustaría que esa sección tenga su propio botón de reproducir y detener, pero que arriba cerca de las cartas de los acordes se muestre ese símbolo de reproducción que tiene actualmente, además me gustaría que ese "acceso directo" a reproducir tambien tenga la opción de seleccionar entre la progresion y el midi.

- Otro error es el reproductor de youtube en modo ventana flotante, este queda abajo en la página y no se puede ni siquiera mover.

-Me gustaría además saber si se puede implementar algun vinculo con alguna pagina que ya muestre los acordes de canciones

-De esta forma podía tener una biblioteca de canciones conocidas con sus acompañamientos. Y hasta su video de youtube con la canción original, me gustaría saber si hay forma de implementar algo así

- Averiguar más sobre la implementacion de tener canciones en una biblioteca con su video de youtube y que se puedan ver los cambios de acorde a medida que avanza la cancion, puede ser con youtube o cualquier otra cosa como el programa Nuclear que es musica libre creo

