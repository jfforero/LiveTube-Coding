# LiveTube Coding

Programa en vivo una rejilla de videos de YouTube desde un editor de código en el navegador. Escribe JavaScript (o usa los alias en español), ejecuta con `Shift+Enter` y controla reproducción, audio, bucles y efectos visuales en tiempo real.

![LiveTube Coding](https://img.shields.io/badge/stack-HTML%20%7C%20JS%20%7C%20YouTube%20API-181717?style=flat-square)

## Características

- Rejilla configurable de reproductores YouTube (divisores de 12: 1×1, 2×2, 3×4, etc.)
- Editor CodeMirror superpuesto sobre la rejilla
- Búsqueda de videos con panel de resultados
- Control de reproducción, volumen, velocidad, sincronización y bucles
- Efectos visuales con filtros CSS GPU y capas overlay (VHS, CRT, glitch…)
- **Etiquetas** para IDs de YouTube (`crear(1, 1, "Bolaño")`)
- Documentación integrada en español e inglés
- API en español: `crear`, `buscar`, `reproducir`, `bucleEn`, `limpiarFx`, etc.

## Inicio rápido

### Requisitos

- Navegador moderno (Chrome, Firefox, Edge)
- Servidor local estático (Live Server, `python -m http.server`, GitHub Pages…)
- Clave de [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com) (solo para `buscar()`)

### Instalación

```bash
git clone https://github.com/TU_USUARIO/LiveTube-Coding.git
cd LiveTube-Coding
```

### Configurar la API key (búsqueda)

La clave **no va en el código fuente**. Usa un archivo local ignorado por Git:

```bash
cp js/config.example.js js/config.local.js
```

Edita `js/config.local.js`:

```js
window.LIVETUBE_CONFIG = {
  youtubeApiKey: 'TU_CLAVE_YOUTUBE_DATA_API'
};
```

En [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. Habilita **YouTube Data API v3**
2. Crea una clave y restríngela:
   - **APIs:** solo YouTube Data API v3
   - **Referrers HTTP:** `http://localhost:*`, `https://tuusuario.github.io/*`

> `js/config.local.js` está en `.gitignore` y no se sube al repositorio.

### Ejecutar

Abre `index.html` con un servidor local (no `file://`):

```bash
# Python 3
python -m http.server 5500
```

Visita `http://localhost:5500`

## Uso básico

```js
// Crear rejilla 2×2
crear(2, 2, "dQw4w9WgXcQ")

// Buscar videos (requiere API key)
buscar("música experimental")

// Reproducir todos con fade-in
fundirEntrada(todos, 3)
reproducir(todos)

// Bucle desde un punto
bucleEn(0, 30, 5)

// Efecto visual
aplicarPreset(todos, "bolano")
presetOverlay(todos, "vhs")
```

## Atajos de teclado

| Atajo | Acción |
|-------|--------|
| `Shift+Enter` | Ejecutar línea o selección |
| `Alt+Enter` | Ayuda en inglés |
| `Alt+Shift+Enter` | Ayuda en español (panel derecho) |
| `Alt` | Ocultar / mostrar editor |
| `Esc` | Alternar editor; insertar índices de celdas seleccionadas |
| Clic en celda | Seleccionar celda (overlay rojo) |

## Etiquetas para IDs de video

Evita recordar IDs largos:

```js
etiqueta("Bolaño", "iqtYrcE27hE")
crear(1, 1, "Bolaño")
cambiar(todos, "Bolaño")
listarEtiquetas()
```

Incluida por defecto: **Bolaño** → `iqtYrcE27hE`

## Efectos visuales

Filtros CSS (rápidos) y overlays (scanlines, viñeta, grano):

```js
escalaGrises(todos, true)
vigneta(todos, 0.7)
lineas(todos, 0.3)
glitch(todos, true)
aplicarPreset(todos, "cyberpunk")
presetOverlay(todos, "crt")
limpiarFx(todos)
listarPresets()
```

Presets de filtro: `calm`, `tense`, `dream`, `chaos`, `dark`, `soft`, `retro`, `neon`, `horror`, `vhs`, `noir`, `cyberpunk`, `bolano`

Presets overlay: `vhs`, `crt`, `glitch`

## Selección de videos

Los índices van de izquierda a derecha, fila por fila (empezando en `0`):

```
Rejilla 3×3:
┌───┬───┬───┐
│ 0 │ 1 │ 2 │
├───┼───┼───┤
│ 3 │ 4 │ 5 │
├───┼───┼───┤
│ 6 │ 7 │ 8 │
└───┴───┴───┘
```

```js
reproducir(0)           // un video
pausar([1, 3])          // varios
silenciar(todos, true)  // todos
desenfocar(excepto(4), 3)
```

## Funciones en español

| Español | Inglés |
|---------|--------|
| `crear()` | `createGrid()` |
| `buscar()` | `search()` |
| `cambiar()` | `cue()` |
| `reproducir()` / `iniciar()` | `play()` |
| `pausar()` | `pause()` |
| `bucleEn()` | `loopAt()` |
| `fundirEntrada()` | `fadeIn()` |
| `etiqueta()` | `alias()` |
| `limpiarFx()` | `resetFx()` |

Referencia completa: abre la ayuda con `Alt+Shift+Enter` o visita [`doc/es/global.html`](doc/es/global.html).

## Estructura del proyecto

```
LiveTube-Coding/
├── index.html          # Página principal
├── css/main.css        # Estilos
├── js/
│   ├── main.js         # Lógica de la rejilla y API
│   ├── config.example.js
│   └── config.local.js # Tu clave (local, gitignored)
├── doc/
│   ├── global.html     # Ayuda en inglés
│   └── es/global.html  # Ayuda en español
├── codemirror/         # Editor de código
└── examplecode.js      # Ejemplos de performance
```

## Seguridad de la API key

- **No** incluyas claves en `main.js` ni en commits públicos
- **No** uses “encriptación” en el navegador: el cliente siempre puede leer el secreto
- Si una clave estuvo expuesta en Git, **revócala** y crea una nueva
- Para GitHub Pages sin `config.local.js`, usa un proxy en servidor o GitHub Actions con Secrets

## Despliegue (GitHub Pages)

1. Sube el repo a GitHub
2. Activa Pages en la rama `main`
3. Para `buscar()` en producción, configura la clave vía CI (Secret) o un proxy backend

Sin configuración adicional, la rejilla y los efectos funcionan; solo la búsqueda requiere la API key.

## Licencia

Proyecto de código abierto para live coding y performances audiovisuales. CodeMirror tiene su propia licencia en `codemirror/LICENSE`.
