/**
 * Plantilla de configuración local para LiveTube Coding.
 *
 * 1. Copia este archivo como:  js/config.local.js
 * 2. Sustituye TU_CLAVE_YOUTUBE_DATA_API por tu clave de Google Cloud.
 * 3. config.local.js está en .gitignore y NO se sube a GitHub.
 *
 * En Google Cloud Console, restringe la clave:
 * - APIs: solo YouTube Data API v3
 * - Referrers HTTP: tu dominio (ej. https://tuusuario.github.io/*)
 *
 * Si la clave ya estuvo en un repo público, créala de nuevo y revoca la anterior.
 */
window.LIVETUBE_CONFIG = {
  youtubeApiKey: 'TU_CLAVE_YOUTUBE_DATA_API'
};
