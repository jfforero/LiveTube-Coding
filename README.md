# LiveTube Coding

> ℹ️ **Nota sobre la bifurcación (Fork):** Este repositorio es una bifurcación (branch/fork) adaptada y extendida de [Live Coding YouTube](https://livecodingyoutube.github.io/).

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
git clone [https://github.com/TU_USUARIO/LiveTube-Coding.git](https://github.com/TU_USUARIO/LiveTube-Coding.git)
cd LiveTube-Coding
