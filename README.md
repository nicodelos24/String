# Traste · Explorador de escalas

Aplicación web para explorar escalas, modos e intervalos sobre el mástil de una guitarra o un bajo. Permite elegir una nota base y una calidad de acorde, visualizar sus relaciones musicales y armar una idea de progresión armónica.

## Cómo ejecutarlo

1. Descargá o cloná este repositorio.
2. Abrí el archivo `index.html` de la raíz en un navegador moderno.

No requiere instalar dependencias, compilar el proyecto ni configurar un servidor. También podés abrirlo mediante Live Server en Visual Studio Code si ya tenés esa extensión.

Las tipografías Manrope y DM Mono se cargan desde Google Fonts y requieren conexión a Internet. La lógica de la aplicación se ejecuta localmente en el navegador.

## Funciones

- Mástil interactivo con 22 trastes.
- Guitarra de seis cuerdas en afinación estándar: E–A–D–G–B–E, de grave a agudo.
- Bajo de cuatro cuerdas en afinación estándar: E–A–D–G, de grave a agudo.
- Selección de nota base, con opciones de sostenidos y bemoles.
- Selección de acorde mayor, menor y disminuido.
- Visualización de modos y escalas pentatónicas.
- Colores para identificar los intervalos respecto de la raíz.
- Visualización de la armadura de clave calculada.
- Superposición de una escala adicional mediante notas semitransparentes.
- Controles para mostrar nombres de notas y alternar el resaltado de grados, tríada o séptima.
- Panel de progresión para agregar, seleccionar y quitar acordes.
- Consulta del nombre y el intervalo de una nota al hacer clic sobre el mástil.

## Modos disponibles

Los controles ofrecen estos modos según la calidad seleccionada:

| Calidad | Modos |
| --- | --- |
| Mayor | Jónico, lidio y mixolidio |
| Menor | Dórico, eólico y frigio |
| Disminuido | Locrio |

Las pentatónicas mayor y menor están disponibles en las tres calidades. La disponibilidad en el selector permite explorar combinaciones; no representa una validación automática de su compatibilidad armónica.

## Uso

1. Elegí **Guitarra** o **Bajo** en el selector de instrumento.
2. Seleccioná la **Nota Base** y la **Calidad** del acorde.
3. Elegí un **Modo** para visualizar sus notas sobre el mástil.
4. Usá el botón **notas / escala / todas** para alternar entre ocultar los nombres, mostrar los de la escala y el acorde, o mostrar todos.
5. Usá **grados / triada / 7ma** para cambiar el resaltado de intervalos.
6. En **Seleccionar escala adicional**, elegí otra escala para compararla visualmente con la principal.
7. Hacé clic en una nota para consultar su nombre e intervalo en el pie del mástil.
8. Presioná **añadir acorde** para incorporar el acorde actual a la progresión. Podés seleccionar sus tarjetas o quitar acordes con el botón de cierre; siempre queda al menos uno.

Por ejemplo, seleccioná guitarra, nota C, calidad mayor y modo jónico para explorar las notas de Do mayor. Luego comparalo con el modo lidio usando el selector de escala adicional.

## Tecnologías

- **HTML5:** estructura y controles de la interfaz.
- **CSS3:** presentación visual y distribución de los paneles.
- **JavaScript:** datos musicales, cálculo de intervalos, generación del mástil y eventos de interacción.
- **Google Fonts:** tipografías de la interfaz.

No utiliza frameworks, backend ni un gestor de paquetes.

## Estructura del proyecto

```text
Proyecto-guitar-IA/
├── index.html      # Página principal
├── style.css       # Estilos de la interfaz
├── app.js          # Lógica y datos musicales
├── README.md       # Documentación
└── version 1.0/    # Copia adicional del proyecto
```

La aplicación principal se ejecuta desde los archivos de la raíz.

## Estado actual

El proyecto se presenta como un MVP de exploración visual. Las selecciones y la progresión se mantienen en memoria y se reinician al recargar la página.

Al hacer clic en una nota se muestra información textual; todavía no se reproduce sonido. La importación de progresiones MIDI y la detección de acordes con micrófono aparecen en la interfaz como funciones futuras.

Algunas funciones musicales requieren ajustes: seleccionar una tarjeta de la progresión no sincroniza su calidad con el selector, y los números romanos de las tarjetas se asignan por posición, no por un análisis armónico. Para las pentatónicas, la armadura mostrada se calcula a partir de la tonalidad mayor de la raíz, incluida la pentatónica menor.

## Desarrollo

Para modificar la interfaz, editá `index.html` y `style.css`. Los instrumentos, afinaciones, modos, intervalos, colores y eventos están definidos en `app.js`.

Después de realizar cambios, recargá la página y comprobá el cambio de instrumento, nota base, calidad y modo, los controles de visualización, la escala adicional y la edición de la progresión.
