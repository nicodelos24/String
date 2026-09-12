# Plan de pruebas — String

Actualizado el 2026-09-11. Proyecto de aprendizaje desarrollado con asistencia de IA. Este plan separa la comprobación técnica de la aceptación manual y auditiva.

## Objetivo y entorno

Verificar que editar tarjetas y secciones, cambiar de vista, reproducir, importar y guardar no interfieran entre sí. Se prueba con Node.js y navegadores Chromium instalados (Chrome y Edge). La aplicación se inicia con `npm start`; el explorador y audio local también admiten `file://`. YouTube requiere HTTP.

## Capas y comandos

| Comando | Qué verifica | Límites |
| --- | --- | --- |
| `npm test` | Estructura HTML, lógica musical, metrónomo, audio, MIDI, biblioteca y validación de secciones | Dobles de DOM/audio y fixtures; no mide comodidad visual ni sonido percibido |
| `node scripts/check-interface-browser.cjs` | Integración de controles, guardado, tarjetas, secciones, MIDI, tema, tamaños móviles y regresiones de esta revisión | Chrome headless, audio silenciado, API YouTube simulada/red bloqueada; movimiento reducido para medir distribución |
| `node scripts/check-interface-browser.cjs --edge` | Mismo flujo en Edge | No equivale a Safari, Firefox ni un teléfono físico |
| `node scripts/check-view-features-browser.cjs` | Tema, iconos, pentatónica y capturas | Automatización visual; no aprobación humana del diseño |
| `node scripts/check-player-browser.cjs --rhythms --no-artifacts` | Web Audio real y análisis offline de niveles, ataques y detención | Archivo local, headless y silenciado; no escucha humana |
| `python scripts/generate-qa-current.py` | Generación y reapertura de Excel actuales | Requiere openpyxl solo para QA; no es una dependencia de la app |

Los scripts de navegador requieren permiso para lanzar procesos en entornos restringidos. Los perfiles son temporales y no usan cuentas personales. Los reportes viejos no deben sobrescribirse: usar `--no-artifacts` en el script de audio y guardar la salida de la ejecución nueva aparte.

## Cobertura y trazabilidad

| Área | Automatización | Casos manuales |
| --- | --- | --- |
| Reproducción, volumen y cancelación | tests/player, metronome y note-preview | MAN-01 a MAN-18 |
| Tema, colores, pentatónica y responsive | tests/progression; interfaz y view-features | MAN-19, MAN-20, MAN-38 |
| Fuente, iconos y paneles | interfaz; BUG-011/012/013 | MAN-21 a MAN-24 |
| MIDI: validación, tiempos y seguimiento | tests/midi-import y midi-player; interfaz | MAN-25 a MAN-27 |
| Secciones: guardar, filtrar, mover, editar y seguir | tests/sections; interfaz; BUG-010/014 | MAN-28 a MAN-32, MAN-34 |
| Biblioteca, límites y compatibilidad | tests/song-library; interfaz; BUG-009 | MAN-33 a MAN-35 |
| Ritmos y plantillas | tests/player y progression-presets | MAN-36 |
| YouTube | tests/youtube-url; API simulada en interfaz | MAN-37 |
| Carga de módulos e IDs | tests/project-structure | MAN-12 |

## Criterios de aceptación

- Suite Node y flujos automatizados declarados sin errores.
- Toda corrección tiene un caso de regresión o una inspección explícitamente identificada.
- La importación fallida conserva la biblioteca anterior.
- Una sola fuente entre MIDI y acompañamiento; la selección y la vista musical no alteran los acordes guardados.
- Las pruebas manuales se marcan aprobadas únicamente después de ejecutarlas, indicando entorno y evidencia.
- La demo no se considera validada para producción solo por tener pruebas verdes: falta escucha, dispositivos físicos, accesibilidad con lector de pantalla y video externo real.

Los resultados reales están en [RESULTADOS.md](RESULTADOS.md). Los casos y bugs actuales comparten la fuente [REVISION-ACTUAL.json](REVISION-ACTUAL.json), que genera Markdown y las planillas String. No se ha medido un porcentaje de cobertura.
