#!/usr/bin/env python3
"""
Produit data/matchs.json pour le site à partir des matchs de data/matchs/ (un fichier JSON par match).

Un match = un fichier data/matchs/AAAA-MM-JJ_EQUIPE_adversaire[_no].json, au format « bll-match-1 » :
    {"format": "bll-match-1", "exporte_le": "…", "source": "pdf" | "saisie", "champs": {…}}
où « champs » reprend les noms de champs du PDF Sommaire. Ces fichiers viennent :
  - de saisie.html (téléphone), déposés directement dans data/matchs/ ;
  - des PDF déposés dans pdf/ : avec --importer, chaque PDF valide est converti en JSON dans data/matchs/
    (il remplace le JSON du même match s'il existe) puis déplacé dans pdf/archives/.
    Sans --importer (vérification locale), les PDF de pdf/ sont lus sans rien déplacer.
Un PDF en erreur reste dans pdf/.

Utilisation (depuis la racine du dépôt) :
    python tools/extract.py              # vérifier localement
    python tools/extract.py --importer   # GitHub Actions : convertir et archiver les PDF

Prérequis : pip install pypdf
"""
import json, os, re, sys, unicodedata
from datetime import date, datetime, timezone
from pathlib import Path
from pypdf import PdfReader

RACINE = Path(__file__).resolve().parent.parent
DOSSIER_PDF = RACINE / "pdf"
DOSSIER_ARCHIVES = DOSSIER_PDF / "archives"
DOSSIER_MATCHS = RACINE / "data" / "matchs"
LISTE_GARDIENNES = RACINE / "data" / "gardiennes.json"
FORMAT = "bll-match-1"
FORMATS_LUS = {FORMAT, "bll-saisie-1"}   # bll-saisie-1 : premiers exports de saisie.html
SORTIE = RACINE / "data" / "matchs.json"

SUR_GITHUB = os.environ.get("GITHUB_ACTIONS") == "true"

PERIODES = ["p1", "p2", "p3", "p4", "prol"]
CODES_TYPE = {"P", "T", "L", "R", "E", "D", "FC", "A"}
ZONES = {"HG", "HC", "HD", "CG", "C", "CD", "BG", "BC", "BD"}
NB_LIGNES_BUTS = 15


def texte(champs, nom):
    v = champs.get(nom)
    if v is None:
        return ""
    v = str(v).strip()
    return "" if v in ("/Off", "Off") else v


def entier(champs, nom):
    v = texte(champs, nom)
    if v == "":
        return None
    try:
        return int(float(v.replace(",", ".")))
    except ValueError:
        return None


def coche(champs, nom):
    return texte(champs, nom) != ""


def saison_de(d):
    # Saison d'août à juillet : 2026-11-01 -> 2026-2027
    an = d.year if d.month >= 8 else d.year - 1
    return f"{an}-{an + 1}"


def gardienne_de(v):
    # "Frédérique Bélanger #30" -> ("Frédérique Bélanger", 30)
    m = re.match(r"^(.*?)\s*#\s*(\d+)\s*$", v)
    if m:
        return m.group(1).strip(), int(m.group(2))
    return v.strip(), None


def gardiennes_officielles():
    try:
        return json.loads(LISTE_GARDIENNES.read_text(encoding="utf-8-sig"))["gardiennes"]
    except (OSError, ValueError, KeyError):
        return []


def normaliser_gardienne(nom, no, avertissements):
    # Rapproche de data/gardiennes.json pour éviter les doublons (coquille, numéro oublié)
    if not nom and no is None:
        return nom, no
    liste = gardiennes_officielles()
    par_no = next((g for g in liste if g["numero"] == no), None)
    if par_no:
        if slug(nom) != slug(par_no["nom"]):
            avertissements.append(f"gardienne #{no} : « {nom} » remplacé par « {par_no['nom']} » (data/gardiennes.json)")
        return par_no["nom"], no
    par_nom = next((g for g in liste if slug(g["nom"]) == slug(nom)), None)
    if par_nom and no is None:
        return par_nom["nom"], par_nom["numero"]
    if no is None:
        avertissements.append(f"gardienne « {nom} » sans numéro et absente de data/gardiennes.json")
    else:
        avertissements.append(f"gardienne « {nom} #{no} » absente de data/gardiennes.json : l'y ajouter")
    return nom, no


def slug(s):
    # Même règle que slug() dans js/saisie.js : les noms de fichiers doivent correspondre
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def nom_fichier(m):
    # Même règle que nomFichier() dans js/saisie.js
    no = f"_{slug(m['no_match'])}" if m["no_match"] and slug(m["no_match"]) else ""
    return f"{m['date']}_{m['equipe']}_{slug(m['adversaire']) or 'adversaire'}{no}.json"


def lire_pdf(pdf):
    brut = {k: v.get("/V") for k, v in (PdfReader(pdf).get_fields() or {}).items()}
    # Valeurs en texte, sans les champs vides ni les zones calculées du filet (zone_HG…)
    champs = {k: texte(brut, k) for k in brut if texte(brut, k) and not k.startswith("zone_")}
    m, erreurs, avertissements = valider(champs)
    return m, erreurs, avertissements, champs


def lire_json(fichier):
    try:
        data = json.loads(fichier.read_text(encoding="utf-8-sig"))  # -sig : tolère un BOM
    except (ValueError, UnicodeDecodeError) as e:
        return None, [f"fichier JSON illisible : {e}"], []
    if not isinstance(data, dict) or data.get("format") not in FORMATS_LUS or not isinstance(data.get("champs"), dict):
        return None, [f"format inconnu (attendu : « {FORMAT} »)"], []
    m, erreurs, avertissements = valider(data["champs"])
    if m:
        m.update(fichier=fichier.name, source=data.get("source", "saisie"), exporte_le=data.get("exporte_le"))
    return m, erreurs, avertissements


def valider(champs):
    erreurs, avertissements = [], []

    # Équipe
    u16, u19 = coche(champs, "equipe_U16AA"), coche(champs, "equipe_U19AA")
    if u16 == u19:
        erreurs.append("cocher une seule équipe (U16AA ou U19AA)")
    equipe = "U16AA" if u16 else "U19AA"

    # Date
    d_txt = texte(champs, "date")
    try:
        d = date.fromisoformat(d_txt)
    except ValueError:
        erreurs.append(f"date invalide ou manquante : « {d_txt} » (format AAAA-MM-JJ)")
        d = None

    adversaire = texte(champs, "adversaire")
    if not adversaire:
        erreurs.append("adversaire manquant")

    no_match = texte(champs, "no_match")
    if not no_match:
        avertissements.append("numéro de match manquant")

    def nombre(nom):
        v = entier(champs, nom)
        if v is None and texte(champs, nom):
            avertissements.append(f"{nom} : « {texte(champs, nom)} » n'est pas un nombre, valeur ignorée")
        return v

    # Tirs cadrés : somme des périodes si elles sont remplies, sinon le total.
    # P1-P4 vides = 0 ; prolongation vide = None (pas de prolongation).
    def tirs(cote):
        per = {p: nombre(f"tirs_{cote}_{p}") for p in PERIODES}
        if any(v is not None for v in per.values()):
            per = {p: (v if p == "prol" else v or 0) for p, v in per.items()}
            return sum(v or 0 for v in per.values()), per
        return nombre(f"tirs_{cote}"), None

    tirs_nous, per_nous = tirs("nous")
    tirs_adv, per_adv = tirs("adv")

    buts_nous = nombre("buts_nous")
    buts_adv = nombre("buts_adv")
    if buts_nous is None or buts_adv is None:
        erreurs.append("buts marqués / accordés manquants (section 1)")

    # Buts accordés détaillés
    detail = []
    # 15 lignes dans le PDF ; une saisie téléphone peut en avoir plus
    nums = [int(m.group(1)) for k in champs if (m := re.fullmatch(r"but_(\d+)_periode", k))]
    for n in range(1, max([NB_LIGNES_BUTS, *nums]) + 1):
        per = texte(champs, f"but_{n}_periode")
        tps = texte(champs, f"but_{n}_temps")
        typ = re.split(r"\s+[–-]\s+", texte(champs, f"but_{n}_type"))[0].strip()
        zon = texte(champs, f"but_{n}_zone")
        if not any([per, tps, typ, zon]):
            continue
        if typ and typ not in CODES_TYPE:
            avertissements.append(f"but {n} : type inconnu « {typ} »")
        if zon and zon not in ZONES:
            avertissements.append(f"but {n} : zone inconnue « {zon} »")
        if not typ or not zon:
            avertissements.append(f"but {n} : type ou zone manquant")
        detail.append({"no": n, "periode": per or None, "temps": tps or None,
                       "type": typ or None, "zone": zon or None})

    if buts_adv is not None and detail and len(detail) != buts_adv:
        avertissements.append(f"{buts_adv} but(s) accordé(s) en section 1, mais {len(detail)} ligne(s) en section 2")
    if tirs_adv is not None and buts_adv is not None and buts_adv > tirs_adv:
        erreurs.append("plus de buts accordés que de tirs cadrés adverses (un but compte aussi comme tir cadré)")

    sz_t, sz_r = nombre("sz_tentatives"), nombre("sz_reussies")
    if sz_t is not None and sz_r is not None and sz_r > sz_t:
        erreurs.append("plus de sorties de zone réussies que de tentatives")

    g_nom, g_no = normaliser_gardienne(*gardienne_de(texte(champs, "gardienne")), avertissements)
    if not g_nom:
        avertissements.append("gardienne non indiquée")

    if erreurs:
        return None, erreurs, avertissements

    return {
        "id": f"{d.isoformat()}_{equipe}_{slug(adversaire) or 'adversaire'}",
        "fichier": None,
        "source": None,
        "saison": saison_de(d),
        "equipe": equipe,
        "no_match": no_match or None,
        "date": d.isoformat(),
        "heure_debut": texte(champs, "heure_debut") or None,
        "heure_fin": texte(champs, "heure_fin") or None,
        "adversaire": adversaire,
        "responsable": texte(champs, "responsable") or None,
        "gardienne": {"nom": g_nom or None, "numero": g_no},
        "buts": {"nous": buts_nous, "adv": buts_adv},
        "tirs": {"nous": tirs_nous, "adv": tirs_adv},
        "tirs_par_periode": {"nous": per_nous, "adv": per_adv},
        "sorties_zone": {"tentatives": sz_t, "reussies": sz_r},
        "buts_accordes": detail,
        "notes": texte(champs, "notes") or None,
    }, [], avertissements


def meme_match(a, b):
    # Même date, équipe et adversaire ; deux numéros de match différents = deux matchs distincts
    if (a["date"], a["equipe"], slug(a["adversaire"])) != (b["date"], b["equipe"], slug(b["adversaire"])):
        return False
    return not (a["no_match"] and b["no_match"] and a["no_match"] != b["no_match"])


class Rapport:
    def __init__(self):
        self.echecs = 0

    def fichier(self, nom, symbole, suite, erreurs=(), avertissements=()):
        print(f"{symbole} {nom}{suite}")
        if erreurs:
            self.echecs += 1
        for e in erreurs:
            print(f"    erreur : {e}")
            if SUR_GITHUB:  # annotation rouge en haut de la page de l'exécution
                print(f"::error title={nom}::{e}")
        for a in avertissements:
            print(f"    attention : {a}")
            if SUR_GITHUB:  # annotation jaune en haut de la page de l'exécution
                print(f"::warning title={nom}::{a}")


def main(importer):
    rapport, matchs = Rapport(), []

    # 1. Matchs enregistrés (data/matchs/*.json)
    for f in sorted(DOSSIER_MATCHS.glob("*.json")):
        m, err, avert = lire_json(f)
        if err:
            rapport.fichier(f.name, "✗", " — ignoré", err, avert)
            continue
        autre = next((x for x in matchs if meme_match(x, m)), None)
        if autre:
            # Deux fichiers pour le même match (ex. renommé « (1) » au téléchargement) : le plus récent gagne
            garde, ecarte = (m, autre) if (m["exporte_le"] or "") > (autre["exporte_le"] or "") else (autre, m)
            avert = avert + [f"même match que {autre['fichier']} : {garde['fichier']} est gardé (le plus récent), "
                             f"supprimer {ecarte['fichier']}"]
            matchs[matchs.index(autre)] = garde
        else:
            matchs.append(m)
        rapport.fichier(f.name, "✓", "", (), avert)

    # 2. PDF déposés dans pdf/ : convertis (et archivés avec --importer), ils remplacent le même match
    for pdf in sorted(DOSSIER_PDF.glob("*.pdf")):
        m, err, avert, champs = lire_pdf(pdf)
        if err:
            rapport.fichier(pdf.name, "✗", " — ignoré, reste dans pdf/", err, avert)
            continue
        i = next((k for k, x in enumerate(matchs) if meme_match(x, m)), None)
        cible = matchs[i]["fichier"] if i is not None else nom_fichier(m)
        if i is None and (DOSSIER_MATCHS / cible).exists():
            cible = cible[:-5] + "_2.json"   # nom pris par un autre match (fichier en erreur)
        if i is not None:
            avert = avert + [f"remplace {cible}"]
        m.update(fichier=cible, source="pdf", exporte_le=datetime.now(timezone.utc).isoformat(timespec="seconds"))
        if importer:
            DOSSIER_MATCHS.mkdir(parents=True, exist_ok=True)
            DOSSIER_ARCHIVES.mkdir(parents=True, exist_ok=True)
            (DOSSIER_MATCHS / cible).write_text(json.dumps(
                {"format": FORMAT, "exporte_le": m["exporte_le"], "source": "pdf", "pdf": pdf.name, "champs": champs},
                ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            pdf.replace(DOSSIER_ARCHIVES / pdf.name)
            suite = f" → data/matchs/{cible} (PDF archivé)"
        else:
            suite = f" → {cible} (sera importé au push)"
        if i is not None:
            matchs[i] = m
        else:
            matchs.append(m)
        rapport.fichier(pdf.name, "✓", suite, (), avert)

    if not matchs and not rapport.echecs:
        print(f"Aucun match dans {DOSSIER_MATCHS.relative_to(RACINE)} ni PDF dans {DOSSIER_PDF.relative_to(RACINE)}")
        return 1

    # Identifiants uniques pour les liens du site (#/match/<id>)
    ids = set()
    for m in sorted(matchs, key=lambda m: (m["date"], m["heure_debut"] or "", m["fichier"])):
        if m["id"] in ids:
            m["id"] += f"_{slug(m['no_match'] or '') or len(ids)}"
        ids.add(m["id"])

    matchs.sort(key=lambda m: (m["date"], m["heure_debut"] or ""), reverse=True)
    SORTIE.parent.mkdir(exist_ok=True)
    SORTIE.write_text(json.dumps({"genere_le": datetime.now().isoformat(timespec="minutes"), "matchs": matchs},
                                 ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n{len(matchs)} match(s) écrit(s) dans {SORTIE.relative_to(RACINE)}"
          + (f" — {rapport.echecs} fichier(s) ignoré(s), à corriger" if rapport.echecs else ""))
    return 1 if rapport.echecs else 0


if __name__ == "__main__":
    sys.exit(main(importer="--importer" in sys.argv[1:]))
