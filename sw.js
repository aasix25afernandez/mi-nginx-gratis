/* ============================================================
   SERVICE WORKER — Colección Vinilos
   Estrategia: Network-first para assets propios.
   → Siempre sirve la versión más nueva del servidor.
   → Si no hay red, sirve desde caché (fallback offline).
   ============================================================ */

const CACHE_NAME = 'vinilos-v1';

/* Assets propios que cacheamos para offline fallback */
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './wishlist.html',
    './admin.html',
    './styles.css',
    './main.js',
    './wishlist.css',
    './wishlist.js',
    './admin.css',
    './admin.js',
    './albums.json',
    './wishlist.json'
];

/* Dominios de terceros que nunca tocamos (CDN, Google Fonts, YouTube…) */
const PASSTHROUGH_ORIGINS = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdnjs.cloudflare.com',
    'youtube.com',
    'www.youtube.com',
    'i.ytimg.com',
    'yt3.ggpht.com'
];

// ── INSTALL: pre-cachear assets propios ──────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS))
    );
    /* Activar inmediatamente sin esperar a que se cierren tabs antiguas */
    self.skipWaiting();
});

// ── ACTIVATE: borrar cachés antiguas ─────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        )
    );
    /* Tomar control de todas las tabs abiertas inmediatamente */
    self.clients.claim();
});

// ── FETCH: network-first para assets propios ─────────────────
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    /* Dejar pasar siempre: peticiones de terceros, no-GET, chrome-extension… */
    if (
        event.request.method !== 'GET' ||
        PASSTHROUGH_ORIGINS.some(o => url.hostname.includes(o)) ||
        url.protocol === 'chrome-extension:' ||
        url.protocol === 'data:'
    ) {
        return; /* sin event.respondWith → comportamiento normal del navegador */
    }

    /* Solo interceptamos el mismo origen */
    if (url.origin !== self.location.origin) return;

    event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);

    /* Normalizar URL: quitar query string (?v=xxx) para buscar en caché */
    const cacheKey = stripQuery(request);

    try {
        /* 1. Intentar red */
        const networkResponse = await fetch(request, { cache: 'no-store' });

        if (networkResponse.ok) {
            /* Guardar la versión nueva en caché (sin query string como clave) */
            cache.put(cacheKey, networkResponse.clone());
        }

        return networkResponse;
    } catch (_) {
        /* 2. Sin red → servir desde caché */
        const cached = await cache.match(cacheKey);
        if (cached) return cached;

        /* 3. No hay caché tampoco → respuesta de error amigable */
        return new Response(
            '<h1 style="font-family:sans-serif;text-align:center;margin-top:20vh">Sin conexión</h1>',
            { headers: { 'Content-Type': 'text/html' } }
        );
    }
}

/* Elimina la query string para usar URLs limpias como claves de caché */
function stripQuery(request) {
    const url = new URL(request.url);
    url.search = '';
    return new Request(url.toString(), { headers: request.headers });
}
