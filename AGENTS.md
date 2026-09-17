# Desarrollo de String

Proyecto sin build: JavaScript clásico (no módulos ES) y sin frameworks. HTML en `index.html`, estilos en `style.css`, lógica en scripts cargados por `<script>` en orden, que comparten ámbito global.

## Ejecutar y verificar

- Servir: `npm start` (`node server.cjs` en http://127.0.0.1:8000). No hace falta `npm install`: no hay dependencias de paquete.
- Pruebas: `npm test` (`node --test tests/*.test.cjs`). Cambios aislados: `node --test tests/<archivo>.test.cjs`.
- Los tests cargan `app.js`, `player-ui.js` y `progression-player.js` en un sandbox `vm` con `document` simulado. Mantener ese código libre de APIs de navegador no simuladas a nivel de arranque.
- Al añadir o quitar un script, actualizar `index.html`; `tests/project-structure.test.cjs` valida IDs únicos en el HTML y scripts sin duplicar.

## Convenciones del repo

- Responder y comentar en español neutro. Explicar brevemente qué cambió y cómo se verificó.
- No abrir ni extraer `archivo-qa/`: contiene el historial de testing comprimido. No generar reportes, Excel ni capturas de QA salvo petición explícita.
- `assets/midi/` y `midi-catalog.js` son fixtures de prueba; `midi-catalog.js` no debe cargarse en la página.
- Compatibilidad de guardado: no romper la clave `traste.songs.v1` ni el formato JSON v1 (campo opcional `sections`); respetar límites: 200 progresiones y 20 MB por respaldo.
- Cambios visuales: verificar el componente afectado, no toda la batería histórica de navegador. Actualizar el README solo si cambia el uso del proyecto.
- Priorizar el cambio solicitado y leer solo los archivos relacionados; evitar auditorías completas salvo petición explícita.
