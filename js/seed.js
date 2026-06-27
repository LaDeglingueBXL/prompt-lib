/* ============================================================
   seed.js — données d'exemple pour test/dev (NON auto-exécuté)
   Console:  import("./js/seed.js").then(m => m.seed())
   ou:       seed()  (exposé sur window après import)
   Réinit :  resetDB()
   ============================================================ */

import { db } from "./db.js";

const SAMPLE_BRIQUES = [
  { categorie: "style",    valeur: "cinematic lighting, 35mm film",  tags: ["photo", "film"] },
  { categorie: "style",    valeur: "flat vector illustration",        tags: ["vector", "illustration"] },
  { categorie: "sujet",    valeur: "a lone lighthouse on a cliff",    tags: ["paysage", "mer"] },
  { categorie: "qualité",  valeur: "highly detailed, 8k",             tags: ["qualité"] },
  { categorie: "ambiance", valeur: "moody, foggy, golden hour",       tags: ["ambiance", "brume"] },
];

const SAMPLE_ENTRIES = [
  {
    titre: "Portrait cinématique Midjourney",
    contenu: "cinematic portrait of an old fisherman, weathered face, soft window light, 85mm, shallow depth of field --ar 4:5 --style raw",
    type: "prompt_image",
    tags: ["portrait", "cinematic", "midjourney"],
    thumb_path: "",
    notes: "Marche mieux avec --style raw.",
    parent_id: null,
  },
  {
    titre: "Resume un PDF en bullet points",
    contenu: "Tu es un assistant de synthèse. Lis le document fourni et restitue 5 à 7 puces, une idée par puce, sans introduction.",
    type: "prompt_texte",
    tags: ["synthèse", "productivité"],
    thumb_path: "",
    notes: "",
    parent_id: null,
  },
  {
    titre: "Installer une PWA — checklist",
    contenu: "1. manifest.json valide\n2. service worker enregistré\n3. icônes 192 + 512\n4. servi en HTTPS (ou localhost)",
    type: "tuto",
    tags: ["pwa", "web"],
    thumb_path: "",
    notes: "Référence rapide.",
    parent_id: null,
  },
];

export async function seed() {
  await db.ready;
  const briques = await db.briques.bulkAdd(SAMPLE_BRIQUES);
  const entries = await db.entries.bulkAdd(SAMPLE_ENTRIES);
  console.log(`seed: +${entries.length} entrées, +${briques.length} briques`);
  if (window.refreshCount) window.refreshCount();
  return { entries, briques };
}

export async function resetDB() {
  await db.ready;
  await db.entries.clear();
  await db.briques.clear();
  console.log("DB vidée");
  if (window.refreshCount) window.refreshCount();
}

// console convenience
window.seed = seed;
window.resetDB = resetDB;
