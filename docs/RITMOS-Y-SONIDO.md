# Ritmos y sonido — segunda etapa

## Qué se agregó

Ahora puedo elegir un acompañamiento antes de reproducir. Cada tarjeta sigue durando cuatro negras. El selector cambia cuándo atacan los acordes y qué golpes de batería se programan; no agrega séptimas ni cambia las notas guardadas.

| Estilo | Acordes | Percusión |
| --- | --- | --- |
| Sin ritmo | Un acorde sostenido por compás | Ninguna |
| Pop / rock | Ataques en los pulsos 1 y 3 | Bombo, caja en 2 y 4, hi-hat en corcheas |
| Jazz suave | Tres ataques con una anticipación con swing | Patrón suave con hi-hats desiguales, inspirado en swing |
| Trap suave | Acorde largo | Bombo sincopado, caja en el tercer pulso y hi-hats en semicorcheas |

Son patrones sintetizados simples para estudiar. No son una simulación completa de cada género, ni una grabación de músicos. No se agregó bajo ni generación automática de canciones.

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
- `node scripts/check-player-browser.cjs --rhythms`: controles y fuentes de audio reales en Chrome. Agregar `--edge` para Edge.
- La prueba OfflineAudioContext renderiza 12 tríadas y tres patrones, mide energía RMS y picos, y comprueba silencio después del final. Son mediciones técnicas, no una escucha humana ni una garantía de sonoridad idéntica.
- MAN-14 a MAN-18: aceptación manual de ritmo, volumen y balance. Pendientes hasta que el usuario los ejecute.
