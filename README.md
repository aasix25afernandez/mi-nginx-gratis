# Colección de Vinilos — Guía completa

---

## 📁 Archivos del proyecto

| Archivo | Descripción |
|---------|-------------|
| `index.html` | Página principal de la colección |
| `main.js` | Lógica principal (v5.0 — YouTube Player) |
| `styles.css` | Estilos |
| `albums.json` | Base de datos de la colección |
| `wishlist.html` | Página de discos que quieres |
| `wishlist.js` | Lógica de la wishlist |
| `wishlist.css` | Estilos de la wishlist |
| `wishlist.json` | Base de datos de la wishlist |
| `admin.html` | Panel de administración |
| `admin.js` | Lógica del panel admin |
| `admin.css` | Estilos del panel admin |

---

## 🎵 Sistema de Preview de YouTube

A partir de la v5.0, al hacer clic en una pista del tracklist se reproduce un **preview de 30 segundos** directamente desde YouTube, sin coste alguno de almacenamiento.

### Cómo funciona

- Las pistas con preview tienen los campos `ytId` y `ytStart` en `albums.json`
- Al clicar una pista, aparece un **mini-player flotante** con barra de progreso y contador
- El audio se para automáticamente a los 30 segundos
- Para parar manualmente: botón ■ del mini-player, ESC (primer ESC cierra el player; segundo ESC cierra el álbum), o clic fuera del modal

### Obtener ytId y ytStart

**`ytId`** — Es el ID del vídeo de YouTube. Se encuentra al final de la URL:
```
https://www.youtube.com/watch?v=-byTiKtOrH4&list=...
                                ^^^^^^^^^^^^
                                Este es el ytId: -byTiKtOrH4
```
Ignora todo lo que hay después del `&`.

**`ytStart`** — Es el segundo exacto donde empieza la canción en el vídeo.

**Estrategia recomendada:** Busca en YouTube `[artista] [álbum] full album`. La mayoría de álbumes completos tienen el tiempo de cada canción en la descripción del vídeo.

Ejemplo: si la canción empieza en el minuto 3:45 del vídeo → `ytStart: 225` (3×60 + 45 = 225).

---

## ➕ Cómo añadir un álbum nuevo

Abre `albums.json` y añade un objeto al array con esta estructura:

```json
{
    "id": "identificador_unico",
    "title": "Título del Álbum",
    "artist": "Nombre del Artista",
    "year": 1984,
    "type": "lp",
    "cover": "https://url-de-la-portada.jpg",
    "tracks": [
        { "code": "A1", "title": "Canción 1", "duration": "4:32", "ytId": "VIDEOID", "ytStart": 0    },
        { "code": "A2", "title": "Canción 2", "duration": "3:15", "ytId": "VIDEOID", "ytStart": 272  },
        { "code": "B1", "title": "Canción 3", "duration": "5:01", "ytId": "VIDEOID", "ytStart": 462  },
        { "code": "B2", "title": "Canción 4", "duration": "3:48"                                      }
    ]
}
```

### Campos obligatorios
- `id` — Identificador único sin espacios (usa guiones bajos)
- `title` — Nombre del álbum
- `artist` — Nombre del artista o banda
- `year` — Año de lanzamiento (número)
- `type` — Formato: `"lp"`, `"ep"`, `"single"` o `"cd"`
- `cover` — URL de la portada (mínimo 500×500 px)
- `tracks` — Array de pistas (ver abajo)

### Campos opcionales por pista
- `ytId` — ID del vídeo de YouTube para el preview. Si no se añade, la pista no tendrá preview (no rompe nada)
- `ytStart` — Segundo del vídeo donde empieza la canción (por defecto: 0)

> **Nota:** No todas las pistas necesitan preview. Puedes añadirlo solo a las que quieras, o a ninguna, y el álbum funciona igual.

---

## 🎛️ Tipos de formato

| Valor | Descripción | Códigos de pista |
|-------|-------------|-----------------|
| `"lp"` | LP estándar | A1, A2… B1, B2… |
| `"ep"` | Extended Play | A1, A2… B1, B2… |
| `"single"` | Single | A, B |
| `"cd"` | Compact Disc | 1, 2, 3… |
| `"lp"` (doble) | Doble LP | A1…B2, C1…D2 |

---

## 🔍 Paso a paso: añadir preview a un álbum existente

1. **Busca en YouTube** `[artista] [álbum] full album`
2. **Copia el ytId** de la URL (los caracteres después de `v=` y antes de `&`)
3. **Anota los tiempos** de inicio de cada canción (suelen estar en la descripción del vídeo)
4. **Convierte minutos a segundos:** `minutos × 60 + segundos`
   - Ejemplo: `3:45` → `3 × 60 + 45 = 225`
5. **Añade `ytId` y `ytStart`** a cada pista en `albums.json`
6. **Sube** el `albums.json` actualizado a tu servidor

### Ejemplo real

Canción: *Dulce Introducción Al Caos* de Extremoduro
- URL del vídeo: `https://www.youtube.com/watch?v=-byTiKtOrH4&list=RD...`
- ytId: `-byTiKtOrH4`
- La canción empieza a 0:00 en ese vídeo → ytStart: `0`

```json
{ "code": "A1", "title": "Dulce Introducción Al Caos", "duration": "7:42", "ytId": "-byTiKtOrH4", "ytStart": 0 }
```

---

## 🌐 Despliegue

1. Edita `albums.json` con tus álbumes
2. Sube **todos los archivos** al directorio de tu hosting
3. El panel admin (`admin.html`) también permite editar y exportar el JSON desde el navegador

---

## 📱 Comportamiento del reproductor

| Acción | Resultado |
|--------|-----------|
| Clic en pista con preview | Inicia el preview de 30 s |
| Clic en la misma pista reproduciendo | Detiene el preview |
| Clic en otra pista | Cambia al preview de esa pista |
| Botón ■ del mini-player | Detiene el preview |
| ESC (1er vez, mientras hay preview) | Detiene solo el preview |
| ESC (2ª vez, sin preview activo) | Cierra el modal del álbum |
| Clic fuera del modal (1er vez, con preview) | Detiene solo el preview |
| Clic fuera del modal (2ª vez, sin preview) | Cierra el modal |
| 30 segundos transcurridos | Se detiene automáticamente |
