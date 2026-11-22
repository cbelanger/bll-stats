#!/usr/bin/env python3
"""
Ajoute à data/calendrier.json (écrit avant par tools/lerq.py) les matchs BLL des tournois de data/tournois.json,
lus dans les calendriers .ics des sites de tournoi (un lien par division : U16AA, U19AA).

- Seuls les matchs entre les dates du tournoi sont gardés (le .ics contient aussi les éditions passées).
- Noms d'équipes : catégorie retirée (« Nepean Ravens U16AA - Cram » -> « Nepean Ravens - Cram »), puis
  correspondance de data/tournois.json (« noms ») vers le nom de la LERQ ; nom inconnu -> avertissement.
- Rondes éliminatoires (« 2nd Place vs 3rd Place », « Winner Semi 1 vs … ») : gardées comme matchs « éventuels »
  (BLL y jouera peut-être) avec ronde (Demi-finale, Finale) et libellé (« 2e c. 3e ») ; dès que le tournoi
  inscrit BLL, le match devient un match ordinaire (la ronde est gardée d'une nuit à l'autre).

Un horaire illisible : on garde les matchs de ce tournoi du dernier calendrier publié. Jamais d'échec.

Utilisation (depuis la racine du dépôt, après tools/lerq.py) :
    python tools/tournois.py
"""
import json, os, re, sys, urllib.request
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
CALENDRIER = RACINE / "data" / "calendrier.json"
TOURNOIS = RACINE / "data" / "tournois.json"
PUBLIE = "https://cbelanger.github.io/bll-stats/data/calendrier.json"
NOUS = "BLL"
SUR_GITHUB = os.environ.get("GITHUB_ACTIONS") == "true"
# Positions des rondes éliminatoires, en français
PLACES = {"1st place": "1re", "2nd place": "2e", "3rd place": "3e", "4th place": "4e", "5th place": "5e", "6th place": "6e",
          "winner semi 1": "gagnante demi 1", "winner semi 2": "gagnante demi 2", "winner semi": "gagnante de la demi",
          "loser semi 1": "perdante demi 1", "loser semi 2": "perdante demi 2"}


def avertir(t):
    print(f"attention : {t}")
    if SUR_GITHUB:
        print(f"::warning title=Tournois::{t}")


def lire(url):
    req = urllib.request.Request(url, headers={"User-Agent": "bll-stats (calendrier BLL Elite)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8-sig")


def sans_categorie(nom):
    # « Eastern Ontario U19AA Rush » -> « Eastern Ontario Rush » ; « BLL U16AA » -> « BLL »
    return re.sub(r"\s+", " ", re.sub(r"\bU\d{2}\s?[A-C]{0,3}\b", "", nom)).strip(" -")


def cle(nom):
    import unicodedata
    s = unicodedata.normalize("NFD", nom.lower())
    return re.sub(r"[^a-z0-9]+", "-", "".join(c for c in s if not unicodedata.combining(c))).strip("-")


def table_noms():
    # {clé du nom au tournoi : nom officiel}, lue dans data/tournois.json (aussi utilisée par extract.py)
    try:
        noms = json.loads(TOURNOIS.read_text(encoding="utf-8"))["noms"]
    except (OSError, ValueError, KeyError):
        return {}
    return {cle(k): v for k, v in noms.items()}


def evenements(ics):
    # Lignes repliées (RFC 5545) remises bout à bout, puis un dict par VEVENT ; « \, » -> « , »
    t = re.sub(r"\r?\n[ \t]", "", ics.replace("\r\n", "\n"))
    for bloc in t.split("BEGIN:VEVENT")[1:]:
        yield {k: v.replace("\\,", ",").replace("\\n", "\n").strip()
               for k, v in re.findall(r"^([A-Z-]+)(?:;[^:\n]*)?:(.*)$", bloc, re.M)}


def matchs_tournoi(t, equipe, url, noms, inconnus):
    sortie = []
    for e in evenements(lire(url)):
        m = re.match(r"(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})", e.get("DTSTART", ""))
        if not m:
            continue
        d = f"{m[1]}-{m[2]}-{m[3]}"
        if not t["debut"] <= d <= t["fin"]:
            continue
        cotes = [sans_categorie(x) for x in e.get("SUMMARY", "").split(": ")[-1].split(" vs ")]
        if len(cotes) != 2:
            continue
        place = [cle(c).replace("-", " ") in PLACES for c in cotes]
        if NOUS not in cotes and not any(place):
            continue   # match entre deux autres équipes
        if cotes == [NOUS, NOUS]:
            continue
        no = re.search(r"Game #\s*(\d+)", e.get("DESCRIPTION", ""))
        fr = lambda c: PLACES.get(cle(c).replace("-", " "), c)
        ronde = None
        if any(place):
            ronde = "Finale" if any(re.match(r"(?i)winner", c) for c in cotes) else "Demi-finale"
        adv = None
        if NOUS in cotes:
            autre = cotes[1 - cotes.index(NOUS)]
            if cle(autre).replace("-", " ") not in PLACES:
                adv = noms.get(cle(autre))
                if adv is None:
                    adv = autre
                    inconnus.add(autre)
        sortie.append({"no": no[1] if no else None, "equipe": equipe, "date": d, "heure": f"{m[4]}:{m[5]}",
                       "endroit": e.get("LOCATION", "").split(",")[0].strip(), "adversaire": adv, "domicile": None,
                       "tournoi": t["id"], "ronde": ronde, "eventuel": NOUS not in cotes,
                       "libelle": " c. ".join(fr(c) for c in cotes) if any(place) else None})
    return sortie


def main():
    try:
        conf = json.loads(TOURNOIS.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        avertir(f"data/tournois.json illisible ({e})")
        return
    try:
        cal = json.loads(CALENDRIER.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        cal = {"matchs": []}
    try:
        publie = json.loads(lire(PUBLIE)).get("matchs", [])
    except Exception:
        publie = []
    # Ronde déjà connue (match éliminatoire dont les équipes sont maintenant inscrites)
    rondes = {(m["tournoi"], m["no"]): m.get("ronde") for m in publie + cal["matchs"] if m.get("tournoi") and m.get("ronde")}
    noms, inconnus = table_noms(), set()
    matchs = [m for m in cal["matchs"] if not m.get("tournoi")]
    for t in conf.get("tournois", []):
        for equipe, url in t.get("horaires", {}).items():
            try:
                ms = matchs_tournoi(t, equipe, url, noms, inconnus)
                if not ms:
                    raise ValueError("aucun match BLL entre les dates du tournoi")
            except Exception as e:
                ms = [m for m in publie if m.get("tournoi") == t["id"] and m["equipe"] == equipe]
                avertir(f"{t['nom']} {equipe} : horaire illisible ({e}) ; {len(ms)} match(s) du dernier calendrier publié gardé(s)")
            for m in ms:
                m["ronde"] = m.get("ronde") or rondes.get((t["id"], m["no"]))
            print(f"{t['nom']} {equipe} : {len(ms)} match(s), dont {sum(m['eventuel'] for m in ms)} éventuel(s)")
            matchs += ms
    for n in sorted(inconnus):
        avertir(f"équipe « {n} » absente des correspondances de data/tournois.json (« noms ») : nom gardé tel quel")
    cal["matchs"] = sorted(matchs, key=lambda m: (m["date"], m["heure"] or "", m["equipe"]))
    # equipes : équipes inscrites (champ « equipes » de tournois.json, sinon les divisions qui ont un horaire) ;
    # liste vide = pas encore connu : le site montre le tournoi aux deux équipes
    # resultats : résultat final inscrit à la main par équipe (le .ics ne dit pas toujours qui est qualifiée)
    cal["tournois"] = [{**{k: t[k] for k in ("id", "nom", "debut", "fin")},
                        "equipes": sorted(t.get("equipes") or t.get("horaires", {}).keys()),
                        "resultats": t.get("resultats", {})}
                       for t in conf.get("tournois", [])]
    CALENDRIER.parent.mkdir(exist_ok=True)
    CALENDRIER.write_text(json.dumps(cal, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
    sys.exit(0)
