# Registro de bugs

Este registro distingue defectos encontrados de funciones pendientes. Los primeros tres se documentan retrospectivamente a partir de la revisión anterior; no se inventan capturas ni ejecuciones manuales históricas.

## BUG-001 — Armadura incorrecta para pentatónica menor

- **Severidad:** media; información musical incorrecta.
- **Reproducir en la versión anterior:** elegir A y pentatónica menor.
- **Esperado:** referencia de Do mayor, sin alteraciones.
- **Observado en el código anterior:** referencia de La mayor, tres sostenidos.
- **Causa:** ambas pentatónicas se trataban como mayor de la raíz.
- **Solución:** usar la relativa mayor para la pentatónica menor y mantener coherencia con la tonalidad interna.
- **Estado:** corregido; regresión automatizada en `pentatonic signatures use the appropriate major reference`.

## BUG-002 — Resaltado de tríada incluye séptimas y novenas

- **Severidad:** media; representación musical incorrecta.
- **Reproducir en la versión anterior:** seleccionar Fm7 de la progresión y activar tríada.
- **Esperado:** resaltar raíz, tercera y quinta del acorde.
- **Observado en el código anterior:** también se resaltaba la séptima.
- **Causa:** se consultaban todos los intervalos del acorde.
- **Solución:** limitar el resaltado a sus tres primeros componentes.
- **Estado:** corregido; regresión automatizada en `triad highlighting excludes extensions and keeps altered fifths`.

## BUG-003 — La nota no aumenta de tamaño al pasar el cursor

- **Severidad:** baja; efecto visual.
- **Reproducir en la versión anterior:** pasar el cursor sobre una nota del mástil.
- **Esperado:** aumento de escala definido por el estilo hover.
- **Observado en revisión estática:** propiedad inválida `transformm`.
- **Solución:** cambiarla por `transform`.
- **Estado:** código corregido; validación visual pendiente.

## BUG-004 — El texto del mástil promete sonido inexistente

- **Severidad:** baja; instrucción engañosa.
- **Reproducir:** leer el mensaje inicial anterior y hacer clic sobre una nota.
- **Esperado:** que el mensaje describa la acción disponible.
- **Observado:** decía «escuchar su función», pero el clic solo mostraba información textual.
- **Solución:** cambiar a «consultar su intervalo».
- **Estado:** texto corregido; comprobación manual incluida en MAN-12.

## BUG-005 — Solo suena el primer acorde y aparece un error

- **Severidad:** alta; no puedo usar la reproducción de progresiones.
- **Prioridad:** alta.
- **Entorno reportado:** abro index.html con doble clic; Chrome o Edge. Versión del navegador del usuario sin especificar.
- **Pasos:** 1. Abro la página. 2. Dejo varias tarjetas en la progresión. 3. Activo Repetir. 4. Presiono Reproducir y espero el siguiente acorde.
- **Esperado:** escuchar las tarjetas en orden y volver a la primera al terminar.
- **Observado por el usuario:** escucho un acorde suave una sola vez y aparece «No se pudo iniciar el audio. Volvé a intentar.».
- **Reproducción técnica:** Chrome 152, archivo local, modo headless. Solo se programaron tres notas del primer acorde. El diagnóstico mostró `TypeError: Illegal invocation`.
- **Causa:** setInterval y clearInterval se guardaron como métodos del reproductor y perdieron el contexto de Window. Fallaba el inicio del temporizador y también la limpieza del audio.
- **Solución:** envolver ambas llamadas para ejecutarlas desde globalThis.
- **Estado:** corregido y verificado automáticamente en Chrome y Edge; revalidación manual pendiente.
- **Regresión:** PLY-14 y scripts/check-player-browser.cjs.
- **Evidencia:** evidencia/reproductor-antes.json y evidencia/reproductor-despues.json.

## BUG-006 — El acorde se escucha demasiado suave

- **Severidad:** media; me cuesta escuchar el acompañamiento.
- **Prioridad:** media.
- **Pasos:** 1. Dejo el volumen inicial. 2. Presiono Reproducir. 3. Escucho cuánto dura el sonido.
- **Esperado:** escuchar el acorde durante el compás y poder regularlo con Volumen.
- **Observado por el usuario:** el único acorde que suena se escucha muy suave.
- **Análisis:** la envolvente anterior bajaba rápidamente hasta casi silencio. El volumen percibido también depende de la salida de audio; no se midió el equipo del usuario.
- **Solución aplicada:** aumentar el nivel normalizado y mantener un nivel sostenido antes del final del acorde.
- **Estado:** pendiente de verificación manual; PLY-15 comprueba los valores programados, no el volumen percibido.
- **Caso vinculado:** MAN-06.

## BUG-007 — No queda claro qué acorde reproduce el botón

- **Severidad:** baja; me confunde la relación entre el selector y las tarjetas.
- **Prioridad:** media.
- **Pasos:** 1. Cambio la nota o calidad en el selector. 2. No presiono añadir acorde. 3. Presiono Reproducir.
- **Expectativa reportada:** escuchar el acorde que acabo de elegir.
- **Comportamiento definido:** Reproducir toma las tarjetas desde la primera; cambiar el selector no modifica las tarjetas guardadas.
- **Observado:** el usuario reporta que no cambia el acorde al elegir otro. El fallo BUG-005 también impedía avanzar. No se confirmó un fallo separado en el cálculo de las notas.
- **Solución aplicada:** aclarar en la interfaz que se reproducen las tarjetas y que hay que usar añadir acorde para incorporar la selección.
- **Estado:** texto mejorado; comprensión pendiente de verificación manual.
- **Caso vinculado:** MAN-13. La prueba de navegador también comprueba una progresión guardada distinta.

## Funciones pendientes, no bugs

Estilos jazz/trap, guardado local, sincronización con metrónomo, reproducción de notas individuales, integración externa y automatización de navegador. Ver [guía del proyecto](../GUIA-DEL-PROYECTO.md). Se convertirían en defectos si incumplieran requisitos aceptados de una versión que afirmara incluirlas.

## Plantilla para nuevos defectos

- **ID y título:** BUG-XXX — síntoma concreto.
- **Entorno:** navegador, versión, sistema operativo y commit.
- **Precondiciones y pasos mínimos:** numerados.
- **Esperado / observado:** describir por separado.
- **Frecuencia:** siempre, intermitente, una vez; cantidad de intentos.
- **Severidad:** impacto sobre el uso. **Prioridad:** orden acordado para resolverlo.
- **Evidencia:** archivo o registro real; error de consola si existe.
- **Caso vinculado:** MAN-XX o prueba automatizada.
- **Estado:** abierto / en corrección / pendiente de verificación / cerrado.
- **Solución y verificación:** completar después de corregir y volver a probar.
