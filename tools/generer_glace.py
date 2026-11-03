"""Génère la texture de fond du site : glace marquée par les patins.

Écrit assets/glace.svg (mode clair) et assets/glace-sombre.svg (mode sombre).
Tuile carrée qui se raccorde sur ses bords (chaque trait est recopié de l'autre côté),
répétée en fond par css/style.css. Tirage fixe : relancer donne le même fichier.

    python tools/generer_glace.py
"""
import math
import random
from pathlib import Path

T = 900            # côté de la tuile (px)
RACINE = Path(__file__).resolve().parent.parent

# (couleur, opacité min, opacité max) par mode : raies claires (glace rayée) et raies foncées (neige tassée)
MODES = {
    "glace.svg": {"clair": ("#FFFFFF", .55, .95), "fonce": ("#9DB4D3", .18, .38), "tache": ("#FFFFFF", .35)},
    "glace-sombre.svg": {"clair": ("#FFFFFF", .035, .08), "fonce": ("#000000", .08, .16), "tache": ("#FFFFFF", .025)},
}


def arc(r, x, y, ang, long, courbe):
    """Courbe de Bézier : un coup de patin (long arc légèrement incurvé)."""
    dx, dy = math.cos(ang), math.sin(ang)
    x2, y2 = x + dx * long, y + dy * long
    cx, cy = x + dx * long / 2 - dy * courbe, y + dy * long / 2 + dx * courbe
    return f"M{x:.1f} {y:.1f}Q{cx:.1f} {cy:.1f} {x2:.1f} {y2:.1f}"


def traits(r):
    """Liste de (d, type, largeur) : coups de patin, paires de lames, arrêts en dérapage."""
    t = []
    for _ in range(70):                       # longs coups de patin
        x, y = r.uniform(0, T), r.uniform(0, T)
        ang = r.uniform(0, math.pi * 2)
        long, courbe = r.uniform(180, 520), r.uniform(-90, 90)
        sorte = "clair" if r.random() < .6 else "fonce"
        t.append((arc(r, x, y, ang, long, courbe), sorte, r.uniform(.6, 1.8)))
        if r.random() < .35:                  # trait parallèle tout proche (deuxième passage)
            e = r.uniform(3, 7)
            t.append((arc(r, x - math.sin(ang) * e, y + math.cos(ang) * e, ang, long * r.uniform(.6, 1), courbe), sorte, r.uniform(.5, 1.2)))
    for _ in range(5):                        # arrêts : gerbe de courts traits en croissant
        x, y = r.uniform(0, T), r.uniform(0, T)
        ang = r.uniform(0, math.pi * 2)
        for k in range(r.randint(14, 24)):
            o = (k - 10) * r.uniform(2.5, 4)
            px, py = x - math.sin(ang) * o, y + math.cos(ang) * o
            t.append((arc(r, px, py, ang + r.uniform(-.15, .15), r.uniform(25, 70), r.uniform(-12, 12)),
                      "clair" if r.random() < .7 else "fonce", r.uniform(.5, 1.4)))
    return t


def svg(mode):
    r = random.Random(2026)
    taches = "".join(
        f'<ellipse cx="{r.uniform(0, T):.0f}" cy="{r.uniform(0, T):.0f}" rx="{r.uniform(80, 220):.0f}" ry="{r.uniform(40, 140):.0f}"/>'
        for _ in range(9))
    c, o = mode["tache"]
    corps = [f'<g fill="{c}" fill-opacity="{o}" filter="url(#f)">{taches}</g>', '<g fill="none" stroke-linecap="round">']
    for d, sorte, larg in traits(r):
        coul, omin, omax = mode[sorte]
        corps.append(f'<path d="{d}" stroke="{coul}" stroke-opacity="{r.uniform(omin, omax):.2f}" stroke-width="{larg:.1f}"/>')
    corps.append("</g>")
    contenu = "".join(corps)
    # Recopie décalée d'une tuile dans chaque direction : les traits qui dépassent réapparaissent de l'autre côté
    copies = "".join(f'<use href="#t" x="{dx}" y="{dy}"/>' for dx in (-T, 0, T) for dy in (-T, 0, T) if dx or dy)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{T}" height="{T}" viewBox="0 0 {T} {T}">'
            f'<defs><filter id="f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter></defs>'
            f'<g id="t">{contenu}</g>{copies}</svg>\n')


for nom, mode in MODES.items():
    (RACINE / "assets" / nom).write_text(svg(mode), encoding="utf-8")
    print("écrit", nom)
