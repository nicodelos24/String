# Estado de la detección por micrófono — String

Actualizado el 2026-09-17. Sigue el avance de la funcionalidad de [detección por micrófono](DETECCION-MICROFONO.md) y sirve de punto de partida para la próxima sesión.

## Dónde estamos

Fase 1 (monofónica) implementada de extremo a extremo: detector, envoltorio y interfaz con resaltado en el mástil. Falta la validación visual/auditiva con instrumento real y una afinación más cómoda para instrumentos por debajo de 440 Hz. La fase 2 (polifónica/acordes) tiene una primera versión experimental integrada; todavía requiere calibración con guitarra real.

## Pasos completados

| Paso | Qué | Archivos | Commit |
| --- | --- | --- | --- |
| Diseño | Documento con el plan y límites | docs/DETECCION-MICROFONO.md | 85c247a |
| 1 | Detector YIN (`detectPitch`, `findFret`, `isInTune`) | pitch-detection.js + tests | 87e549a |
| 2 | Envoltorio `MicrophoneReader` + `followStable` | microphone.js + tests | dc7144c |
| 3 | Botón, lectura y resaltado `.live` | microphone-ui.js, index.html, style.css | 7970b12 |
| Ajuste | Botón visible arriba del mástil y estilos | index.html, style.css, microphone-ui.js | 27b0ca9 |
| Ajuste | Resaltado persistente mientras la nota suena | microphone-ui.js, style.css | 982a131 |

Estado de las pruebas: `npm test` → 86/86 (detector y envoltorio cubiertos; la interfaz se valida en navegador).

## Cómo probar

1. `npm start` → http://127.0.0.1:8000 (recargar con Ctrl+Shift+R si la pestaña era vieja).
2. Pulsar **Micrófono** (arriba del mástil, a la izquierda de Aa / 1 / 🎨) y conceder permiso.
3. Tocar una nota: se ilumina dorada su(s) posición(es) en el mástil y las cuerdas al aire mientras suena; la lectura muestra p. ej. `A4 · 440 Hz` o `… (desafinado)`.

## Cosas a corregir / continuar (por prioridad)

1. **Validación con instrumento real** (pendiente del autor): precisión, latencia y confort de visual, tanto en guitarra como bajo. También probar en móvil y en Firefox/Safari.
2. **Afinación del dispositivo**: un bajo afina a 440 Hz ≈ -67 cents respecto a la referencia, por lo que las notas saldrán `desafinado`. Conviene añadir un desvío configurable (calibración) que se aplique en `detectPitch` o se descuente en `centsOf` (`pitch-detection.js`), expuesto como opción en `MicrophoneReader` y un control en la interfaz.
3. **Rango agudo**: `maxFreq` 1100 deja fuera las notas agudas de la primera cuerda (hasta D6/1175 Hz). Si se toca ahí, se pueden subir los límites; faltaría notificar cuando la nota cae fuera de banda (hoy simplemente no se detecta).
4. **Aliasing fuera de banda**: una fundamental por encima de `maxFreq` puede detectarse como su subarmónico (la autocorrelación encuentra el primer múltiplo de periodo dentro del rango). Limitación conocida; mitigar con umbral de confianza si molesta.
5. **Documentación oficial**: cuando validemos, actualizar README (sección de uso) y docs/GUIA-DEL-PROYECTO (funcionalidad implementada), siguiendo la regla de `AGENTS.md`.
6. **Fase 2 (polifónica)**: primera versión integrada en `chord-detection.js`. Usa picos espectrales, plantillas y confirmación temporal; reconoce mayores, menores, sextas, novenas, suspendidos, aumentados, disminuidos y sus variantes de séptima (ver `LIVE_CHORD_TEMPLATES`). Los empates enarmónicos (Dm7 = F6, Am6 = F#m7b5, acordes simétricos dim7/aug) se resuelven por la nota más grave que suena. La tarjeta permite añadir el acorde o activar «Auto añadir». El switch «Escala en vivo» usa el modo sugerido por la plantilla y se puede desactivar para que el mástil no cambie. Sigue pendiente la prueba con guitarra real, arpegios, cejillas, ruido y falsos positivos.

## Cómo revertir un paso

Los pasos son commits independientes y en orden. Para deshacer uno (y sus dependencias posteriores) usar `git revert` del commit correspondiente en orden inverso:
`982a131` → `27b0ca9` → `7970b12` → `dc7144c` → `87e549a` → `85c247a`.
El árbol de trabajo está limpio si no hay cambios sin commitear.