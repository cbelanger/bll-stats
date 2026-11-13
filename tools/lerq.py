#!/usr/bin/env python3
"""
Écrit data/calendrier.json : les matchs BLL de la saison (passés et à venir), lus sur le site de la LERQ
(https://membres.ringuette-quebec.qc.ca/cedules_liste_web.asp, formulaire de recherche par ligue).

En ringuette, Cadette est plus vieux que Junior : LERQ-Cadette AA = U19AA, LERQ-Junior AA = U16AA.
La page ne dit que « BLL », sans la catégorie : c'est la ligue choisie qui la donne.

Seulement le calendrier (numéro, date, heure, aréna, adversaire) : jamais les feuilles de match, qui
contiennent les noms des joueuses (le dépôt est public).

Si la LERQ ne répond pas, on garde le dernier calendrier publié (site GitHub Pages), sinon le fichier local.
Ne fait jamais échouer l'Action : un problème donne un avertissement seulement.

Utilisation (depuis la racine du dépôt) :
    python tools/lerq.py
"""
import html, json, os, re, sys, urllib.parse, urllib.request
from datetime import datetime
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "data" / "calendrier.json"
URL = "https://membres.ringuette-quebec.qc.ca/cedules_liste_web.asp"
PUBLIE = "https://cbelanger.github.io/bll-stats/data/calendrier.json"
LIGUES = {"LERQ-Cadette AA": "U19AA", "LERQ-Junior AA": "U16AA"}
NOUS = "BLL"
SUR_GITHUB = os.environ.get("GITHUB_ACTIONS") == "true"


def lire(url, donnees=None):
    corps = urllib.parse.urlencode(donnees).encode() if donnees else None
    req = urllib.request.Request(url, data=corps, headers={"User-Agent": "bll-stats (calendrier BLL Elite)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("iso-8859-1")


def propre(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).strip()


def nom_equipe(s):
    # « Eastern rush » -> « Eastern Rush » ; « Rive-Sud  » -> « Rive-Sud » ; GCRA, Lac St-Louis inchangés
    return " ".join(m[:1].upper() + m[1:] for m in propre(s).split(" "))


def ligues():
    # Numéros des ligues lus dans le formulaire (ils peuvent changer d'une saison à l'autre)
    page = lire(URL)
    trouve = {}
    for no, nom in re.findall(r'<option value\s*="(\d+)"[^>]*>(.*?)</option>', page, re.S):
        eq = LIGUES.get(propre(nom))
        if eq:
            trouve[eq] = no
    return trouve


def matchs_ligue(no_ligue, equipe):
    page = lire(URL, {"NbrAfficher": "100", "numero": "", "ligues_id": no_ligue, "submit": " Rechercher "})
    rangs = re.findall(r"<tr>\s*(<td width=\"46\" class='DataTD1?'>.*?)</tr>", page, re.S)
    if len(rangs) >= 100:
        # La page n'en montre jamais plus de 100 : y a-t-il un match après le dernier numéro affiché ?
        dernier = re.findall(r"<td width=\"46\" class='DataTD1?'>\s*(\d+)", page)[-1]
        suite = lire(URL, {"NbrAfficher": "10", "numero": str(int(dernier) + 1), "ligues_id": no_ligue, "submit": " Rechercher "})
        if "class='DataTD'>" in suite:
            avertir(f"{equipe} : plus de 100 matchs dans la ligue, la page de la LERQ n'en montre que 100 (calendrier incomplet)")
    sortie = []
    for r in rangs:
        c = re.findall(r"<td[^>]*>(.*?)</td>", r, re.S)
        if len(c) < 6:
            continue
        no, dt, heure, endroit, rec, vis = (propre(x) for x in c[:6])
        rec, vis = nom_equipe(rec), nom_equipe(vis)
        if NOUS not in (rec, vis) or rec == vis:
            continue
        try:
            d = datetime.strptime(dt, "%d-%m-%Y").date().isoformat()
        except ValueError:
            avertir(f"match {no} : date illisible « {dt} »")
            continue
        h = re.match(r"(\d{1,2}):(\d{2})", heure)
        lien = re.search(r"cedules_id=(\d+)", r)
        sortie.append({"no": no, "equipe": equipe, "date": d, "heure": f"{int(h[1]):02d}:{h[2]}" if h else None,
                       "endroit": endroit, "adversaire": vis if rec == NOUS else rec, "domicile": rec == NOUS,
                       "lerq_id": lien[1] if lien else None})
    return sortie


def avertir(t):
    print(f"attention : {t}")
    if SUR_GITHUB:
        print(f"::warning title=Calendrier LERQ::{t}")


def secours(raison):
    avertir(f"{raison} ; on garde le dernier calendrier connu")
    try:
        SORTIE.write_text(lire(PUBLIE), encoding="utf-8")
        print(f"Dernier calendrier publié recopié dans {SORTIE.relative_to(RACINE)}")
    except Exception:
        if not SORTIE.exists():
            print("Aucun calendrier : le site et la saisie s'en passeront")


def main():
    try:
        ids = ligues()
        if not ids:
            return secours("ligues Cadette AA / Junior AA introuvables dans le formulaire de la LERQ")
        matchs = []
        for eq, no in sorted(ids.items()):
            ms = matchs_ligue(no, eq)
            print(f"{eq} : {len(ms)} matchs BLL")
            matchs += ms
    except Exception as e:
        return secours(f"LERQ inaccessible ({e})")
    if not matchs:
        return secours("aucun match BLL trouvé")
    matchs.sort(key=lambda m: (m["date"], m["heure"] or "", m["equipe"]))
    SORTIE.parent.mkdir(exist_ok=True)
    SORTIE.write_text(json.dumps({"lu_le": datetime.now().isoformat(timespec="minutes"), "source": URL,
                                  "matchs": matchs}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(matchs)} match(s) écrit(s) dans {SORTIE.relative_to(RACINE)}")


if __name__ == "__main__":
    main()
    sys.exit(0)
