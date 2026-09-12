# Guía del proyecto y aprendizaje — String

Actualizada el 2026-09-11. String es un proyecto de portfolio desarrollado con asistencia de IA. El objetivo es comprender, revisar y demostrar el código y las pruebas, no presentar la generación automática como trabajo manual.

## Cómo está organizado

| Responsabilidad | Archivos principales |
| --- | --- |
| Notas, modos, mástil y tarjetas | app.js |
| Secciones y repeticiones | sections.js |
| Audio de acompañamiento y controles | progression-player.js, player-ui.js |
| Lectura y reproducción MIDI | midi-import.js, midi-player.js, midi-ui.js |
| Guardado, validación e importación JSON | song-library.js, song-library-ui.js |
| YouTube y enlaces admitidos | youtube-player.js, youtube-url.js |
| Interacciones y paneles | progression-interactions.js, panel-controls.js, player-disclosure.js |
| Tema y distribución adaptable | theme.js, responsive-layout.js, style.css |
| Escucha de notas y metrónomo | note-preview.js, metronome.js |
| Ejecución local | server.cjs |
| Verificación rápida | tests/; `npm test` |
| QA histórico separado | archivo-qa/ (ZIP recuperable) |

Los motores de audio y sus interfaces están separados. No hay base de datos remota: Mis progresiones usa localStorage. La clave histórica `traste.songs.v1` se conserva para no perder datos al cambiar la marca.

## Recorrido de datos

1. Las tarjetas son los acordes base. Una sección conserva referencias a esas tarjetas durante la edición.
2. Al guardar, las referencias se convierten en índices dentro de la lista completa. Se guardan nombre, repeticiones e índices únicos.
3. El acompañamiento crea una copia para reproducir. Repetir una sección expande la ejecución, no duplica las tarjetas visibles.
4. Los callbacks indican el acorde y la sección actuales, cambian el mástil y seleccionan la sección.
5. El MIDI tiene su propio tiempo y conserva el vínculo con las tarjetas importadas mientras permanece cargado.
6. Los eventos detienen MIDI y acompañamiento mutuamente. YouTube y metrónomo son independientes.
7. Las vistas pentatónica y oscura modifican la presentación, no el archivo MIDI ni las tarjetas guardadas.

## Funcionalidad implementada

- Editor de tarjetas, arrastre, duplicado y eliminación.
- Secciones con rangos, repeticiones, tarjetas propias, filtrado y reordenamiento.
- Diez estilos de acompañamiento y siete plantillas editables.
- Importación y reproducción MIDI local; sin catálogo/API MIDI activo.
- Biblioteca local con respaldo JSON y compatibilidad con progresiones sin secciones.
- YouTube embebido con transporte y modo flotante; sin sincronización de acordes.
- Tema claro/oscuro, vista pentatónica global, notas audibles y diseño adaptable.
- Pruebas Node activas; comprobaciones históricas Chrome/Edge archivadas.

## Qué sigue pendiente

La estructura de secciones ya existe. Quedan por diseñar la edición directa de nombre/repeticiones, duraciones variables, catálogo de ejemplos y marcas temporales para YouTube. También conviene medir rendimiento con progresiones grandes y separar el modelo y renderizado de app.js.

No hay integración continua ni publicación verificadas en esta revisión. Tampoco hay evaluación formal de accesibilidad completa o aceptación auditiva.

## Cómo aprender de cada cambio

Para una corrección: reproducir el problema, escribir el resultado esperado, encontrar la causa, añadir una regresión, cambiar el código y registrar la evidencia. Una prueba con un DOM simulado no demuestra que un botón se vea bien: para eso se necesitan navegador y revisión manual.

Consulta [la revisión técnica](REVISION-TECNICA.md). El plan QA y los resultados anteriores están en el [archivo de testing](../archivo-qa/README.md). En el portfolio explica qué hizo la IA, qué revisaste, qué comprobaste y qué límites siguen presentes.
