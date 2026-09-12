# Desarrollo de String

- Priorizar el cambio solicitado y leer solo los archivos relacionados. Evitar auditorías completas salvo petición explícita.
- `archivo-qa/` contiene el historial de testing comprimido. No abrirlo ni extraerlo en tareas normales de desarrollo.
- Conservar las pruebas rápidas de `tests/`. Ejecutar las relacionadas con el cambio; usar `npm test` si afecta varios módulos. No repetir comprobaciones que ya pasaron sin cambios relevantes.
- No generar reportes, Excel, capturas ni ampliar documentación de QA salvo que el usuario lo pida.
- Para cambios visuales, verificar el componente afectado; no ejecutar toda la batería histórica de navegador por defecto.
- Explicar brevemente qué cambió y cómo se verificó, en español neutro. Actualizar el README solo cuando cambie el uso del proyecto.
- Estas pautas reducen trabajo innecesario; no omitir validaciones necesarias para evitar pérdida de datos o regresiones del cambio solicitado.
