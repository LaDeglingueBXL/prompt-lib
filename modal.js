/* ============================================================
   modal.js — consultation + édition non-destructive (étape 5)
   Modes : view (lecture) | edit (formulaire inline)
   Actions : Éditer (in-place), Dupliquer (variante parent_id),
             Nouvelle, Supprimer (confirmé), Copier.
   Émet "entries:changed" après toute mutation (liste + compteurs réagissent).
   ============================================================ */

import { db } from "./db.js";
import { esc, copyText, flashCopied } from "./util.js";

const TYPE_LABEL = {
  prompt_texte: "Prompt texte",
  prompt_image: "Prompt image",
  tuto: "Tuto",
  skill: "Skill",
};
const TYPES = ["prompt_texte", "prompt_image", "tuto", "skill"];

let root, lastFocus = null;
let entry = null;       // current entry
let mode = "view";      // "view" | "edit"
let isNew = false;

export function emptyEntry() {
  return {
    id: undefined, titre: "", contenu: "", type: "prompt_texte",
    tags: [], thumb_path: "", notes: "", parent_id: null,
  };
}

function notifyChanged() {
  document.dispatchEvent(new CustomEvent("entries:changed"));
}

function fmtDate(iso) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("fr", { day: "2-digit", month: "short", year: "numeric" })
      .format(new Date(iso));
  } catch { return iso; }
}

/* ---------- DOM shell (built once) ---------- */
function build() {
  root = document.createElement("div");
  root.className = "modal";
  root.setAttribute("hidden", "");
  root.innerHTML = `
    <div class="modal__backdrop" data-close></div>
    <div class="modal__dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header class="modal__head">
        <h2 class="modal__title" id="modal-title"></h2>
        <button class="modal__close" data-close aria-label="Fermer">✕</button>
      </header>
      <div class="modal__main"></div>
      <footer class="modal__foot"></footer>
    </div>`;
  document.body.appendChild(root);

  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (root.hasAttribute("hidden")) return;
    if (e.key === "Escape") { if (mode === "edit") renderView(); else closeModal(); }
    if (e.key === "Tab") trapFocus(e);
  });
}

function trapFocus(e) {
  const dialog = root.querySelector(".modal__dialog");
  const f = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const list = [...f].filter((el) => !el.disabled && el.offsetParent !== null);
  if (list.length === 0) return;
  const first = list[0], last = list[list.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/* ---------- VIEW mode ---------- */
async function renderView() {
  mode = "view";
  root.querySelector(".modal__title").textContent = entry.titre || "(sans titre)";

  const tags = (entry.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("");
  const asideImage = entry.type === "prompt_image";
  const thumb = entry.thumb_path
    ? `<img class="modal__thumb" src="${esc(entry.thumb_path)}" alt="Aperçu"
         onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'modal__thumb modal__thumb--ph',textContent:'aperçu indisponible'}))">`
    : `<div class="modal__thumb modal__thumb--ph">aperçu à venir</div>`;

  const notes = entry.notes
    ? `<div class="modal__notes"><span class="modal__notes-label">Notes</span>${esc(entry.notes)}</div>` : "";

  root.querySelector(".modal__main").innerHTML = `
    <div class="modal__meta">
      <span class="badge">${esc(TYPE_LABEL[entry.type] || entry.type || "")}</span>${tags}
    </div>
    <div class="modal__body">
      <aside class="modal__aside" ${asideImage ? "" : "hidden"}>${asideImage ? thumb : ""}</aside>
      <div class="modal__content">
        <pre class="modal__contenu mono">${esc(entry.contenu)}</pre>
        ${notes}
        <div class="modal__variants"></div>
      </div>
    </div>`;

  root.querySelector(".modal__foot").innerHTML = `
    <span class="modal__date">${fmtDate(entry.date_creation)}</span>
    <div class="modal__actions">
      <button class="btn" data-act="duplicate">Dupliquer</button>
      <button class="btn" data-act="edit">Éditer</button>
      <button class="btn btn--accent modal__copy" data-act="copy">Copier le contenu</button>
    </div>`;

  wireView();
  loadVariants();
  root.querySelector('[data-act="copy"]').focus();
}

function wireView() {
  const foot = root.querySelector(".modal__foot");
  foot.querySelector('[data-act="copy"]').addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const ok = await copyText(entry.contenu || "");
    flashCopied(btn, ok);
  });
  foot.querySelector('[data-act="edit"]').addEventListener("click", () => { isNew = false; renderEdit(); });
  foot.querySelector('[data-act="duplicate"]').addEventListener("click", duplicate);
}

async function loadVariants() {
  if (!entry.id) return;
  const kids = await db.entries.children(entry.id);
  const box = root.querySelector(".modal__variants");
  if (!box || kids.length === 0) return;
  box.innerHTML = `
    <span class="modal__notes-label">Variantes (${kids.length})</span>
    <ul class="modal__variant-list">
      ${kids.map((k) => `<li><button class="modal__variant" data-open="${esc(k.id)}">${esc(k.titre || "(sans titre)")}</button></li>`).join("")}
    </ul>`;
  box.querySelectorAll("[data-open]").forEach((b) =>
    b.addEventListener("click", async () => {
      const child = await db.entries.get(b.getAttribute("data-open"));
      if (child) { entry = child; renderView(); }
    })
  );
}

/* ---------- EDIT mode ---------- */
function renderEdit() {
  mode = "edit";
  root.querySelector(".modal__title").textContent = isNew ? "Nouvelle entrée" : "Modifier";

  const opts = TYPES.map((t) =>
    `<option value="${t}" ${t === entry.type ? "selected" : ""}>${TYPE_LABEL[t]}</option>`).join("");

  root.querySelector(".modal__main").innerHTML = `
    <form class="form" id="entry-form" novalidate>
      <label class="field">
        <span class="field__label">Titre</span>
        <input class="field__input" name="titre" value="${esc(entry.titre)}" autocomplete="off" />
      </label>
      <div class="form__row">
        <label class="field">
          <span class="field__label">Type</span>
          <select class="field__input" name="type">${opts}</select>
        </label>
        <label class="field">
          <span class="field__label">Tags (séparés par virgule)</span>
          <input class="field__input" name="tags" value="${esc((entry.tags || []).join(", "))}" autocomplete="off" />
        </label>
      </div>
      <label class="field">
        <span class="field__label">Contenu</span>
        <textarea class="field__input field__textarea mono" name="contenu" rows="8">${esc(entry.contenu)}</textarea>
      </label>
      <label class="field">
        <span class="field__label">Notes</span>
        <textarea class="field__input" name="notes" rows="2">${esc(entry.notes)}</textarea>
      </label>
      <p class="form__error" hidden></p>
    </form>`;

  root.querySelector(".modal__foot").innerHTML = `
    <div class="modal__actions modal__actions--left">
      ${isNew ? "" : `<button class="btn btn--danger" data-act="delete">Supprimer</button>`}
    </div>
    <div class="modal__actions">
      <button class="btn" data-act="cancel">Annuler</button>
      <button class="btn btn--accent" data-act="save">Enregistrer</button>
    </div>`;

  wireEdit();
  root.querySelector('[name="titre"]').focus();
}

function readForm() {
  const f = root.querySelector("#entry-form");
  const get = (n) => f.querySelector(`[name="${n}"]`).value;
  return {
    titre: get("titre").trim(),
    type: get("type"),
    tags: get("tags").split(",").map((s) => s.trim()).filter(Boolean),
    contenu: get("contenu"),
    notes: get("notes").trim(),
  };
}

function showError(msg) {
  const el = root.querySelector(".form__error");
  if (el) { el.textContent = msg; el.hidden = !msg; }
}

function wireEdit() {
  const foot = root.querySelector(".modal__foot");
  foot.querySelector('[data-act="cancel"]').addEventListener("click", () => {
    if (isNew) closeModal(); else renderView();
  });
  foot.querySelector('[data-act="save"]').addEventListener("click", save);
  const del = foot.querySelector('[data-act="delete"]');
  if (del) del.addEventListener("click", remove);
}

async function save() {
  const data = readForm();
  if (!data.titre && !data.contenu.trim()) {
    showError("Donne au moins un titre ou du contenu.");
    return;
  }
  showError("");
  if (isNew || !entry.id) {
    entry = await db.entries.add({ ...entry, ...data });
    isNew = false;
  } else {
    entry = await db.entries.put({ ...entry, ...data });
  }
  notifyChanged();
  renderView();
}

async function duplicate() {
  const copy = await db.entries.add({
    ...entry,
    id: undefined,
    date_creation: undefined,
    titre: (entry.titre || "Sans titre") + " (copie)",
    parent_id: entry.id || null,
  });
  entry = copy;
  isNew = false;
  notifyChanged();
  renderEdit();
}

async function remove() {
  if (!entry.id) return;
  if (!window.confirm(`Supprimer « ${entry.titre || "cette entrée"} » ? Action définitive.`)) return;
  await db.entries.delete(entry.id);
  notifyChanged();
  closeModal();
}

/* ---------- open / close ---------- */
export function openModal(e, opts = {}) {
  if (!root) build();
  entry = e;
  isNew = !!opts.isNew;
  lastFocus = document.activeElement;
  root.removeAttribute("hidden");
  document.body.style.overflow = "hidden";
  if (opts.edit || isNew) renderEdit(); else renderView();
  requestAnimationFrame(() => root.classList.add("is-open"));
}

export function closeModal() {
  if (!root) return;
  root.classList.remove("is-open");
  document.body.style.overflow = "";
  const done = () => {
    root.setAttribute("hidden", "");
    root.removeEventListener("transitionend", done);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };
  root.addEventListener("transitionend", done);
  setTimeout(() => { if (!root.hasAttribute("hidden")) done(); }, 250);
}
