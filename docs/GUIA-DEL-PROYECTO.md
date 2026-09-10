# Guía de aprendizaje y portfolio

## Objetivo

Construir una herramienta para estudiar escalas y practicar sobre progresiones, y poder explicar cómo se desarrolló y verificó. Este repositorio puede mostrar trabajo de frontend, pruebas automatizadas y testing manual, con evidencia concreta de tus habilidades.

## Etapas pequeñas

| Etapa | Entregable | Qué aprender | Estado |
| --- | --- | --- | --- |
| 1 | Reproductor local: acordes, BPM, volumen, repetición | Web Audio, asincronía, separación entre lógica e interfaz, pruebas con dobles | Implementado; usuario confirma inicio de audio; aceptación completa pendiente |
| 2 | Primera ejecución manual y corrección de defectos encontrados | Casos de prueba, evidencia, severidad, regresión | Reportes exploratorios registrados; casos formales pendientes |
| 3 | Patrones Pop / rock y Jazz suave | Eventos rítmicos, swing, pruebas de tiempos | Implementados; aceptación manual pendiente |
| 4 | Patrón Trap suave y mezcla | Percusión, subdivisiones y normalización de niveles | Implementado sin bajo; aceptación manual pendiente |
| 5 | Guardado de progresiones y ajustes | Almacenamiento local, validación y recuperación de datos | Pendiente |
| 6 | Pruebas de navegador y ejecución automática en GitHub | E2E y CI | Comprobación básica de audio en Chrome/Edge incorporada tras BUG-005; ampliar pruebas y agregar CI sigue pendiente |
| 7 | Demo publicada y caso de estudio | Presentación del trabajo y decisiones técnicas | Pendiente |

Cada etapa debe poder demostrarse antes de comenzar la siguiente. Los estilos serán patrones programados, con parámetros y límites explícitos; la app no genera canciones con IA.

## Paso 1: cómo funciona el reproductor

1. `app.js` mantiene la progresión: raíz y tipo de cada acorde.
2. `player-ui.js` lee esos datos al presionar Reproducir y construye las notas de cada acorde.
3. `chordToMidi()` coloca las notas en un registro ascendente. Por ejemplo, Do mayor es `[48, 52, 55]`. Una novena se coloca encima de la séptima.
4. `midiToFrequency()` convierte cada número MIDI a una frecuencia. Se usa MIDI como numeración; no se genera un archivo MIDI.
5. `ProgressionPlayer` programa osciladores de Web Audio. Un oscilador produce un tono; varias notas simultáneas forman el acorde. Una envolvente de volumen suaviza el inicio y el final.
6. El motor revisa el reloj de audio cada 25 ms. Cuando faltan menos de 100 ms para el próximo compás, programa sus ataques de acordes y percusión con `AudioContext.currentTime`.
7. Los callbacks `onChord` y `onState` actualizan el texto y los controles. El motor no consulta el HTML.

Con 120 BPM, un pulso dura `60 / 120 = 0,5 segundos`. Cada acorde ocupa cuatro pulsos: dos segundos. Detener cancela el sonido y el temporizador; la próxima ejecución empieza por el primer acorde.

El motor copia la progresión para que editarla durante la reproducción no altere los eventos en curso. Un contador de ejecución evita un inicio tardío si se presiona Detener mientras se activa el audio.

### Límites de la primera etapa (histórico)

La segunda etapa agrega ritmos y mejora la síntesis. Ver [Ritmos y sonido](RITMOS-Y-SONIDO.md) para el funcionamiento actual.

- Sonido sintetizado sencillo, sin muestras de guitarra, piano o instrumentos reales.
- Cuatro pulsos por acorde; todavía no hay patrones de estilo, percusión ni duraciones individuales.
- BPM y repetición se eligen antes de iniciar; el volumen puede cambiar durante la reproducción.
- El metrónomo y el reproductor son independientes y no están sincronizados.
- El acorde que suena se indica por texto; no cambia automáticamente la selección ni la escala del mástil.
- No reproduce las notas individuales al tocar el mástil.

## Música externa: decisión para otra etapa

Reproducir una canción existente puede servir para practicar, pero no interpreta la progresión creada en Traste. La opción inicial a evaluar es pegar un enlace de YouTube y mostrar su reproductor oficial. La documentación de [IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) permite incrustar y controlar videos; un [iframe básico](https://developers.google.com/youtube/player_parameters) usa el identificador del video, sin implementar acceso a una cuenta.

Eso no equivale a vincular una biblioteca de YouTube Music. No se confirmó una API oficial específica para esa integración en la documentación consultada. La [YouTube Data API](https://developers.google.com/youtube/v3/getting-started) requiere configuración de proyecto y autorización para operaciones sobre datos de usuario. No está implementada en esta etapa.

Antes de agregar un embed, probar disponibilidad del video, errores y comportamiento desde una demo servida por HTTP/HTTPS. Mantener el reproductor oficial visible y respetar sus controles. No diseñar la función como extracción de audio.

## Cómo convertirlo en un portfolio que puedas defender

- Explicar el problema: visualizar escalas y escuchar una progresión para practicar.
- Mostrar una demo breve con una tarea real, incluyendo un caso de error bien manejado.
- Enlazar requisitos, pruebas y bugs desde el README. Registrar versiones del entorno y evidencia real de las ejecuciones manuales.
- Hacer commits pequeños con propósito: por ejemplo, `feat: reproducir progresiones con Web Audio` o `test: evitar inicio tardío después de detener`. Los cambios de esta etapa aún no se confirmaron en un commit.
- Escribir un caso de estudio: problema, decisión técnica, alternativa considerada, prueba que encontró un fallo, solución y límite pendiente.
- Explicar qué implementaste, qué hiciste con asistencia y cómo lo verificaste. Poder modificar y explicar una función vale más que enumerar tecnologías.
- No presentar pruebas simuladas como E2E ni afirmar cobertura total porque la suite pasa. No hay todavía una medición de cobertura ni una demo publicada por esta tarea.

## Tu siguiente ejercicio

Ejecutar MAN-01 a MAN-04 de [los casos manuales](qa/CASOS-MANUALES.md), registrar resultados y anotar cómo suena el timbre. Después, explicar con tus palabras por qué a 120 BPM cada acorde dura dos segundos y por qué Detener debe cancelar también los sonidos programados.

Los patrones ya están implementados. El siguiente ejercicio es ejecutar MAN-14 a MAN-18 y anotar qué estilo y notas escuchaste. Conviene mantener la misma progresión y el mismo volumen al comparar, para cambiar una sola variable por vez.
