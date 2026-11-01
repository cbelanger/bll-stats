# Projet : statistiques de match BLL Élite (ringuette)

Site statique publié sur GitHub Pages (dépôt public) qui affiche les statistiques des équipes
**U16AA** et **U19AA** du BLL Élite (LERQ). Les données proviennent des sommaires PDF remplis
après chaque match. Une seule personne (Christian) dépose les données ; le site est en lecture seule.

Répondre en français, tutoiement, ton direct.

## Flux de données

1. Pendant le match : feuille papier « Saisie » (grilles à barrer).
2. Après le match : « Sommaire » rempli dans Acrobat Reader → enregistré dans `pdf/`
   (nom sans accents : `AAAA-MM-JJ_U19AA_Adversaire.pdf`).
3. Commit + push → GitHub Actions (`.github/workflows/publier.yml`) lance `python tools/extract.py`,
   qui lit tous les PDF de `pdf/` → écrit `data/matchs.json`, puis publie le site sur GitHub Pages (branche `main` seulement).
   Sur une autre branche, l'Action fait l'extraction et la vérification sans publier.
4. Le site (`index.html`, `js/app.js`, `css/style.css`) lit `data/matchs.json` et calcule tout côté navigateur.

`data/matchs.json` et `data/version.json` ne sont pas versionnés (`.gitignore`) : lancer `extract.py` localement
sert seulement à vérifier avec Live Server. Tag `avant-github-action` = état du site avant ce fonctionnement.

## Structure

| Chemin | Rôle |
|---|---|
| `index.html` | Page unique ; navigation par hash `#/matchs`, `#/match/<id>`, `#/gardiennes`, `#/equipe` |
| `js/app.js` | Toute la logique (JS vanilla, aucune dépendance, aucun build) |
| `css/style.css` | Styles ; jetons de couleur dans `:root` (marine #16336B, rouge #D7192D), mode sombre |
| `tools/extract.py` | Extraction PDF → JSON avec validation (erreurs bloquantes / avertissements) |
| `tools/fiches/generer_sommaire.py` | Génère le PDF remplissable « Sommaire » (reportlab + post-traitement pypdf pour le JavaScript Acrobat) |
| `tools/fiches/generer_saisie.py` | Génère la feuille papier « Saisie » (paysage) |
| `fiches/` | PDF vierges générés (à distribuer à l'équipe) |
| `pdf/` | Sommaires remplis = source des données |
| `data/matchs.json` | Généré (localement ou par l'Action), non versionné, ne jamais éditer à la main |
| `.github/workflows/publier.yml` | Extraction + publication sur GitHub Pages ; erreurs en annotations et courriel |
| `assets/logo-bll.png` | Logo du club |

## Champs du PDF Sommaire (noms internes stables — ne pas renommer sans adapter extract.py)

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
  locale. La seule étape automatisée est `extract.py`, lancé par GitHub Actions.
- Le dépôt est public : ne rien y mettre qu'on ne veut pas voir publié.
- Les calculs JavaScript du PDF (totaux, filet, validation de l'heure) ne marchent que dans Acrobat Reader.
  Éviter `AFTime_FormatEx` : la valeur devenait invisible hors focus ; on utilise une validation maison.
- Tester localement avec Live Server ou `python -m http.server 8000` (pas en ouvrant index.html directement).
- Après toute modification d'extract.py : relancer `python tools/extract.py` et vérifier le site.
