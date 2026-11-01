# Group Horizon Media – système d'actualités automatique

## Fonctionnement
Sources RSS/API  →  `shared/news-core.js` (lecture, classement, doublons)  →  stockage KV `NEWS`  →  `/api/news` (JSON)  →  site.
- **Worker cron** (`worker/`) : relance la récupération toutes les 10 minutes.
- **Pages Function** (`functions/api/news.js`) : sert le JSON ; si les données ont plus de 15 min, relance aussi la récupération (filet de sécurité).
- Une source en panne est ignorée : les articles déjà récupérés restent (7 jours max). Le site garde aussi les dernières données dans le navigateur.
- Le navigateur interroge `/api/news` toutes les 10 min (et au retour sur l'onglet). Rien de secret n'est dans le navigateur.

## Classement
- Sources/mentions sénégalaises → rubrique thématique (Politique, Économie, Société, Santé, Sport, Culture, Éducation, Environnement, Technologie), badge « Sénégal ».
- Autres pays africains / monde → International (badges « Afrique » / « Monde »), et aussi Sport, Santé, Économie, Culture, Environnement, Technologie quand le thème est détecté.
- À LA UNE : score = fraîcheur + Sénégal + image + poids de la source (max. 2 articles par source). FLASH INFO : les 10 plus récents.

## Tester
1. `npm install` puis `npm test` : 3 tests automatiques (classement, doublons, images, panne de source).
2. `npm run check` : interroge VOS sources réelles et affiche ✅/❌ par source (à lancer depuis votre ordinateur).
3. `npm run dev` : site local sur http://localhost:8788 (récupération réelle à la première visite).

## Déployer
1. `npx wrangler kv namespace create NEWS` → copiez l'`id` dans `wrangler.toml` ET `worker/wrangler.toml`.
2. Pages : GitHub → Cloudflare Pages, dossier de sortie `public`, pas de commande de build. Liez le KV `NEWS` (Settings > Functions > KV bindings) si `wrangler.toml` n'est pas utilisé.
3. Worker : `cd worker && npx wrangler deploy` (le cron `*/10 * * * *` est déjà configuré).
4. Contrôle : ouvrez `/api/news` → champ `sources` (ok true/false + erreur). Le pied de page affiche « sources actives X/Y ».

## Ajouter / remplacer une source
Éditez **uniquement** `shared/sources.js` : ajoutez une ligne `{ id, name, url:'<flux RSS>', country:'sn'|'afrique'|'monde', cat, weight }`. Pas d'adresse de flux ? Mettez `site:'https://exemple.sn'` : le flux est détecté automatiquement. Retirer = supprimer la ligne ou `enabled:false`. Redéployez, puis `npm run check`.

## Ce qui demande une configuration
| Élément | Statut |
|---|---|
| KV `NEWS` + id dans les 2 `wrangler.toml` | **obligatoire** pour le stockage partagé |
| Flux Senego, Dakaractu, RFI, RFI Afrique, BBC Afrique, France 24 | adresses trouvées par recherche, à valider avec `npm run check` |
| Seneweb, PressAfrik, Le Soleil, APS | flux détecté automatiquement, **non vérifié** : peut échouer |
| API NewsData.io | **optionnelle**, clé : `npx wrangler secret put NEWSDATA_API_KEY` (Worker) et variable secrète du projet Pages |
| `ADMIN_TOKEN` | optionnel : permet `POST /api/refresh` avec `Authorization: Bearer …` |
| `CONFIG.videos`, `liveUrl`, `ads`, `email` (`public/assets/js/main.js`) | à renseigner |

## Droits
Seuls titre, extrait, image fournie par le flux, source, date et lien sont repris ; chaque article renvoie vers l'original. Vérifiez les conditions d'utilisation de chaque média (`images:false` désactive les images d'une source).
