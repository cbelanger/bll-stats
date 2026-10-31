#!/usr/bin/env python3
"""
Lit les sommaires PDF remplis (dossier pdf/) et produit data/matchs.json pour le site.

Utilisation (depuis la racine du dépôt) :
    python tools/extract.py

Prérequis : pip install pypdf
"""
import json, re, sys
from datetime import date
from pathlib import Path
from pypdf import PdfReader

RACINE = Path(__file__).resolve().parent.parent
DOSSIER_PDF = RACINE / "pdf"
SORTIE = RACINE / "data" / "matchs.json"

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


def lire(pdf):
    champs = {k: v.get("/V") for k, v in (PdfReader(pdf).get_fields() or {}).items()}
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

    # Tirs cadrés : somme des périodes si elles sont remplies, sinon le total
    def tirs(cote):
        per = {p: entier(champs, f"tirs_{cote}_{p}") for p in PERIODES}
        if any(v is not None for v in per.values()):
            per = {p: (v or 0) for p, v in per.items()}
            return sum(per.values()), per
        return entier(champs, f"tirs_{cote}"), None

    tirs_nous, per_nous = tirs("nous")
    tirs_adv, per_adv = tirs("adv")

    buts_nous = entier(champs, "buts_nous")
    buts_adv = entier(champs, "buts_adv")
    if buts_nous is None or buts_adv is None:
        erreurs.append("buts marqués / accordés manquants (section 1)")

    # Buts accordés détaillés
    detail = []
    for n in range(1, NB_LIGNES_BUTS + 1):
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

    sz_t, sz_r = entier(champs, "sz_tentatives"), entier(champs, "sz_reussies")
    if sz_t is not None and sz_r is not None and sz_r > sz_t:
        erreurs.append("plus de sorties de zone réussies que de tentatives")

    g_nom, g_no = gardienne_de(texte(champs, "gardienne"))
    if not g_nom:
        avertissements.append("gardienne non indiquée")

    if erreurs:
        return None, erreurs, avertissements

    return {
        "id": f"{d.isoformat()}_{equipe}_{slug(adversaire)}",
        "fichier_pdf": pdf.name,
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


def main():
    pdfs = sorted(DOSSIER_PDF.glob("*.pdf"))
    if not pdfs:
        print(f"Aucun PDF dans {DOSSIER_PDF}")
        return 1
    matchs, ids, echecs = [], set(), 0
    for pdf in pdfs:
        m, err, avert = lire(pdf)
        if err:
            echecs += 1
            print(f"✗ {pdf.name} — ignoré")
            for e in err:
                print(f"    erreur : {e}")
        else:
            if m["id"] in ids:
                m["id"] += f"_{m['no_match'] or len(ids)}"
            ids.add(m["id"])
            matchs.append(m)
            print(f"✓ {pdf.name} → {m['id']}")
        for a in avert:
            print(f"    attention : {a}")
    matchs.sort(key=lambda m: (m["date"], m["heure_debut"] or ""), reverse=True)
    SORTIE.parent.mkdir(exist_ok=True)
    SORTIE.write_text(json.dumps({"genere_le": date.today().isoformat(), "matchs": matchs},
                                 ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n{len(matchs)} match(s) écrit(s) dans {SORTIE.relative_to(RACINE)}"
          + (f" — {echecs} PDF ignoré(s), à corriger" if echecs else ""))
    return 1 if echecs else 0


if __name__ == "__main__":
    sys.exit(main())
