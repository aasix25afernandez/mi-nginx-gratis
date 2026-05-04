/* ==========================================
   ADMIN PANEL - LÓGICA COMPLETA
   Sin PHP · Autenticación SHA-256 · localStorage
   ========================================== */

// ==========================================
// CONFIGURACIÓN
// ── Cambia PASSWORD_HASH por el de tu contraseña
// ── Para obtenerlo: abre la consola del navegador
//    y ejecuta: hashPassword('TuContraseña').then(console.log)
// ── Por defecto la contraseña es: admin1234
// ==========================================
const PASSWORD_HASH = 'da330f0d2d87296af6c73a3acd009e5edbadbbec0205c1da142d81fb15f4ff9f';
// CONTRASEÑA POR DEFECTO: admin1234
// Para cambiarla, edita admin.js y reemplaza el valor de PASSWORD_HASH
// con el hash de tu nueva contraseña (ver instrucciones en README)

const SESSION_KEY  = 'vinyl_admin_session';
const DATA_KEY     = 'vinyl_collection_override';
const SESSION_TTL  = 8 * 60 * 60 * 1000; // 8 horas

const typeLabels = { lp: 'LP', ep: 'EP', single: 'Single', cd: 'CD' };

// ==========================================
// HASH SHA-256 (Web Crypto API — sin servidor)
// ==========================================
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ==========================================
// SESIÓN
// ==========================================
function isAuthenticated() {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return false;
    try {
        const { expires } = JSON.parse(session);
        return Date.now() < expires;
    } catch {
        return false;
    }
}

function createSession() {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        expires: Date.now() + SESSION_TTL
    }));
}

function destroySession() {
    localStorage.removeItem(SESSION_KEY);
}

// ==========================================
// COLECCIÓN EN MEMORIA
// ==========================================
let collection = [];

function loadCollection() {
    const local = localStorage.getItem(DATA_KEY);
    if (local) {
        try { collection = JSON.parse(local); return; } catch {}
    }
    // Si no hay datos locales, carga albums.json del servidor
    fetch('albums.json')
        .then(r => r.json())
        .then(data => {
            collection = data;
            saveCollection();
            renderAll();
        })
        .catch(() => {
            collection = [];
            renderAll();
        });
}

function saveCollection() {
    localStorage.setItem(DATA_KEY, JSON.stringify(collection));
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (isAuthenticated()) {
        showAdminPanel();
    } else {
        setupLogin();
    }
});

// ==========================================
// LOGIN
// ==========================================
function setupLogin() {
    const pwInput = document.getElementById('login-password');
    const btn     = document.getElementById('login-btn');
    const errEl   = document.getElementById('login-error');

    async function attemptLogin() {
        const pw = pwInput.value.trim();
        if (!pw) return;

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...';

        const hash = await hashPassword(pw);

        if (hash === PASSWORD_HASH) {
            createSession();
            document.getElementById('login-screen').classList.add('fade-out');
            setTimeout(showAdminPanel, 400);
        } else {
            errEl.classList.add('visible');
            pwInput.value = '';
            pwInput.focus();
            btn.disabled = false;
            btn.innerHTML = '<span>Entrar</span><i class="fa-solid fa-arrow-right"></i>';
            // Shake
            pwInput.style.animation = 'none';
            pwInput.offsetHeight;
            pwInput.style.animation = 'shake 0.4s ease';
        }
    }

    btn.addEventListener('click', attemptLogin);
    pwInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') attemptLogin();
        errEl.classList.remove('visible');
    });
}

// ==========================================
// PANEL PRINCIPAL
// ==========================================
function showAdminPanel() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-panel').classList.remove('hidden');

    loadCollection();
    setupNavigation();
    setupListView();
    setupFormView();
    setupExportView();
    setupLogout();
    setupConfirmModal();

    setTimeout(renderAll, 100);
}

// ==========================================
// NAVEGACIÓN ENTRE VISTAS
// ==========================================
let currentView = 'list';

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            switchView(btn.dataset.view);
        });
    });

    document.getElementById('cancel-edit').addEventListener('click',  () => switchView('list'));
    document.getElementById('cancel-edit-2').addEventListener('click', () => switchView('list'));
}

function switchView(view) {
    currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

    document.getElementById(`view-${view}`).classList.remove('hidden');
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    if (view === 'export') refreshExportPreview();
    if (view === 'list')   renderTable(collection);
}

// ==========================================
// RENDER GENERAL
// ==========================================
function renderAll() {
    renderSidebarStats();
    renderTable(collection);
    refreshExportPreview();
}

// ==========================================
// SIDEBAR STATS
// ==========================================
function renderSidebarStats() {
    const lp     = collection.filter(a => a.type === 'lp').length;
    const ep     = collection.filter(a => a.type === 'ep').length;
    const single = collection.filter(a => a.type === 'single').length;
    const cd     = collection.filter(a => a.type === 'cd').length;

    document.getElementById('sidebar-stats').innerHTML = `
        <strong>${collection.length}</strong> discos en total<br>
        ${lp} LP · ${ep} EP · ${single} Singles · ${cd} CD
    `;

    document.getElementById('list-count').textContent =
        `${collection.length} disco${collection.length !== 1 ? 's' : ''} en la colección`;
}

// ==========================================
// VISTA LISTA → TABLA
// ==========================================
function setupListView() {
    const searchEl = document.getElementById('admin-search');
    const typeEl   = document.getElementById('admin-filter-type');

    searchEl.addEventListener('input', () => renderTable(filterCollection()));
    typeEl.addEventListener('change',  () => renderTable(filterCollection()));
}

function filterCollection() {
    const q    = document.getElementById('admin-search').value.toLowerCase().trim();
    const type = document.getElementById('admin-filter-type').value;

    return collection.filter(a => {
        const matchQ = !q ||
            a.title.toLowerCase().includes(q) ||
            a.artist.toLowerCase().includes(q);
        const matchT = !type || a.type === type;
        return matchQ && matchT;
    });
}

function renderTable(list) {
    const tbody = document.getElementById('album-tbody');

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="7">
                <div class="empty-table">
                    <i class="fa-solid fa-record-vinyl"></i>
                    <p>No se encontraron discos</p>
                </div>
            </td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(album => `
        <tr>
            <td>
                <img class="table-cover"
                     src="${escHtml(album.cover)}"
                     alt="${escHtml(album.title)}"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2244%22 height=%2244%22><rect width=%2244%22 height=%2244%22 fill=%22%23252525%22/></svg>'">
            </td>
            <td class="table-title">${escHtml(album.title)}</td>
            <td class="table-artist">${escHtml(album.artist)}</td>
            <td>${album.year}</td>
            <td><span class="type-badge ${album.type}">${typeLabels[album.type] || album.type.toUpperCase()}</span></td>
            <td>${album.tracks.length}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" onclick="openEdit('${escHtml(album.id)}')">
                        <i class="fa-solid fa-pen"></i> Editar
                    </button>
                    <button class="btn-delete" onclick="confirmDelete('${escHtml(album.id)}')">
                        <i class="fa-solid fa-trash"></i> Borrar
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ==========================================
// FORMULARIO (AÑADIR / EDITAR)
// ==========================================
let editingId = null;

function setupFormView() {
    document.getElementById('preview-cover-btn').addEventListener('click', previewCover);
    document.getElementById('f-cover').addEventListener('keydown', e => {
        if (e.key === 'Enter') previewCover();
    });
    document.getElementById('add-track-btn').addEventListener('click', () => addTrackRow());
    document.getElementById('save-album-btn').addEventListener('click', saveAlbum);

    // Auto-generar ID desde título
    document.getElementById('f-title').addEventListener('input', () => {
        if (!editingId) {
            const title = document.getElementById('f-title').value;
            document.getElementById('f-id').value = slugify(title);
        }
    });
}

function slugify(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s_]/g, '')
        .trim()
        .replace(/\s+/g, '_');
}

function openAdd() {
    editingId = null;
    resetForm();
    document.getElementById('form-title').textContent = 'Añadir disco';
    document.getElementById('save-btn-text').textContent = 'Guardar disco';
    document.getElementById('f-id').removeAttribute('readonly');
    switchView('add');
    addTrackRow(); // empezar con 1 pista vacía
}

function openEdit(id) {
    const album = collection.find(a => a.id === id);
    if (!album) return;

    editingId = id;
    resetForm();
    document.getElementById('form-title').textContent = 'Editar disco';
    document.getElementById('save-btn-text').textContent = 'Guardar cambios';

    document.getElementById('f-id').value      = album.id;
    document.getElementById('f-id').setAttribute('readonly', true);
    document.getElementById('f-title').value   = album.title;
    document.getElementById('f-artist').value  = album.artist;
    document.getElementById('f-year').value    = album.year;
    document.getElementById('f-type').value    = album.type;
    document.getElementById('f-spotify').value = album.spotifyId || '';
    document.getElementById('f-cover').value   = album.cover;

    // Cover preview
    const img = document.getElementById('cover-preview-img');
    const prev = document.getElementById('cover-preview');
    img.src = album.cover;
    prev.classList.add('visible');

    // Tracks
    album.tracks.forEach(t => addTrackRow(t.code, t.title, t.duration));

    switchView('add');
}

function resetForm() {
    ['f-id','f-title','f-artist','f-year','f-spotify','f-cover'].forEach(id => {
        document.getElementById(id).value = '';
        document.getElementById(id).classList.remove('error');
    });
    document.getElementById('f-type').value = '';
    document.getElementById('cover-preview').classList.remove('visible');
    document.getElementById('cover-preview-img').src = '';
    document.getElementById('tracks-container').innerHTML = '';
}

function previewCover() {
    const url  = document.getElementById('f-cover').value.trim();
    const img  = document.getElementById('cover-preview-img');
    const prev = document.getElementById('cover-preview');

    if (!url) { showToast('Introduce una URL de portada primero', true); return; }

    img.src = url;
    img.onload  = () => prev.classList.add('visible');
    img.onerror = () => { showToast('No se pudo cargar la imagen', true); prev.classList.remove('visible'); };
}

let trackCounter = 0;

function addTrackRow(code = '', title = '', duration = '') {
    trackCounter++;
    const id = `track-${trackCounter}`;
    const row = document.createElement('div');
    row.className = 'track-row';
    row.id = id;
    row.innerHTML = `
        <input type="text"   class="t-code"     placeholder="A1"         value="${escHtml(code)}"     maxlength="4">
        <input type="text"   class="t-title"    placeholder="Título de la canción" value="${escHtml(title)}">
        <input type="text"   class="t-duration" placeholder="3:45"       value="${escHtml(duration)}" maxlength="7">
        <button type="button" class="btn-remove-track" onclick="removeTrackRow('${id}')" title="Eliminar pista">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;
    document.getElementById('tracks-container').appendChild(row);
}

function removeTrackRow(id) {
    document.getElementById(id)?.remove();
}

function collectTracks() {
    const rows = document.querySelectorAll('#tracks-container .track-row');
    return Array.from(rows).map(row => ({
        code:     row.querySelector('.t-code').value.trim(),
        title:    row.querySelector('.t-title').value.trim(),
        duration: row.querySelector('.t-duration').value.trim()
    })).filter(t => t.title); // ignorar filas completamente vacías
}

function validateForm() {
    let ok = true;

    const fields = [
        { id: 'f-id',     val: document.getElementById('f-id').value.trim() },
        { id: 'f-title',  val: document.getElementById('f-title').value.trim() },
        { id: 'f-artist', val: document.getElementById('f-artist').value.trim() },
        { id: 'f-year',   val: document.getElementById('f-year').value.trim() },
        { id: 'f-cover',  val: document.getElementById('f-cover').value.trim() },
    ];

    fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (!f.val) { el.classList.add('error'); ok = false; }
        else         el.classList.remove('error');
    });

    const typeEl = document.getElementById('f-type');
    if (!typeEl.value) { ok = false; showToast('Selecciona un formato', true); }

    const tracks = collectTracks();
    if (tracks.length === 0) { ok = false; showToast('Añade al menos una pista', true); }

    // ID único (solo al añadir)
    if (!editingId) {
        const newId = document.getElementById('f-id').value.trim();
        if (collection.some(a => a.id === newId)) {
            document.getElementById('f-id').classList.add('error');
            showToast('Ya existe un disco con ese ID', true);
            ok = false;
        }
    }

    return ok;
}

function saveAlbum() {
    if (!validateForm()) return;

    const album = {
        id:        document.getElementById('f-id').value.trim(),
        title:     document.getElementById('f-title').value.trim(),
        artist:    document.getElementById('f-artist').value.trim(),
        year:      parseInt(document.getElementById('f-year').value),
        type:      document.getElementById('f-type').value,
        cover:     document.getElementById('f-cover').value.trim(),
        spotifyId: document.getElementById('f-spotify').value.trim() || null,
        tracks:    collectTracks()
    };

    if (editingId) {
        const idx = collection.findIndex(a => a.id === editingId);
        if (idx !== -1) collection[idx] = album;
        showToast('Disco actualizado correctamente');
    } else {
        collection.push(album);
        showToast('Disco añadido correctamente');
    }

    saveCollection();
    renderAll();
    switchView('list');
}

// Enlazar botón "Añadir disco" de la barra lateral
document.addEventListener('DOMContentLoaded', () => {
    // El botón de nav ya cambia de vista; sobreescribir para que resetee el form
    const addNavBtn = document.querySelector('[data-view="add"]');
    if (addNavBtn) {
        addNavBtn.addEventListener('click', (e) => {
            e.stopImmediatePropagation();
            openAdd();
        }, true);
    }
});

// ==========================================
// ELIMINAR
// ==========================================
let deleteTargetId = null;

function confirmDelete(id) {
    const album = collection.find(a => a.id === id);
    if (!album) return;

    deleteTargetId = id;
    document.getElementById('confirm-title').textContent = '¿Eliminar disco?';
    document.getElementById('confirm-msg').textContent   =
        `Se eliminará "${album.title}" de ${album.artist} (${album.year}). Esta acción no se puede deshacer.`;
    document.getElementById('confirm-overlay').classList.remove('hidden');
}

function setupConfirmModal() {
    document.getElementById('confirm-cancel').addEventListener('click', () => {
        document.getElementById('confirm-overlay').classList.add('hidden');
        deleteTargetId = null;
    });

    document.getElementById('confirm-ok').addEventListener('click', () => {
        if (!deleteTargetId) return;
        collection = collection.filter(a => a.id !== deleteTargetId);
        saveCollection();
        renderAll();
        document.getElementById('confirm-overlay').classList.add('hidden');
        deleteTargetId = null;
        showToast('Disco eliminado');
    });

    document.getElementById('confirm-overlay').addEventListener('click', e => {
        if (e.target === document.getElementById('confirm-overlay')) {
            document.getElementById('confirm-overlay').classList.add('hidden');
        }
    });
}

// ==========================================
// EXPORTAR
// ==========================================
function setupExportView() {
    document.getElementById('download-json-btn').addEventListener('click', downloadJSON);
    document.getElementById('copy-json-btn').addEventListener('click', copyJSON);
    document.getElementById('reset-local-btn').addEventListener('click', resetToServer);
}

function refreshExportPreview() {
    const preview = document.getElementById('json-preview');
    // Mostrar solo los primeros 3 álbumes en la preview para no saturar
    const sample  = collection.slice(0, 3);
    let text = formatCollectionJSON(sample);
    if (collection.length > 3) {
        text = text.slice(0, -1) + `,\n    // ... ${collection.length - 3} discos más\n]`;
    }
    preview.textContent = text;
}

// Formateador personalizado: álbumes con 4 espacios, tracks en una sola línea
function formatCollectionJSON(data) {
    const lines = ['['];
    data.forEach((album, albumIdx) => {
        lines.push('    {');
        const keys = ['id', 'title', 'artist', 'year', 'type', 'cover', 'spotifyId', 'tracks'];
        keys.forEach(key => {
            if (!(key in album)) return;
            if (key === 'tracks') {
                const tracksInline = album.tracks
                    .map(t => `{ "code": ${JSON.stringify(t.code)}, "title": ${JSON.stringify(t.title)}, "duration": ${JSON.stringify(t.duration)} }`)
                    .join(',\n            ');
                lines.push(`        "tracks": [`);
                album.tracks.forEach((t, i) => {
                    const comma = i < album.tracks.length - 1 ? ',' : '';
                    lines.push(`            { "code": ${JSON.stringify(t.code)}, "title": ${JSON.stringify(t.title)}, "duration": ${JSON.stringify(t.duration)} }${comma}`);
                });
                lines.push('        ]');
            } else {
                const comma = ',';
                lines.push(`        ${JSON.stringify(key)}: ${JSON.stringify(album[key])}${comma}`);
            }
        });
        const albumComma = albumIdx < data.length - 1 ? ',' : '';
        lines.push('    }' + albumComma);
    });
    lines.push(']');
    return lines.join('\n');
}

function downloadJSON() {
    const json = formatCollectionJSON(collection);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'albums.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('albums.json descargado — súbelo a tu servidor');
}

function copyJSON() {
    const json = formatCollectionJSON(collection);
    navigator.clipboard.writeText(json)
        .then(() => showToast('JSON copiado al portapapeles'))
        .catch(() => showToast('No se pudo copiar', true));
}

function resetToServer() {
    if (!confirm('¿Seguro? Se borrarán todos los cambios locales y se cargarán los datos del servidor.')) return;

    localStorage.removeItem(DATA_KEY);

    fetch('albums.json')
        .then(r => r.json())
        .then(data => {
            collection = data;
            saveCollection();
            renderAll();
            showToast('Datos restaurados desde el servidor');
        })
        .catch(() => showToast('No se pudo conectar con el servidor', true));
}

// ==========================================
// LOGOUT
// ==========================================
function setupLogout() {
    document.getElementById('logout-btn').addEventListener('click', () => {
        destroySession();
        location.reload();
    });
}

// ==========================================
// TOAST NOTIFICATION
// ==========================================
let toastTimer = null;

function showToast(msg, isError = false) {
    const toast  = document.getElementById('toast');
    const msgEl  = document.getElementById('toast-msg');
    const iconEl = toast.querySelector('i');

    clearTimeout(toastTimer);
    msgEl.textContent = msg;

    if (isError) {
        toast.classList.add('error');
        iconEl.className = 'fa-solid fa-circle-xmark';
    } else {
        toast.classList.remove('error');
        iconEl.className = 'fa-solid fa-check-circle';
    }

    toast.classList.remove('hidden');
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 3200);
}

// ==========================================
// HASH DE CONTRASEÑA (helper para consola)
// Instrucciones:
// Abre la consola del navegador en admin.html y ejecuta:
//   hashPassword('TuNuevaContraseña').then(h => console.log('Nuevo hash:', h))
// Luego pega ese hash en la constante PASSWORD_HASH arriba.
// ==========================================
window.hashPassword = hashPassword;
