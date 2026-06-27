\# 02 — Architecture des données



\## Entité `entry` (IndexedDB + data.json)



| Champ        | Type           | Notes                                             |

|--------------|----------------|---------------------------------------------------|

| id           | UUID (string)  | Généré côté client (crypto.randomUUID())          |

| titre        | string         |                                                   |

| contenu      | string (long)  | Le prompt / tuto / skill                          |

| type         | enum           | "prompt\_texte" | "prompt\_image" | "tuto" | "skill" |

| tags         | string\[]       | Ex: \["portrait", "cinematic", "midjourney"]       |

| thumb\_path   | string         | "thumbs/{id}.jpg" — chemin relatif               |

| notes        | string         | Remarques personnelles                            |

| date\_creation| ISO string     | "2026-06-20T14:30:00Z"                           |

| parent\_id    | UUID | null    | Renseigné si c'est une variante (duplication)     |



\## Entité `brique` (IndexedDB + data.json)



| Champ     | Type     | Notes                                    |

|-----------|----------|------------------------------------------|

| id        | UUID     |                                          |

| categorie | string   | "style" | "sujet" | "qualité" | "ambiance"|

| valeur    | string   | Le fragment de texte réutilisable        |

| tags      | string\[] | Pour la recherche de briques             |



> Une même brique peut figurer dans plusieurs prompts générés.

> Relation N:N entre briques et prompts générés → stockée comme liste d'IDs dans

> l'entrée générée (champ `brique\_ids: string\[]` dans `entry`).



\## Images



| Type         | Dossier               | Taille max | Exporté Netlify |

|--------------|-----------------------|------------|-----------------|

| Original     | /assets/originals/    | Illimitée  | Non             |

| Thumbnail    | /assets/thumbs/       | 300px larg., JPEG 75% | Oui  |



Script `deploy.py` :

1\. Lit tous les originaux via Pillow.

2\. Génère thumb si inexistant ou original modifié.

3\. Exporte IndexedDB → data.json via l'API navigateur (pont JS→Python à définir).

4\. Copie /assets/thumbs/ + data.json vers /deploy/.

5\. Push /deploy/ vers Netlify CLI.



\## data.json (structure)

```json

{

&#x20; "version": "1.0",

&#x20; "exported\_at": "2026-06-20T14:30:00Z",

&#x20; "entries": \[ /\* array d'entry \*/ ],

&#x20; "briques": \[ /\* array de brique \*/ ]

}

