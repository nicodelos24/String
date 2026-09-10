# Resultados de pruebas

## Ejecución automatizada — 2026-09-09

- Entorno: Windows, PowerShell, Node.js v24.16.0.
- Comando: `node --test tests/*.test.cjs` desde la raíz.
- Revisión: cambios locales del primer reproductor sobre `5aed427`; sin commit propio todavía.
- Resultado: **25 pruebas, 25 aprobadas, 0 fallidas, 0 omitidas**.
- Alcance: lógica musical, progresiones, metrónomo, motor de reproducción y conexión de sus controles con datos de la app.
- Evidencia resumida del runner:

```text
tests 25
pass 25
fail 0
cancelled 0
skipped 0
todo 0
```

La suite anterior tenía 12 pruebas; se agregaron 11 del motor y 2 de integración de controles. No se midió cobertura porcentual. `git diff --check` también terminó sin errores de espacios.

## Reporte exploratorio del usuario y corrección posterior

El usuario abrió `index.html` con doble clic y reportó un acorde suave que sonaba una sola vez, sin avanzar ni repetir, junto al mensaje de error. También esperaba que cambiar la selección cambiara lo reproducido. Registrado como BUG-005, BUG-006 y BUG-007. No se presentó una captura ni una ejecución formal de los casos MAN; se conserva como reporte exploratorio.

### Resultado automatizado tras corregir BUG-005

- `node --test tests/*.test.cjs`: **27 aprobadas, 0 fallidas**.
- PLY-14 cubre el contexto requerido por los temporizadores del navegador, que los dobles anteriores no detectaban.
- PLY-15 comprueba la envolvente con volumen sostenido; no mide la percepción del sonido.
- Chrome 152.0.7977.83 y Edge 152.0.4191.66: se usó el archivo local, modo headless y audio silenciado. Se comprobó cambio de acordes, repetición y detención con Web Audio real.
- La comprobación ampliada también cambia la progresión guardada a F#m, verifica frecuencias distintas y su finalización sin repetir.
- La comprobación anterior a la corrección programaba únicamente las tres notas de C y devolvía `TypeError: Illegal invocation`. Después se programan las sucesivas tarjetas y la vuelta siguiente.

Comandos separados de la suite de Node:

```sh
node scripts/check-player-browser.cjs
node scripts/check-player-browser.cjs --edge
```

El script requiere Chrome o Edge instalado. Usa un perfil temporal aislado, sin acceder al perfil personal. Las fechas de los registros JSON están en UTC.

Evidencia:

- [Antes de la corrección: Chrome](evidencia/reproductor-antes.json).
- [Después de la corrección: Chrome](evidencia/reproductor-despues.json).
- [Después de la corrección: Edge](evidencia/reproductor-despues-edge.json).
- [Primer intento en Edge](evidencia/reproductor-intento-edge.json): la comprobación terminó antes de que el reloj de audio llegara a la repetición. Se reemplazó la espera fija por espera del estado esperado con límite de tiempo. No se clasificó como un nuevo bug de la app.

### Pendiente de verificación manual

Falta escuchar el volumen y la calidad del sonido, comprobar la comodidad de la interfaz y ejecutar los [casos manuales](CASOS-MANUALES.md). Una ejecución automatizada en headless no equivale a una escucha humana. Los bugs de percepción de volumen y claridad del mensaje siguen pendientes de revalidación manual.

## Archivos Excel

- [Reporte de bugs](excel/Reporte_de_bugs_Traste.xlsx): registro, ficha por bug y plantilla.
- [Casos de prueba](excel/Casos_de_prueba_Traste.xlsx): casos, ejecuciones y cobertura automatizada.

Se generaron con `python scripts/generate-qa-excel.py` (requiere `openpyxl`) y se reabrieron para validar hojas, tablas y contenido. No se comprobó su apariencia dentro de Microsoft Excel. Guardar las ejecuciones personales en una copia: regenerar reemplaza los archivos de ejemplo.
