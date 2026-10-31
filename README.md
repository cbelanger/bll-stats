# BLL Élite – Statistiques de match

Site statique (GitHub Pages) qui affiche les statistiques des équipes U16AA et U19AA
à partir des sommaires PDF remplis après chaque match.

## Ajouter un match

1. Pendant le match : noter les données sur la feuille papier « Saisie ».
2. Après le match : remplir `fiches/BLL - Statistiques - Sommaire - Match.pdf` dans **Acrobat Reader**
   (les totaux, le filet et la validation de l'heure ne fonctionnent que dans Acrobat)
   et l'enregistrer dans `pdf/`. Le nom du fichier est libre, par exemple
   `BLL - Statistiques - Sommaire - Match U19 #2016 - 2026-10-31.pdf`.
3. Extraire les données :
   ```
   python tools/extract.py
   ```
4. Vérifier localement (voir ci-dessous).
5. Commit + push. Le site se met à jour en environ une minute
   (Ctrl+F5 dans le navigateur si l'ancienne version reste affichée).

## Commandes

Toutes les commandes se lancent depuis la racine du dépôt.

| Commande | Rôle |
|---|---|
| `pip install -r requirements.txt` | Installe les dépendances Python (pypdf, reportlab, pillow) |
| `python tools/extract.py` | Lit tous les PDF de `pdf/` et réécrit `data/matchs.json` |
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
| `data/matchs.json` | Généré par `tools/extract.py` — ne pas éditer à la main |
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
