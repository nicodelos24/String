# Plan de pruebas

## Alcance y estrategia

Se verifica la lógica musical, la gestión de progresiones, el metrónomo y el primer reproductor de acordes. Las pruebas automatizadas usan `node:test` y `node:assert/strict`, sin instalar dependencias.

```sh
node --test tests/*.test.cjs
```

| Archivo | Nivel y alcance | Límite |
| --- | --- | --- |
| `tests/metronome.test.cjs` | Motor de metrónomo con reloj y audio simulados | No verifica altavoces ni latencia real |
| `tests/progression.test.cjs` | Lógica musical e integración de controles con DOM simulado | No verifica renderizado, foco real ni compatibilidad de navegador |
| `tests/player.test.cjs` | Motor de reproducción con reloj, temporizador y audio simulados | No escucha el timbre ni verifica Web Audio real |

Los dobles de prueba sustituyen servicios externos al código probado. Permiten adelantar el reloj sin esperar segundos reales y reproducir errores de audio. No son un navegador.

Tras el reporte BUG-005 se agregó `scripts/check-player-browser.cjs`, que abre el archivo local en Chrome o Edge real y comprueba el flujo con Web Audio. Esta comprobación usa el navegador en headless y silenciado: valida los estados y las notas programadas, sin escucha humana. PLY-14 cubre el contexto de los temporizadores y PLY-15 la envolvente de volumen.

## Requisitos y trazabilidad del reproductor

| Requisito | Criterio de aceptación | Automatización | Manual |
| --- | --- | --- | --- |
| REP-01 | Reproducir en orden las notas de los acordes guardados, incluidas extensiones | PLY-01, PLY-02, PLY-12 | MAN-01 |
| REP-02 | Un acorde cada cuatro pulsos; BPM entre 30 y 240 | PLY-02, PLY-06, PLY-13 | MAN-02, MAN-05 |
| REP-03 | Repetir al activar la opción; terminar tras el último acorde al desactivarla | PLY-02, PLY-03 | MAN-03 |
| REP-04 | Detener cancela audio pendiente; reiniciar comienza en el primer acorde | PLY-04, PLY-05, PLY-11 | MAN-04 |
| REP-05 | Volumen ajustable durante la reproducción, con silencio en cero | PLY-08, PLY-13 | MAN-06 |
| REP-06 | La ejecución mantiene una copia de la progresión sin cambiar la selección del editor | PLY-07, PLY-12 | MAN-07 |
| REP-07 | Mostrar un error recuperable si falla el audio; detener al abandonar la página | PLY-10, PLY-13 | MAN-08, MAN-09 |
| REP-08 | Tras una demora no lanzar muchos acordes juntos | PLY-09 | MAN-09 |
| REP-09 | Controles con etiquetas, foco visible y acceso por teclado | Pendiente de pruebas de navegador | MAN-10, MAN-11 |

Los identificadores PLY están en los nombres de las pruebas. Los requisitos describen comportamiento verificable; los próximos estilos musicales se definirán en requisitos nuevos.

## Ejecución registrada

Ver [RESULTADOS.md](RESULTADOS.md) para el entorno, el comando y los resultados. No marcar un caso manual como aprobado hasta ejecutarlo. Un caso bloqueado necesita indicar qué impidió probarlo.

## Criterio para presentar la demo

- Suite automatizada sin fallos.
- Casos manuales del flujo principal ejecutados con entorno y evidencia.
- Sin defectos abiertos que impidan reproducir, detener o editar la progresión.
- Limitaciones documentadas; revisión de teclado y pantalla móvil.

La publicación de la demo sigue pendiente hasta completar esas comprobaciones.
