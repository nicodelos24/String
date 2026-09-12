# Testing histórico separado

El archivo [testing-historico-2026-09-12.zip](testing-historico-2026-09-12.zip) conserva los reportes de bugs, casos manuales, Excel, capturas, evidencias y scripts de navegador y generación de QA. Incluye una copia de las pruebas Node de esta fecha. Se verificó el contenido del ZIP contra cada original antes de retirar los archivos sueltos.

La aplicación no necesita este archivo. Las pruebas rápidas permanecen en `tests/` y se ejecutan con `npm test`, sin instalar dependencias. No verifican el aspecto visual ni YouTube real.

## Consultar o recuperar

Abre el ZIP con el explorador de archivos y extrae lo que necesites en una carpeta aparte. Conserva las rutas internas para consultar los enlaces entre los reportes. Puedes mover este ZIP fuera del proyecto si prefieres guardarlo con tu material de portfolio.

Para volver a ejecutar las pruebas históricas de navegador, recupera las carpetas `scripts/` y `docs/qa/` en la raíz del proyecto. No reemplaces `tests/` con la copia histórica: las pruebas activas pueden haber evolucionado. Los scripts antiguos podrían necesitar ajustes si cambia la aplicación. Generar Excel requiere Python y openpyxl; desarrollar String no.

Los resultados archivados describen la revisión anterior, no prueban futuros cambios. No extraer ni regenerar QA durante el desarrollo habitual salvo que se solicite.
