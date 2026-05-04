/* ==========================================
   COLECCIÓN VINILOS - v5.0
   YouTube Preview Player (sin Spotify)
   ========================================== */

// ==========================================
// ESTADO GLOBAL
// ==========================================
let albums = [];
let listeningHistory = [];
let favorites = [];
let viewMode = 'grid';
let isLoaded = false;

// ==========================================
// TIPOS DE FORMATO
// ==========================================
const typeLabels = { lp: "LP", ep: "EP", single: "SINGLE", cd: "CD" };

// ==========================================
// ELEMENTOS DOM
// ==========================================
let artistFilter, yearFilter, typeFilter, searchInput, sortSelect;
let collectionGrid, modal;

// ==========================================
// DEBOUNCE
// ==========================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadAlbums();

        artistFilter  = document.getElementById('artist-filter');
        yearFilter    = document.getElementById('year-filter');
        typeFilter    = document.getElementById('type-filter');
        searchInput   = document.getElementById('search');
        sortSelect    = document.getElementById('sort');
        collectionGrid = document.getElementById('collection');
        modal         = document.getElementById('modal');

        loadPersistentData();

        initLoader();
        initCursor();
        initNavigation();
        initFilters();
        initModal();
        initYouTubeAPI();
        initRoulette();
        initViewToggle();
        initScrollToTop();
        initExport();
        initWhatToListen();
        initStats();

        updateCounter();
        renderAlbums(albums);
        isLoaded = true;
    } catch (error) {
        console.error('Error al inicializar:', error);
        document.querySelector('.loader').innerHTML = `
            <div style="color:#d4ff00;padding:20px;text-align:center;">
                <p>Error al cargar la colección.</p>
                <p style="font-size:.9rem;margin-top:10px;">${error.message}</p>
            </div>`;
    }
});

// ==========================================
// CARGAR ÁLBUMES
// ==========================================
async function loadAlbums() {
    const override = localStorage.getItem('vinyl_collection_override');
    if (override) {
        try {
            albums = JSON.parse(override);
            console.log(`${albums.length} álbumes cargados (datos admin)`);
            return;
        } catch (e) {
            console.warn('Datos locales corruptos, cargando albums.json');
            localStorage.removeItem('vinyl_collection_override');
        }
    }
    const response = await fetch('albums.json');
    if (!response.ok) throw new Error('No se pudo cargar albums.json');
    albums = await response.json();
    console.log(`${albums.length} álbumes cargados`);
}

// ==========================================
// DATOS PERSISTENTES
// ==========================================
function loadPersistentData() {
    const history = localStorage.getItem('listeningHistory');
    const favs    = localStorage.getItem('favorites');
    if (history) {
        listeningHistory = JSON.parse(history);
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        listeningHistory = listeningHistory.filter(h => h.timestamp > thirtyDaysAgo);
    }
    if (favs) favorites = JSON.parse(favs);
}

function saveListeningHistory() { localStorage.setItem('listeningHistory', JSON.stringify(listeningHistory)); }
function saveFavorites()        { localStorage.setItem('favorites', JSON.stringify(favorites)); }

function toggleFavorite(albumId) {
    const index = favorites.indexOf(albumId);
    if (index === -1) { favorites.push(albumId); } else { favorites.splice(index, 1); }
    saveFavorites();
    return index === -1;
}

// ==========================================
// LOADER
// ==========================================
function initLoader() {
    const loader = document.querySelector('.loader');
    if (!loader) return;
    setTimeout(() => {
        loader.classList.add('hidden');
        document.body.style.overflow = 'auto';
        requestAnimationFrame(animateVinyls);
    }, 800);
}

// ==========================================
// CUSTOM CURSOR
// ==========================================
function initCursor() {
    const cursor    = document.querySelector('.cursor');
    const cursorDot = document.querySelector('.cursor-dot');
    if (!cursor || !cursorDot) return;
    if (window.matchMedia('(hover: none)').matches) {
        cursor.style.display = 'none';
        cursorDot.style.display = 'none';
        return;
    }

    let mouseX = 0, mouseY = 0, cursorX = 0, cursorY = 0;
    let dotX = 0, dotY = 0, rafId = null, mouseMoved = false;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX; mouseY = e.clientY;
        if (!mouseMoved) { mouseMoved = true; if (!rafId) rafId = requestAnimationFrame(animateCursor); }
    }, { passive: true });

    function animateCursor() {
        const dx = mouseX - cursorX, dy = mouseY - cursorY;
        const ddx = mouseX - dotX,   ddy = mouseY - dotY;
        cursorX += dx * 0.15; cursorY += dy * 0.15;
        cursor.style.left = cursorX + 'px'; cursor.style.top = cursorY + 'px';
        dotX += ddx * 0.35; dotY += ddy * 0.35;
        cursorDot.style.left = dotX + 'px'; cursorDot.style.top = dotY + 'px';
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 && Math.abs(ddx) < 0.1 && Math.abs(ddy) < 0.1) {
            rafId = null; mouseMoved = false;
        } else { rafId = requestAnimationFrame(animateCursor); }
    }

    document.querySelectorAll('a, button, .vinyl, .controls input, .controls select, .action-btn')
        .forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
        });
}

// ==========================================
// NAVIGATION
// ==========================================
function initNavigation() {
    const nav = document.querySelector('nav');
    if (!nav) return;
    let lastScrollY = window.scrollY, ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const cur = window.scrollY;
                nav.classList.toggle('hidden', cur > lastScrollY && cur > 100);
                lastScrollY = cur; ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

// ==========================================
// FILTERS
// ==========================================
function initFilters() {
    [...new Set(albums.map(a => a.artist))].sort().forEach(artist => {
        const count = albums.filter(a => a.artist === artist).length;
        const opt = document.createElement('option');
        opt.value = artist;
        opt.textContent = `${artist} · ${count}`;
        artistFilter.appendChild(opt);
    });

    [...new Set(albums.map(a => a.year))].sort((a, b) => b - a).forEach(year => {
        const count = albums.filter(a => a.year === year).length;
        const opt = document.createElement('option');
        opt.value = year; opt.textContent = `${year} · ${count}`;
        yearFilter.appendChild(opt);
    });

    [...new Set(albums.map(a => a.type))].forEach(type => {
        const count = albums.filter(a => a.type === type).length;
        const opt = document.createElement('option');
        opt.value = type; opt.textContent = `${typeLabels[type] || type.toUpperCase()} · ${count}`;
        typeFilter.appendChild(opt);
    });

    const debouncedUpdate = debounce(updateCollection, 150);
    searchInput.addEventListener('input',   debouncedUpdate, { passive: true });
    artistFilter.addEventListener('change', updateCollection);
    yearFilter.addEventListener('change',   updateCollection);
    typeFilter.addEventListener('change',   updateCollection);
    sortSelect.addEventListener('change',   updateCollection);
}

// ==========================================
// ACTION BUTTONS
// ==========================================
function initActionButtons() {
    const actionsHTML = `
        <div class="actions-menu" id="actions-menu">
            <button class="action-btn" id="action-toggle" title="Acciones">
                <i class="fa-solid fa-sliders"></i>
                <span>Acciones</span>
            </button>
            <div class="actions-dropdown" id="actions-dropdown">
                <button class="dropdown-item" id="view-toggle">
                    <i class="fa-solid fa-table-cells-large"></i>
                    <span>Grid</span>
                </button>
                <button class="dropdown-item" id="what-to-listen">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                    <span>¿Qué escucho hoy?</span>
                </button>
                <button class="dropdown-item" id="export-btn">
                    <i class="fa-solid fa-download"></i>
                    <span>Exportar</span>
                </button>
                <button class="dropdown-item" id="stats-btn">
                    <i class="fa-solid fa-chart-simple"></i>
                    <span>Estadísticas</span>
                </button>
                <div class="dropdown-separator"></div>
                <a href="admin.html" class="dropdown-item dropdown-item-admin">
                    <i class="fa-solid fa-gear"></i>
                    <span>Panel Admin</span>
                </a>
            </div>
        </div>`;
    document.querySelector('.controls').insertAdjacentHTML('beforeend', actionsHTML);

    const toggle   = document.getElementById('action-toggle');
    const dropdown = document.getElementById('actions-dropdown');

    toggle.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('open'); });
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== toggle) dropdown.classList.remove('open');
    });

    document.getElementById('view-toggle').addEventListener('click', () => {
        viewMode = viewMode === 'grid' ? 'list' : 'grid';
        updateViewToggleUI(); updateCollection(); dropdown.classList.remove('open');
    });
    document.getElementById('what-to-listen').addEventListener('click', () => { openWhatToListen(); dropdown.classList.remove('open'); });
    document.getElementById('export-btn').addEventListener('click', () => { showExportOptions(); dropdown.classList.remove('open'); });
    document.getElementById('stats-btn').addEventListener('click', () => { openStats(); dropdown.classList.remove('open'); });
}

function updateViewToggleUI() {
    const btn = document.getElementById('view-toggle');
    if (!btn) return;
    const icon = btn.querySelector('i'), text = btn.querySelector('span');
    if (viewMode === 'list') {
        icon.className = 'fa-solid fa-list'; text.textContent = 'Lista';
        collectionGrid.classList.add('list-view');
    } else {
        icon.className = 'fa-solid fa-table-cells-large'; text.textContent = 'Grid';
        collectionGrid.classList.remove('list-view');
    }
}

function initViewToggle() { initActionButtons(); updateViewToggleUI(); }

// ==========================================
// SCROLL TO TOP
// ==========================================
function initScrollToTop() {
    document.body.insertAdjacentHTML('beforeend',
        `<button class="scroll-top-btn" id="scroll-top" title="Volver arriba">
            <i class="fa-solid fa-arrow-up"></i>
         </button>`);
    const btn = document.getElementById('scroll-top');
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => { btn.classList.toggle('visible', window.scrollY > 500); ticking = false; });
            ticking = true;
        }
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ==========================================
// EXPORTAR COLECCIÓN
// ==========================================
function initExport() {}

function showExportOptions() {
    document.getElementById('export-backdrop')?.remove();
    document.getElementById('export-options')?.remove();

    const backdropEl = document.createElement('div');
    backdropEl.id = 'export-backdrop';
    backdropEl.style.cssText = 'position:fixed;inset:0;z-index:1199;';
    backdropEl.addEventListener('click', hideExportOptions);

    const panelEl = document.createElement('div');
    panelEl.className = 'export-options';
    panelEl.id = 'export-options';
    panelEl.style.zIndex = '1200';
    panelEl.innerHTML = `
        <div class="export-header">
            <span>Formato de exportación</span>
            <button class="export-close" id="export-close">&times;</button>
        </div>
        <div class="export-buttons">
            <button class="export-option" data-format="csv">
                <i class="fa-solid fa-file-csv"></i><span>CSV (Excel)</span>
            </button>
            <button class="export-option" data-format="print">
                <i class="fa-solid fa-print"></i><span>Imprimir / PDF</span>
            </button>
            <button class="export-option" data-format="json">
                <i class="fa-solid fa-file-code"></i><span>JSON</span>
            </button>
        </div>`;
    panelEl.addEventListener('click', (e) => e.stopPropagation());

    document.body.appendChild(backdropEl);
    document.body.appendChild(panelEl);

    document.getElementById('export-close').addEventListener('click', hideExportOptions);
    document.querySelectorAll('.export-option').forEach(btn => {
        btn.addEventListener('click', (e) => { exportCollection(e.currentTarget.dataset.format); hideExportOptions(); });
    });
}

function hideExportOptions() {
    document.getElementById('export-options')?.remove();
    document.getElementById('export-backdrop')?.remove();
}

function exportCollection(format) {
    const filtered = getFilteredAlbums();
    const timestamp = new Date().toISOString().split('T')[0];
    if (format === 'csv')   exportCSV(filtered, timestamp);
    else if (format === 'print') exportPrint(filtered, timestamp);
    else if (format === 'json')  exportJSON(filtered, timestamp);
}

function exportCSV(albumList, timestamp) {
    const headers = ['ID','Título','Artista','Año','Formato','Pistas','Duración Total'];
    const rows = albumList.map(album => [
        `"${album.id}"`,
        `"${album.title.replace(/"/g,'""')}"`,
        `"${album.artist.replace(/"/g,'""')}"`,
        album.year,
        typeLabels[album.type] || album.type.toUpperCase(),
        album.tracks.length,
        calculateTotalDuration(album.tracks)
    ].join(','));
    downloadFile([headers.join(','), ...rows].join('\n'), `coleccion_${timestamp}.csv`, 'text/csv');
}

function exportJSON(albumList, timestamp) {
    downloadFile(JSON.stringify(albumList, null, 2), `coleccion_${timestamp}.json`, 'application/json');
}

function exportPrint(albumList, timestamp) {
    const printWindow = window.open('', '_blank');
    let totalSeconds = 0;
    albumList.forEach(a => a.tracks.forEach(t => { totalSeconds += parseDuration(t.duration); }));
    const hours = Math.floor(totalSeconds / 3600), minutes = Math.floor((totalSeconds % 3600) / 60);
    const lpCount = albumList.filter(a => a.type === 'lp').length;
    const epCount = albumList.filter(a => a.type === 'ep').length;
    const singleCount = albumList.filter(a => a.type === 'single').length;
    const cdCount = albumList.filter(a => a.type === 'cd').length;
    const printContent = `<!DOCTYPE html><html><head><title>Colección - ${timestamp}</title>
    <style>@page{size:A4;margin:1.5cm}*{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',sans-serif;font-size:10px;line-height:1.3;color:#333}
    .header{text-align:center;padding-bottom:20px;border-bottom:3px solid #1a1a1a;margin-bottom:20px}
    .header h1{font-size:24px;text-transform:uppercase;letter-spacing:3px}
    .stats{display:flex;justify-content:center;gap:30px;margin:15px 0;padding:10px;background:#f5f5f5;border-radius:8px;flex-wrap:wrap}
    .stat{text-align:center}.stat-value{font-size:18px;font-weight:bold}.stat-label{font-size:9px;color:#666;text-transform:uppercase}
    .album-list{display:grid;grid-template-columns:repeat(2,1fr);gap:15px}
    .album{display:flex;gap:12px;padding:12px;border:1px solid #e0e0e0;border-radius:8px;break-inside:avoid}
    .album-cover{width:60px;height:60px;flex-shrink:0;background:#f0f0f0;border-radius:4px;overflow:hidden}
    .album-cover img{width:100%;height:100%;object-fit:cover}
    .album-title{font-size:11px;font-weight:600;margin-bottom:3px}
    .album-artist{font-size:10px;color:#555;margin-bottom:4px}
    .album-meta{display:flex;gap:10px;font-size:9px;color:#777;flex-wrap:wrap}
    .album-meta span{background:#f0f0f0;padding:2px 6px;border-radius:3px}
    .footer{margin-top:30px;padding-top:15px;border-top:1px solid #e0e0e0;text-align:center;font-size:9px;color:#999}
    </style></head><body>
    <div class="header"><h1>Colección de Vinilos</h1><p>Exportado el ${timestamp}</p>
    <div class="stats">
        <div class="stat"><div class="stat-value">${albumList.length}</div><div class="stat-label">Álbumes</div></div>
        ${lpCount>0?`<div class="stat"><div class="stat-value">${lpCount}</div><div class="stat-label">LPs</div></div>`:''}
        ${epCount>0?`<div class="stat"><div class="stat-value">${epCount}</div><div class="stat-label">EPs</div></div>`:''}
        ${singleCount>0?`<div class="stat"><div class="stat-value">${singleCount}</div><div class="stat-label">Singles</div></div>`:''}
        ${cdCount>0?`<div class="stat"><div class="stat-value">${cdCount}</div><div class="stat-label">CDs</div></div>`:''}
        <div class="stat"><div class="stat-value">${hours}h ${minutes}m</div><div class="stat-label">Duración</div></div>
    </div></div>
    <div class="album-list">${albumList.map(a=>`
        <div class="album">
            <div class="album-cover"><img src="${a.cover}" alt="${a.title}"></div>
            <div>
                <div class="album-title">${a.title}</div>
                <div class="album-artist">${a.artist}</div>
                <div class="album-meta">
                    <span>${a.year}</span>
                    <span>${typeLabels[a.type]||a.type.toUpperCase()}</span>
                    <span>${a.tracks.length} pistas</span>
                </div>
            </div>
        </div>`).join('')}
    </div>
    <div class="footer"><p>Colección personal de vinilos - Generado automáticamente</p></div>
    </body></html>`;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ==========================================
// ¿QUÉ ESCUCHO HOY?
// ==========================================
function initWhatToListen() {}

function openWhatToListen() {
    const pool = getFilteredAlbums();
    if (pool.length === 0) { alert('No hay álbumes con los filtros actuales'); return; }
    const selection = pickSmartAlbum(pool);
    listeningHistory.push({ albumId: selection.id, timestamp: Date.now() });
    saveListeningHistory();
    setTimeout(() => openAlbum(selection), 100);
}

function pickSmartAlbum(pool) {
    const now = Date.now(), twentyFourHours = 24 * 60 * 60 * 1000;
    const recentIds  = new Set(listeningHistory.filter(h => now - h.timestamp < twentyFourHours).map(h => h.albumId));
    const playCount  = {};
    listeningHistory.forEach(h => { playCount[h.albumId] = (playCount[h.albumId] || 0) + 1; });
    const available  = pool.filter(a => !recentIds.has(a.id));
    if (available.length > 0) {
        const weights    = available.map(a => 1 / (playCount[a.id] || 1));
        const totalW     = weights.reduce((a, b) => a + b, 0);
        let rnd = Math.random() * totalW;
        for (let i = 0; i < available.length; i++) { rnd -= weights[i]; if (rnd <= 0) return available[i]; }
        return available[available.length - 1];
    }
    const sorted = [...pool].sort((a, b) => (playCount[a.id] || 0) - (playCount[b.id] || 0));
    const top3   = sorted.slice(0, Math.min(3, pool.length));
    return top3[Math.floor(Math.random() * top3.length)];
}

// ==========================================
// ESTADÍSTICAS
// ==========================================
function initStats() {}

function openStats() {
    const s = calculateStats();
    const html = `
        <div class="stats-overlay" id="stats-overlay">
            <div class="stats-panel">
                <div class="stats-header">
                    <h2><i class="fa-solid fa-chart-simple"></i> Estadísticas de Colección</h2>
                    <button class="stats-close" id="stats-close">&times;</button>
                </div>
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-card-value">${s.totalAlbums}</div><div class="stat-card-label">Álbumes Totales</div></div>
                    <div class="stat-card"><div class="stat-card-value">${s.totalArtists}</div><div class="stat-card-label">Artistas Únicos</div></div>
                    <div class="stat-card"><div class="stat-card-value">${s.totalTracks}</div><div class="stat-card-label">Canciones Totales</div></div>
                    <div class="stat-card"><div class="stat-card-value">${s.totalDurationFormatted}</div><div class="stat-card-label">Duración Total</div></div>
                </div>
                <div class="stats-section">
                    <h3>Por Formato</h3>
                    <div class="format-bars">
                        ${Object.entries(s.byType).map(([type, count]) => `
                            <div class="format-bar">
                                <div class="format-bar-label"><span>${typeLabels[type]||type.toUpperCase()}</span><span>${count} (${Math.round(count/s.totalAlbums*100)}%)</span></div>
                                <div class="format-bar-track"><div class="format-bar-fill" style="width:${(count/s.totalAlbums)*100}%"></div></div>
                            </div>`).join('')}
                    </div>
                </div>
                <div class="stats-section">
                    <h3>Por Década</h3>
                    <div class="decade-grid">
                        ${Object.entries(s.byDecade).map(([d, c]) => `
                            <div class="decade-item"><span class="decade-label">${d}s</span><span class="decade-count">${c}</span></div>`).join('')}
                    </div>
                </div>
                <div class="stats-section">
                    <h3>Top 5 Artistas</h3>
                    <div class="top-artists">
                        ${s.topArtists.map((item, i) => `
                            <div class="top-artist"><span class="top-artist-rank">#${i+1}</span><span class="top-artist-name">${item.artist}</span><span class="top-artist-count">${item.count} álbumes</span></div>`).join('')}
                    </div>
                </div>
                <div class="stats-section">
                    <h3>Extremos</h3>
                    <div class="extremes-grid">
                        <div class="extreme-item"><span class="extreme-label">Más Antiguo</span><span class="extreme-value">${s.oldestAlbum.title} (${s.oldestAlbum.year})</span></div>
                        <div class="extreme-item"><span class="extreme-label">Más Reciente</span><span class="extreme-value">${s.newestAlbum.title} (${s.newestAlbum.year})</span></div>
                        <div class="extreme-item"><span class="extreme-label">Más Pistas</span><span class="extreme-value">${s.mostTracks.title} (${s.mostTracks.trackCount} pistas)</span></div>
                        <div class="extreme-item"><span class="extreme-label">Más Duradero</span><span class="extreme-value">${s.longestAlbum.title} (${s.longestAlbum.duration})</span></div>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('stats-close').addEventListener('click', () => document.getElementById('stats-overlay').remove());
    document.getElementById('stats-overlay').addEventListener('click', (e) => { if (e.target.id === 'stats-overlay') document.getElementById('stats-overlay').remove(); });
}

function calculateStats() {
    const totalAlbums   = albums.length;
    const totalArtists  = new Set(albums.map(a => a.artist)).size;
    const totalTracks   = albums.reduce((acc, a) => acc + a.tracks.length, 0);
    let totalSeconds    = 0;
    albums.forEach(a => a.tracks.forEach(t => { totalSeconds += parseDuration(t.duration); }));
    const hours = Math.floor(totalSeconds / 3600), minutes = Math.floor((totalSeconds % 3600) / 60);
    const byType = {}, byDecade = {}, artistCount = {};
    albums.forEach(a => {
        byType[a.type]   = (byType[a.type] || 0) + 1;
        const decade     = Math.floor(a.year / 10) * 10;
        byDecade[decade] = (byDecade[decade] || 0) + 1;
        artistCount[a.artist] = (artistCount[a.artist] || 0) + 1;
    });
    const topArtists    = Object.entries(artistCount).map(([artist, count]) => ({ artist, count })).sort((a,b)=>b.count-a.count).slice(0,5);
    const sortedByYear  = [...albums].sort((a,b)=>a.year-b.year);
    const albumDurations= albums.map(a => ({ title:a.title, duration:calculateTotalDuration(a.tracks), seconds:a.tracks.reduce((acc,t)=>acc+parseDuration(t.duration),0) }));
    const mostTracksAlbum = [...albums].sort((a,b)=>b.tracks.length-a.tracks.length)[0];
    return {
        totalAlbums, totalArtists, totalTracks,
        totalDurationFormatted: `${hours}h ${minutes}m`,
        byType, byDecade, topArtists,
        oldestAlbum: sortedByYear[0],
        newestAlbum: sortedByYear[sortedByYear.length-1],
        mostTracks:  { title: mostTracksAlbum.title, trackCount: mostTracksAlbum.tracks.length },
        longestAlbum: albumDurations.sort((a,b)=>b.seconds-a.seconds)[0]
    };
}

// ==========================================
// COUNTER
// ==========================================
function updateCounter() {
    const lp = albums.filter(a=>a.type==='lp').length;
    const ep = albums.filter(a=>a.type==='ep').length;
    const single = albums.filter(a=>a.type==='single').length;
    const cd = albums.filter(a=>a.type==='cd').length;
    document.getElementById('counter').innerHTML = `
        <span class="counter-item"><span class="counter-number">${lp}</span><span class="counter-label">LP</span></span>
        <span class="counter-item"><span class="counter-number">${ep}</span><span class="counter-label">EP</span></span>
        <span class="counter-item"><span class="counter-number">${single}</span><span class="counter-label">SINGLES</span></span>
        <span class="counter-item"><span class="counter-number">${cd}</span><span class="counter-label">CD</span></span>`;
}

// ==========================================
// FILTERING & SORTING
// ==========================================
function getFilteredAlbums() {
    return albums.filter(album => {
        const q = searchInput.value.toLowerCase();
        return (!q || album.title.toLowerCase().includes(q) || album.artist.toLowerCase().includes(q))
            && (!artistFilter.value || album.artist === artistFilter.value)
            && (!yearFilter.value  || album.year  === parseInt(yearFilter.value))
            && (!typeFilter.value  || album.type  === typeFilter.value);
    });
}

function sortAlbums(list) {
    const sorted = [...list];
    switch (sortSelect.value) {
        case 'title':  sorted.sort((a,b) => a.title.localeCompare(b.title));   break;
        case 'artist': sorted.sort((a,b) => a.artist.localeCompare(b.artist)); break;
        case 'year':   sorted.sort((a,b) => b.year - a.year);                  break;
    }
    return sorted;
}

// ==========================================
// RENDER
// ==========================================
function updateCollection() {
    if (!isLoaded) return;
    renderAlbums(sortAlbums(getFilteredAlbums()));
}

function renderAlbums(list) {
    collectionGrid.innerHTML = '';
    if (list.length === 0) {
        collectionGrid.innerHTML = `<div class="no-results"><i class="fa-solid fa-record-vinyl"></i><p>No se encontraron álbumes</p></div>`;
        return;
    }

    const searchTerm = searchInput.value.toLowerCase().trim();
    const BATCH = 20;
    let index = 0;

    function buildCard(album) {
        const vinyl = document.createElement('div');
        vinyl.className = 'vinyl';
        const isFav = favorites.includes(album.id);
        const hTitle  = searchTerm ? highlightText(album.title,  searchTerm) : album.title;
        const hArtist = searchTerm ? highlightText(album.artist, searchTerm) : album.artist;

        if (viewMode === 'list') {
            vinyl.innerHTML = `
                <div class="vinyl-cover">
                    <img src="${album.cover}" alt="${album.title}" loading="lazy" width="56" height="56" decoding="async">
                    <span class="vinyl-type">${typeLabels[album.type]||album.type.toUpperCase()}</span>
                </div>
                <div class="vinyl-list-info">
                    <h3>${hTitle}</h3>
                    <div class="vinyl-meta">
                        <span class="vinyl-artist">${hArtist}</span>
                        <div class="vinyl-meta-badges">
                            <span class="vinyl-year">${album.year}</span>
                            <span class="vinyl-tracks">${album.tracks.length} pistas</span>
                        </div>
                    </div>
                </div>
                <button class="favorite-btn ${isFav?'active':''}" data-album-id="${album.id}">
                    <i class="fa-${isFav?'solid':'regular'} fa-heart"></i>
                </button>`;
        } else {
            vinyl.innerHTML = `
                <div class="vinyl-cover">
                    <img src="${album.cover}" alt="${album.title}" loading="lazy" width="200" height="200" decoding="async">
                    <span class="vinyl-type">${typeLabels[album.type]||album.type.toUpperCase()}</span>
                    <button class="favorite-btn ${isFav?'active':''}" data-album-id="${album.id}">
                        <i class="fa-${isFav?'solid':'regular'} fa-heart"></i>
                    </button>
                </div>
                <h3>${hTitle}</h3>
                <div class="vinyl-meta">
                    <span class="vinyl-artist">${hArtist}</span>
                    <span class="vinyl-year">${album.year}</span>
                </div>`;
        }

        vinyl.addEventListener('click', (e) => { if (!e.target.closest('.favorite-btn')) openAlbum(album); });
        vinyl.querySelector('.favorite-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const isNow = toggleFavorite(album.id);
            const btn = e.currentTarget, icon = btn.querySelector('i');
            btn.classList.toggle('active', isNow);
            icon.className = `fa-${isNow?'solid':'regular'} fa-heart`;
        });
        return vinyl;
    }

    function renderBatch(deadline) {
        const frag = document.createDocumentFragment();
        while (index < list.length && (deadline.timeRemaining() > 2 || index < BATCH)) {
            frag.appendChild(buildCard(list[index++]));
        }
        collectionGrid.appendChild(frag);
        collectionGrid.querySelectorAll('.vinyl:not(.visible)').forEach(v => getVinylObserver().observe(v));
        if (index < list.length) {
            if ('requestIdleCallback' in window) requestIdleCallback(renderBatch, { timeout: 200 });
            else setTimeout(() => renderBatch({ timeRemaining: () => 10 }), 16);
        }
    }

    if ('requestIdleCallback' in window) requestIdleCallback(renderBatch, { timeout: 200 });
    else setTimeout(() => renderBatch({ timeRemaining: () => 10 }), 0);
}

function highlightText(text, term) {
    return text.replace(new RegExp(`(${escapeRegex(term)})`, 'gi'), '<mark>$1</mark>');
}
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

let _vinylObserver = null;
function getVinylObserver() {
    if (_vinylObserver) return _vinylObserver;
    _vinylObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { entry.target.classList.add('visible'); _vinylObserver.unobserve(entry.target); }
        });
    }, { rootMargin: '0px 0px 80px 0px', threshold: 0.05 });
    return _vinylObserver;
}
function animateVinyls() {
    document.querySelectorAll('.vinyl:not(.visible)').forEach(v => getVinylObserver().observe(v));
}

// ==========================================
// YOUTUBE PREVIEW PLAYER
// ==========================================

/* Estado del reproductor */
let ytPlayer      = null;   // instancia YT.Player
let ytReady       = false;  // API cargada
let ytPendingPlay = null;   // { ytId, ytStart } pendiente hasta que API esté lista
let ytPreviewTimer = null;  // setTimeout de 30 s
let ytContainerId = 'yt-hidden-player';
let ytActiveTrackEl = null; // <div class="track"> activo

/* Duración del preview en segundos */
const YT_PREVIEW_DURATION = 30;

/* Inyectar contenedor oculto del player */
function injectYTContainer() {
    if (document.getElementById(ytContainerId)) return;
    const wrap = document.createElement('div');
    wrap.id = 'yt-player-wrap';
    wrap.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;z-index:-1;';
    wrap.innerHTML = `<div id="${ytContainerId}"></div>`;
    document.body.appendChild(wrap);
}

/* Cargar YouTube IFrame API una sola vez */
function initYouTubeAPI() {
    injectYTContainer();
    if (window.YT && window.YT.Player) { ytReady = true; return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
}

/* Callback global requerido por YouTube */
window.onYouTubeIframeAPIReady = function () {
    ytReady = true;
    if (ytPendingPlay) {
        const p = ytPendingPlay; ytPendingPlay = null;
        _doPlay(p.ytId, p.ytStart);
    }
};

/* API pública: reproducir pista */
function playYTPreview(ytId, ytStart, trackEl) {
    if (!ytId) return;
    ytStart = parseInt(ytStart) || 0;

    /* Detener preview anterior */
    stopYTPreview(false);

    /* Marcar pista activa */
    ytActiveTrackEl = trackEl;
    if (trackEl) trackEl.classList.add('yt-playing');

    if (!ytReady) {
        ytPendingPlay = { ytId, ytStart };
        return;
    }
    _doPlay(ytId, ytStart);
}

function _doPlay(ytId, ytStart) {
    if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
        ytPlayer.loadVideoById({ videoId: ytId, startSeconds: ytStart });
    } else {
        ytPlayer = new YT.Player(ytContainerId, {
            width: '1', height: '1',
            videoId: ytId,
            playerVars: {
                autoplay: 1,
                start:    ytStart,
                controls: 0,
                disablekb: 1,
                fs: 0,
                rel: 0,
                playsinline: 1,
                origin: window.location.origin
            },
            events: {
                onReady: (e) => { e.target.setVolume(100); e.target.playVideo(); },
                onStateChange: onYTStateChange,
                onError: () => stopYTPreview(true)
            }
        });
    }

    /* Mini-player UI */
    showMiniPlayer(ytId, ytStart);

    /* Auto-stop tras 30 s */
    clearTimeout(ytPreviewTimer);
    ytPreviewTimer = setTimeout(() => stopYTPreview(true), YT_PREVIEW_DURATION * 1000);
}

function onYTStateChange(event) {
    /* Si el video termina antes de los 30 s */
    if (event.data === YT.PlayerState.ENDED) stopYTPreview(true);
}

/* Detener y limpiar */
function stopYTPreview(animate) {
    clearTimeout(ytPreviewTimer);
    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
        try { ytPlayer.pauseVideo(); } catch (e) {}
    }
    if (ytActiveTrackEl) { ytActiveTrackEl.classList.remove('yt-playing'); ytActiveTrackEl = null; }
    hideMiniPlayer(animate);
}

/* ── MINI-PLAYER UI ── */
let miniPlayerEl = null;
let miniProgressRaf = null;
let miniStartTime = 0;

function showMiniPlayer(ytId, ytStart) {
    if (!miniPlayerEl) {
        miniPlayerEl = document.createElement('div');
        miniPlayerEl.id = 'yt-mini-player';
        miniPlayerEl.innerHTML = `
            <div class="ymp-bar">
                <div class="ymp-progress-track">
                    <div class="ymp-progress-fill" id="ymp-fill"></div>
                </div>
            </div>
            <div class="ymp-body">
                <div class="ymp-icon"><i class="fa-brands fa-youtube"></i></div>
                <div class="ymp-text">
                    <div class="ymp-track-name" id="ymp-track-name">Cargando…</div>
                    <div class="ymp-time" id="ymp-time">${YT_PREVIEW_DURATION}s · Preview</div>
                </div>
                <button class="ymp-stop" id="ymp-stop" title="Detener (ESC)">
                    <i class="fa-solid fa-stop"></i>
                </button>
            </div>`;
        document.body.appendChild(miniPlayerEl);
        document.getElementById('ymp-stop').addEventListener('click', () => stopYTPreview(true));
    }

    /* Nombre de la pista desde el elemento activo */
    const trackTitle = ytActiveTrackEl
        ? (ytActiveTrackEl.querySelector('.track-title')?.textContent || 'Preview')
        : 'Preview';
    const trackCode  = ytActiveTrackEl
        ? (ytActiveTrackEl.querySelector('.track-code')?.textContent || '')
        : '';
    document.getElementById('ymp-track-name').textContent = trackCode ? `${trackCode} · ${trackTitle}` : trackTitle;
    document.getElementById('ymp-fill').style.width = '0%';
    document.getElementById('ymp-time').textContent = `${YT_PREVIEW_DURATION}s · Preview`;

    miniPlayerEl.classList.remove('ymp-hide');
    miniPlayerEl.classList.add('ymp-show');

    /* Barra de progreso animada */
    miniStartTime = performance.now();
    cancelAnimationFrame(miniProgressRaf);
    animateMiniProgress();
}

function animateMiniProgress() {
    const elapsed  = (performance.now() - miniStartTime) / 1000;
    const progress = Math.min(elapsed / YT_PREVIEW_DURATION, 1);
    const remaining = Math.max(0, Math.ceil(YT_PREVIEW_DURATION - elapsed));
    const fill = document.getElementById('ymp-fill');
    const time = document.getElementById('ymp-time');
    if (fill) fill.style.width = (progress * 100) + '%';
    if (time) time.textContent = `${remaining}s · Preview`;
    if (progress < 1) miniProgressRaf = requestAnimationFrame(animateMiniProgress);
}

function hideMiniPlayer(animate) {
    cancelAnimationFrame(miniProgressRaf);
    if (!miniPlayerEl) return;
    if (animate) {
        miniPlayerEl.classList.add('ymp-hide');
        miniPlayerEl.classList.remove('ymp-show');
        setTimeout(() => {
            if (miniPlayerEl && miniPlayerEl.classList.contains('ymp-hide')) {
                miniPlayerEl.classList.remove('ymp-hide', 'ymp-show');
            }
        }, 350);
    } else {
        miniPlayerEl.classList.remove('ymp-show', 'ymp-hide');
    }
}

// ==========================================
// MODAL
// ==========================================

/*
 * Lógica de cierre en dos pasos:
 * 1. Si mini-player activo → solo detener preview (primer ESC / clic fuera)
 * 2. Si modal abierto sin preview → cerrar modal
 */
function initModal() {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) handleModalOutsideClick();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) handleEsc();
    });
}

function handleModalOutsideClick() {
    if (ytActiveTrackEl) {
        stopYTPreview(true);   // primer clic fuera: solo cierra el reproductor
    } else {
        closeAlbum();          // segundo clic fuera: cierra el modal
    }
}

function handleEsc() {
    if (ytActiveTrackEl) {
        stopYTPreview(true);   // primer ESC: solo cierra el reproductor
    } else {
        closeAlbum();          // segundo ESC: cierra el modal
    }
}

function openAlbum(album) {
    /* Si había preview activo de antes, limpiar sin animación */
    stopYTPreview(false);

    const tracksHTML  = renderTracklist(album);
    const totalDuration = calculateTotalDuration(album.tracks);
    const isFavorite  = favorites.includes(album.id);

    /* ¿Tiene alguna pista con ytId? */
    const hasYT = album.tracks.some(t => t.ytId);

    document.getElementById('modal-content').innerHTML = `
        <div class="modal-cover">
            <img src="${album.cover}" alt="${album.title}">
            <span class="modal-type">${typeLabels[album.type]||album.type.toUpperCase()}</span>
            <button class="modal-favorite-btn ${isFavorite?'active':''}" id="modal-favorite-btn">
                <i class="fa-${isFavorite?'solid':'regular'} fa-heart"></i>
            </button>
        </div>
        <div class="modal-info">
            <h2>${album.title}</h2>
            <div class="modal-meta">
                <span class="artist">${album.artist}</span>
                <span class="divider">•</span>
                <span class="year">${album.year}</span>
                <span class="divider">•</span>
                <span class="total-duration">${totalDuration}</span>
            </div>
            ${hasYT ? `<p class="yt-hint"><i class="fa-solid fa-circle-play"></i> Clic en una pista para escuchar un preview de 30 segundos</p>` : ''}
            <div class="tracklist">
                <div class="tracklist-header"><span>Pista</span><span>Título</span><span>Duración</span></div>
                ${tracksHTML}
            </div>
        </div>`;

    /* Botón favorito */
    document.getElementById('modal-favorite-btn').addEventListener('click', () => {
        const isNow = toggleFavorite(album.id);
        const btn   = document.getElementById('modal-favorite-btn');
        btn.classList.toggle('active', isNow);
        btn.querySelector('i').className = `fa-${isNow?'solid':'regular'} fa-heart`;
    });

    /* Clicks en pistas con ytId */
    document.querySelectorAll('.track[data-yt-id]').forEach(trackEl => {
        trackEl.addEventListener('click', () => {
            const ytId    = trackEl.dataset.ytId;
            const ytStart = trackEl.dataset.ytStart;

            /* Si esta pista ya está sonando, detenerla */
            if (trackEl.classList.contains('yt-playing')) {
                stopYTPreview(true);
                return;
            }
            playYTPreview(ytId, ytStart, trackEl);
        });
    });

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function renderTracklist(album) {
    const tracks = album.tracks;
    const sides  = {};

    tracks.forEach(track => {
        const m    = track.code.match(/^([A-Z])/);
        const side = m ? m[1] : 'X';
        if (!sides[side]) sides[side] = [];
        sides[side].push(track);
    });

    let html = '';
    Object.keys(sides).sort().forEach(side => {
        html += `<div class="track-side-separator"><span>CARA ${side}</span></div>`;
        sides[side].forEach(track => {
            const hasYT   = !!track.ytId;
            const ytAttrs = hasYT
                ? `data-yt-id="${track.ytId}" data-yt-start="${track.ytStart||0}"`
                : '';
            html += `
                <div class="track${hasYT?' yt-track':''}" ${ytAttrs}>
                    <span class="track-code">${track.code}</span>
                    <span class="track-title">
                        ${track.title}
                        ${hasYT ? `<span class="yt-play-icon"><i class="fa-solid fa-play"></i></span>` : ''}
                    </span>
                    <span class="track-duration">${track.duration}</span>
                </div>`;
        });
    });
    return html;
}

function closeAlbum() {
    stopYTPreview(false);
    modal.classList.remove('open');
    document.body.style.overflow = '';
}

// ==========================================
// UTILIDADES
// ==========================================
function calculateTotalDuration(tracks) {
    if (!tracks || tracks.length === 0) return '0m 0s';
    const totalSeconds = tracks.reduce((acc, t) => acc + parseDuration(t.duration), 0);
    const hours   = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
}

function parseDuration(duration) {
    if (!duration) return 0;
    const parts = duration.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
}

function getAlbumById(id) { return albums.find(a => a.id === id); }

// ==========================================
// RULETA ALEATORIA
// ==========================================
function initRoulette() {
    document.body.insertAdjacentHTML('beforeend', `
        <button class="roulette-fab" id="roulette-fab" aria-label="Ruleta aleatoria" title="Ruleta aleatoria">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
        </button>
        <div class="roulette-overlay" id="roulette-overlay" role="dialog" aria-modal="true">
            <div class="roulette-panel" id="roulette-panel">
                <div class="roulette-header">
                    <h2>RULETA <span>ALEATORIA</span></h2>
                    <div class="roulette-count-label" id="roulette-count-label"></div>
                </div>
                <div class="roulette-stage" id="roulette-stage">
                    <div class="roulette-cover-wrap" id="roulette-cover-wrap">
                        <div class="roulette-cover-placeholder" id="roulette-placeholder">
                            <i class="fa-solid fa-record-vinyl"></i>
                        </div>
                        <img id="roulette-img" src="" alt="" style="display:none;">
                    </div>
                    <div class="roulette-disc"></div>
                </div>
                <div class="roulette-info" id="roulette-info">
                    <div class="r-title" id="roulette-title"></div>
                    <div class="r-meta"  id="roulette-meta"></div>
                </div>
                <button class="roulette-spin-btn" id="roulette-spin-btn">
                    <span class="btn-icon">&#9654;</span>
                    <span id="roulette-btn-label">GIRAR</span>
                </button><br>
                <button class="roulette-open-btn" id="roulette-open-btn">
                    <i class="fa-solid fa-circle-info"></i> Ver ficha del disco
                </button>
                <div class="roulette-hint">ESC o clic fuera para cerrar</div>
            </div>
        </div>`);

    const fab        = document.getElementById('roulette-fab');
    const overlay    = document.getElementById('roulette-overlay');
    const stage      = document.getElementById('roulette-stage');
    const coverWrap  = document.getElementById('roulette-cover-wrap');
    const placeholder= document.getElementById('roulette-placeholder');
    const img        = document.getElementById('roulette-img');
    const infoEl     = document.getElementById('roulette-info');
    const titleEl    = document.getElementById('roulette-title');
    const metaEl     = document.getElementById('roulette-meta');
    const spinBtn    = document.getElementById('roulette-spin-btn');
    const btnLabel   = document.getElementById('roulette-btn-label');
    const openBtn    = document.getElementById('roulette-open-btn');
    const countLabel = document.getElementById('roulette-count-label');

    let spinning = false, currentAlbum = null;

    function getPool()   { return getFilteredAlbums(); }
    function pickRandom(pool) { return pool[Math.floor(Math.random() * pool.length)]; }

    function updateCountLabel() {
        const n = getPool().length;
        countLabel.innerHTML = n === 0 ? 'No hay discos con los filtros actuales' : `<strong>${n}</strong> disco${n!==1?'s':''} en juego`;
    }

    function showCover(album) {
        img.src = album.cover; img.alt = album.title;
        img.style.display = 'block'; placeholder.style.display = 'none';
    }

    function resetStage() {
        img.style.display = 'none'; img.src = '';
        placeholder.style.display = 'flex';
        coverWrap.classList.remove('winner');
        infoEl.classList.remove('revealed');
        titleEl.textContent = ''; metaEl.innerHTML = '';
        openBtn.classList.remove('visible');
        currentAlbum = null;
    }

    function revealWinner(album) {
        currentAlbum = album; showCover(album);
        coverWrap.classList.add('winner');
        titleEl.textContent = album.title;
        metaEl.innerHTML = `
            <span class="r-artist">${album.artist}</span>
            <span style="color:rgba(255,255,255,.2);margin:0 8px">•</span>
            <span>${album.year}</span>
            <span style="color:rgba(255,255,255,.2);margin:0 8px">•</span>
            <span style="color:var(--accent);font-weight:700;text-transform:uppercase;font-size:.75rem">${typeLabels[album.type]||album.type.toUpperCase()}</span>`;
        requestAnimationFrame(() => infoEl.classList.add('revealed'));
        openBtn.classList.add('visible');
    }

    function spin() {
        const pool = getPool();
        if (pool.length === 0 || spinning) return;
        spinning = true; stage.classList.add('spinning'); spinBtn.classList.add('spinning');
        spinBtn.disabled = true; btnLabel.textContent = 'GIRANDO…';
        openBtn.classList.remove('visible'); infoEl.classList.remove('revealed'); coverWrap.classList.remove('winner');
        const DURATION = 2200, start = performance.now(); let lastTick = 0;
        function tick(now) {
            if (!spinning) return;
            const elapsed = now - start, progress = Math.min(elapsed / DURATION, 1);
            const interval = 80 + (260 - 80) * (progress ** 2);
            if (now - lastTick >= interval) { lastTick = now; showCover(pickRandom(pool)); placeholder.style.display = 'none'; }
            if (progress < 1) requestAnimationFrame(tick);
            else finishSpin(pickRandom(pool));
        }
        requestAnimationFrame(tick);
    }

    function finishSpin(winner) {
        spinning = false; stage.classList.remove('spinning'); spinBtn.classList.remove('spinning');
        spinBtn.disabled = false; btnLabel.textContent = 'VOLVER A GIRAR'; revealWinner(winner);
    }

    openBtn.addEventListener('click', () => { if (!currentAlbum) return; closeRoulette(); setTimeout(() => openAlbum(currentAlbum), 320); });

    function openRoulette()  { resetStage(); updateCountLabel(); overlay.classList.add('open'); document.body.style.overflow = 'hidden'; spinBtn.focus(); }
    function closeRoulette() { overlay.classList.remove('open'); document.body.style.overflow = ''; spinning = false; }

    fab.addEventListener('click', openRoulette);
    spinBtn.addEventListener('click', spin);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeRoulette(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('open')) closeRoulette(); });

    ['input','change'].forEach(ev => ['search','artist-filter','year-filter','type-filter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(ev, () => { if (overlay.classList.contains('open')) { updateCountLabel(); resetStage(); btnLabel.textContent = 'GIRAR'; } });
    }));
}
