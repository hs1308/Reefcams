// newtab.js — main logic for the new tab page

let currentUser = null;
let userCams = [];
let allCams = [];
let activeCamId = null;

const CACHE_KEYS = {
  userCams: 'rc_cached_user_cams',
  allCams: 'rc_cached_all_cams'
};

// ---- Helpers ----

// Extract YouTube video ID from any youtube URL format
function extractVideoId(url) {
  const patterns = [
    /embed\/([^?&]+)/,
    /v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /\/v\/([^?&]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('Failed to read cache', key, err);
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Failed to write cache', key, err);
  }
}

// ---- Boot ----

async function boot() {
  showLoading(true);
  bindEvents();

  try {
    let user = null;
    if (supabase.getToken() && supabase.getUserId()) {
      user = { id: supabase.getUserId() };
    } else {
      user = await supabase.refreshSession();
      if (!user) user = await supabase.signInAnonymously();
    }
    currentUser = user;
  } catch (err) {
    console.error('Auth error:', err);
    showError('Auth failed: ' + (err?.message || JSON.stringify(err)));
    return;
  }

  hydrateFromCache();

  try {
    await loadUserCamsWithRecovery();
    await ensureDefaultCams();
    showLoading(false);
    renderSidebar();

    const savedCamId = localStorage.getItem('rc_active_cam');
    const target = userCams.find(c => c.cam_id === savedCamId) || userCams[0];
    if (target) {
      showCam(target.cam_id);
    } else {
      showEmptyState();
    }

    loadAllCams().catch(err => {
      console.error('Catalog load error:', err);
    });
  } catch (err) {
    console.error('Data load error:', err);
    showError('Data load failed: ' + (err?.message || JSON.stringify(err)));
    return;
  }
}

// ---- Loading / Error / Empty ----

function showLoading(on) {
  document.getElementById('loading-screen').style.display = on ? 'flex' : 'none';
}

function showError(msg) {
  showLoading(false);
  const el = document.getElementById('error-screen');
  el.style.display = 'flex';
  el.querySelector('.error-msg').textContent = msg;
}

function showEmptyState() {
  document.getElementById('cam-iframe').src = '';
  document.getElementById('cam-name-badge').textContent = '';
  document.getElementById('empty-state').style.display = 'flex';
}

function hideEmptyState() {
  document.getElementById('empty-state').style.display = 'none';
}

function hydrateFromCache() {
  const cachedUserCams = readCache(CACHE_KEYS.userCams);
  const cachedAllCams = readCache(CACHE_KEYS.allCams);

  if (Array.isArray(cachedUserCams) && cachedUserCams.length > 0) {
    userCams = cachedUserCams;
    if (Array.isArray(cachedAllCams)) allCams = cachedAllCams;

    showLoading(false);
    renderSidebar();

    const savedCamId = localStorage.getItem('rc_active_cam');
    const target = userCams.find(c => c.cam_id === savedCamId) || userCams[0];
    if (target) showCam(target.cam_id);
    else showEmptyState();
  }
}

// ---- Data ----

async function loadUserCams() {
  const userId = supabase.getUserId();
  const rows = await supabase.query('reefcams_user_cams', {
    select: 'id,cam_id,display_order,reefcams_catalog(id,name,youtube_url,category,thumbnail_url)',
    filter: { user_id: userId },
    order: 'display_order.asc'
  });
  userCams = Array.isArray(rows) ? rows.map(r => ({ ...r, cam: r.reefcams_catalog })) : [];
  writeCache(CACHE_KEYS.userCams, userCams);
}

async function loadUserCamsWithRecovery() {
  try {
    await loadUserCams();
    return;
  } catch (err) {
    const message = String(err?.message || '');
    const shouldRecover =
      message.toLowerCase().includes('jwt') ||
      message.toLowerCase().includes('expired') ||
      message.toLowerCase().includes('unauthorized');

    if (!shouldRecover) throw err;
  }

  const user = await supabase.refreshSession() || await supabase.signInAnonymously();
  currentUser = user;
  await loadUserCams();
}

async function loadAllCams() {
  const rows = await supabase.query('reefcams_catalog', {
    select: '*',
    order: 'category.asc,name.asc'
  });
  allCams = Array.isArray(rows) ? rows : [];
  writeCache(CACHE_KEYS.allCams, allCams);
}

async function ensureDefaultCams() {
  if (userCams.length > 0) return;

  if (allCams.length === 0) {
    await loadAllCams();
  }

  if (allCams.length === 0) return;

  const userId = supabase.getUserId();
  const rows = allCams.map((cam, index) => ({
    user_id: userId,
    cam_id: cam.id,
    display_order: index
  }));

  await supabase.insert('reefcams_user_cams', rows);
  await loadUserCams();
}

// ---- Render Sidebar ----

function renderSidebar() {
  const list = document.getElementById('cam-list');
  list.innerHTML = '';

  if (userCams.length === 0) {
    list.innerHTML = `<div class="sidebar-empty">No cams yet.<br/>Click <strong>+ Add More</strong> below.</div>`;
    return;
  }

  userCams.forEach(entry => {
    const cam = entry.cam;
    if (!cam) return;

    const card = document.createElement('div');
    card.className = 'cam-card' + (entry.cam_id === activeCamId ? ' active' : '');
    card.dataset.camId = entry.cam_id;

    card.innerHTML = `
      <img src="${cam.thumbnail_url || ''}" alt="${cam.name}" loading="lazy" />
      <div class="cam-card-label">${cam.name}</div>
      <button class="cam-remove-btn" title="Remove">✕</button>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('cam-remove-btn')) return;
      showCam(entry.cam_id);
    });

    card.querySelector('.cam-remove-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      removeCam(entry.cam_id);
    });

    list.appendChild(card);
  });
}

// ---- Show Cam ----

function showCam(camId) {
  activeCamId = camId;
  localStorage.setItem('rc_active_cam', camId);
  hideEmptyState();

  const entry = userCams.find(c => c.cam_id === camId);
  if (!entry || !entry.cam) return;

  const videoId = extractVideoId(entry.cam.youtube_url);
  if (!videoId) {
    console.error('Could not extract video ID from:', entry.cam.youtube_url);
    return;
  }

  if (!HOSTED_PLAYER_BASE_URL || HOSTED_PLAYER_BASE_URL.includes('YOUR_HOSTED_PLAYER_DOMAIN')) {
    console.error('Hosted player URL is not configured.');
    showError('Hosted player is not configured yet. Set HOSTED_PLAYER_BASE_URL in extension/supabase.js.');
    return;
  }

  const playerUrl = `${HOSTED_PLAYER_BASE_URL.replace(/\/$/, '')}/player.html?v=${encodeURIComponent(videoId)}&title=${encodeURIComponent(entry.cam.name)}&thumb=${encodeURIComponent(entry.cam.thumbnail_url || '')}`;
  const iframe = document.getElementById('cam-iframe');
  showViewerLoading(entry.cam.thumbnail_url);
  if (iframe.src !== playerUrl) iframe.src = playerUrl;
  document.getElementById('cam-name-badge').textContent = entry.cam.name;

  document.querySelectorAll('.cam-card').forEach(c => {
    c.classList.toggle('active', c.dataset.camId === camId);
  });
}

function showViewerLoading(thumbnailUrl) {
  const loading = document.getElementById('viewer-loading');
  const backdrop = loading.querySelector('.viewer-loading-backdrop');
  backdrop.style.backgroundImage = thumbnailUrl
    ? `linear-gradient(rgba(0,0,0,0.36), rgba(0,0,0,0.52)), url("${thumbnailUrl.replace(/"/g, '%22')}")`
    : 'linear-gradient(rgba(0,0,0,0.36), rgba(0,0,0,0.52)), none';
  loading.classList.remove('hidden');
}

function hideViewerLoading() {
  document.getElementById('viewer-loading').classList.add('hidden');
}

// ---- Add / Remove Cam ----

async function addCam(camId) {
  const userId = supabase.getUserId();
  await supabase.insert('reefcams_user_cams', {
    user_id: userId,
    cam_id: camId,
    display_order: userCams.length
  });
  await loadUserCams();
  renderSidebar();
  renderModal();
  if (userCams.length === 1) showCam(camId);
}

async function removeCam(camId) {
  const userId = supabase.getUserId();
  await supabase.delete('reefcams_user_cams', { user_id: userId, cam_id: camId });
  await loadUserCams();
  renderSidebar();

  if (activeCamId === camId) {
    if (userCams.length > 0) showCam(userCams[0].cam_id);
    else showEmptyState();
  }
}

// ---- Modal ----

function renderModal() {
  const body = document.getElementById('modal-body');
  body.innerHTML = '';

  const addedCamIds = new Set(userCams.map(c => c.cam_id));
  const categories = {};
  allCams.forEach(cam => {
    if (!categories[cam.category]) categories[cam.category] = [];
    categories[cam.category].push(cam);
  });

  if (Object.keys(categories).length === 0) {
    body.innerHTML = `<p style="color:rgba(255,255,255,0.4);text-align:center;padding:40px 0">No cams available.</p>`;
    return;
  }

  for (const [category, cams] of Object.entries(categories)) {
    const section = document.createElement('div');
    section.className = 'modal-category';
    section.innerHTML = `<h3>${category}</h3>`;

    const grid = document.createElement('div');
    grid.className = 'modal-cams-grid';

    cams.forEach(cam => {
      const isAdded = addedCamIds.has(cam.id);
      const card = document.createElement('div');
      card.className = 'modal-cam-card' + (isAdded ? ' already-added' : '');
      card.innerHTML = `
        <img src="${cam.thumbnail_url || ''}" alt="${cam.name}" loading="lazy" />
        <div class="modal-cam-label">${cam.name}</div>
      `;
      if (!isAdded) card.addEventListener('click', () => addCam(cam.id));
      grid.appendChild(card);
    });

    section.appendChild(grid);
    body.appendChild(section);
  }
}

function openModal() {
  renderModal();
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ---- Events ----

function bindEvents() {
  if (bindEvents.didBind) return;
  bindEvents.didBind = true;
  document.getElementById('cam-iframe').addEventListener('load', hideViewerLoading);
  document.getElementById('btn-add-more').addEventListener('click', openModal);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ---- Run ----

boot();
