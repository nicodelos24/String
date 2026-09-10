# Casos de prueba manuales

## Preparación

Abrir el `index.html` de la raíz en un navegador moderno. Recargar antes de cada caso salvo indicación contraria. La progresión inicial es C, Fm7, G7, C. Usar volumen moderado y dejar detenido el metrónomo, que es independiente. Registrar navegador y versión, sistema operativo, fecha y revisión de Git.

Los casos formales siguen **pendientes de ejecución manual**. Hay un reporte exploratorio del usuario vinculado a BUG-005/006/007 y verificaciones automatizadas registradas por separado. La columna Esperado no es un resultado observado.

| ID | Pasos | Esperado |
| --- | --- | --- |
| MAN-01 | Presionar Reproducir con los valores iniciales. Escuchar una vuelta. | Se oyen cuatro acordes en orden C, Fm7, G7, C. El texto muestra nombre y posición. El mástil conserva su selección. |
| MAN-02 | Elegir 120 BPM, desactivar Repetir e iniciar. Medir cambios con un cronómetro o grabación. | Cambios aproximadamente cada 2 s; una vuelta ocupa 8 s más el pequeño margen de inicio. Registrar desvíos perceptibles sin asumir precisión del cronómetro. |
| MAN-03 | Desactivar Repetir y completar la vuelta. Activarlo e iniciar otra vez. | Primero termina solo tras el cuarto acorde. En la segunda ejecución vuelve al primer acorde y sigue hasta Detener. |
| MAN-04 | Iniciar, detener a mitad del primer acorde, esperar y reiniciar. Repetir con clics rápidos. | No sigue sonando después de Detener. No aparecen reproducciones superpuestas. Reinicia en C. |
| MAN-05 | Probar 29, 241 y campo vacío al iniciar. Luego probar 30 y 240. | Los valores inválidos impiden iniciar con validación visible. Ambos límites válidos funcionan. BPM y Repetir están deshabilitados durante la ejecución y se habilitan al detener. |
| MAN-06 | Iniciar y llevar volumen a 0; después a 35 y a 100. | Cero silencia el acorde en curso; al subir vuelve el sonido si sigue dentro de su duración. No se reinicia la progresión. Anotar distorsión o chasquidos si se perciben. |
| MAN-07 | Iniciar; añadir un acorde y eliminar otro mientras suena. Seleccionar otra tarjeta. Detener e iniciar. | La primera ejecución conserva la secuencia original. La siguiente usa los cambios. No se modifica automáticamente la selección del editor. |
| MAN-08 | En un entorno donde se pueda bloquear Web Audio, impedir su activación e iniciar. Restaurar disponibilidad y reintentar. | Aparece un error comprensible y los controles vuelven a estar disponibles. Tras restaurar el audio permite reintentar. Si no se puede provocar el error, registrar Bloqueado, no Aprobado. |
| MAN-09 | Reproducir, navegar a otra página y volver. Luego iniciar y dejar la pestaña en segundo plano antes de regresar. | Al abandonar la página se detiene. Al regresar de una demora no suenan muchos acordes juntos. El segundo plano puede suspender audio según navegador; registrar el comportamiento. |
| MAN-10 | Usar solo Tab, Shift+Tab, Espacio, Enter y flechas para recorrer controles, iniciar, ajustar volumen y detener. | Foco visible, orden comprensible, controles operables y etiquetas identificables. |
| MAN-11 | Abrir a 360 px de ancho y en escritorio. Recorrer reproductor y mástil. | Los controles se acomodan y siguen siendo utilizables. El desplazamiento horizontal del mástil no impide acceder al reproductor. |
| MAN-12 | Con el reproductor detenido: cambiar instrumento, raíz, modo, grados y notas; editar progresión; iniciar y detener el metrónomo. | Las funciones anteriores siguen disponibles. Ningún error nuevo en consola. |
| MAN-13 | Cambio raíz y calidad, leo la ayuda y presiono añadir acorde. Detengo y vuelvo a reproducir. | Se reproducen las tarjetas desde la primera y se incluye el acorde añadido. Cambiar solo el selector no reemplaza la progresión guardada. |
| MAN-14 | Con la misma progresión y BPM, pruebo Sin ritmo, Pop / rock, Jazz suave y Trap suave, deteniendo antes de cambiar. | Sin ritmo toca acordes sin batería. Pop tiene pulso recto; Jazz tiene swing; Trap tiene hi-hats más rápidos y caja a medio tiempo. Cambia el acompañamiento, no la identidad de los acordes. |
| MAN-15 | Elijo Pop / rock y desactivo Percusión antes de reproducir. Después repito con Percusión activada. | Sin percusión quedan los ataques rítmicos de los acordes. Al activarla se agregan bombo, caja y hi-hat. |
| MAN-16 | Reproduzco Trap suave. Bajo Volumen percusión a cero y lo vuelvo a subir. Después bajo Volumen general a cero. | El primer control silencia solo la batería; los acordes continúan. El volumen general silencia toda la mezcla. No se reinicia la secuencia. |
| MAN-17 | Reproduzco cada estilo con Repetir activado, dejo pasar una vuelta y presiono Detener. | La percusión sigue el compás de los acordes, vuelve con la progresión y no quedan golpes pendientes después de Detener. |
| MAN-18 | Con Sin ritmo y el mismo volumen, comparo acordes de distintas raíces y los acordes con séptima guardados. Anoto los acordes o notas que sobresalen, BPM, navegador y auriculares o altavoces. | El balance resulta cómodo y no percibo distorsión. Si alguna nota sobresale, registro cuál y con qué configuración para reabrir la investigación de BUG-008. |

## Plantilla de ejecución

Copiar una fila por caso a un registro nuevo, por ejemplo `ejecucion-AAAA-MM-DD.md`:

| Caso | Entorno/revisión | Resultado observado | Estado | Evidencia | Bug |
| --- | --- | --- | --- | --- | --- |
| MAN-01 | Completar | Completar después de probar | Pendiente / Aprobado / Fallido / Bloqueado | Ruta a captura, grabación o notas | BUG-XXX si corresponde |

Una captura muestra estados visuales; una grabación con audio ayuda a documentar reproducción y tiempos. No adjuntar información privada. Si falla un caso, registrar pasos mínimos, esperado y observado en el [registro de bugs](BUGS.md).
