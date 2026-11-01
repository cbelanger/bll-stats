# Saisies faites sur téléphone

Fichiers `.json` exportés par `saisie.html` (bouton « Terminer » → « Télécharger le fichier »).
Ils contiennent les mêmes champs que le PDF Sommaire et sont lus par `tools/extract.py`, comme les PDF de `pdf/`.

- Déposer un fichier : <https://github.com/cbelanger/bll-stats/upload/main/data/saisies>
- Un même match présent aussi en PDF : le PDF est gardé, la saisie est ignorée (avertissement).
- Deux saisies du même match : la plus récemment exportée est gardée (avertissement) ; supprimer l'autre.
