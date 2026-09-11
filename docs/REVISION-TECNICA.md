# Revisión técnica y próximos pasos

Esta revisión se realizó con ayuda de IA. Las pruebas automatizadas cubren comportamientos concretos; no garantizan ausencia de errores ni sustituyen la escucha y la prueba manual en dispositivos reales.

## Hallazgos

- El botón de añadir permitía superar los 4096 acordes aceptados por el guardado. Se alineó ese límite y se impide añadir durante el arrastre.
- La escucha de notas programaba una envolvente incluso con volumen cero. Ahora el silencio y los volúmenes no válidos no crean una voz.
- MIDI y acompañamiento tienen motores distintos porque uno respeta tiempos originales y el otro usa compases de cuatro pulsos. Sus eventos detienen el otro motor. YouTube y metrónomo siguen siendo independientes.
- No se debe eliminar un módulo solo por compartir operaciones de audio: las envolventes, los tiempos y la cancelación tienen responsabilidades diferentes.
- `app.js` concentra estado musical, renderizado y edición. Conviene separar el modelo de progresión de su interfaz antes de añadir estructura por secciones.
- `style.css` contiene sucesivas redefiniciones y reglas de distintos tamaños de pantalla. No todas son duplicaciones innecesarias; consolidarlas requiere comparar las vistas y evitar cambiar de nuevo las proporciones del mástil.
- La carpeta `version 1.0` es una copia histórica, no está cargada por la página actual. `midi-catalog.js` conserva metadatos utilizados en pruebas, no una conexión activa a una API.
- Las tarjetas se reconstruyen al cambiar de acorde. Con miles de tarjetas conviene medir el rendimiento y actualizar solo selección y resaltado.
- La biblioteca usa almacenamiento local y conserva su clave y formato anteriores al cambiar el nombre visible a «Mis progresiones». Los tiempos MIDI no se guardan. El respaldo importado tiene un límite de 2 MB; una biblioteca muy grande podría exportar un archivo que exceda ese límite. Esto debe resolverse antes de ampliar el almacenamiento.

## Evolución de secciones

Se implementó una primera versión por rangos de tarjetas, con nombre, repeticiones, orden de reproducción y guardado opcional en `sections`. No duplica tarjetas y mantiene compatibilidad con progresiones anteriores. La propuesta siguiente describe el modelo más avanzado que aún queda pendiente, con secciones reutilizables y duraciones variables.

1. Separar una sección musical de su uso en el tema: una sección «Verso» contiene acordes; el orden del tema referencia esa sección con una cantidad de repeticiones.
2. Ejemplo: Intro → Verso ×2 → Estribillo → Verso → Estribillo ×2. Editar Verso actualiza sus apariciones; duplicar la sección crea una variante independiente.
3. Cada acorde debe tener una duración en pulsos. El reproductor debe informar sección, repetición y acorde actual. Para MIDI se conservan además los tiempos originales.
4. Versionar el formato de guardado y migrar las progresiones existentes a una sección inicial «Parte A», sin perder datos.
5. Añadir una biblioteca de ejemplos propia, separada de lo guardado por el usuario. Abrir un ejemplo crea una copia editable.
6. Incorporar marcas temporales de YouTube por aparición del acorde: una misma sección puede sonar en distintos momentos del video. Mantener el seguimiento opcional.

Primero se debe definir y probar este modelo; los botones «×2», «Verso» y «Estribillo» deben representar datos reales, no solo etiquetas decorativas.
