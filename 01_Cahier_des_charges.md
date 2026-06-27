\# 01 — Cahier des charges



\## Projet

PWA "Bibliothèque de prompts" — bibliothèque personnelle pour prompts (texte/image),

tutoriels IA et skills LLMs.



\## Stack validée (définitive)

\- Frontend : HTML / CSS / JS vanilla — PWA (manifest + service worker).

\- Stockage PC : IndexedDB via Dexie.js.

\- Lecture mobile : data.json statique servi par Netlify.

\- Images : originals sur PC uniquement ; thumbs 300px sur Netlify.

\- Python : 2 scripts locaux — import\_excel.py et deploy.py (Pillow + openpyxl).

\- Excel (CSV/XLSX) : import/export uniquement.

\- Pas de backend. Pas de serveur. Pas de cloud propriétaire.



\## Fonctionnalités

1\. Recherche par mots-clés (titre, tags, contenu).

2\. Consultation split-screen / modale : contenu + copier + aperçu thumb.

3\. Édition non-destructive : duplication (parent\_id), pas d'historique.

4\. Générateur : concaténation de briques → nouveau prompt.

5\. Ajout d'entrées via l'app (PC) ou import Excel.



\## Appareils et rôles

| Appareil | Rôle       | Stockage    | Images    |

|----------|------------|-------------|-----------|

| PC       | Édition    | IndexedDB   | Originales|

| Android  | Lecture    | data.json   | Thumbs    |

| iPad     | Lecture    | data.json   | Thumbs    |



\## Principes

\- Geste prioritaire : chercher → copier (optimiser l'UX autour de ça).

\- PC = maître. Mobile = miroir en lecture seule.

\- Un bouton "Déployer" sur PC suffit à synchroniser.

\- Coder une feature de bout en bout à la fois.

\- Modèle de données figé avant tout code.



\## Contraintes

\- Volume cible : 1 000–10 000 entrées.

\- \~2 000 images lourdes → thumbs obligatoires, originals hors déploiement.

\- Hors-ligne mobile : oui via service worker (cache data.json + thumbs).

\- Offline desktop : non requis (PC = en ligne).

