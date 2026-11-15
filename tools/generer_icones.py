#!/usr/bin/env python3
"""Génère les icônes d'écran d'accueil du téléphone à partir de assets/logo-bll.png :
saisie (logo sur fond blanc) et site des statistiques (logo dans une carte blanche sur fond marine, liseré rouge),
pour ne pas confondre les deux applications.
Utilisation (racine du dépôt) : python tools/generer_icones.py
Prérequis : pip install -r requirements.txt"""
from pathlib import Path
from PIL import Image, ImageDraw

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


# Site : (fichier, taille, marge de la carte blanche) ; maskable : carte dans le cercle central
ICONES_SITE = [("site-192.png", 192, .12), ("site-512.png", 512, .12), ("site-maskable-512.png", 512, .22),
               ("site-180.png", 180, .12)]   # 180 : iPhone (apple-touch-icon)
MARINE, ROUGE = "#16336B", "#D7192D"


def icone_site(taille, marge):
    fond = Image.new("RGBA", (taille, taille), MARINE)
    d = ImageDraw.Draw(fond)
    m = round(taille * marge)
    carte = (m, m, taille - m, taille - m)
    rayon = round((taille - 2 * m) * .14)
    # liseré rouge sous la carte (comme la barre du site), puis carte blanche
    d.rounded_rectangle((m, m + round(taille * .035), taille - m, taille - m + round(taille * .035)), rayon, fill=ROUGE)
    d.rounded_rectangle(carte, rayon, fill="white")
    logo = Image.open(LOGO).convert("RGBA")
    zone = (taille - 2 * m) * .78
    r = min(zone / logo.width, zone / logo.height)
    logo = logo.resize((round(logo.width * r), round(logo.height * r)), Image.LANCZOS)
    fond.alpha_composite(logo, ((taille - logo.width) // 2, (taille - logo.height) // 2))
    return fond.convert("RGB")


if __name__ == "__main__":
    SORTIE.mkdir(exist_ok=True)
    for nom, taille, marge in ICONES:
        icone(taille, marge).save(SORTIE / nom, optimize=True)
        print(f"✓ assets/icones/{nom}")
    for nom, taille, marge in ICONES_SITE:
        icone_site(taille, marge).save(SORTIE / nom, optimize=True)
        print(f"✓ assets/icones/{nom}")
