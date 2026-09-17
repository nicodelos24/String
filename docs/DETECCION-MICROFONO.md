# Detección por micrófono en tiempo real — diseño

Fecha: 2026-09-17. Estado: **pasos 1–3 (fase 1 monofónica) implementados**; la validación con instrumento real y navegador queda pendiente. La fase 2 (polifónica) es futura. Ver el detalle de avance en [ESTADO-DETECCION-MICROFONO.md](ESTADO-DETECCION-MICROFONO.md). El objetivo es resaltar en el mástil, en tiempo real, la nota que el usuario toca con el instrumento, para improvisar viendo qué está sonando mientras se estudia la escala.

## Objetivo y límites del alcance (fase 1)

- Detección **monofónica**: una nota a la vez. La improvisación usual sobre una escala toca líneas de una sola voz.
- El detector **no cambia** la raíz (`root`), el acorde (`chordType`), el modo (`selectedMode`) ni la escala: solo resalta notas y muestra un indicador. Convive con las vistas actuales.
- El reconocimiento de **acordes simultáneos es fase 2**: requiere análisis armónico y plantillas de acorde, y es notablemente menos fiable con micrófono de portátil. No se promete en la primera versión.

## Cómo encaja en la arquitectura actual

- `app.js` concentra estado y render: `root`, `chordType`, `selectedMode`, `instrument`, `pentatonicView`, etc. `updateView()` repinta piano, leyendas, mástil y tarjetas.
- Cada nota del mástil es un `<span>` con `data-midi` (clases `.fret-note` / `.open-string-note`), generado por `renderFretboard()` y `renderOpenStrings()` (`app.js:612`, `app.js:719`).
- Los "motores" externos (progresión, MIDI, video) cambian el mástil publicando su estado, no tocando el render: `midi-ui.js:19` llama `showProgressionChord(...)` y `video-sync.js` usa `playingProgressionItem` + `renderProgression()`. El micrófono debe seguir ese patrón: un módulo que publica notas; un listener repinta el resaltado.
- Patrón de módulo del repo (ver `midi-player.js`, `video-sync.js`, `note-preview.js`): funciones puras usables en Node, `if (typeof module !== 'undefined') module.exports = {...}` para `npm test`, y `if (typeof document !== 'undefined') (() => {...})()` para el cableado en navegador. Todos los scripts se cargan como `<script>` clásico en `index.html`, en orden; no hay módulos ES ni npm install.
- Cada subsistema de audio (metrónomo, NotePreview, MidiPlayer, ProgressionPlayer) crea su `AudioContext` de forma perezosa e independiente (`metronome.js:3`, `note-preview.js:3`, `midi-player.js:2`, `progression-player.js:50`). No hay un contexto global compartido; el micrófono puede crear el suyo o reutilizar uno ya abierto.

## Diseño propuesto

### 1. Nuevo módulo `pitch-detection.js` (fase corazón, testeable)

- `detectPitch(timeData, sampleRate)` → `{ midi, cents } | null`.
  - Rango de canto configurable; por defecto ~41–1100 Hz (E1–C6), que cubre el registro habitual de estudio en bajo (hasta E1) y guitarra. Los trastes agudos de la primera cuerda quedan por encima (hasta D6/1175 Hz) y pueden ampliar el rango; notificar cuando la nota quede fuera.
  - Algoritmo de autocorrelación (ACF2+ o variante YIN) sobre datos de dominio temporal; sin dependencias externas.
  - Tolerancia de afinación: considerarla válida solo si el pico queda a menos de ~40 cents de la nota más cercana. Fuera de ese rango se reporta «desafinado» y no se ilumina.
- Histeresis: repetir la misma nota ~60–80 ms estables (varias ventanas consecutivas con ±30 cents) antes de publicarla, para evitar parpadeo por ruido y vibrato.
- `findFret(midi, instrument)` → `[{ string, fret }]`: posiciones en el mástil donde puede tocarse esa nota (la de traste más bajo o la posición más cercana), usando `instruments[instrument].strings` (`app.js:4`). Iluminar 1–2 posiciones.
- Exportar estas funciones por `module.exports` para poder probarlas en `node --test` con arrays sintetizados.

### 2. Envoltorio de micrófono

- `navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })`. Los `false` importan: el procesamiento del navegador distorsiona la afinación.
- `AudioContext` (propio o reutilizado) + `createMediaStreamSource` + `AnalyserNode` (`fftSize=2048`, ~23 Hz de resolución a 48 kHz) + `getFloatTimeDomainData`.
- Lazo con `requestAnimationFrame` o `setInterval` a ~30–60 fps mientras esté activo. Análisis barato: no re-hacer bucles por cada frame innecesarios.
- Estados: inactivo → pidiendo permiso → activo → pausado; `stop()` corta los `track.stop()` del stream y desconecta los nodos. En `pagehide`, apagar.

### 3. UI y resaltado

- Botón/interruptor (junto al área de escucha del mástil) para activar el micrófono, más un indicador de nota detectada («A3 · 220 Hz», y «desafinado» cuando aplique).
- Al detectar una nota: añadir `class="… live"` a los `[data-midi="${midi}"]` del mástil y de las cuerdas al aire; retirarlo tras ~400–600 ms si la nota no se repite (efecto pulso).
- CSS `.live` en `style.css`: resaltado brillante que no confundir con los colores por intervalo; respetar `prefers-reduced-motion`.
- Al activar el micrófono, no es obligatorio silenciar el resto de audio; la práctica recomendada es no tener acompañamiento ni escucha sonando a la vez (realimentación). No se detiene automáticamente nada.

### 4. Integración

- Añadir el nuevo script a `index.html` en orden; `tests/project-structure.test.cjs` exige IDs únicos y scripts que existan y no estén duplicados.
- `tests/` nuevos: probar `detectPitch` con ondas seno sintetizadas (440 Hz → A4/MIDI 69; silencio → `null`; seno con ruido), `findFret` y límites del rango. Sin dependencias extra: son `node --test` puros.

## Límites y honestidad

- Fase 1 es monofónica: los acordes de varias notas no se identificarán de forma fiable con autocorrelación.
- La precisión depende del micrófono y la sala; un portátil de consumo y ruido de fondo reducen la fiabilidad. `autoGainControl: false` ayuda pero no garantiza.
- El seguimiento por micrófono comparte la pantalla con las vistas existentes y no deduce qué acorde tocar a continuación: es una ayuda visual, no un evaluador.
- Permisos y contexto seguro: `getUserMedia` requiere `https` o `localhost`; el servidor local (`npm start`, `127.0.0.1`) ya es contexto seguro. Con `file://` no funciona.
- No se añade ninguna librería ni dependencia de paquete: todo es `AudioContext`/`AnalyserNode` nativo + JS propio.

## Cómo se verifica

- Automático: `npm test` con las nuevas pruebas de `pitch-detection.js` y regresión de `tests/`.
- Manual en navegador: activar micrófono y tocar cuerdas al aire (E A D G B e), comprobar que el mástil ilumina la nota correcta y el indicador la nombra; probar desafinación y silencio. Lo visual/auditivo no lo cubren las pruebas Node.

## Pasos sugeridos de implementación

1. `pitch-detection.js` con el detector puro + `findFret` y sus pruebas (`node --test tests/pitch-detection.test.cjs`).
2. Envoltorio de micrófono (permisos, stream, AnalyserNode, estados, limpieza).
3. UI (interruptor, indicador) y resaltado `.live` en `style.css`.
4. Añadir el script a `index.html` y revisión visual con instrumento real.
5. Fase 2 (opcional): esqueleto de detección polifónica y plantillas de acordes.

No forma parte de la aplicación durante el desarrollo: se trata de un documento de diseño para una funcionalidad futura.