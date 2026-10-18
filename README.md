# Happy Double – feuille de score

Page statique (HTML/CSS/JS, sans dépendance) pour tenir les scores de Happy Double sur le fond de la feuille officielle.

## Utilisation

- **Local** : ouvrir `index.html` dans un navigateur. Tout fonctionne, sauf l'installation en application (PWA).
- **PWA** : déposer le dossier sur n'importe quel hébergement statique HTTPS (GitHub Pages, Netlify Drop, Cloudflare Pages…). Le navigateur propose alors « Installer » (aussi dans le menu ☰) et l'application fonctionne hors ligne.

Hébergement actuel : https://ghomerr.github.io/happy-double-score/ — déployé automatiquement à chaque push sur `main` par [.github/workflows/pages.yml](.github/workflows/pages.yml).

Pour tester la PWA en local : `python -m http.server 8000` puis http://localhost:8000.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html`, `app.css`, `app.js` | Application |
| `assets/sheet.svg` | Fond vectoriel extrait de `GIGAMIC_HAPPY-DOUBLE_BLOC-SCORE_WEB.pdf` |
| `manifest.webmanifest`, `sw.js`, `icons/` | PWA (installation et hors ligne) |

Après une modification des fichiers, incrémenter `VERSION` dans `sw.js` pour que les appareils installés récupèrent la mise à jour.

## Calcul des points d'une manche

Somme des cases (points de double compris) + bonus de la zone de risque selon la dernière case remplie (L3 +5, L4 +10, L5 +15, L6 +20).
- Ligne nulle : 0, ou ce qui précède la parenthèse si le filet de sécurité a été posé (bonus de la zone atteinte avant la parenthèse inclus).
- Quitte ou double : total de la ligne × 2, sauf en cas d'élimination.
