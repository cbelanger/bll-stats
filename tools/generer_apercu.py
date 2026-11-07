#!/usr/bin/env python3
"""Génère les images d'aperçu de lien (Messenger, courriel…) : assets/apercu.png (site) et assets/apercu-saisie.png.
Format 1200 × 630 recommandé pour og:image. Utilisation (racine du dépôt) : python tools/generer_apercu.py
Police : Bahnschrift (Windows) ; sinon la police par défaut de Pillow."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RACINE = Path(__file__).resolve().parents[1]
MARINE, ROUGE, BLANC, PALE = "#16336B", "#D7192D", "#FFFFFF", "#C9D6EE"


def police(taille, style="Bold Condensed"):
    try:
        f = ImageFont.truetype("C:/Windows/Fonts/bahnschrift.ttf", taille)
        f.set_variation_by_name(style)
        return f
    except OSError:
        return ImageFont.load_default(taille)


def apercu(titre, sous_titre, sortie):
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), MARINE)
    d = ImageDraw.Draw(img)
    # Rayures de glace discrètes et bande rouge du bas (comme l'en-tête du site)
    for i in range(-H, W, 46):
        d.line([(i, H), (i + H * 0.55, 0)], fill="#1B3B78", width=3)
    d.rectangle([0, H - 26, W, H], fill=ROUGE)
    # Logo sur fond blanc arrondi
    logo = Image.open(RACINE / "assets" / "logo-bll.png").convert("RGBA")
    logo.thumbnail((300, 220))
    bx, by, pad = 90, (H - 26 - logo.height) // 2 - 20, 26
    d.rounded_rectangle([bx - pad, by - pad, bx + logo.width + pad, by + logo.height + pad], 24, fill=BLANC)
    img.paste(logo, (bx, by), logo)
    x = bx + logo.width + pad + 70
    d.text((x, 205), titre, font=police(92), fill=BLANC)
    d.text((x, 315), sous_titre, font=police(46, "SemiBold"), fill=PALE)
    d.text((x, 385), "U16AA  ·  U19AA", font=police(46, "SemiBold"), fill=BLANC)
    img.save(sortie, optimize=True)
    print(sortie.relative_to(RACINE), sortie.stat().st_size // 1024, "Ko")


apercu("Statistiques", "Ringuette BLL Élite", RACINE / "assets" / "apercu.png")
apercu("Saisie de match", "Stats sur téléphone", RACINE / "assets" / "apercu-saisie.png")
