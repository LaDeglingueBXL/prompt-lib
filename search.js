/* ============================================================
   search.js — geste prioritaire : chercher → copier
   - recherche live (debounce) via db.entries.search()
   - rendu liste résultats + highlight des termes
   - bouton Copier (1 tap) → presse-papier, feedback inline
   - nav clavier : ↓/↑ sélection, Entrée = copier, Échap = vider
   ============================================================ */

import { db } from "./db.js";

const TYPE_LABEL = {
  prompt_texte: "Prompt texte",
  prompt_image: "Prompt image",
  tuto: "Tuto",
  skill: "Skill",
};

let resultsEl, searchEl;
let current = [];   // current result objects, in display order
let selected = -1;  // selected index for keyboard nav
let debounceTimer = null;

/* --- html escape --- */
function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}
function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* --- highlight matched tokens (single pass, escaped) --- */
function highlight(text, tokens) {
  const safe = esc(text);
  const parts = tokens.map((t) => esc(t)).filter((t) => t.length >= 2).map(escRe);
  if (parts.length === 0) return safe;
  const re = new RegExp("(" + parts.join("|") + ")", "gi");
  return safe.replace(re, "<mark>$1</mark>");
}

/* --- clip a long preview --- */
function preview(text, max = 220) {
  const t = String(text || "").trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

/* --- copy to clipboard with fallback --- */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/* --- render one result card --- */
function cardHTML(entry, tokens, index) {
  const tags = (entry.tags || [])
    .map((t) => `<span class="chip">${esc(t)}</span>`)
    .join("");
  return `
    <article class="card" data-index="${index}" data-id="${esc(entry.id)}" tabindex="-1">
      <div class="card__head">
        <h3 class="card__title">${highlight(entry.titre, tokens)}</h3>
        <button class="btn btn--accent card__copy" data-copy="${esc(entry.id)}">Copier</button>
      </div>
      <div class="card__meta">
        <span class="badge">${esc(TYPE_LABEL[entry.type] || entry.type || "")}</span>
        ${tags}
      </div>
      <p class="card__preview mono">${highlight(preview(entry.contenu), tokens)}</p>
    </article>`;
}

/* --- render the whole list --- */
function render(entries, tokens, emptyQuery) {
  current = entries;
  selected = -1;
  if (entries.length === 0) {
    const msg = emptyQuery
      ? "Bibliothèque vide. Ajoute une entrée pour commencer."
      : "Aucun résultat. Essaie d'autres mots-clés.";
    resultsEl.innerHTML = `<div class="empty">${msg}</div>`;
    return;
  }
  resultsEl.innerHTML = entries.map((e, i) => cardHTML(e, tokens, i)).join("");
}

/* --- run a search and render --- */
async function run(query) {
  const entries = await db.entries.search(query);
  const tokens = query.split(/\s+/).filter(Boolean);
  render(entries, tokens, tokens.length === 0);
  return entries;
}

/* --- copy by entry id + inline feedback on its button --- */
async function copyEntry(id) {
  const entry = current.find((e) => e.id === id) || (await db.entries.get(id));
  if (!entry) return;
  const ok = await copyText(entry.contenu || "");
  const btn = resultsEl.querySelector(`[data-copy="${CSS.escape(id)}"]`);
  if (btn) {
    const prev = btn.textContent;
    btn.textContent = ok ? "Copié ✓" : "Échec";
    btn.classList.toggle("is-ok", ok);
    setTimeout(() => {
      btn.textContent = prev;
      btn.classList.remove("is-ok");
    }, 1100);
  }
}

/* --- keyboard selection --- */
function setSelected(i) {
  const cards = resultsEl.querySelectorAll(".card");
  if (cards.length === 0) return;
  selected = Math.max(0, Math.min(i, cards.length - 1));
  cards.forEach((c, idx) => c.classList.toggle("is-selected", idx === selected));
  cards[selected].scrollIntoView({ block: "nearest" });
}

function onKey(e) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    setSelected(selected + 1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    setSelected(selected - 1);
  } else if (e.key === "Enter") {
    if (current.length === 0) return;
    const idx = selected >= 0 ? selected : 0;
    const entry = current[idx];
    if (entry) copyEntry(entry.id);
  } else if (e.key === "Escape") {
    searchEl.value = "";
    run("");
  }
}

/* --- wire it up --- */
export function initSearch() {
  resultsEl = document.getElementById("results");
  searchEl = document.getElementById("search");

  searchEl.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => run(searchEl.value), 120);
  });

  searchEl.addEventListener("keydown", onKey);

  // delegate clicks: copy button
  resultsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-copy]");
    if (btn) {
      copyEntry(btn.getAttribute("data-copy"));
    }
  });

  // initial: show all (recent first)
  run("");
}

export { run as runSearch };
