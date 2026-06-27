# Bibliothèque de prompts — PWA

Bibliothèque personnelle : prompts (texte/image), tutos IA, skills LLM.
Stack : HTML/CSS/JS vanilla + IndexedDB (Dexie) sur PC · `data.json` statique (Netlify) en lecture mobile. Zéro backend.

## Lancer en local

PWA + service worker → besoin d'un serveur (pas `file://`) :

```bash
cd prompt-lib
python3 -m http.server 8000
# ouvrir http://localhost:8000
```

## Structure

```
prompt-lib/
├── index.html              app shell (search hero + résultats)
├── manifest.json           PWA install (standalone, thème dark)
├── sw.js                   service worker (precache shell, offline ok)
├── css/styles.css          design tokens + base
├── js/app.js               bootstrap (SW + focus search)
├── assets/icons/           icônes PWA (192/512/maskable + svg)
├── assets/originals/       images source — PC only, JAMAIS déployées
├── assets/thumbs/          thumbs 300px — générés par deploy.py
├── vendor/                 libs vendorées (Dexie) — étape 2
└── scripts/                import_excel.py + deploy.py — étape 7-8
```

## Build — où on en est

- [x] **1. Scaffold PWA** — dossiers, manifest, SW, shell, icônes
- [x] **2. IndexedDB (wrapper maison)** — stores entries + briques, CRUD, search, duplication
- [x] **3. UI recherche → copier** — live search, highlight, copier 1-tap, nav clavier
- [x] **4. Modale de consultation** — split-screen, thumb placeholder, copier, focus trap
- [x] **5. Duplication / édition non-destructive** — édition inline, dupliquer, nouvelle, variantes, supprimer
- [x] **6. Générateur de briques** — assemblage ordonné, aperçu live, séparateurs, brique CRUD, save as prompt
- [ ] 7. import_excel.py
- [ ] 8. deploy.py + Netlify

## Notes

- Fonts = stacks système pour l'instant ; faces custom vendorées en passe polish.
- `data.json` (mobile) n'existe pas encore → généré par `deploy.py` (étape 8).
- Bump `CACHE` dans `sw.js` à chaque déploiement pour invalider l'ancien shell.
