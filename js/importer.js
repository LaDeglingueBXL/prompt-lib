// importer.js — Bibliothèque de prompts
// Détecte import_queue.json au démarrage → upsert IndexedDB → dispatch event

const QUEUE_PATH = "./import_queue.json";

export async function runImportIfQueued(db) {
  let queue;
  try {
    const res = await fetch(`${QUEUE_PATH}?_=${Date.now()}`);
    if (!res.ok) return;
    queue = await res.json();
  } catch {
    return;
  }

  if (!queue?.version) return;

  const entries = queue.entries ?? [];
  const briques = queue.briques ?? [];
  const action  = queue.action  ?? "merge";

  try {
    if (action === "replace") {
      await db.entries.clear();
      await db.briques.clear();
    }

    let countE = 0, countB = 0;

    for (const entry of entries) {
      if (!entry.id || !entry.titre) continue;
      await db.entries.put(entry);
      countE++;
    }
    for (const brique of briques) {
      if (!brique.id || !brique.valeur) continue;
      await db.briques.put(brique);
      countB++;
    }

    console.info(`[importer] ${action} — ${countE} entrée(s), ${countB} brique(s)`);

    window.dispatchEvent(new CustomEvent("entries:changed"));
    window.dispatchEvent(new CustomEvent("import:done", {
      detail: { entries: countE, briques: countB, action }
    }));

    _showImportToast(countE, countB, action);

  } catch (err) {
    console.error("[importer] Échec :", err);
  }
}

function _showImportToast(countE, countB, action) {
  const toast = document.createElement("div");
  toast.className = "import-toast";

  const label = action === "replace" ? "Remplacement" : "Import";
  toast.innerHTML = `
    <span class="import-toast__icon">✓</span>
    <span class="import-toast__msg">
      ${label} : <strong>${countE}</strong> entrée(s),
      <strong>${countB}</strong> brique(s)
    </span>
    <span class="import-toast__hint">
      Supprime <code>import_queue.json</code> pour éviter le ré-import.
    </span>
    <button class="import-toast__close" aria-label="Fermer">×</button>
  `;

  document.body.appendChild(toast);
  toast.querySelector(".import-toast__close").addEventListener("click", () => toast.remove());
  setTimeout(() => toast.remove(), 8000);
}