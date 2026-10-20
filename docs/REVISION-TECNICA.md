# Revisión técnica — base histórica del 2026-09-11

Base inspeccionada: `4aee85c` más los cambios locales de esta revisión. Trabajo realizado con asistencia de IA. Es una revisión de código y regresiones de los flujos existentes; no garantiza ausencia total de defectos.

## Estado validado el 2026-10-20

Base actual: `main` `b698f11`, sincronizada con `origin/main`. Esta sección actualiza el
estado sin reescribir el registro histórico de la revisión del 11/09.

- La suite `npm test` pasa completa sin dependencias de paquete. Abarca lógica musical, MIDI,
  guardado, secciones, estructura HTML y tres regresiones de CSS que se pueden comprobar como
  texto.
- Hay integración continua en `.github/workflows/tests.yml`: ejecuta `npm test` con Node 20 en
  cada push a `main` y en pull requests.
- La revisión visual de QA en Chromium, a 1440 px y 375 px, no detectó regresiones estáticas en
  las rondas integradas de consolidación CSS (`T-05`) ni en la fuente de Tempo (`DEF-02`). La
  comprobación no cubre el halo con el micrófono realmente activo: permanece en validación manual
  (`T-03` y `DEF-01`).
- La estructura se dividió en archivos por dominio, pero `app.js` continúa concentrando datos
  musicales, estado y renderizado. Su extracción gradual sigue siendo `T-01`; no es seguro
  reordenarlo en una sola ronda.
- El catálogo ampliado de plantillas funciona, pero cuatro descripciones musicales no coinciden
  con los acordes que cargan (`T-10`). Es un defecto de contenido pendiente de decisión, no una
  regresión que se deba ocultar con una prueba.
- La auditoría de contraste corrigió dos textos invisibles en oscuro y el relevo de movimiento
  reducido de `.workspace`; conserva hallazgos abiertos en los grados del mástil, `--muted`,
  `--rust` y el número de octava en oscuro. Ver `AUDITORIA-CONTRASTE.md`.

## Alcance de la revisión histórica

Las correcciones y conclusiones que siguen describen la fotografía de `4aee85c`. Para el
estado vigente se aplica la actualización anterior y el backlog coordinado del proyecto.

## Correcciones de esta revisión

| ID | Problema | Cambio |
| --- | --- | --- |
| BUG-009 | Exportación permitía respaldos que la interfaz rechazaba por superar 2 MB | Límite común de 20 MB, exportación compacta e importación con validación antes de escribir |
| BUG-010 | Foco incorrecto al mover un acorde dentro de una sección filtrada | Se conserva la identidad del acorde para recuperar el foco |
| BUG-011 | Pausa visual para motores que realmente detienen | Icono cuadrado en MIDI/acompañamiento; pausa real sigue en YouTube |
| BUG-012 | Elegir la fuente ya activa detenía la música | Se detiene únicamente al cambiar de fuente |
| BUG-013 | Panel reabierto podía conservar controles inert y perder foco | Recuperación de foco antes de inert; limpieza de animaciones; sincronización en toggle |
| BUG-014 | Índices duplicados en secciones importadas ambiguaban la edición | Validación de índices únicos; repeticiones mediante repeat |

Los pasos, severidad, casos y evidencia se registran en BUGS.md, dentro del archivo histórico de QA del repositorio `portfolio-qa-string` (carpeta `archivo-qa/`). Las correcciones anteriores de límite de tarjetas y silencio de notas siguen cubiertas por pruebas.

## Duplicaciones y código histórico

- No se encontraron funciones nombradas duplicadas dentro de cada archivo JavaScript raíz en la inspección estática realizada.
- Se retiraron fragmentos HTML comentados de interfaces anteriores y estilos del catálogo MIDI retirado.
- Una prueba verifica IDs HTML activos únicos, scripts no repetidos y existencia de sus archivos.
- `version 1.0/` es una copia histórica no cargada por la aplicación; no se modificó.
- `midi-catalog.js` contiene metadatos de fixtures usados en pruebas; no es una API activa.
- Audio MIDI, acompañamiento y escucha de notas no son duplicaciones intercambiables: tienen tiempos, voces y responsabilidades diferentes.
- El CSS mantiene reglas que se sobrescriben y media queries. No se hizo una consolidación completa a ciegas: requiere comparación visual por componente.

## Límites y deuda técnica

- app.js aún concentra datos musicales, estado y renderizado.
- Cambiar acordes reconstruye tarjetas y el mástil; queda pendiente medir y optimizar progresiones de miles de tarjetas.
- localStorage depende de la cuota del navegador: un JSON menor a 20 MB puede no caber. El fallo se informa sin reemplazar datos existentes.
- Las secciones siguen guardadas por índices con referencias en memoria, no mediante IDs persistentes de acordes.
- Las pruebas de YouTube usan un doble de API. El video externo real, la percepción de audio, Safari/Firefox y los dispositivos físicos requieren validación aparte.
- Los iconos de MIDI y acompañamiento representan detener, no una pausa reanudable.

## Evolución recomendada

Primero completar los casos manuales y medir el uso real. Después, separar el modelo de progresión, añadir edición directa de secciones y duraciones por acorde, versionar datos si cambia su estructura e incorporar ejemplos propios y marcas de tiempo de YouTube. Ninguna de esas funciones futuras se presenta como implementada.
