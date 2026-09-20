# Guía: estructura de una canción, compases y acordes (con ejemplos de jazz)

## 1. La base: el compás

En la mayoría de canciones el compás es de **4/4** (4 tiempos). Un acorde por compás se anota así:

```
Compás 1      Compás 2      Compás 3      Compás 4
|  Cmaj7    |  Am7       |  Dm7       |  G7        |
```

- Cada `| ... |` es un compás.
- El símbolo `Cmaj7` indica: toca ese acorde durante TODO el compás (los 4 tiempos).
- Los acordes normales duran 1 compás; los que van entre corchetes o con una línea encima duran medio compás (2 tiempos).

## 2. Cuando hay cambios dentro del compás

Si un acorde dura solo 2 tiempos (medio compás), se escribe dos acordes por compás:

```
| Cmaj7 *     Am7   *   |   Dm7    *    G7    *   |
   (t. 1-2)  (t. 3-4)     (t. 1-2)  (t. 3-4)
```

Convención clásica: dos acordes en un compás = **2 tiempos cada uno**.

## 3. Forma estándar: el "Real Book style"

Esta es la forma real de escribir la armadura de una canción jazz:

```
        A7                       Dm7
|------------------------|------------------------|   (compases 1-2)

        E7                       Am7
|------------------------|------------------------|   (compases 3-4)
```

Con los símbolos sobre el pentagrama, no hay que "interpretar" nada: cada símbolo marca el inicio exacto del cambio.

## 4. Ejemplo clásico: el Blues de 12 compases

Forma de 12 compases (estilo B.B. King):

```
| F7          | F7          | F7          | F7          |
| Bb7         | Bb7         | F7          | F7          |
| C7          | Bb7         | F7          | C7 / F7     |
```

Observa: el último compás tiene **dos acordes** (`C7` y `F7`), cada uno de 2 tiempos: es un "turnaround".

## 5. Ejemplo de ii–V–I (la secuencia rey del jazz)

En Do mayor:

```
| Dm7        | G7        | Cmaj7      | Cmaj7      |
   (ii)        (V)         (I)
```

Los números romanos son grados: **ii = re menor, V = sol dominante, I = do mayor**. Esta es la célula que verás repetida en toda canción.

## 6. Ejemplo real: "Autumn Leaves" (primeros 8 compases)

```
| Cmaj7      | Fmaj7      | Bm7(b5)    | E7         |
| Am7        | Am7        | Dm7        | G7         |
```

Sigue el ciclo de quintas hacia abajo (la base del jazz): C → F → B → E → A → D → G.

## 7. Cambios rápidos: "Giant Steps" (Coltrane)

Cuando hay MÁS de 2 acordes por compás, se escriben separados por música muy densa (3 acordes por compás ≈ 1 acorde cada 1.3 tiempos, aproximado):

```
| Bmaj7 D7  | Gmaj7 Bb7 | Ebmaj7     | Am7 D7    |
```

Aquí la densidad pide que marques también **cuántos tiempos** dura cada uno (encima de cada símbolo con numeritos, ej. `1 2` o líneas dobles).

## Resumen gráfico de las duraciones

```
Duración         Escritura
─────────────────────────────────────────────
4 tiempos (1 compás)      |  Cmaj7         |
2 tiempos (½ compás)      |  Cmaj7   Am7   |
1 tiempo (¼)              | Cmaj7 F7 Dm7 G7 | (o con "1 2 3 4" encima)
```

---

## Ejemplo completo 1: el Blues de 12 compases (en F)

Compás numerado, tónica en el compás 7:

```
 1       2       3       4
| F7    | F7    | F7    | F7    |
| Bb7   | Bb7   | F7    | F7    |
| C7    | Bb7   | F7    | C7 / F7 |
 9       10      11      12
```

Con los **grados** (qué papel juega cada acorde):

```
| F7   | F7   | F7   | F7   |
  I7     I7     I7     I7
| Bb7  | Bb7  | F7   | F7   |
  IV7    IV7    I7     I7
| C7   | Bb7  | F7   | C7 / F7 |
  V7     IV7    I7     V7/I7
```

Regla de oro del blues: **I → IV → I → V → IV → I → V (turnaround)**. El compás 12 tiene 2 acordes de 2 tiempos cada uno.

---

## Ejemplo completo 2: Autumn Leaves (Josep Kosma)

Versión habitual del Real Book, en **Mi menor / Sol mayor**. Forma **A A B** = 24 compases, 4/4. Es el ejemplo perfecto de "ciclo de quintas": encadena ii–V–I mayor y menor.

```
C1        C2        C3        C4
| Am7    | D7     | Gmaj7  | Cmaj7  |
| F#m7b5 | B7b9   | Em     | Em     |
C5        C6        C7        C8

C9        C10       C11       C12
| F#m7b5 | B7b9   | Em     | Em     |
| Am7    | D7     | Gmaj7  | Gmaj7  |
C13       C14       C15       C16

C17       C18       C19         C20
| F#m7b5 | B7b9   | Em7  Eb7 | Dm7  Db7 |
| Cmaj7  | B7#5   | Em6    | Em6       |
C21       C22       C23         C24
```

(Un símbolo por compás = 4 tiempos. `F#m7b5` = medio disminuido `F#ø`. `b9`, `#5` son extensiones de color.)

### Análisis: casi todo son dos patrones

**a) La sección A es un ciclo de quintas caído — fíjate en las raíces:** `A – D – G – C – F# – B – E` (cada acorde resuelve al siguiente bajando una quinta):

```
Compás:  1      2       3      4       5       6      7-8
         Am7    D7      Gmaj7  Cmaj7   F#m7b5  B7     Em
Grado:   ii7 → V7 →  Imaj7    IV      iiø  → V7  →  i
         ├── ii–V–I de SOL mayor ──┤   ├─ iiø–V–i de MI menor ─┤
```

Es decir: **Am7–D7–Gmaj7** resuelve a la región mayor (Sol), y **F#m7b5–B7–Em** resuelve a la relativa menor (Mi menor). Toda la canción alterna entre esos dos polos.

**b) La sección B** repite el ciclo pero con "aproximación cromática" al final: `Em7–Eb7–Dm7–Db7–Cmaj7` baja la raíz **por semitonos** (un recurso clásico para tensión antes de resolver).

### Mapa mental para estudiarla (así la guardas sin papel)

```
  AAm7  D7  |  Gmaj7  Cmaj7  |  F#m7b5  B7  |  Em  Em
  ├─ ii–V ──┤  ├─ I  IV ────┤  ├─ iiø–V ────┤  └─ i ──┘    ← 8 compases
```

Memoriza solo **4 casillas de 2 compases** y ya tienes la sección A completa.