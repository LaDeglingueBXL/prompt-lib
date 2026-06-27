/* ============================================================
   generator.js — générateur de briques (étape 6)
   Assemble des fragments (briques) → prompt concaténé (zéro IA).
   Enregistre comme entry { contenu, brique_ids[] }.
   Gère aussi la création/suppression de briques.
   ============================================================ */

import { db } from "./db.js";
import { esc, copyText, flashCopied } from "./util.js";

const CAT_ORDER = ["sujet", "style", "qualité", "ambiance"];
const CAT_LABEL = {
  sujet: "Sujet", style: "Style", "qualité": "Qualité", ambiance: "Ambiance",
};
const SEPARATORS = {
  ", ": "virgule",
  " ": "espace",
  "\n": "nouvelle ligne",
};

let root, lastFocus = null;
let selected = [];     // ordered [{id, valeur, categorie}]
let separator = ", ";
let showBriqueForm = false;

function notifyChanged() {
  document.dispatchEvent(new CustomEvent("entries:changed"));
}

function preview() {
  return selected.map((s) => s.valeur).join(separator);
}

/* ---------- shell ---------- */
function build() {
  root = document.createElement("div");
  root.className = "modal";
  root.setAttribute("hidden", "");
  root.innerHTML = `
    <div class="modal__backdrop" data-close></div>
    <div class="modal__dialog modal__dialog--wide" role="dialog" aria-modal="true" aria-labelledby="gen-title">
      <header class="modal__head">
        <h2 class="modal__title" id="gen-title">Générateur</h2>
        <button class="modal__close" data-close aria-label="Fermer">✕</button>
      </header>
      <div class="gen">
        <section class="gen__library" aria-label="Briques disponibles"></section>
        <section class="gen__build" aria-label="Assemblage"></section>
      </div>
      <footer class="modal__foot gen__foot"></footer>
    </div>`;
  document.body.appendChild(root);

  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeGenerator();
  });
  document.addEventListener("keydown", (e) => {
    if (root.hasAttribute("hidden")) return;
    if (e.key === "Escape") closeGenerator();
  });
}

/* ---------- library (left) ---------- */
async function renderLibrary() {
  const briques = await db.briques.all();
  const cats = [...new Set(briques.map((b) => b.categorie))];
  cats.sort((a, b) => {
    const ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });

  const groups = cats.map((cat) => {
    const items = briques.filter((b) => b.categorie === cat);
    return `
      <div class="gen__group">
        <span class="gen__cat">${esc(CAT_LABEL[cat] || cat)}</span>
        <div class="gen__chips">
          ${items.map((b) => `
            <span class="gen__brique">
              <button class="gen__brique-add" data-add="${esc(b.id)}" title="Ajouter">${esc(b.valeur)}</button>
              <button class="gen__brique-del" data-del="${esc(b.id)}" title="Supprimer la brique" aria-label="Supprimer">✕</button>
            </span>`).join("")}
        </div>
      </div>`;
  }).join("");

  const form = showBriqueForm ? briqueFormHTML() : "";

  root.querySelector(".gen__library").innerHTML = `
    <div class="gen__lib-head">
      <span class="modal__notes-label">Briques</span>
      <button class="btn gen__add-brique" data-act="toggle-form">${showBriqueForm ? "Fermer" : "+ Brique"}</button>
    </div>
    ${form}
    ${briques.length === 0 ? `<p class="gen__empty">Aucune brique. Crée-en une.</p>` : groups}`;

  wireLibrary();
}

function briqueFormHTML() {
  const opts = CAT_ORDER.map((c) => `<option value="${c}">${CAT_LABEL[c]}</option>`).join("");
  return `
    <form class="gen__brique-form" id="brique-form">
      <select class="field__input" name="categorie">${opts}</select>
      <input class="field__input" name="valeur" placeholder="Valeur du fragment" autocomplete="off" />
      <input class="field__input" name="tags" placeholder="Tags (virgule)" autocomplete="off" />
      <button type="button" class="btn btn--accent" data-act="save-brique">Ajouter</button>
    </form>`;
}

function wireLibrary() {
  const lib = root.querySelector(".gen__library");
  lib.querySelector('[data-act="toggle-form"]').addEventListener("click", () => {
    showBriqueForm = !showBriqueForm;
    renderLibrary();
  });
  const saveB = lib.querySelector('[data-act="save-brique"]');
  if (saveB) saveB.addEventListener("click", saveBrique);

  lib.querySelectorAll("[data-add]").forEach((b) =>
    b.addEventListener("click", async () => {
      const brique = await db.briques.get(b.getAttribute("data-add"));
      if (brique) {
        selected.push({ id: brique.id, valeur: brique.valeur, categorie: brique.categorie });
        renderBuild();
      }
    })
  );
  lib.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", async () => {
      const id = b.getAttribute("data-del");
      if (!window.confirm("Supprimer cette brique ?")) return;
      await db.briques.delete(id);
      selected = selected.filter((s) => s.id !== id);
      notifyChanged();
      renderLibrary();
      renderBuild();
    })
  );
}

async function saveBrique() {
  const f = root.querySelector("#brique-form");
  const valeur = f.querySelector('[name="valeur"]').value.trim();
  if (!valeur) { f.querySelector('[name="valeur"]').focus(); return; }
  await db.briques.add({
    categorie: f.querySelector('[name="categorie"]').value,
    valeur,
    tags: f.querySelector('[name="tags"]').value.split(",").map((s) => s.trim()).filter(Boolean),
  });
  showBriqueForm = false;
  notifyChanged();
  renderLibrary();
}

/* ---------- build (right) ---------- */
function renderBuild() {
  const sepOpts = Object.entries(SEPARATORS)
    .map(([v, label]) => `<option value="${v === "\n" ? "\\n" : v}" ${v === separator ? "selected" : ""}>${label}</option>`)
    .join("");

  const list = selected.length === 0
    ? `<p class="gen__empty">Clique des briques à gauche pour les assembler.</p>`
    : `<ol class="gen__selected">
        ${selected.map((s, i) => `
          <li class="gen__sel">
            <span class="gen__sel-val">${esc(s.valeur)}</span>
            <span class="gen__sel-ctrl">
              <button data-up="${i}" aria-label="Monter" ${i === 0 ? "disabled" : ""}>↑</button>
              <button data-down="${i}" aria-label="Descendre" ${i === selected.length - 1 ? "disabled" : ""}>↓</button>
              <button data-rm="${i}" aria-label="Retirer">✕</button>
            </span>
          </li>`).join("")}
       </ol>`;

  root.querySelector(".gen__build").innerHTML = `
    <div class="gen__build-head">
      <span class="modal__notes-label">Assemblage</span>
      <label class="gen__sep">Séparateur
        <select class="field__input field__input--sm" data-sep>${sepOpts}</select>
      </label>
    </div>
    ${list}
    <span class="modal__notes-label">Aperçu</span>
    <pre class="gen__preview mono">${esc(preview()) || "<vide>"}</pre>`;

  wireBuild();
}

function wireBuild() {
  const build = root.querySelector(".gen__build");
  const sep = build.querySelector("[data-sep]");
  if (sep) sep.addEventListener("change", (e) => {
    separator = e.target.value === "\\n" ? "\n" : e.target.value;
    renderBuild();
  });
  build.querySelectorAll("[data-up]").forEach((b) => b.addEventListener("click", () => move(+b.dataset.up, -1)));
  build.querySelectorAll("[data-down]").forEach((b) => b.addEventListener("click", () => move(+b.dataset.down, +1)));
  build.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => {
    selected.splice(+b.dataset.rm, 1); renderBuild();
  }));
}

function move(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= selected.length) return;
  [selected[i], selected[j]] = [selected[j], selected[i]];
  renderBuild();
}

/* ---------- footer ---------- */
function renderFoot() {
  root.querySelector(".gen__foot").innerHTML = `
    <input class="field__input gen__title" id="gen-entry-title" placeholder="Titre du prompt généré" autocomplete="off" />
    <div class="modal__actions">
      <button class="btn gen__copy" data-act="copy">Copier</button>
      <button class="btn btn--accent" data-act="save-entry">Enregistrer comme prompt</button>
    </div>`;
  const foot = root.querySelector(".gen__foot");
  foot.querySelector('[data-act="copy"]').addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const ok = await copyText(preview());
    flashCopied(btn, ok);
  });
  foot.querySelector('[data-act="save-entry"]').addEventListener("click", saveEntry);
}

async function saveEntry() {
  if (selected.length === 0) return;
  const titleEl = root.querySelector("#gen-entry-title");
  const titre = titleEl.value.trim() || "Prompt généré";
  await db.entries.add({
    titre,
    contenu: preview(),
    type: "prompt_image",
    tags: [...new Set(selected.map((s) => s.categorie))],
    brique_ids: selected.map((s) => s.id),
    notes: "",
    parent_id: null,
  });
  notifyChanged();
  closeGenerator();
}

/* ---------- open / close ---------- */
export async function openGenerator() {
  if (!root) build();
  selected = [];
  separator = ", ";
  showBriqueForm = false;
  lastFocus = document.activeElement;
  root.removeAttribute("hidden");
  document.body.style.overflow = "hidden";
  await renderLibrary();
  renderBuild();
  renderFoot();
  requestAnimationFrame(() => {
    root.classList.add("is-open");
    root.querySelector(".modal__close").focus();
  });
}

export function closeGenerator() {
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
