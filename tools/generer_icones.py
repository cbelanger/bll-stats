#!/usr/bin/env python3
"""Génère les icônes de la page de saisie (écran d'accueil du téléphone) à partir de assets/logo-bll.png.
Utilisation (racine du dépôt) : python tools/generer_icones.py
Prérequis : pip install -r requirements.txt"""
from pathlib import Path
from PIL import Image

RACINE = Path(__file__).resolve().parents[1]
LOGO = RACINE / "assets" / "logo-bll.png"
SORTIE = RACINE / "assets" / "icones"

# (fichier, taille, marge de chaque côté en fraction de la taille)
# « maskable » : Android découpe l'icône (cercle, carré arrondi) ; le logo doit rester dans le cercle central de 80 %.
ICONES = [("saisie-192.png", 192, .08), ("saisie-512.png", 512, .08), ("saisie-maskable-512.png", 512, .2)]


def icone(taille, marge):
    logo = Image.open(LOGO).convert("RGBA")
    zone = taille * (1 - 2 * marge)
    r = min(zone / logo.width, zone / logo.height)
    logo = logo.resize((round(logo.width * r), round(logo.height * r)), Image.LANCZOS)
    fond = Image.new("RGBA", (taille, taille), "white")
    fond.alpha_composite(logo, ((taille - logo.width) // 2, (taille - logo.height) // 2))
    return fond.convert("RGB")


if __name__ == "__main__":
    SORTIE.mkdir(exist_ok=True)
    for nom, taille, marge in ICONES:
        icone(taille, marge).save(SORTIE / nom, optimize=True)
        print(f"✓ assets/icones/{nom}")
