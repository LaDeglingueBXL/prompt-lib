// js/exporter.js
import { db } from './db.js';

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('toast--visible');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('toast--visible'), 4000);
}

export async function exportData() {
  const entries = await db.entries.all();
  const briques = await db.briques.all();

  const payload = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    entries,
    briques,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'export_data.json';
  a.click();
  URL.revokeObjectURL(url);

  showToast('✅ Export téléchargé — déplace le fichier dans prompt-lib/ puis lance deploy.py');
}