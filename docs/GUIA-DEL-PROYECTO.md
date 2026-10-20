# Guía del proyecto y aprendizaje — String

Actualizada el 2026-10-20 sobre `main` `b698f11`. String es un proyecto de portfolio desarrollado con asistencia de IA. El objetivo es comprender, revisar y demostrar el código y las pruebas, no presentar la generación automática como trabajo manual.

## Cómo está organizado

| Responsabilidad | Archivos principales |
| --- | --- |
| Notas, modos, mástil y tarjetas | app.js, progression-interactions.js |
| Secciones y repeticiones | sections.js |
| Audio de acompañamiento y controles | progression-player.js, player-ui.js |
| Lectura y reproducción MIDI | midi-import.js, midi-player.js, midi-ui.js |
| Guardado, validación e importación JSON | song-library.js, song-library-ui.js |
| YouTube y enlaces admitidos | youtube-player.js, youtube-url.js |
| Interacciones y paneles | progression-interactions.js, panel-controls.js, player-disclosure.js |
| Tema y distribución adaptable | theme.js, responsive-layout.js, mobile-tabs.js, style.css |
| Escucha de notas, micrófono y metrónomo | note-preview.js, microphone.js, microphone-ui.js, pitch-detection.js, chord-detection.js, mic-follow.js, metronome.js |
| Ejecución local | server.cjs |
| Verificación rápida | tests/; `npm test` |
| QA separado | repositorio `portfolio-qa-string`: historias, casos, defectos y ejecuciones; el histórico comprimido en su carpeta `archivo-qa/` |

Los motores de audio y sus interfaces están separados. No hay base de datos remota: Mis progresiones usa localStorage. La clave histórica `traste.songs.v1` se conserva para no perder datos al cambiar la marca.

## Recorrido de datos

1. Las tarjetas son los acordes base. Una sección conserva referencias a esas tarjetas durante la edición.
2. Al guardar, las referencias se convierten en índices dentro de la lista completa. Se guardan nombre, repeticiones e índices únicos.
3. El acompañamiento crea una copia para reproducir. Repetir una sección expande la ejecución, no duplica las tarjetas visibles.
4. Los callbacks indican el acorde y la sección actuales, cambian el mástil y seleccionan la sección.
5. El MIDI tiene su propio tiempo y conserva el vínculo con las tarjetas importadas mientras permanece cargado.
6. Los eventos detienen MIDI y acompañamiento mutuamente. YouTube puede seguir marcas de acordes guardadas; no analiza el audio ni sustituye el tiempo del MIDI. El metrónomo sigue siendo independiente.
7. Las vistas pentatónica y oscura modifican la presentación, no el archivo MIDI ni las tarjetas guardadas.

## Funcionalidad implementada

- Editor de tarjetas, arrastre, duplicado y eliminación; ↑/↓ recorre tarjetas enfocadas y Supr las elimina con las guardas de foco y candado.
- Secciones con rangos, repeticiones, tarjetas propias, filtrado y reordenamiento.
- Diez estilos de acompañamiento y un catálogo ampliado de plantillas editables. Cuatro descripciones musicales del catálogo están marcadas como defecto de contenido (`T-10`): no se consideran validadas hasta decidir si se corrige el rótulo o los acordes.
- Importación y reproducción MIDI local; las duraciones de acordes importados pueden conservar el tiempo real del archivo. El catálogo/API MIDI no se carga en la página.
- Biblioteca local con respaldo JSON y compatibilidad con progresiones sin secciones.
- YouTube embebido con transporte, modo flotante, marcas manuales por acorde y generación de marcas desde BPM; no reconoce ni analiza el audio del video.
- Tema claro/oscuro, vista pentatónica global, teclado expandible, pestañas móviles, notas audibles, afinador y diseño adaptable.
- Micrófono para nota, acorde experimental, rótulo Nota/Grado, marcar BPM con notas y entrar a la reproducción al tocar.
- Pruebas Node activas, tres aserciones CSS contra regresiones conocidas y flujo de integración continua en GitHub Actions (Node 20, `npm test`). Ninguna sustituye la revisión visual, auditiva o con instrumento real.

## Qué sigue pendiente

La estructura de secciones ya existe. Quedan por diseñar la edición directa de nombre/repeticiones, medir rendimiento con progresiones grandes y separar el modelo y renderizado de `app.js`. También están pendientes la validación de la legibilidad real con guitarra y micrófono, resolver los contrastes que la auditoría dejó abiertos y corregir las cuatro descripciones del catálogo que no coinciden con sus acordes.

La integración continua está configurada en `.github/workflows/tests.yml` y ejecuta `npm test` en cada push a `main` y pull request. La publicación y el estado de GitHub se verifican desde el repositorio remoto. No hay todavía una evaluación de accesibilidad completa ni aceptación auditiva con instrumento real.

## Cómo aprender de cada cambio

Para una corrección: reproducir el problema, escribir el resultado esperado, encontrar la causa, añadir una regresión, cambiar el código y registrar la evidencia. Una prueba con un DOM simulado no demuestra que un botón se vea bien: para eso se necesitan navegador y revisión manual.

Consulta [la revisión técnica](REVISION-TECNICA.md). El plan QA y los resultados están en el repositorio [`portfolio-qa-string`](https://github.com/nicodelos24/portfolio-qa-string), en sus historias de usuario, casos de prueba, reportes de defectos y registro de ejecuciones; el histórico comprimido anterior está en su carpeta `archivo-qa/`. En el portfolio explica qué hizo la IA, qué revisaste, qué comprobaste y qué límites siguen presentes.
