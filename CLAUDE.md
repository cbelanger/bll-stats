# Projet : statistiques de match BLL Élite (ringuette)

Site statique publié sur GitHub Pages (dépôt public) qui affiche les statistiques des équipes
**U16AA** et **U19AA** du BLL Élite (LERQ). Une seule personne (Christian) dépose les données ;
le site est en lecture seule.

Répondre en français, tutoiement, ton direct.

## Flux de données : un match = un fichier `data/matchs/*.json`

La source de vérité est `data/matchs/`, un fichier par match, nommé `AAAA-MM-JJ_EQUIPE_adversaire[_no].json`
(règle `nom_fichier()` dans extract.py = `nomFichier()` dans js/saisie.js), au format
`{"format": "bll-match-1", "exporte_le": …, "source": "pdf"|"saisie", "champs": {…}}` où `champs` reprend
**les noms de champs du PDF Sommaire** (validés par `valider()` d'extract.py). Deux façons d'entrer un match :

1. **Téléphone** : `saisie.html` (page non liée, Android ; Christian utilise Edge). Saisie dans le navigateur
   (localStorage, `sw-saisie.js` pour le hors-ligne) ; « Terminer » télécharge le JSON, déposé à la main dans `data/matchs/`.
   « Ouvrir un match du site » recharge n'importe quel fichier de `data/matchs/` pour le corriger et le réexporter
   sous le même nom (les tirs jamais saisis restent vides, les buts sans détail gardent une période inconnue).
2. **PDF** : « Sommaire » rempli dans Acrobat → déposé dans `pdf/`. Au push sur `main`, GitHub Actions
   (`.github/workflows/publier.yml`) lance `extract.py --importer` : chaque PDF valide devient `data/matchs/….json`
   (remplace le même match s'il existe) et est déplacé dans `pdf/archives/` ; commit « Import automatique des PDF »
   par le bot (Christian fait Pull avant son prochain push). Un PDF en erreur reste dans `pdf/`.
   Retraiter un PDF = le recopier de `pdf/archives/` vers `pdf/`.

Ensuite `extract.py` écrit `data/matchs.json` et l'Action publie le site (`main` seulement ; autre branche =
vérification sans import ni publication). Sans `--importer` (local), les PDF de `pdf/` sont lus sans rien déplacer.
Deux fichiers JSON pour le même match : le plus récemment exporté est gardé (avertissement).
Supprimer un match = supprimer son JSON. La fiche de match du site affiche le nom du fichier (lien GitHub).
Pendant le match, la feuille papier « Saisie » reste possible.

Gardiennes : liste officielle dans `data/gardiennes.json` (versionné, édité à la main), lue par saisie.html (boutons),
generer_sommaire.py (liste du PDF) et extract.py (`normaliser_gardienne` : numéro connu → nom officiel ;
nom connu sans numéro → numéro ajouté ; inconnue → avertissement). Le site regroupe les gardiennes par numéro.

`data/matchs.json` et `data/version.json` ne sont pas versionnés (`.gitignore`) : lancer `extract.py` localement
sert seulement à vérifier avec Live Server. Tag `avant-github-action` = état du site avant ce fonctionnement.

## Structure

| Chemin | Rôle |
|---|---|
| `index.html` | Page unique ; navigation par hash `#/matchs`, `#/match/<id>`, `#/gardiennes`, `#/equipe` |
| `js/app.js` | Toute la logique (JS vanilla, aucune dépendance, aucun build) |
| `css/style.css` | Styles ; jetons de couleur dans `:root` (marine #16336B, rouge #D7192D), mode sombre |
| `tools/extract.py` | Validation (erreurs bloquantes / avertissements), import PDF → `data/matchs/`, écrit `data/matchs.json` |
| `saisie.html`, `js/saisie.js`, `css/saisie.css`, `sw-saisie.js` | Page de saisie téléphone (incrémenter `CACHE` dans sw-saisie.js à chaque modification) |
| `data/matchs/` | Un JSON par match = source des données |
| `data/gardiennes.json` | Liste officielle des gardiennes |
| `tools/fiches/generer_sommaire.py` | Génère le PDF remplissable « Sommaire » (reportlab + post-traitement pypdf pour le JavaScript Acrobat) |
| `tools/fiches/generer_saisie.py` | Génère la feuille papier « Saisie » (paysage) |
| `fiches/` | PDF vierges générés (à distribuer à l'équipe) |
| `pdf/` | PDF déposés, en attente d'import ; `pdf/archives/` = PDF déjà importés |
| `data/matchs.json` | Généré (localement ou par l'Action), non versionné, ne jamais éditer à la main |
| `.github/workflows/publier.yml` | Extraction + publication sur GitHub Pages ; erreurs en annotations et courriel |
| `assets/logo-bll.png` | Logo du club |

## Champs du PDF Sommaire (noms internes stables — ne pas renommer sans adapter extract.py et js/saisie.js)

- En-tête : `equipe_U16AA`, `equipe_U19AA` (cases), `adversaire`, `date` (AAAA-MM-JJ), `heure_debut`, `heure_fin` (HH:MM),
  `no_match`, `responsable`
- Section 1 : `buts_nous`, `buts_adv`, `tirs_nous`, `tirs_adv` (totaux calculés, lecture seule),
  `tirs_nous_p1..p4`, `tirs_nous_prol`, `tirs_adv_p1..p4`, `tirs_adv_prol`
- Section 2 : `gardienne` (liste éditable « Nom #numéro »), puis pour n = 1..15 :
  `but_n_periode`, `but_n_temps`, `but_n_type` (« R – Rebond »), `but_n_zone` ;
  `zone_HG` … `zone_BD` = champs calculés (numéros de buts affichés dans le filet)
- Section 3 : `sz_tentatives`, `sz_reussies`
- Section 4 : `notes`

Codes de type de jeu : P Pick/écran, T Triangle, L Tir de loin, R Rebond, E Échappée, D Déviation, FC Fille de coin, A Autre.
Zones (vue de face du filet) : HG HC HD / CG C CD / BG BC BD.
Périodes : P1 à P4 + Prolongation.

## Règles de calcul

- Un tir cadré inclut les buts. % d'arrêts = (tirs cadrés adverses − buts accordés) / tirs cadrés adverses.
- Moyenne de buts accordés = par match (pas par 60 minutes).
- Une gardienne par match : tous les tirs adverses du match lui sont attribués.
- Saison d'août à juillet (2026-11-01 → « 2026-2027 »).

## Contraintes

- Le site doit rester 100 % statique : pas de serveur, pas de base de données, pas d'étape de build
  locale. La seule étape automatisée est `extract.py` (import des PDF + extraction), lancé par GitHub Actions.
- Le dépôt est public : ne rien y mettre qu'on ne veut pas voir publié.
- Les calculs JavaScript du PDF (totaux, filet, validation de l'heure) ne marchent que dans Acrobat Reader.
  Éviter `AFTime_FormatEx` : la valeur devenait invisible hors focus ; on utilise une validation maison.
- Tester localement avec Live Server ou `python -m http.server 8000` (pas en ouvrant index.html directement).
- Après toute modification d'extract.py : relancer `python tools/extract.py` et vérifier le site.
