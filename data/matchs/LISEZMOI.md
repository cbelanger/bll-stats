# Un fichier par match

Chaque match du site est un fichier `.json` ici, nommé `AAAA-MM-JJ_EQUIPE_adversaire_no.json`
(ex. `2026-10-31_U19AA_ontario-rush_2016.json`). Le format reprend les noms de champs du PDF Sommaire.

- **Supprimer un match** : supprimer son fichier (sur GitHub : ouvrir le fichier → ··· → Delete file).
- **Modifier un match** : page de saisie → nom du match → « Ouvrir un match du site », corriger,
  « Terminer » → télécharger → déposer ici sous le même nom (remplace l'ancien).
- **Ajouter un match en PDF** : déposer le PDF dans `pdf/`. GitHub Actions le convertit en fichier ici
  et le range dans `pdf/archives/`. Pour retraiter un PDF, le recopier de `pdf/archives/` vers `pdf/`.
- **Ajouter un match saisi sur téléphone** : <https://github.com/cbelanger/bll-stats/upload/main/data/matchs>
- Deux fichiers pour le même match : le plus récemment exporté est gardé (avertissement) ; supprimer l'autre.
