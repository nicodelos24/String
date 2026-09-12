# Ritmos y sonido

Actualizado el 2026-09-11. Los resultados históricos de niveles están en QA; las comprobaciones automáticas no sustituyen la escucha humana.

## Qué se agregó

Ahora puedo elegir un acompañamiento antes de reproducir. Cada tarjeta sigue durando cuatro negras. El selector cambia cuándo atacan los acordes y qué golpes de batería se programan; no agrega séptimas ni cambia las notas guardadas.

| Estilo | Acordes | Percusión |
| --- | --- | --- |
| Sin ritmo | Un acorde sostenido por compás | Ninguna |
| Pop / rock | Ataques en los pulsos 1 y 3 | Bombo, caja en 2 y 4, hi-hat en corcheas |
| Jazz suave | Tres ataques con una anticipación con swing | Patrón suave con hi-hats desiguales, inspirado en swing |
| Trap suave | Acorde largo | Bombo sincopado, caja en el tercer pulso y hi-hats en semicorcheas |
| Funk | Cinco ataques cortos y sincopados | Bombo sincopado, caja y hi-hats subdivididos |
| Bossa suave | Cuatro ataques con anticipaciones | Bombo, caja y hi-hats en corcheas |
| Reggaetón suave | Cuatro ataques alternando duración | Patrón simplificado inspirado en dembow |
| Reggae | Acordes cortos en contratiempos | Bombo/caja en el tercer pulso e hi-hats en contratiempos |
| Disco | Cuatro ataques de acorde | Bombo en cada pulso, caja en 2 y 4 |
| Balada | Acorde sostenido | Patrón espaciado de bombo, caja e hi-hats |

Son patrones sintetizados simples para estudiar. No son una simulación completa de cada género, ni una grabación de músicos. No se agregó bajo ni generación automática de canciones.

Lo anterior se refiere al acompañamiento: la escucha individual del mástil sí tiene un timbre sintetizado de bajo tipo slap y otro de guitarra. El piano usa una onda triangular. La reproducción de notas respeta silencio en cero y cancela la voz anterior.

MIDI tiene su propio motor y respeta los tiempos del archivo. Se detiene mutuamente con el acompañamiento. Ambos muestran un cuadrado para detener y reinician desde el comienzo; solo YouTube ofrece pausa reanudable. Las secciones expanden el orden del acompañamiento sin duplicar tarjetas ni cambiar los tiempos del MIDI.

## Cómo probarlo

1. Armo la progresión con las tarjetas.
2. Elijo un estilo, BPM y Repetir antes de iniciar.
3. Decido si quiero Percusión. Aunque la desactive, el estilo sigue cambiando los ataques de los acordes.
4. Reproduzco y ajusto Volumen general o Volumen percusión.
5. Detengo antes de cambiar de estilo.

La batería comparte el reloj del reproductor. El metrónomo anterior continúa siendo independiente. Los cambios a las tarjetas entran en la próxima reproducción.

## Cómo funciona el código

`accompanimentStyles` guarda posiciones medidas en negras, desde 0 hasta menos de 4. Por ejemplo, una caja en `[1, 3]` corresponde a los pulsos musicales 2 y 4. El código cuenta desde cero.

`scheduleBar()` transforma posiciones a segundos con `60 / BPM`, y programa acordes y percusión desde el mismo comienzo de compás. Se prepara el compás completo al acercarse su inicio; todos los nodos quedan registrados para poder cancelarlos con Detener.

El bombo es una onda sinusoidal que baja de frecuencia. La caja y el hi-hat usan ruido filtrado y una envolvente corta. El control de percusión regula un canal que luego entra al volumen general.

## Qué se cambió en los acordes

El usuario confirmó que la reproducción ya funciona, pero reportó notas con volúmenes desiguales. La nueva síntesis usa una fundamental predominante y armónicos suaves. `chordLevels()` compensa moderadamente los agudos y normaliza la suma de ganancias al cuadrado, para que agregar notas al acorde no lo vuelva mucho más débil. Un compresor suave controla picos de la mezcla.

Una misma energía eléctrica no garantiza una misma sonoridad percibida. El balance final también depende de la nota, los altavoces y la escucha. Por eso BUG-008 queda pendiente de revalidación manual.

## Cómo se verifica

- RIT-01 a RIT-06: posiciones rítmicas, BPM compartido, desactivación de percusión, volúmenes independientes, estilos inválidos y controles.
- MIX-01: normalización entre acordes de distinta cantidad de notas y compensación moderada de agudos.
- La comprobación de audio en Chrome/Edge está en el [archivo histórico de QA](../archivo-qa/README.md). Para ejecutarla, primero recupera sus scripts siguiendo esas instrucciones.
- La prueba OfflineAudioContext renderiza 12 tríadas y tres patrones, mide energía RMS y picos, y comprueba silencio después del final. Son mediciones técnicas, no una escucha humana ni una garantía de sonoridad idéntica.
- MAN-14 a MAN-18: aceptación manual de ritmo, volumen y balance. Pendientes hasta que el usuario los ejecute.
