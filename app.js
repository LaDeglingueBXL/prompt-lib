/* ============================================================
   app.js — bootstrap
   - register service worker
   - open IndexedDB, show counts
   - wire "+ Nouvelle" + react to entries:changed
   - focus search
   ============================================================ */

import { db } from "./db.js";
import { initSearch } from "./search.js";
import { openModal, emptyEntry } from "./modal.js";

const statusEl = document.getElementById("status");
const searchEl = document.getElementById("search");
const newBtn = document.getElementById("new-entry");

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (err) {
    console.error("SW register failed:", err);
  }
}

async function refreshCount() {
  const n = await db.entries.count();
  const b = await db.briques.count();
  setStatus(`${n} entrées · ${b} briques · hors-ligne ok`);
}

async function init() {
  setStatus("init…");
  registerSW();
  await db.ready;
  await refreshCount();
  initSearch();

  newBtn.addEventListener("click", () => openModal(emptyEntry(), { isNew: true }));
  document.addEventListener("entries:changed", refreshCount);

  if (searchEl) searchEl.focus({ preventScroll: true });

  window.db = db;
  window.refreshCount = refreshCount;
}

document.addEventListener("DOMContentLoaded", init);
