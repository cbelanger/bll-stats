# BLL Élite – Statistiques de match

Site statique (GitHub Pages) qui affiche les statistiques des équipes U16AA et U19AA
à partir des sommaires PDF remplis après chaque match.

## Ajouter un match

1. Remplir « BLL - Statistiques - Sommaire - Match.pdf » dans Acrobat Reader et l'enregistrer dans `pdf/`
   (nom suggéré : `AAAA-MM-JJ_U19AA_Adversaire.pdf`).
2. Depuis la racine du dépôt :
   ```
   python tools/extract.py
   ```
   Le script lit tous les PDF de `pdf/`, signale les erreurs et réécrit `data/matchs.json`.
   Un PDF avec une erreur est ignoré ; les « attention » n'empêchent pas la publication.
3. Vérifier localement (VS Code → Live Server, ou `python -m http.server 8000`).
4. Commit + push. Le site se met à jour en environ une minute.

## Prérequis

```
pip install -r requirements.txt
```

## Structure

| Dossier | Contenu |
|---|---|
| `pdf/` | Sommaires remplis (source des données) |
| `data/matchs.json` | Généré par `tools/extract.py` — ne pas éditer à la main |
| `tools/extract.py` | Extraction PDF → JSON |
| `index.html`, `css/`, `js/` | Le site |

## Calculs

- % d'arrêts = (tirs cadrés adverses − buts accordés) / tirs cadrés adverses
- Buts accordés par match = buts accordés / matchs joués
- Les tirs d'un match sont attribués à la gardienne indiquée dans le sommaire.
- Saison : d'août à juillet (un match du 2026-11-01 compte pour 2026-2027).

Les matchs de démonstration (« Démo », données fictives) sont à supprimer de `pdf/`
avant de publier les vrais matchs, puis relancer `tools/extract.py`.
