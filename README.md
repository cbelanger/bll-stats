# BLL Élite – Statistiques de match

Site statique (GitHub Pages) qui affiche les statistiques des équipes U16AA et U19AA du BLL Élite (ringuette).
Une seule personne (l'admin) publie les données ; le site est en lecture seule.

| Adresse | Pour qui |
|---|---|
| <https://cbelanger.github.io/bll-stats/> | Le site (coachs, direction) |
| <https://cbelanger.github.io/bll-stats/saisie.html> | Saisie d'un match sur téléphone (parents, marqueurs) |
| <https://cbelanger.github.io/bll-stats/saisie.html?gestion=1> | Saisie admin, avec dépôt GitHub (application « BLL Gestion ») |

**Un match = un fichier** dans `data/matchs/`, nommé `AAAA-MM-JJ_EQUIPE_adversaire_no.json`
(ex. `2026-10-31_U19AA_ontario-rush_2016.json`). C'est la seule source des données.

## En bref

| Je veux… | Comment |
|---|---|
| Ajouter un match saisi sur téléphone | Saisie → « Terminer » → « Télécharger le fichier » → déposer le `.json` dans `data/matchs/` |
| Ajouter un match reçu d'un parent | Vérifier le `.json` reçu (courriel, texto), puis le déposer dans `data/matchs/` |
| Ajouter un match en PDF | Déposer dans `pdf/` le Sommaire **remplissable** rempli dans Acrobat (PDF avec champs, pas un scan ni une image) : GitHub Actions le convertit et le range dans `pdf/archives/` |
| Corriger un match | Saisie admin → menu ☰ → « Ouvrir un match du site… » → corriger → « Terminer » → déposer (même nom, remplace l'ancien) |
| Compléter un but (temps, type, zone, situation…) | L'ouvrir dans la saisie → toucher la ligne du but dans « Buts du match » |
| Placer par période les buts d'un vieux match | L'ouvrir dans la saisie : « sans période n » s'affiche ; choisir la période, puis « + » (but BLL ou accordé) place un de ces buts sans changer le score et ouvre sa fiche |
| Retraiter un PDF | Le recopier de `pdf/archives/` vers `pdf/` : il remplace le fichier du même match |
| Supprimer un match (ex. le match test) | Supprimer son fichier dans `data/matchs/` (sur GitHub : ouvrir le fichier → ··· → Delete file) |
| Ajouter une gardienne | Voir [Ajouter une gardienne](#ajouter-une-gardienne) |

Après chaque import de PDF, GitHub Actions ajoute un commit « Import automatique des PDF » :
faire **Pull origin** avant le prochain push.

```
Téléphone (saisie.html) ──► fichier .json ──┐
                                            ├──► data/matchs/*.json ──► tools/extract.py ──► data/matchs.json ──► site
Feuille papier ──► Sommaire PDF ──► pdf/ ───┘        (GitHub Actions, à chaque push sur main)
```

## Saisir un match sur téléphone

### Deux adresses : parents et admin

- **Parents** : <https://cbelanger.github.io/bll-stats/saisie.html>. Ni lien vers GitHub, ni « Ouvrir un match du site »,
  ni « Copier le contenu ». Après « Terminer », la page demande de télécharger le fichier `.json` et de l'envoyer
  à l'admin (courriel ou texto, en pièce jointe) ; un avertissement rappelle d'inscrire son nom (Responsable des stats).
- **Admin** : <https://cbelanger.github.io/bll-stats/saisie.html?gestion=1>, avec le lien de dépôt GitHub,
  « Ouvrir un match du site » et « Copier le contenu ». Installée depuis cette adresse, c'est une application distincte,
  « BLL Gestion » (`saisie-gestion.webmanifest`), qui s'ouvre toujours en mode admin.

Les deux adresses partagent le même match en cours sur un même téléphone. Ce partage ne protège rien : il simplifie
seulement la page des parents (sans identifiants, personne ne peut déposer sur GitHub). Le site lui-même ne renvoie
jamais vers la saisie ni vers GitHub (seulement vers la page d'aide).

**Installer comme une application** (icône BLL, plein écran) : dans Edge ou Chrome, menu → **Ajouter au téléphone** /
**Installer l'application**. La page fonctionne ensuite **sans réseau** (aréna) si elle a été ouverte une fois avec du réseau.
Après une mise à jour de la saisie, l'ouvrir avec du réseau, puis la fermer et la rouvrir pour charger la nouvelle version.

**Page d'aide** : <https://cbelanger.github.io/bll-stats/aide.html>, ouverte par le bouton « Aide » en haut de la saisie
et par l'onglet « Aide » du site. Elle s'adresse aux parents (avant, pendant et après le match, fiche d'un but, codes,
problèmes fréquents) et fonctionne sans réseau. Son lien de retour ramène là d'où on vient : la saisie (dans le même
mode) ou le site (`aide.html?depuis=site`, sans lien vers la saisie). À tenir à jour quand la saisie change.
En haut de l'aide, une **vidéo** d'environ 2 minutes (`assets/aide/saisie-demo.mp4`, sans son, avec sous-titres) montre
un match fictif « Équipe A » ; les vrais noms des gardiennes y sont remplacés par « Gardienne 1 », « Gardienne 2 ».
Elle est fabriquée automatiquement à partir de la vraie saisie : **après un changement de la saisie, la refaire** avec
`python tools/video/faire_video.py` (les étapes et sous-titres sont dans `tools/video/demo.html`).

### Avant le match

Toucher le nom du match en haut pour remplir les infos : équipe (U16AA ou U19AA), adversaire, date, no de match
(le lien **LERQ** ouvre le calendrier de Ringuette Québec), heures, gardienne (seulement celles de l'équipe choisie,
ou « Autre » avec nom et numéro) et responsable des stats.

### Pendant le match

1. Choisir la **période** en haut (P1 à P4, Prol.). Tout est noté par période.
2. **Tirs cadrés** : « + Tir » pour nous et pour l'adversaire (son nom s'affiche dès qu'il est inscrit dans les infos) ;
   « − » retire un tir de la période.
3. **Sorties de zone** : « ✓ Réussie » ou « ✗ Ratée ».
4. **Buts** : « + But » (BLL) et « + But accordé » comptent le but **et un tir cadré** tout de suite, puis ouvrent la fiche du but :
   - **période** (celle en cours, déjà choisie) ;
   - **situation du BLL** : AN, 5 c. 3, DN, 3 c. 5 ; **rien de choisi = à égalité**. Toujours du point de vue du BLL :
     un but accordé pendant notre punition = DN ; 5 c. 3 et 3 c. 5 = deux punitions ;
   - **temps au chrono** : chiffres seulement (845 donne 8:45) ;
   - **type de jeu** (codes plus bas) ;
   - **zone** du filet, vu de face (pour nos buts, le filet adverse) ;
   - facultatif, **d'où part le but** : toucher l'endroit sur la demi-patinoire (filet en haut, vue de la tireuse ;
     toucher ailleurs déplace le point, « Effacer » le retire). Cette position n'existe que dans la saisie téléphone.

   Les boutons **Supprimer / Plus tard / Enregistrer** restent visibles au bas de la fiche. « Plus tard » ferme la fiche
   sans garder les choix ; le but reste compté. Toucher la ligne d'un but dans « Buts du match » rouvre sa fiche
   (lignes BLL en bleu ; AN, 5v3, DN ou 3v5 s'affiche à côté de la zone).
   Un but BLL est salué par quelques anneaux bleus qui s'envolent pendant une seconde (et une courte vibration) ;
   rien n'est bloqué, et il n'y a pas d'animation si le téléphone est réglé pour réduire les animations.
5. **Changement de gardienne** (saisie téléphone seulement) : menu ☰ → « Changement de gardienne » : nouvelle gardienne,
   période et temps au chrono du changement ; les tirs adverses reçus jusque-là sont proposés (corriger au besoin).
   Les changements notés s'affichent dans « Buts du match » et peuvent être retirés (✕) dans la même fiche.
6. **Retirer un but** : toucher sa ligne dans « Buts du match » → Supprimer (le tir compté avec lui est retiré aussi).
   **Annuler** (en bas) défait la dernière action ; **Notes** pour un commentaire.

Tout reste dans le téléphone (localStorage), même sans réseau, en rechargeant la page ou en fermant l'application.
L'écran reste allumé pendant la saisie si le navigateur le permet.

### Après le match

1. « **Terminer** » : heure de fin, puis vérifications. **Rouge** = erreur qui bloque le téléchargement (adversaire
   manquant, plus de buts que de tirs…) ; **jaune** = à vérifier, on peut continuer (no de match, gardienne, buts
   accordés sans type ou zone, nom du responsable…).
2. « **Télécharger le fichier** » : le `.json` va dans Téléchargements.
   - Parents : l'envoyer à l'admin.
   - Admin : « Ouvrir la page de dépôt GitHub » → choisir le fichier dans Téléchargements → « Commit changes ».
     GitHub Actions publie le site en 1 à 2 minutes.
3. Facultatif : « **Télécharger aussi le PDF Sommaire** » : la fiche Sommaire remplie avec les données du match, pour
   archiver ou partager. Elle est **aplatie** (aucun champ modifiable) et **ne peut pas être importée** : seul le `.json`
   sert au site. Une situation « à égalité » y laisse la case Sit. vide. Au-delà de 15 buts accordés ou 7 buts BLL,
   les buts de plus sont recopiés dans les notes du PDF.
4. Match suivant : bandeau vert « Nouveau match », ou menu ☰ → « Nouveau match ». Un match pas encore exporté est mis
   de côté (un seul) : menu ☰ → « Récupérer le match précédent » le remet en place.

### Corriger un match publié (admin)

Menu ☰ → « Ouvrir un match du site… » recharge n'importe quel fichier de `data/matchs/` ; « Terminer » le réexporte
**sous le même nom** : déposé dans `data/matchs/`, il remplace l'ancien.

- Match venu d'un PDF : changer la période d'un but ou le supprimer ne change pas les tirs (comptés à part sur papier).
- Tirs jamais saisis : ils restent vides (« non saisis ») tant qu'on n'en ajoute pas.
- Réexporter un vieux match met « à égalité » chaque but détaillé sans situation : choisir AN, DN… avant si on s'en souvient.

### Fichier « (1) »

Edge ajoute « (1) » si un fichier du même nom est déjà dans Téléchargements. Les deux fichiers du même match coexistent
alors dans `data/matchs/` : le plus récemment exporté est gardé (avertissement dans l'Action). Supprimer l'ancien, puis
renommer le nouveau sans « (1) ». Pour l'éviter : supprimer l'ancien fichier de Téléchargements avant de télécharger.

## Ajouter un match en PDF

> **Le PDF déposé doit avoir ses champs remplis** : c'est le Sommaire remplissable
> (`fiches/BLL - Statistiques - Sommaire - Match.pdf`), rempli dans Acrobat Reader puis enregistré avec
> **Fichier → Enregistrer**. `extract.py` lit les **champs**, pas ce qui est dessiné sur la page. Ne fonctionnent donc pas :
> un scan ou une photo de la feuille, un PDF « imprimé » (Imprimer → Microsoft Print to PDF, Enregistrer en PDF),
> un PDF aplati, ni le PDF Sommaire téléchargé depuis la saisie (pour celui-ci, déposer le `.json`).
> Un tel PDF est refusé (« PDF sans champs remplissables ») et reste dans `pdf/`.

1. Pendant le match : noter les données sur la feuille papier `fiches/BLL - Statistiques - Saisie - Match.pdf` (paysage) :
   section 1 tirs cadrés et section 2 sorties de zone (grilles à barrer ; un trait épais marque la fin de chaque période),
   section 3 **nos buts** (10 colonnes : période, temps, type, sit., zone = X dans le mini-filet adverse),
   section 4 **buts accordés** (12 lignes : période, temps, type, sit., zone), section 5 notes.
2. Après le match : remplir `fiches/BLL - Statistiques - Sommaire - Match.pdf` dans **Acrobat Reader**
   (les totaux, le filet et la validation de l'heure ne fonctionnent que dans Acrobat) et l'enregistrer dans `pdf/`
   (nom de fichier libre) :
   - section 1 : stats générales et tirs cadrés par période ;
   - section 2 : gardienne et buts accordés (15 lignes : période, temps, type, zone, sit.) ;
   - section 3 : nos buts (7 colonnes : période, temps, type, zone du filet adverse, sit.) ;
   - section 4 : sorties de zone par période (tentatives et réussies, totaux calculés) ;
   - section 5 : notes.

   Case Sit. vide = à égalité. Un ancien Sommaire (sans section 3, sans colonne Sit. ou avec les sorties de zone
   sans période) reste accepté ; ses buts n'ont alors pas de situation.
3. (Facultatif) Vérifier localement : `python tools/extract.py` (ne déplace rien), puis Live Server.
4. Commit + push. GitHub Actions convertit le PDF en `data/matchs/….json` (remplace le même match s'il existe),
   l'archive dans `pdf/archives/` et publie le site. Un PDF en erreur reste dans `pdf/`.

## Codes

| | |
|---|---|
| Types de jeu | **P** Pick / écran · **T** Triangle · **L** Tir de loin · **R** Rebond · **E** Échappée · **D** Déviation · **FC** Fille de coin · **A** Autre |
| Zones (filet vu de face) | HG HC HD / CG C CD / BG BC BD |
| Situation (pour le BLL) | vide ou EG = à égalité · **AN** avantage numérique · **5v3** double avantage · **DN** désavantage numérique · **3v5** double désavantage |
| Périodes | P1 à P4 (10 minutes) et prolongation ; le chrono **descend** (dans une période, 7:55 vient avant 6:29) |
| Tir cadré | Tir qui aurait pu entrer sans la gardienne, ou qui finit par un but |
| Sortie de zone réussie | L'équipe sort l'anneau de sa zone défensive en contrôle ou par une passe complétée |

## Le site

En haut : saison et équipe (U16AA, U19AA), et un bouton lune / soleil pour passer en mode sombre ou clair (le choix
est gardé dans le navigateur ; sans choix, le site suit le réglage du téléphone ou de l'ordi). Le même choix vaut pour
la saisie (menu ☰ → « Mode sombre » / « Mode clair ») et l'aide (lune / soleil en haut à droite). Quatre onglets et l'aide ;
tout se consulte aussi sur téléphone.

- **Matchs** : en haut, le **dernier match** en vedette (score, résultat, 3 faits saillants au plus ; un clic ouvre sa
  fiche), puis la liste de la saison, du plus vieux au plus récent : résultat, score, tirs, % de sorties de zone
  réussies, gardienne, % d'arrêts. Un clic ouvre la fiche du match :
  - **Faits saillants** : quelques phrases tirées des données (retard effacé, but gagnant, série de buts,
    3 buts ou plus en 5 minutes, période gagnée par 3 buts ou plus, arrêts de la gardienne, domination aux tirs,
    records de la saison dès 3 matchs) ; 6 au plus ;
  - **Déroulement du match** : une bande par période, nos buts au-dessus, ceux de l'adversaire en dessous,
    score à la fin de chaque période ; seuls les buts avec période et temps y sont placés ;
  - **Sommaire** : buts des deux équipes dans l'ordre du match (BLL en bleu, adversaire en rouge), type, zone,
    badge de situation (AN, 5v3, DN, 3v5) et score après chaque but quand la période et le temps de tous les buts sont connus ;
  - **Par période** : buts et tirs cadrés, nous et adversaire ;
  - filets des buts accordés et de nos buts (numéros des buts dans chaque zone) ;
  - **D'où partent les buts** : demi-patinoire avec les buts numérotés des deux équipes ;
  - sorties de zone (détail par période s'il est connu) et notes.

  Toucher un but (déroulement, Sommaire ou patinoire) l'allume en jaune partout et allume la zone du filet où il est entré.
- **Gardiennes** : tableau comparatif (MJ, V, D, N, BA, BL = blanchissages, TC, % arr., MOY par 40 minutes, TG = temps de glace, ligne Équipe ; un clic sur un en-tête trie le tableau, un deuxième inverse l'ordre ; un clic mène à la fiche),
  puis pour chacune : % d'arrêts, buts accordés par match, tableau match par match, moyenne et % d'arrêts par période,
  tendance du % d'arrêts, zones du filet, types de jeu, d'où partent les buts accordés.
- **Équipe** : fiche V-D-N, moyennes par match, progression de la saison (graphiques match après match : buts,
  tirs cadrés, % de sorties de zone réussies), tirs cadrés moyens par période, buts pour et contre par période,
  sorties de zone par période, **buts selon la situation** (à égalité, AN, 5 contre 3, DN, 3 contre 5 ; pour et contre),
  nos buts et les buts accordés par type de jeu, par zone du filet et par endroit d'où ils partent.
- **Adversaires** : équipes affrontées dans la saison (PJ, V-D-N, buts) ; un clic ouvre le dossier d'avant-match :
  « À retenir » (leur type de but et leur zone les plus fréquents, moment et période où elles marquent),
  nos affrontements, moyennes contre elles comparées à toute la saison, buts par période, moment des buts dans la
  période (début, milieu, fin), buts selon la situation, types de jeu, filets et patinoires (leurs buts et les nôtres).
  Les noms d'adversaires sont regroupés sans tenir compte des majuscules, des accents ni des espaces.
  Bouton **Imprimer** à côté du nom : version papier (ou PDF) sans bandeau ni fond, toujours en mode clair,
  sur deux pages environ, sans couper un panneau entre deux pages (règles `@media print` à la fin de `css/style.css`).

Dans les graphiques match après match (Équipe, tendance du % d'arrêts des gardiennes), survoler ou toucher un match
affiche ses valeurs sous le graphique, avec un lien vers sa fiche.
Les cartes de patinoire de plusieurs matchs (Équipe, Adversaires, Gardiennes) montrent de petits points et des
**zones de chaleur** : plus c'est foncé, plus il part de buts de cet endroit.
« – » = donnée non disponible. Bas de page : date de mise à jour du code et des stats.
Le site ne montre aucune statistique individuelle de joueuse (seulement l'équipe et les gardiennes).

## Calculs

- Un tir cadré inclut les buts.
- % d'arrêts = (tirs cadrés adverses − buts accordés) / tirs cadrés adverses, toujours à 1 décimale.
- Buts accordés par match = buts accordés / matchs joués (pas par 60 minutes).
- Gardiennes (règle du hockey, LNH et NCAA) : chaque gardienne qui joue reçoit un **match joué (MJ)** ; elle a les buts
  accordés et les tirs reçus pendant qu'elle était dans le filet, et son temps de glace (TG). La **décision** (V, D ou N) va à la
  gardienne dans le filet au **but gagnant** (le but qui donne à l'équipe gagnante un but de plus que le total final de
  l'autre) ; match nul : au dernier but ; 0-0 : à celle qui a commencé. **Blanchissage** (BL) : seulement si une seule
  gardienne a joué et n'a accordé aucun but. **MOY** = buts accordés × 40 ÷ minutes de glace (un match = 40 minutes ;
  la prolongation compte comme une période de 10 minutes, jusqu'au but en prolongation s'il y en a un).
  Sans changement de gardienne, la gardienne du match a tout. Le changement se note seulement dans la saisie téléphone.
- Tirs par période : une période P1 à P4 laissée vide compte pour 0 ; une prolongation vide
  signifie « pas de prolongation » et n'entre pas dans la moyenne de la prolongation.
- Buts par période : un match où un but n'a pas de période est exclu (jamais compté comme 0) ;
  un match sans but compte pour 0 dans chaque période.
- % d'arrêts par période (gardiennes) : seulement les matchs où les tirs adverses par période sont aussi connus.
- Buts selon la situation : seulement les buts dont la situation est notée (le tableau indique combien).
- Saison : d'août à juillet (un match du 2026-11-01 compte pour 2026-2027).

## Ajouter une gardienne

1. Ajouter une ligne dans `data/gardiennes.json` : `{ "nom": "Prénom Nom", "numero": 31, "equipe": "U16AA" }`.
2. Régénérer la fiche : `python tools/fiches/generer_sommaire.py` (liste du PDF), puis commit + push.

La saisie affiche la liste à la prochaine ouverture avec réseau (seulement les gardiennes de l'équipe du match).
`extract.py` s'en sert, pour l'équipe du match, pour corriger les coquilles (numéro connu → nom officiel), compléter
un numéro oublié et avertir pour une gardienne inconnue. La liste du PDF Sommaire (une fiche pour les deux équipes)
contient toutes les gardiennes. Le site regroupe les gardiennes par numéro.

## Publication (GitHub Actions)

À chaque push, `.github/workflows/publier.yml` :

1. lance `tools/extract.py` (sur `main` : avec `--importer`, qui convertit les PDF de `pdf/` et les archive) ;
2. sur `main`, enregistre l'import (commit « Import automatique des PDF » par le bot) ;
3. écrit `data/version.json` (date du dernier changement de code, affichée en bas du site) ;
4. ajoute `?v=<commit>` à `style.css`, `app.js` et `patinoire.js` dans l'`index.html` publié, pour que les
   téléphones ne gardent pas l'ancien code en cache ;
5. publie le site sur GitHub Pages (`main` seulement ; une autre branche ne fait que vérifier).

Réglage (une seule fois) : Settings → Pages → Source = « GitHub Actions ».
La saisie a son propre cache hors ligne (`sw-saisie.js`) : incrémenter `CACHE` à chaque modification de la saisie.

### Si quelque chose ne va pas

- **Erreur** dans un fichier : le match est laissé de côté, les autres sont publiés, et l'exécution finit en ✗ rouge.
  GitHub envoie un courriel ; le détail est dans l'onglet **Actions** du dépôt (résumé de l'extraction
  et annotations en rouge).
- **Attention** : l'exécution reste verte ; les avertissements s'affichent en jaune en haut de l'exécution.
- Le téléphone montre une vieille version du site : recharger la page ; au besoin, vider le cache d'Edge pour le site.
- Tags de retour en arrière : `avant-github-action` (remettre alors Settings → Pages → Source sur
  « Deploy from a branch »), `AVant-un--fichier-json-par-match`, `Avant-changement-page-des-gardiennes`,
  `Avant-ajout-des-zones-de-tirs-pour-les-buts`.

### Messages de `extract.py`

- **erreur** (match ignoré) : PDF sans champs remplissables (scan, image, PDF imprimé ou aplati), aucune ou deux équipes cochées, date invalide, adversaire ou score manquant,
  plus de buts accordés que de tirs cadrés adverses, plus de sorties de zone réussies que de tentatives,
  fichier JSON illisible ou de format inconnu.
- **attention** (match publié quand même) : numéro de match ou gardienne manquant, gardienne absente de
  `data/gardiennes.json` (ou nom corrigé d'après le numéro), type ou zone de but accordé manquant, type, zone ou
  situation inconnu, position sur la patinoire illisible, nombre de buts en section 1 différent du nombre de lignes
  détaillées, buts par période dont la somme ne donne pas le total, plus de sorties réussies que de tentatives
  dans une période, deux fichiers pour le même match, texte non numérique dans un champ numérique (valeur ignorée).

## Commandes

Toutes les commandes se lancent depuis la racine du dépôt.

| Commande | Rôle |
|---|---|
| `pip install -r requirements.txt` | Installe les dépendances Python (pypdf, reportlab, pillow) |
| `python tools/extract.py` | Lit `data/matchs/` et les PDF de `pdf/` (sans les déplacer), réécrit `data/matchs.json` : vérification locale |
| `python tools/extract.py --importer` | Comme ci-dessus, mais convertit les PDF en `data/matchs/*.json` et les archive (ce que fait GitHub Actions) |
| `python tools/fiches/generer_sommaire.py` | Régénère le PDF remplissable vierge `fiches/BLL - Statistiques - Sommaire - Match.pdf` |
| `python tools/fiches/generer_saisie.py` | Régénère la feuille papier vierge `fiches/BLL - Statistiques - Saisie - Match.pdf` (paysage) |
| `python tools/generer_icones.py` | Régénère les icônes de l'application de saisie (`assets/icones/`) |
| `python tools/generer_apercu.py` | Régénère les images d'aperçu de lien (Messenger, courriel) : `assets/apercu.png` (site, aide) et `assets/apercu-saisie.png` |
| `python tools/generer_glace.py` | Régénère le fond du site (glace marquée par les patins, `assets/glace*.svg`) |
| `python tools/video/faire_video.py` | Refait la vidéo de l'aide (`assets/aide/saisie-demo.mp4`) en rejouant la saisie dans Edge ; demande `pip install imageio-ffmpeg` (pas dans requirements.txt) ; `--images DOSSIER` garde une image par étape pour vérifier |
| `python -m http.server 8000` | Sert le site localement sur <http://localhost:8000> (ou Live Server dans VS Code) |

Le site doit être ouvert par un serveur : un double-clic sur `index.html` ne peut pas lire `data/matchs.json`.
`data/matchs.json` et `data/version.json` ne sont pas versionnés : les produire localement sert seulement à vérifier.

## Structure

| Chemin | Contenu |
|---|---|
| `index.html`, `css/style.css`, `js/app.js` | Le site (JavaScript sans dépendance, aucune étape de build) |
| `js/patinoire.js` | Dessin de la demi-patinoire (site et saisie) |
| `saisie.html`, `css/saisie.css`, `js/saisie.js` | Page de saisie sur téléphone |
| `aide.html` | Page d'aide de la saisie (styles dans `css/saisie.css`) |
| `assets/aide/` | Vidéo de l'aide (`saisie-demo.mp4`) et son image d'affiche (`saisie-demo.jpg`) |
| `tools/video/` | Fabrication de la vidéo : `demo.html` (étapes, sous-titres) et `faire_video.py` |
| `sw-saisie.js` | Cache hors ligne de la saisie (incrémenter `CACHE` à chaque modification) |
| `saisie.webmanifest`, `saisie-gestion.webmanifest`, `assets/icones/` | Installation de la saisie comme application (parents, admin) |
| `js/vendor/pdf-lib.min.js` | [pdf-lib](https://pdf-lib.js.org/) 1.17.1 (licence MIT, `js/vendor/pdf-lib-LICENSE.md`) : remplit le PDF Sommaire dans la saisie |
| `data/matchs/` | **Un fichier JSON par match (source des données)** |
| `data/gardiennes.json` | Liste officielle des gardiennes (nom, numéro, équipe) — éditée à la main |
| `data/matchs.json`, `data/version.json` | Générés (extract.py, Action) — non versionnés, ne pas éditer à la main |
| `pdf/` | PDF déposés, en attente d'import ; `pdf/archives/` : PDF déjà importés |
| `fiches/` | Fiches vierges à distribuer (Sommaire remplissable, Saisie papier) |
| `tools/extract.py` | Validation, import des PDF, production de `data/matchs.json` |
| `tools/fiches/` | Scripts qui génèrent les fiches vierges |
| `tools/generer_icones.py`, `tools/generer_glace.py` | Icônes de la saisie, fond du site |
| `.github/workflows/publier.yml` | GitHub Actions : extraction et publication du site |
| `assets/` | Logo du club, fond de glace, icônes, images d'aperçu de lien (`apercu*.png`) |

Les fichiers de match utilisent les mêmes noms de champs que le PDF Sommaire (format `bll-match-1`) ; la saisie
téléphone ajoute la position des buts (`but_n_lieu`) et le nombre de nos buts par période.

Le dépôt est public : tout ce qui est dans `pdf/` et `data/` (y compris les notes) est publié.

## Licence

Le code (`index.html`, `css/`, `js/`, `tools/`) est sous [licence MIT](LICENSE), © 2026 Christian Bélanger,
sauf `js/vendor/pdf-lib.min.js` (pdf-lib, © 2019 Andrew Dillon, licence MIT).
Le logo du BLL Élite (`assets/`) appartient au club ; les données de match (`pdf/`, `data/`) ne sont pas
sous licence libre (tous droits réservés).
