/* ============================================================
   util.js — helpers partagés (search + modal)
   ============================================================ */

export function esc(s) {
  return String(s || "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

export function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** copy to clipboard, fallback to execCommand. returns boolean. */
export async function copyText(text) {
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

/** transient "Copié ✓" feedback on a button. */
export function flashCopied(btn, ok) {
  if (!btn) return;
  const prev = btn.dataset.label || btn.textContent;
  btn.dataset.label = prev;
  btn.textContent = ok ? "Copié ✓" : "Échec";
  btn.classList.toggle("is-ok", ok);
  clearTimeout(btn._flashT);
  btn._flashT = setTimeout(() => {
    btn.textContent = prev;
    btn.classList.remove("is-ok");
  }, 1100);
}
/** toast notification (durée en ms, défaut 4000). */
export function showToast(msg, duration = 4000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('toast--visible');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('toast--visible'), duration);
}