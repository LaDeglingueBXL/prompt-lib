/* ============================================================
   mobile.js — prompt-lib PWA mobile (lecture seule)
   Fetch data.json → recherche + filtre + tri + modale + copier
   ============================================================ */

const DATA_URL = 'https://cdn.jsdelivr.net/gh/LaDeglingueBXL/prompt-lib-data@main/data.json';

// ---- État ----
let allEntries = [];
let filtered   = [];
let query      = '';
let typeFilter = '';
let sortKey    = 'date_desc';

// ---- DOM ----
const $list     = document.getElementById('mob-list');
const $loading  = document.getElementById('mob-loading');
const $count    = document.getElementById('mob-count');
const $search   = document.getElementById('mob-search');
const $sort     = document.getElementById('mob-sort');
const $filters  = document.getElementById('mob-filters');
const $modal    = document.getElementById('mob-modal');
const $backdrop = document.getElementById('mob-modal-backdrop');
const $mClose   = document.getElementById('mob-modal-close');
const $mTitre   = document.getElementById('mob-modal-titre');
const $mType    = document.getElementById('mob-modal-type');
const $mTags    = document.getElementById('mob-modal-tags');
const $mContenu = document.getElementById('mob-modal-contenu');
const $mCopy    = document.getElementById('mob-modal-copy');
const $mNotes   = document.getElementById('mob-modal-notes');
const $toast    = document.getElementById('mob-toast');

// ---- Chargement ----
async function load() {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allEntries = data.entries || [];
    $loading.remove();
    $count.textContent = `${allEntries.length} entrées`;
    applyFilters();
  } catch (err) {
    $loading.textContent = `Erreur de chargement — vérifie ta connexion. (${err.message})`;
  }
}

// ---- Filtrage + tri ----
function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function applyFilters() {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);

  filtered = allEntries.filter(e => {
    // filtre type
    if (typeFilter && e.type !== typeFilter) return false;
    // filtre texte
    if (tokens.length) {
      const hay = normalize([e.titre, e.contenu, ...(e.tags || [])].join(' '));
      if (!tokens.every(t => hay.includes(t))) return false;
    }
    return true;
  });

  // tri
  filtered.sort((a, b) => {
    if (sortKey === 'date_desc') return (b.date_creation || '').localeCompare(a.date_creation || '');
    if (sortKey === 'date_asc')  return (a.date_creation || '').localeCompare(b.date_creation || '');
    if (sortKey === 'titre_asc') return normalize(a.titre).localeCompare(normalize(b.titre));
    return 0;
  });

  renderList();
}

// ---- Rendu liste ----
function highlight(text, tokens) {
  if (!tokens.length) return esc(text);
  const re = new RegExp(`(${tokens.map(escRe).join('|')})`, 'gi');
  return esc(text).replace(re, '<mark>$1</mark>');
}

function esc(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function typeLabel(type) {
  const map = { prompt_texte: 'Texte', prompt_image: 'Image', tuto: 'Tuto', skill: 'Skill' };
  return map[type] || type;
}

function renderList() {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);

  if (!filtered.length) {
    $list.innerHTML = '<div class="mob-empty">Aucun résultat.</div>';
    return;
  }

  $list.innerHTML = filtered.map(e => {
    const excerpt = (e.contenu || '').slice(0, 90).replace(/\n/g, ' ');
    const tags = (e.tags || []).slice(0, 4).map(t =>
      `<span class="mob-tag">${esc(t)}</span>`
    ).join('');

    return `
      <div class="mob-card" role="listitem" data-id="${esc(e.id)}" tabindex="0">
        <div class="mob-card__top">
          <span class="mob-badge mob-badge--${esc(e.type)}">${typeLabel(e.type)}</span>
          <span class="mob-card__titre">${highlight(e.titre, tokens)}</span>
        </div>
        ${excerpt ? `<div class="mob-card__excerpt">${highlight(excerpt, tokens)}</div>` : ''}
        ${tags ? `<div class="mob-card__tags">${tags}</div>` : ''}
      </div>`;
  }).join('');

  // Événements cartes
  $list.querySelectorAll('.mob-card').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.id));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') openModal(card.dataset.id);
    });
  });
}

// ---- Modale ----
function openModal(id) {
  const entry = allEntries.find(e => e.id === id);
  if (!entry) return;

  $mType.textContent    = typeLabel(entry.type);
  $mType.className      = `mob-badge mob-badge--${entry.type}`;
  $mTitre.textContent   = entry.titre || '';
  $mContenu.textContent = entry.contenu || '';
  $mNotes.textContent   = entry.notes || '';

  $mTags.innerHTML = (entry.tags || []).map(t =>
    `<span class="mob-tag">${esc(t)}</span>`
  ).join('');

  $modal.hidden = false;
  document.body.style.overflow = 'hidden';
  $mClose.focus();
}

function closeModal() {
  $modal.hidden = true;
  document.body.style.overflow = '';
}

$mClose.addEventListener('click', closeModal);
$backdrop.addEventListener('click', closeModal);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$modal.hidden) closeModal();
});

// ---- Copier ----
$mCopy.addEventListener('click', async () => {
  const text = $mContenu.textContent;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copié !');
    const orig = $mCopy.textContent;
    $mCopy.textContent = '✓ Copié';
    setTimeout(() => { $mCopy.textContent = orig; }, 1800);
  } catch {
    showToast('Copie non disponible');
  }
});

// ---- Toast ----
let toastTimer;
function showToast(msg) {
  $toast.textContent = msg;
  $toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $toast.hidden = true; }, 2200);
}

// ---- Événements toolbar ----
let debounceTimer;
$search.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    query = $search.value;
    applyFilters();
  }, 220);
});

$sort.addEventListener('change', () => {
  sortKey = $sort.value;
  applyFilters();
});

$filters.addEventListener('click', e => {
  const chip = e.target.closest('.mob-chip');
  if (!chip) return;
  $filters.querySelectorAll('.mob-chip').forEach(c => c.classList.remove('mob-chip--active'));
  chip.classList.add('mob-chip--active');
  typeFilter = chip.dataset.type;
  applyFilters();
});
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('mobile-sw.js');
}

// ---- Init ----
load();
