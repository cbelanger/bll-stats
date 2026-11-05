# BLL Élite – Statistiques de match

Site statique (GitHub Pages) qui affiche les statistiques des équipes U16AA et U19AA.

**Un match = un fichier** dans `data/matchs/`, nommé `AAAA-MM-JJ_EQUIPE_adversaire_no.json`
(ex. `2026-10-31_U19AA_ontario-rush_2016.json`).

| Je veux… | Comment |
|---|---|
| Ajouter un match saisi sur téléphone | Page de saisie → « Terminer » → déposer le fichier dans `data/matchs/` |
| Ajouter un match en PDF | Déposer le PDF dans `pdf/` : GitHub Actions le convertit et le range dans `pdf/archives/` |
| Corriger un match | Page de saisie → menu ☰ → « Ouvrir un match du site… » → corriger → « Terminer » → déposer (même nom, remplace l'ancien) |
| Placer par période les buts d'un vieux match | L'ouvrir dans la saisie : « sans période n » s'affiche ; choisir la période, puis « + » (but BLL ou accordé) place un de ces buts sans changer le score et ouvre sa fiche (temps, type) ; « − » le remet sans période |
| Ajouter le temps ou le type d'un but | L'ouvrir dans la saisie → toucher la ligne du but dans « Buts du match » (BLL en bleu) |
| Retraiter un PDF | Le recopier de `pdf/archives/` vers `pdf/` : il remplace le fichier du même match |
| Supprimer un match | Supprimer son fichier dans `data/matchs/` (sur GitHub : ouvrir le fichier → ··· → Delete file) |

Après chaque import de PDF, GitHub Actions ajoute un commit « Import automatique des PDF » :
faire **Pull origin** avant ton prochain push.

## Ajouter un match en PDF

1. Pendant le match : noter les données sur la feuille papier `fiches/BLL - Statistiques - Saisie - Match.pdf`
   (tirs et sorties de zone à barrer, **nos buts** : période, temps, type, zone, **buts accordés** : période, temps, type, zone).
2. Après le match : remplir `fiches/BLL - Statistiques - Sommaire - Match.pdf` dans **Acrobat Reader**
   (les totaux, le filet et la validation de l'heure ne fonctionnent que dans Acrobat)
   et l'enregistrer dans `pdf/`. Le nom du fichier PDF est libre.
   Section 1 : stats générales ; section 2 : buts accordés (période, temps, type, zone) ;
   section 3 : nos buts (7 colonnes : période, temps, type, zone du filet adverse) ; section 4 : sorties de zone
   par période (tentatives et réussies, totaux calculés) ; section 5 : notes.
   Sur la feuille papier, un trait épais marque la fin de chaque période dans les grilles des sorties de zone, comme pour les tirs.
   Un ancien Sommaire (sans section 3, ou sorties de zone sans période) reste accepté.
3. (Facultatif) Vérifier localement : `python tools/extract.py` (ne déplace rien), puis Live Server.
4. Commit + push. GitHub Actions convertit le PDF, l'archive et publie le site en 1 à 2 minutes
   (Ctrl+F5 dans le navigateur si l'ancienne version reste affichée). Un PDF en erreur reste dans `pdf/`.

## Saisir un match sur téléphone

Page non liée depuis le site : <https://cbelanger.github.io/bll-stats/saisie.html>.
Pour l'installer comme une application (icône BLL sur l'écran d'accueil, plein écran) : dans Edge ou Chrome,
menu → **Ajouter au téléphone** / **Installer l'application**. Les icônes se régénèrent avec `python tools/generer_icones.py`.

1. Avant le match : toucher le nom du match en haut pour remplir les infos (équipe, adversaire, no de match, gardienne).
2. Pendant le match : choisir la période, puis compter tirs, buts et sorties de zone (tous notés par période). « + But » (BLL) et « + But accordé »
   comptent le but (et un tir cadré) tout de suite et ouvrent sa fiche : temps au chrono (845 donne 8:45), type de jeu
   et zone (filet vu de face ; pour nos buts, le filet adverse), puis, facultatif, **d'où part le but** : toucher l'endroit
   sur la demi-patinoire (filet en haut, vue de la tireuse ; toucher ailleurs déplace le point, « Effacer » le retire).
   Cette position n'existe que dans la saisie téléphone (pas dans le PDF Sommaire). « Plus tard » ferme la fiche sans garder
   ce qui a été choisi ; toucher la ligne du but dans « Buts du match »
   la rouvre. « Annuler » défait la dernière action. Tout reste dans le téléphone, même sans réseau ni en rechargeant la page.
3. Après le match : « Terminer » → vérifications → « Télécharger le fichier » → « Ouvrir la page de dépôt GitHub »
   → choisir le fichier dans Téléchargements → « Commit changes ». GitHub Actions publie le site.
   « Télécharger aussi le PDF Sommaire » produit en plus la fiche Sommaire remplie avec les données du match
   (pour archiver ou partager), **non modifiable** : les valeurs font partie de la page, il n'y a plus de champs.
   Ne déposer que le fichier `.json` sur GitHub (ce PDF ne peut pas être importé). Au-delà de 15 buts accordés
   ou 7 buts BLL, les buts de plus sont recopiés dans les notes du PDF.
4. Pour le match suivant : bandeau vert « Nouveau match », ou menu ☰ → « Nouveau match » à tout moment.
   Un match pas encore exporté est mis de côté sur le téléphone : menu ☰ → « Récupérer » le remet en place.

Les fichiers vont dans `data/matchs/` et ont les mêmes champs que le PDF Sommaire.

### Deux adresses : parents et gestion

- **Parents** (U16AA ou U19AA) : <https://cbelanger.github.io/bll-stats/saisie.html>. Ni lien vers GitHub,
  ni « Ouvrir un match du site », ni « Copier le contenu ». Après « Terminer », la page demande de télécharger le
  fichier `.json` et de l'envoyer à Christian (courriel ou texto) ; un avertissement rappelle d'inscrire son nom
  (Responsable des stats). Christian vérifie le fichier reçu, puis le dépose dans `data/matchs/` comme d'habitude.
- **Gestion** (Christian) : <https://cbelanger.github.io/bll-stats/saisie.html?gestion=1>, avec le dépôt GitHub,
  « Ouvrir un match du site » et « Copier le contenu ». Installée depuis cette adresse (menu → Ajouter au téléphone),
  c'est une application distincte, « BLL Gestion » (`saisie-gestion.webmanifest`), qui s'ouvre toujours en gestion.
  Les deux applications partagent le même match en cours sur le téléphone.

Ce partage ne protège rien : il simplifie seulement la page des parents (sans identifiants, personne ne peut déposer sur GitHub).

Pour un match venu d'un PDF, changer la période d'un but ou le supprimer ne change pas les tirs (comptés à part sur papier).
Après une mise à jour de la saisie, fermer et rouvrir la page (ou l'application) deux fois pour charger la nouvelle version.

**Fichier « (1) »** : Edge ajoute « (1) » si un fichier du même nom est déjà dans Téléchargements. Les deux fichiers
du même match coexistent alors dans `data/matchs/` : le plus récemment exporté est gardé (avertissement dans l'Action).
Supprimer l'ancien, puis renommer le nouveau sans « (1) ». Pour l'éviter : supprimer l'ancien fichier de Téléchargements
avant de télécharger.

### Si quelque chose ne va pas

- **Erreur** dans un fichier : le match est laissé de côté, les autres sont publiés, et l'exécution finit en ✗ rouge.
  GitHub envoie un courriel ; le détail est dans l'onglet **Actions** du dépôt (résumé de l'extraction
  et annotations en rouge).
- **Attention** : l'exécution reste verte ; les avertissements s'affichent en jaune en haut de l'exécution.
- Sur une autre branche que `main`, l'Action vérifie sans rien importer ni publier.
- Revenir à l'état d'avant GitHub Actions : tag `avant-github-action`, et remettre
  Settings → Pages → Source sur « Deploy from a branch ».

## Commandes

Toutes les commandes se lancent depuis la racine du dépôt.

| Commande | Rôle |
|---|---|
| `pip install -r requirements.txt` | Installe les dépendances Python (pypdf, reportlab, pillow) |
| `python tools/extract.py` | Lit `data/matchs/` et les PDF de `pdf/` (sans les déplacer), réécrit `data/matchs.json` : vérification locale |
| `python tools/extract.py --importer` | Comme ci-dessus, mais convertit les PDF en `data/matchs/*.json` et les archive (ce que fait GitHub Actions) |
| `python tools/fiches/generer_sommaire.py` | Régénère le PDF remplissable vierge `fiches/BLL - Statistiques - Sommaire - Match.pdf` |
| `python tools/fiches/generer_saisie.py` | Régénère la feuille papier vierge `fiches/BLL - Statistiques - Saisie - Match.pdf` (paysage) |
| `python -m http.server 8000` | Sert le site localement sur <http://localhost:8000> (ou Live Server dans VS Code) |

Le site doit être ouvert par un serveur : un double-clic sur `index.html` ne peut pas lire `data/matchs.json`.

### Messages de `extract.py`

- **erreur** : le PDF est ignoré et le script se termine avec un code d'erreur. Exemples : aucune ou
  deux équipes cochées, date invalide, adversaire ou score manquant, plus de buts accordés que de
  tirs cadrés adverses, plus de sorties de zone réussies que de tentatives.
- **attention** : le match est publié quand même. Exemples : numéro de match ou gardienne manquant,
  type ou zone de but accordé manquant, nombre de buts en section 1 différent du nombre de lignes en section 2
  (buts accordés) ou 3 (nos buts), buts par période dont la somme ne donne pas le total, plus de sorties réussies que de tentatives
  dans une période, deux fichiers pour le
  même match, texte non numérique dans un champ numérique (valeur ignorée).

## Structure

| Chemin | Contenu |
|---|---|
| `index.html`, `css/`, `js/` | Le site (JavaScript sans dépendance, aucune étape de build) |
| `data/matchs/` | **Un fichier JSON par match (source des données)** |
| `pdf/` | PDF déposés, en attente d'import ; `pdf/archives/` : PDF déjà importés |
| `data/gardiennes.json` | Liste officielle des gardiennes (nom, numéro) — édité à la main |
| `saisie.html`, `css/saisie.css`, `js/saisie.js`, `sw-saisie.js` | Page de saisie sur téléphone (hors ligne grâce à `sw-saisie.js`) |
| `saisie.webmanifest`, `assets/icones/` | Installation de la saisie comme application (icônes : `tools/generer_icones.py`) |
| `js/vendor/pdf-lib.min.js` | Bibliothèque [pdf-lib](https://pdf-lib.js.org/) 1.17.1 (licence MIT, `js/vendor/pdf-lib-LICENSE.md`) : remplit le PDF Sommaire dans la saisie |
| `data/matchs.json` | Généré par `tools/extract.py` — non versionné, ne pas éditer à la main |
| `.github/workflows/publier.yml` | GitHub Actions : extraction et publication du site |
| `tools/extract.py` | Validation, import des PDF, production de `data/matchs.json` |
| `tools/fiches/` | Scripts qui génèrent les fiches vierges |
| `fiches/` | Fiches vierges à distribuer (Sommaire remplissable, Saisie papier) |
| `assets/` | Logo du club |

Le dépôt est public : tout ce qui est dans `pdf/` et `data/` (y compris les notes) est publié.

## Le site

- **Matchs** : liste des matchs de la saison, du plus vieux au plus récent ; un clic ouvre la fiche du match :
  - **Faits saillants** : quelques phrases tirées des données (retard effacé, but gagnant, série de buts,
    3 buts ou plus en 5 minutes, période gagnée par 3 buts ou plus, arrêts de la gardienne, domination aux tirs,
    records de la saison dès 3 matchs) ; 6 au plus ;
  - **Déroulement du match** : une bande par période (10 minutes), nos buts au-dessus, ceux de l'adversaire en dessous,
    score à la fin de chaque période ; seuls les buts avec période et temps y sont placés ; toucher un point allume
    la ligne du but dans le Sommaire (et l'inverse) et la zone du filet où il est entré ;
  - **Sommaire** : buts des deux équipes dans l'ordre du match (nos buts en bleu, ceux de l'adversaire en rouge),
    avec le score après chaque but quand la période et le temps de tous les buts sont connus (le chrono descend :
    dans une période, 7:55 vient avant 6:29) ;
  - **Par période** : buts et tirs cadrés, nous et adversaire ;
  - filet des buts accordés et filet de nos buts (numéros des buts dans chaque zone) ;
  - **D'où partent les buts** : demi-patinoire avec les buts des deux équipes (numéros ; toucher un point allume sa
    ligne du Sommaire et sa zone du filet), si au moins un but a sa position. La même carte (tous les matchs) est dans Équipe,
    Adversaires et la fiche de chaque gardienne ;
  - sorties de zone (avec le détail par période s'il est connu), et notes.
- **Adversaires** : équipes affrontées dans la saison (PJ, V-D-N, buts) ; un clic ouvre le dossier d'avant-match :
  « À retenir » (leur type de but et leur zone les plus fréquents, moment de la période et période où ils marquent),
  nos affrontements, moyennes contre eux comparées à toute la saison, buts par période, moment des buts dans la période
  (début, milieu, fin), types de jeu et filets (leurs buts et les nôtres). Les noms d'adversaires sont regroupés sans
  tenir compte des majuscules, des accents ni des espaces.
- **Gardiennes** : tableau comparatif (PJ, V, D, N, BA, TC, % arr., MOY, ligne Équipe ; un clic mène à la fiche
  de la gardienne), puis pour chacune : % d'arrêts, buts accordés par match, tableau match par match, buts accordés, moyenne et
  % d'arrêts par période, tendance du % d'arrêts, zones et types de jeu.
- **Équipe** : fiche V-D-N, moyennes par match, progression de la saison (graphiques match après match : buts,
  tirs cadrés, % de sorties de zone réussies), tirs cadrés moyens par période, buts pour et contre par période,
  sorties de zone par période, nos buts par type de jeu et par zone (filet adverse), buts accordés par type de jeu et par zone.
- Les stats par période ne comptent que les matchs où la période de chaque but est connue ; « – » = donnée non disponible.
- Bas de page : date de publication du code et date de la dernière exécution de `extract.py`.

## Ajouter une gardienne

1. Ajouter une ligne dans `data/gardiennes.json` : `{ "nom": "Prénom Nom", "numero": 31, "equipe": "U16AA" }`.
2. Régénérer la fiche : `python tools/fiches/generer_sommaire.py` (pour la liste du PDF), puis commit + push.

La page de saisie affiche la liste à la prochaine ouverture avec réseau, seulement les gardiennes de l'équipe du match.
`extract.py` s'en sert (gardiennes de l'équipe du match seulement) pour corriger
les coquilles (numéro connu → nom officiel), compléter un numéro oublié et avertir pour une gardienne inconnue.
La liste du PDF Sommaire (une fiche pour les deux équipes) contient toutes les gardiennes.

## Calculs

- Un tir cadré inclut les buts.
- % d'arrêts = (tirs cadrés adverses − buts accordés) / tirs cadrés adverses.
- Buts accordés par match = buts accordés / matchs joués (pas par 60 minutes).
- Une gardienne par match : tous les tirs adverses du match lui sont attribués.
- Tirs par période : une période P1 à P4 laissée vide compte pour 0 ; une prolongation vide
  signifie « pas de prolongation » et n'entre pas dans la moyenne de la prolongation.
- Buts par période : un match où un but n'a pas de période est exclu (jamais compté comme 0) ;
  un match sans but compte pour 0 dans chaque période.
- % d'arrêts par période (gardiennes) : seulement les matchs où les tirs adverses par période sont aussi connus.
- Saison : d'août à juillet (un match du 2026-11-01 compte pour 2026-2027).

## Licence

Le code (`index.html`, `css/`, `js/`, `tools/`) est sous [licence MIT](LICENSE), © 2026 Christian Bélanger,
sauf `js/vendor/pdf-lib.min.js` (pdf-lib, © 2019 Andrew Dillon, licence MIT).
Le logo du BLL Élite (`assets/`) appartient au club ; les données de match (`pdf/`, `data/`) ne sont pas
sous licence libre (tous droits réservés).
