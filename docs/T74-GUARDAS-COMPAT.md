# T-74 · Guardas de compatibilidad y recorridos críticos

Unidad de **verificación sin cambio funcional**. Especifica y ejecuta controles
reproducibles sobre `traste.songs.v1`, el JSON v1, los límites de 200
progresiones y 20 MB por respaldo, los atajos y los recorridos
guardar/abrir/importar/exportar. **No cambia producto ni datos del dueño.**

La revisión visual en navegador (móvil y aspecto) es una **unidad separada**,
coordinada aparte por Brian: no se infiere de estos controles de DOM simulado.

## Ámbito y procedencia

| Dato | Valor |
| --- | --- |
| SHA base (`origin/main` al abrir) | `27f688a528023101f4b64fb321cf95626195e622` |
| Worktree | `String/wt-apx-t74-guardas` |
| Rama | `agente1/t74-guardas-compat` |
| Archivos nuevos | `tests/t74-guardas-compat.test.cjs`, `tests/t74-recorridos-ui.test.cjs`, `tests/t74-atajos.test.cjs`, este documento |
| Producto tocado | **Ninguno.** Cero cambios en `*.js`, `*.css`, `*.html` de la app ni en `tests/` preexistentes |
| Datos del dueño | **Ninguno.** Todo el `localStorage` de los controles es un `Map` en memoria; `String/` en `main` y el espejo `~/Documents/GitHub/String/` quedan intactos |

## Contrato bajo control

Fuente: `song-library.js` (clase `SongLibrary`) y `song-library-ui.js`
(validación y manejadores). Sin alterarlos:

1. **Clave:** `traste.songs.v1`, y solo esa.
2. **Esquema v1:** `{"version":1,"songs":[...]}`. `version !== 1`, `songs` no
   arreglo, JSON roto o IDs repetidos → se rechaza con error y los datos
   existentes no se reemplazan.
3. **200 progresiones:** `write` y `parse` rechazan `songs.length > 200`; el
   rechazo no escribe en `localStorage`.
4. **20 MB por respaldo:** `SongLibrary.maxBackupBytes = 20 * 1024 * 1024`;
   `checkSize` miden bytes UTF-8 y rechaza con `> 20 MB` en `parse`, `write`,
   `export` e `import`. El límite es inclusivo (20 MB exactos pasan el guarda de
   tamaño y fallan después en `JSON.parse`). La UI additionally controla
   `file.size` antes de leer el archivo.
5. **Guardar/abrir/actualizar/borrar:** guardar nueva escribe v1; Actualizar
   conserva el `id` (no duplica); Abrir restaura título, tarjetas y ajustes sin
   reescribir la biblioteca; sin selección avisa.
6. **Exportar/importar:** export genera un `Blob` `application/json` llamado
   `string-progresiones.json`; import añade copias con `id` nuevo (nunca
   sobrescribe) y devuelve el número de copias; un archivo inválido o de más de
   20 MB se rechaza con aviso y sin tocar lo guardado.
7. **Atajos:**
   - `Ctrl`/`Meta`/`Alt` + `Enter` o `Espacio` no disparan el atajo de añadir
     acorde (se dejan al navegador).
   - `Espacio` sobre un botón de transporte sin captura en vivo conserva su
     semántica nativa (T-37); `Enter` sobre botón o campo de escritura también.
   - Campos de escritura (`input text/number/url/email/tel/password/date/file`,
     `textarea`, `select`, contenido editable) no interceptan atajos.
   - `Supr`/`Ctrl+Supr` borra la tarjeta enfocada; no lo hace con el candlock de
     escala activo ni cuando el foco está en un control.

## Comandos reproducibles

Desde el worktree (`String/wt-apx-t74-guardas`, SHA `27f688a`):

```bash
# Suite completa del proyecto
npm test

# Controles focales T-74 (los tres archivos nuevos)
node --test tests/t74-guardas-compat.test.cjs \
             tests/t74-recorridos-ui.test.cjs \
             tests/t74-atajos.test.cjs

# Comprobación de whitespace / conflictos en el diff
git diff --check
```

Node v26.13.1 · npm 11.20.0. No hay dependencias nuevas: los controles usan
`node:test`, `node:assert`, `node:vm` y el DOM simulado ya presente en
`tests/song-library.test.cjs` y `tests/keyboard-section.test.cjs`.

## Resultados

| Control | Salida | Exit |
| --- | --- | --- |
| `npm test` | 668/668 pruebas, 0 fallos (637 preexistentes + 31 nuevas) | 0 |
| `tests/t74-guardas-compat.test.cjs` | 16/16 (clave, esquema, 200, 20 MB, guardar/importar/exportar/remove, fallos sin pérdida) | 0 |
| `tests/t74-recorridos-ui.test.cjs` | 7/7 (handler real de UI en DOM simulado: guardar/abrir/actualizar, export Blob, import copias, rechazos) | 0 |
| `tests/t74-atajos.test.cjs` | 8/8 (modificadores, T-37, campos de escritura, Supr/Ctrl+Supr con candlock) | 0 |
| `git diff --check` | sin salida | 0 |

**Veredicto QA: APROBADO en lo medido.** Los controles pasan sobre el SHA exacto
`27f688a` y no muestran defecto atribuible a este alcance.

## Límites (lo que estos controles NO prueban)

- **Navegador real, móvil y aspecto visual:** no se ejecutan acá; son la unidad
  separada que coordina Brian con un solo agente. Ninguna captura ni juicio
  visual se infiere del DOM simulado.
- **Micrófono físico, YouTube externo y otros navegadores:** fuera de alcance.
- **Almacenamiento real del navegador:** los controles usan un `Map`; el
  `QuotaExceeded` se simula con un `setItem` que lanza. No se comprueba el
  comportamiento del `localStorage` del navegador ni el protocolo `file:`.
- **Garantía futura:** ninguna suite puede afirmar que «nada se rompe» en el
  futuro; estos controles cubren solo el contrato y el SHA declarados.
- **No se hereda un OK de otro commit:** cualquier cambio posterior requiere
  su propia verificación sobre su SHA exacto.
