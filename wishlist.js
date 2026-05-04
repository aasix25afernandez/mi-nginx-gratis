/* ==========================================
   WISHLIST - LÓGICA COMPLETA
   ========================================== */

const typeLabels = { lp: 'LP', ep: 'EP', single: 'Single', cd: 'CD' };
let wishlist = [];

// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadWishlist();
    initLoader();
    initCursor();
    initNav();
    initControls();
    initScrollTop();
    renderStats();
    renderTop3();
    renderList(wishlist);
});

// ==========================================
// CARGAR DATOS
// ==========================================
async function loadWishlist() {
    try {
        const r = await fetch('wishlist.json');
        if (!r.ok) throw new Error('No se pudo cargar wishlist.json');
        wishlist = await r.json();
    } catch (e) {
        console.error(e);
        wishlist = [];
    }
}

// ==========================================
// LOADER
// ==========================================
function initLoader() {
    const loader = document.getElementById('loader');
    setTimeout(() => {
        loader.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }, 700);
}

// ==========================================
// CURSOR
// ==========================================
function initCursor() {
    const cursor = document.querySelector('.cursor');
    const dot    = document.querySelector('.cursor-dot');
    if (!cursor || !dot) return;
    if (window.matchMedia('(hover: none)').matches) {
        cursor.style.display = 'none';
        dot.style.display = 'none';
        return;
    }
    let mx = 0, my = 0, cx = 0, cy = 0, dx = 0, dy = 0, raf = null;
    document.addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        if (!raf) raf = requestAnimationFrame(anim);
    }, { passive: true });
    function anim() {
        cx += (mx - cx) * 0.15; cy += (my - cy) * 0.15;
        dx += (mx - dx) * 0.35; dy += (my - dy) * 0.35;
        cursor.style.left = cx + 'px'; cursor.style.top = cy + 'px';
        dot.style.left    = dx + 'px'; dot.style.top    = dy + 'px';
        raf = Math.abs(mx-cx) > 0.1 ? requestAnimationFrame(anim) : null;
    }
    document.querySelectorAll('a, button, select, input').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
}

// ==========================================
// NAV HIDE ON SCROLL
// ==========================================
function initNav() {
    const nav = document.getElementById('main-nav');
    let last = 0, ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                const cur = window.scrollY;
                nav.classList.toggle('hidden', cur > last && cur > 100);
                last = cur; ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

// ==========================================
// STATS HERO
// ==========================================
function renderStats() {
    const total      = wishlist.length;
    const prices     = wishlist.map(w => parsePrice(w.price)).filter(p => p > 0);
    const totalPrice = prices.reduce((a, b) => a + b, 0);
    const top3count  = wishlist.filter(w => w.priority && w.priority <= 3).length;

    document.getElementById('wish-stats').innerHTML = `
        <div class="wish-stat">
            <span class="wish-stat-num">${total}</span>
            <span class="wish-stat-lbl">Discos en lista</span>
        </div>
        <div class="wish-stat">
            <span class="wish-stat-num">${totalPrice > 0 ? totalPrice.toFixed(0) + '€' : '—'}</span>
            <span class="wish-stat-lbl">Inversión estimada</span>
        </div>
        <div class="wish-stat">
            <span class="wish-stat-num">${top3count}</span>
            <span class="wish-stat-lbl">Alta prioridad</span>
        </div>
    `;
}

function parsePrice(str) {
    if (!str) return 0;
    const n = parseFloat(str.replace(/[^0-9.,]/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
}

// ==========================================
// TOP 3
// ==========================================
function renderTop3() {
    const top = wishlist
        .filter(w => w.priority && w.priority <= 3)
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 3);

    const grid = document.getElementById('top3-grid');

    if (top.length === 0) {
        grid.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem;grid-column:1/-1">
            Ningún disco tiene prioridad asignada aún.</p>`;
        return;
    }

    const rankClass = ['rank-1', 'rank-2', 'rank-3'];

    grid.innerHTML = top.map((w, i) => `
        <div class="top3-card">
            <div class="top3-rank">${w.priority}</div>
            <div class="top3-cover">
                <img src="${esc(w.cover)}" alt="${esc(w.title)}"
                     onerror="this.style.opacity='.3'">
            </div>
            <div class="top3-body">
                <div class="top3-title">${esc(w.title)}</div>
                <div class="top3-artist">${esc(w.artist)} <span style="color:var(--text-muted);font-weight:400">· ${w.year}</span></div>
                ${w.note ? `<div class="top3-note">${esc(w.note)}</div>` : ''}
            </div>
            <div class="top3-right">
                ${w.price ? `<div class="top3-price">${esc(w.price)}</div>` : ''}
                ${w.shop  ? (w.shopUrl
                    ? `<a class="top3-shop-link" href="${esc(w.shopUrl)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-cart-shopping"></i>${esc(w.shop)}</a>`
                    : `<div class="top3-shop-link no-url"><i class="fa-solid fa-cart-shopping"></i>${esc(w.shop)}</div>`)
                  : ''}
            </div>
        </div>
    `).join('');
}

// ==========================================
// LISTA COMPLETA
// ==========================================
function initControls() {
    const search  = document.getElementById('wish-search');
    const type    = document.getElementById('wish-filter-type');
    const sort    = document.getElementById('wish-sort');

    const update = () => renderList(applyFilters());
    search.addEventListener('input',  update);
    type.addEventListener('change',   update);
    sort.addEventListener('change',   update);
}

function applyFilters() {
    const q    = document.getElementById('wish-search').value.toLowerCase().trim();
    const type = document.getElementById('wish-filter-type').value;
    const sort = document.getElementById('wish-sort').value;

    let list = wishlist.filter(w => {
        const matchQ = !q || w.title.toLowerCase().includes(q) || w.artist.toLowerCase().includes(q);
        const matchT = !type || w.type === type;
        return matchQ && matchT;
    });

    list = [...list].sort((a, b) => {
        switch (sort) {
            case 'priority':
                // con prioridad primero, luego sin
                const pa = a.priority ?? 999;
                const pb = b.priority ?? 999;
                return pa - pb;
            case 'price-asc':  return parsePrice(a.price) - parsePrice(b.price);
            case 'price-desc': return parsePrice(b.price) - parsePrice(a.price);
            case 'title':      return a.title.localeCompare(b.title);
            case 'year':       return b.year - a.year;
            case 'artist':     return a.artist.localeCompare(b.artist);
            default:           return 0;
        }
    });

    return list;
}

function renderList(list) {
    const container = document.getElementById('wishlist-container');
    const empty     = document.getElementById('empty-wish');
    const countEl   = document.getElementById('wish-count');

    countEl.innerHTML = `<strong>${list.length}</strong> disco${list.length !== 1 ? 's' : ''}`;

    if (list.length === 0) {
        container.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');

    container.innerHTML = list.map((w, i) => {
        const isTop  = w.priority && w.priority <= 3;
        const rankClass = w.priority === 1 ? 'r1' : w.priority === 2 ? 'r2' : w.priority === 3 ? 'r3' : '';

        return `
        <div class="wish-item${isTop ? ' is-top' : ''}" style="animation-delay:${i * 30}ms">
            <div class="wish-cover">
                <img src="${esc(w.cover)}" alt="${esc(w.title)}"
                     loading="lazy"
                     onerror="this.style.opacity='.25'">
                ${isTop ? `<div class="wish-rank-mini ${rankClass}">${w.priority}</div>` : ''}
            </div>
            <div class="wish-info">
                <div class="wish-title">${esc(w.title)}</div>
                <div class="wish-artist">${esc(w.artist)}</div>
                <div class="wish-tags">
                    <span class="wish-badge badge-${w.type}">${typeLabels[w.type] || w.type.toUpperCase()}</span>
                    <span class="wish-year-tag">${w.year}</span>
                </div>
                ${w.note ? `<div class="wish-note-inline">${esc(w.note)}</div>` : ''}
            </div>
            <div class="wish-right">
                ${w.price ? `<div class="wish-price">${esc(w.price)}</div>` : '<div class="wish-price" style="color:var(--text-muted)">—</div>'}
                ${w.shop  ? (w.shopUrl
                    ? `<a class="wish-shop-tag" href="${esc(w.shopUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()"><i class="fa-solid fa-cart-shopping"></i>${esc(w.shop)}</a>`
                    : `<div class="wish-shop-tag no-url"><i class="fa-solid fa-cart-shopping"></i>${esc(w.shop)}</div>`)
                  : ''}
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// SCROLL TOP
// ==========================================
function initScrollTop() {
    const btn = document.getElementById('scroll-top');
    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ==========================================
// UTIL
// ==========================================
function esc(str) {
    return String(str ?? '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
