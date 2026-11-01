#!/usr/bin/env python3
"""
Lit les sommaires PDF remplis (dossier pdf/) et les saisies faites sur téléphone avec saisie.html
(dossier data/saisies/), et produit data/matchs.json pour le site.
Un même match présent en PDF et en saisie : le PDF est gardé.

Utilisation (depuis la racine du dépôt) :
    python tools/extract.py

Prérequis : pip install pypdf
"""
import json, os, re, sys
from datetime import date, datetime
from pathlib import Path
from pypdf import PdfReader

RACINE = Path(__file__).resolve().parent.parent
DOSSIER_PDF = RACINE / "pdf"
DOSSIER_SAISIES = RACINE / "data" / "saisies"
FORMAT_SAISIE = "bll-saisie-1"
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


def slug(s):
    s = s.lower()
    for a, b in (("àâä", "a"), ("éèêë", "e"), ("îï", "i"), ("ôö", "o"), ("ùûü", "u"), ("ç", "c")):
        for ch in a:
            s = s.replace(ch, b)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-") or "adversaire"


def lire_pdf(pdf):
    champs = {k: v.get("/V") for k, v in (PdfReader(pdf).get_fields() or {}).items()}
    return valider(champs, pdf, "pdf")


def lire_saisie(fichier):
    # Fichier exporté par saisie.html : mêmes noms de champs que le PDF Sommaire
    try:
        data = json.loads(fichier.read_text(encoding="utf-8-sig"))  # -sig : tolère un BOM
    except (ValueError, UnicodeDecodeError) as e:
        return None, [f"fichier JSON illisible : {e}"], []
    if not isinstance(data, dict) or data.get("format") != FORMAT_SAISIE or not isinstance(data.get("champs"), dict):
        return None, [f"format inconnu (attendu : « {FORMAT_SAISIE} »)"], []
    m, erreurs, avertissements = valider(data["champs"], fichier, "saisie")
    if m:
        m["exporte_le"] = data.get("exporte_le")
    return m, erreurs, avertissements


def valider(champs, fichier, source):
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

    g_nom, g_no = gardienne_de(texte(champs, "gardienne"))
    if not g_nom:
        avertissements.append("gardienne non indiquée")

    if erreurs:
        return None, erreurs, avertissements

    return {
        "id": f"{d.isoformat()}_{equipe}_{slug(adversaire)}",
        "fichier": fichier.name,
        "source": source,
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


def main():
    # PDF d'abord : en cas de doublon avec une saisie, le PDF est gardé
    fichiers = ([(f, lire_pdf) for f in sorted(DOSSIER_PDF.glob("*.pdf"))]
                + [(f, lire_saisie) for f in sorted(DOSSIER_SAISIES.glob("*.json"))])
    if not fichiers:
        print(f"Aucun PDF dans {DOSSIER_PDF} ni saisie dans {DOSSIER_SAISIES}")
        return 1
    matchs, ids, echecs = [], set(), 0
    for f, lire in fichiers:
        m, err, avert = lire(f)
        if not err and m["source"] == "saisie":
            autre = next((x for x in matchs if meme_match(x, m)), None)
            if autre and autre["source"] == "pdf":
                print(f"– {f.name} — ignoré")
                avert = avert + [f"même match que {autre['fichier']} : le PDF est gardé, la saisie est ignorée"]
                m = None
            elif autre and (m["exporte_le"] or "") > (autre["exporte_le"] or ""):
                # Deux saisies du même match (ex. exportée deux fois) : la plus récente remplace l'autre
                avert = avert + [f"remplace {autre['fichier']} (exportée plus tôt) : supprimer ce fichier"]
                matchs.remove(autre)
                ids.discard(autre["id"])
            elif autre:
                print(f"– {f.name} — ignoré")
                avert = avert + [f"même match que {autre['fichier']}, exportée plus tard : supprimer ce fichier"]
                m = None
        if err:
            echecs += 1
            print(f"✗ {f.name} — ignoré")
            for e in err:
                print(f"    erreur : {e}")
                if SUR_GITHUB:  # annotation rouge en haut de la page de l'exécution
                    print(f"::error title={f.name}::{e}")
        elif m:
            if m["id"] in ids:
                m["id"] += f"_{m['no_match'] or len(ids)}"
            ids.add(m["id"])
            matchs.append(m)
            print(f"✓ {f.name} → {m['id']}")
        for a in avert:
            print(f"    attention : {a}")
            if SUR_GITHUB:  # annotation jaune en haut de la page de l'exécution
                print(f"::warning title={f.name}::{a}")
    matchs.sort(key=lambda m: (m["date"], m["heure_debut"] or ""), reverse=True)
    SORTIE.parent.mkdir(exist_ok=True)
    SORTIE.write_text(json.dumps({"genere_le": datetime.now().isoformat(timespec="minutes"),"matchs": matchs},
                                 ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n{len(matchs)} match(s) écrit(s) dans {SORTIE.relative_to(RACINE)}"
          + (f" — {echecs} fichier(s) ignoré(s), à corriger" if echecs else ""))
    return 1 if echecs else 0


if __name__ == "__main__":
    sys.exit(main())
