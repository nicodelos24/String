# Revisión técnica — 2026-09-11

Base inspeccionada: `4aee85c` más los cambios locales de esta revisión. Trabajo realizado con asistencia de IA. Es una revisión de código y regresiones de los flujos existentes; no garantiza ausencia total de defectos.

## Correcciones de esta revisión

| ID | Problema | Cambio |
| --- | --- | --- |
| BUG-009 | Exportación permitía respaldos que la interfaz rechazaba por superar 2 MB | Límite común de 20 MB, exportación compacta e importación con validación antes de escribir |
| BUG-010 | Foco incorrecto al mover un acorde dentro de una sección filtrada | Se conserva la identidad del acorde para recuperar el foco |
| BUG-011 | Pausa visual para motores que realmente detienen | Icono cuadrado en MIDI/acompañamiento; pausa real sigue en YouTube |
| BUG-012 | Elegir la fuente ya activa detenía la música | Se detiene únicamente al cambiar de fuente |
| BUG-013 | Panel reabierto podía conservar controles inert y perder foco | Recuperación de foco antes de inert; limpieza de animaciones; sincronización en toggle |
| BUG-014 | Índices duplicados en secciones importadas ambiguaban la edición | Validación de índices únicos; repeticiones mediante repeat |

Los pasos, severidad, casos y evidencia se registran en BUGS.md, dentro del [archivo histórico de QA](../archivo-qa/README.md). Las correcciones anteriores de límite de tarjetas y silencio de notas siguen cubiertas por pruebas.

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
