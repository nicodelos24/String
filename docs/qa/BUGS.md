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

Guardado local, sincronización con el metrónomo independiente, reproducción de notas individuales e integración externa. Los patrones básicos de estilos ya están implementados y pendientes de escucha manual. Ver [guía del proyecto](../GUIA-DEL-PROYECTO.md).

## BUG-008 — Algunas notas del acorde se escuchan más fuertes que otras

- **Severidad:** media; afecta la comodidad al escuchar el acompañamiento.
- **Prioridad:** media.
- **Origen:** prueba exploratoria del usuario del 2026-09-10.
- **Pasos reportados:** reproduzco los acordes y escucho el resultado. Las notas exactas, el tempo y el dispositivo de salida no se especificaron.
- **Esperado:** escuchar los acordes con un balance cómodo, sin notas que sobresalgan demasiado.
- **Observado por el usuario:** «Suena lindo pero hay notas que se escuchan muy fuertes y otras no tanto». También confirma que ahora se reproduce sonido.
- **Análisis:** asignar la misma ganancia no garantiza igual sonoridad percibida. Influyen la altura, los armónicos, la cantidad de notas y la salida de audio. No se confirmó una única causa acústica en el equipo del usuario.
- **Solución aplicada:** timbre con fundamental predominante y armónicos suaves; compensación moderada de agudos, normalización por energía y compresión suave de la mezcla.
- **Estado:** ajuste implementado; pendiente de revalidación auditiva del usuario. No se presenta como un balance perfecto.
- **Regresión:** MIX-01 y mediciones OfflineAudioContext en el script de navegador.
- **Caso vinculado:** MAN-18.

### Seguimiento de la prueba exploratoria anterior

El 2026-09-10 el usuario confirmó que el sonido ahora se reproduce. Esto aporta una confirmación manual del inicio de audio de BUG-005, pero no confirma por separado repetición, detención ni todos los casos MAN. El volumen y balance siguen bajo revisión mediante BUG-006 y BUG-008. Los estilos recién agregados todavía no fueron probados manualmente por el usuario.

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

## Revisión 2026-09-11

Defectos encontrados en revisión técnica, no reportes manuales inventados. Los estados siguientes se refieren a la verificación automatizada.

### BUG-009 — Respaldo exportado mayor a 2 MB no se puede importar

- **Origen:** Revisión de código y regresión automatizada; no es un reporte manual del usuario.
- **Severidad:** Alta
- **Prioridad:** Alta
- **Pasos:** Exportar biblioteca grande e intentar importarla en otra sesión.
- **Esperado:** Restaurar un respaldo válido que la app haya exportado.
- **Observado en el código revisado:** La interfaz rechazaba archivos mayores de 2 MB, aunque guardar/exportar no imponían ese límite.
- **Corrección:** Límite común de 20 MB en lectura, escritura, exportación e importación; exportación compacta.
- **Caso manual:** MAN-33
- **Regresión:** tests/song-library.test.cjs; check-interface-browser.cjs
- **Estado:** Corregido y verificado automáticamente; revalidación manual pendiente
- **Evidencia:** docs/qa/evidencia/revision-2026-09-11/ejecucion.json

### BUG-010 — El foco salta a otro acorde al ordenar una sección con teclado

- **Origen:** Revisión de código y regresión automatizada; no es un reporte manual del usuario.
- **Severidad:** Media
- **Prioridad:** Alta
- **Pasos:** Seleccionar una sección con índices no contiguos; mover acorde con Alt + flecha.
- **Esperado:** El foco permanece en el acorde que se movió.
- **Observado en el código revisado:** El selector de foco usaba el índice destino global, que corresponde a otra tarjeta cuando cambia solo el orden interno.
- **Corrección:** Conservar la identidad del acorde y buscar su índice después de mover.
- **Caso manual:** MAN-31
- **Regresión:** check-interface-browser.cjs
- **Estado:** Corregido y verificado automáticamente; revalidación manual pendiente
- **Evidencia:** docs/qa/evidencia/revision-2026-09-11/ejecucion.json

### BUG-011 — Icono de pausa para una acción que detiene y reinicia

- **Origen:** Revisión de código y regresión automatizada; no es un reporte manual del usuario.
- **Severidad:** Baja
- **Prioridad:** Media
- **Pasos:** Iniciar acompañamiento o MIDI; pulsar icono de pausa; volver a reproducir.
- **Esperado:** El icono representa detener si la próxima reproducción comienza desde cero.
- **Observado en el código revisado:** Se dibujaban dos barras de pausa aunque la etiqueta y el motor indicaban Detener.
- **Corrección:** Cuadrado de detener en MIDI y progresión; YouTube conserva pausa real.
- **Caso manual:** MAN-22
- **Regresión:** check-interface-browser.cjs; revisión de los motores
- **Estado:** Corregido y verificado automáticamente; revalidación manual pendiente
- **Evidencia:** docs/qa/evidencia/revision-2026-09-11/ejecucion.json

### BUG-012 — Pulsar la fuente activa detiene la reproducción

- **Origen:** Revisión de código y regresión automatizada; no es un reporte manual del usuario.
- **Severidad:** Media
- **Prioridad:** Media
- **Pasos:** Reproducir Progresión; volver a pulsar Progresión en el selector.
- **Esperado:** Mantener la reproducción al elegir la misma fuente.
- **Observado en el código revisado:** Cada clic emitía traste:load-song incluso sin cambiar de fuente.
- **Corrección:** Emitir detención solamente al cambiar de fuente.
- **Caso manual:** MAN-21
- **Regresión:** check-interface-browser.cjs
- **Estado:** Corregido y verificado automáticamente; revalidación manual pendiente
- **Evidencia:** docs/qa/evidencia/revision-2026-09-11/ejecucion.json

### BUG-013 — Panel reabierto con controles inactivos y foco perdido

- **Origen:** Revisión de código y regresión automatizada; no es un reporte manual del usuario.
- **Severidad:** Media
- **Prioridad:** Alta
- **Pasos:** Cerrar Crear sección con foco en Nombre; reabrir mediante cambio de open; repetir con movimiento reducido.
- **Esperado:** Devolver foco al encabezado y reactivar el contenido al abrir.
- **Observado en el código revisado:** Se aplicaba inert antes de recuperar el foco; cambios programáticos de open no restauraban inert. Una animación cancelada podía quedar registrada.
- **Corrección:** Recuperar foco antes de inert, limpiar animación cancelada y sincronizar inert en toggle.
- **Caso manual:** MAN-24
- **Regresión:** check-interface-browser.cjs
- **Estado:** Corregido y verificado automáticamente; revalidación manual pendiente
- **Evidencia:** docs/qa/evidencia/revision-2026-09-11/ejecucion.json

### BUG-014 — Secciones importadas aceptan la misma tarjeta repetida por índice

- **Origen:** Revisión de código y regresión automatizada; no es un reporte manual del usuario.
- **Severidad:** Media
- **Prioridad:** Media
- **Pasos:** Importar una sección con indices [0,0].
- **Esperado:** Rechazar referencias duplicadas; usar repeat para repeticiones.
- **Observado en el código revisado:** El validador aceptaba índices repetidos; las operaciones de edición por identidad no distinguen esas apariciones.
- **Corrección:** Validar índices únicos dentro de cada sección.
- **Caso manual:** MAN-34
- **Regresión:** tests/sections.test.cjs
- **Estado:** Corregido y verificado automáticamente; revalidación manual pendiente
- **Evidencia:** docs/qa/evidencia/revision-2026-09-11/ejecucion.json
