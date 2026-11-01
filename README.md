# BLL Élite – Statistiques de match

Site statique (GitHub Pages) qui affiche les statistiques des équipes U16AA et U19AA
à partir des sommaires PDF remplis après chaque match.

## Ajouter un match

1. Pendant le match : noter les données sur la feuille papier « Saisie ».
2. Après le match : remplir `fiches/BLL - Statistiques - Sommaire - Match.pdf` dans **Acrobat Reader**
   (les totaux, le filet et la validation de l'heure ne fonctionnent que dans Acrobat)
   et l'enregistrer dans `pdf/`. Le nom du fichier est libre, par exemple
   `BLL - Statistiques - Sommaire - Match U19 #2016 - 2026-10-31.pdf`.
3. (Facultatif) Vérifier localement : `python tools/extract.py`, puis Live Server.
4. Commit + push. GitHub Actions lance `extract.py` et publie le site en 1 à 2 minutes
   (Ctrl+F5 dans le navigateur si l'ancienne version reste affichée).

## Saisir un match sur téléphone

Page non liée depuis le site : <https://cbelanger.github.io/bll-stats/saisie.html> (à mettre en favori ou sur l'écran d'accueil).

1. Avant le match : toucher le nom du match en haut pour remplir les infos (équipe, adversaire, no de match, gardienne).
2. Pendant le match : choisir la période, puis compter tirs, buts et sorties de zone. « + But accordé » enregistre le but
   tout de suite ; le détail (temps, type, zone) se complète maintenant ou plus tard en touchant la ligne du but.
   « Annuler » défait la dernière action. Tout reste dans le téléphone, même sans réseau ni en rechargeant la page.
3. Après le match : « Terminer » → vérifications → « Télécharger le fichier » → « Ouvrir la page de dépôt GitHub »
   → choisir le fichier dans Téléchargements → « Commit changes ». GitHub Actions publie le site.
4. Pour le match suivant : toucher le nom du match → « Nouveau match ».

Les fichiers vont dans `data/saisies/` et ont les mêmes champs que le PDF Sommaire. Les PDF restent possibles en parallèle ;
si un même match existe en PDF et en saisie, le PDF est gardé.

### Si quelque chose ne va pas

- **Erreur** dans un PDF : le match est laissé de côté, les autres sont publiés, et l'exécution finit en ✗ rouge.
  GitHub envoie un courriel ; le détail est dans l'onglet **Actions** du dépôt (résumé de l'extraction
  et annotations en rouge).
- **Attention** : l'exécution reste verte ; les avertissements s'affichent en jaune en haut de l'exécution.
- Sur une autre branche que `main`, l'Action vérifie les PDF sans rien publier.
- Revenir à l'état d'avant GitHub Actions : tag `avant-github-action`, et remettre
  Settings → Pages → Source sur « Deploy from a branch ».

## Commandes

Toutes les commandes se lancent depuis la racine du dépôt.

| Commande | Rôle |
|---|---|
| `pip install -r requirements.txt` | Installe les dépendances Python (pypdf, reportlab, pillow) |
| `python tools/extract.py` | Lit tous les PDF de `pdf/` et réécrit `data/matchs.json` (vérification locale ; GitHub Actions le lance aussi à chaque push) |
| `python tools/fiches/generer_sommaire.py` | Régénère le PDF remplissable vierge `fiches/BLL - Statistiques - Sommaire - Match.pdf` |
| `python tools/fiches/generer_saisie.py` | Régénère la feuille papier vierge `fiches/BLL - Statistiques - Saisie - Match.pdf` (paysage) |
| `python -m http.server 8000` | Sert le site localement sur <http://localhost:8000> (ou Live Server dans VS Code) |

Le site doit être ouvert par un serveur : un double-clic sur `index.html` ne peut pas lire `data/matchs.json`.

### Messages de `extract.py`

- **erreur** : le PDF est ignoré et le script se termine avec un code d'erreur. Exemples : aucune ou
  deux équipes cochées, date invalide, adversaire ou score manquant, plus de buts accordés que de
  tirs cadrés adverses, plus de sorties de zone réussies que de tentatives.
- **attention** : le match est publié quand même. Exemples : numéro de match ou gardienne manquant,
  type ou zone de but manquant, nombre de buts en section 1 différent du nombre de lignes en section 2,
  texte non numérique dans un champ numérique (valeur ignorée).

## Structure

| Chemin | Contenu |
|---|---|
| `index.html`, `css/`, `js/` | Le site (JavaScript sans dépendance, aucune étape de build) |
| `pdf/` | Sommaires remplis (source des données) |
| `data/saisies/` | Matchs saisis sur téléphone avec `saisie.html` (source des données) |
| `data/gardiennes.json` | Liste officielle des gardiennes (nom, numéro) — édité à la main |
| `saisie.html`, `css/saisie.css`, `js/saisie.js`, `sw-saisie.js` | Page de saisie sur téléphone (hors ligne grâce à `sw-saisie.js`) |
| `data/matchs.json` | Généré par `tools/extract.py` — non versionné, ne pas éditer à la main |
| `.github/workflows/publier.yml` | GitHub Actions : extraction et publication du site |
| `tools/extract.py` | Extraction PDF → JSON, avec validation |
| `tools/fiches/` | Scripts qui génèrent les fiches vierges |
| `fiches/` | Fiches vierges à distribuer (Sommaire remplissable, Saisie papier) |
| `assets/` | Logo du club |

Le dépôt est public : tout ce qui est dans `pdf/` (y compris les notes) est publié.

## Le site

- **Matchs** : liste des matchs de la saison, du plus vieux au plus récent ; un clic ouvre la fiche du match.
- **Gardiennes** : % d'arrêts, buts accordés par match, tableau match par match, zones et types de jeu.
- **Équipe** : fiche V-D-N, moyennes par match, tirs cadrés moyens par période, buts accordés par zone et par type.
- Bas de page : date de publication du code et date de la dernière exécution de `extract.py`.

## Ajouter une gardienne

1. Ajouter une ligne dans `data/gardiennes.json` : `{ "nom": "Prénom Nom", "numero": 31 }`.
2. Régénérer la fiche : `python tools/fiches/generer_sommaire.py` (pour la liste du PDF), puis commit + push.

La page de saisie affiche la liste à la prochaine ouverture avec réseau. `extract.py` s'en sert pour corriger
les coquilles (numéro connu → nom officiel), compléter un numéro oublié et avertir pour une gardienne inconnue.

## Calculs

- Un tir cadré inclut les buts.
- % d'arrêts = (tirs cadrés adverses − buts accordés) / tirs cadrés adverses.
- Buts accordés par match = buts accordés / matchs joués (pas par 60 minutes).
- Une gardienne par match : tous les tirs adverses du match lui sont attribués.
- Tirs par période : une période P1 à P4 laissée vide compte pour 0 ; une prolongation vide
  signifie « pas de prolongation » et n'entre pas dans la moyenne de la prolongation.
- Saison : d'août à juillet (un match du 2026-11-01 compte pour 2026-2027).

## Licence

Le code (`index.html`, `css/`, `js/`, `tools/`) est sous [licence MIT](LICENSE), © 2026 Christian Bélanger.
Le logo du BLL Élite (`assets/`) appartient au club ; les données de match (`pdf/`, `data/`) ne sont pas
sous licence libre (tous droits réservés).
