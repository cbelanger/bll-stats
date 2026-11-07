#!/usr/bin/env python3
"""Fabrique la vidéo d'aide de la saisie : assets/aide/saisie-demo.mp4 (+ affiche saisie-demo.jpg).

Rejoue la vraie saisie dans Edge sans fenêtre (tools/video/demo.html?etape=N), une capture par étape,
puis assemble les images en MP4 vertical avec des fondus. À relancer après un changement de la saisie.

Utilisation (racine du dépôt) : python tools/video/faire_video.py [--images DOSSIER]
  --images : garde aussi une image PNG par étape dans DOSSIER (pour vérifier sans les fondus).
Prérequis : Microsoft Edge, pillow, imageio-ffmpeg (pip install imageio-ffmpeg ; pas dans requirements.txt :
seulement pour fabriquer la vidéo).
"""
import re
import subprocess
import sys
import tempfile
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import imageio_ffmpeg
from PIL import Image

RACINE = Path(__file__).resolve().parents[2]
SORTIE = RACINE / "assets" / "aide"
EDGE = next((p for p in [Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
                         Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe")] if p.exists()), None)
IPS = 24          # images par seconde
FONDU = 0.35      # secondes de fondu entre deux étapes


def nb_etapes():
    # Nombre d'étapes = entrées de ETAPES dans demo.html (une par « st: »)
    return len(re.findall(r"\bst:", (RACINE / "tools" / "video" / "demo.html").read_text(encoding="utf-8")))


def sous_titre(n):
    textes = re.findall(r'st:\s*"([^"]*)"', (RACINE / "tools" / "video" / "demo.html").read_text(encoding="utf-8"))
    return re.sub(r"<[^>]+>", "", textes[n]) if n < len(textes) else ""


def capturer(port, n, dossier):
    png = dossier / f"etape-{n:02d}.png"
    profil = dossier / f"profil-{n}"   # profil neuf : la saisie repart d'un match vide
    subprocess.run([str(EDGE), "--headless", "--disable-gpu", f"--user-data-dir={profil}", "--hide-scrollbars",
                    "--force-device-scale-factor=2", "--window-size=360,640", "--virtual-time-budget=8500",
                    f"--screenshot={png}", f"http://localhost:{port}/tools/video/demo.html?etape={n}"],
                   check=True, timeout=120, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return Image.open(png).convert("RGB").resize((720, 1280))


def duree(n, total):
    if n == 0:
        return 3.5
    if n == total - 1:
        return 6.0
    return min(5.0, max(3.0, 1.8 + len(sous_titre(n)) / 16))


def main():
    if not EDGE:
        sys.exit("Microsoft Edge introuvable")
    SORTIE.mkdir(parents=True, exist_ok=True)
    class Muet(SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    serveur = ThreadingHTTPServer(("localhost", 0), partial(Muet, directory=str(RACINE)))
    threading.Thread(target=serveur.serve_forever, daemon=True).start()
    total = nb_etapes()
    with tempfile.TemporaryDirectory() as tmp:
        images = []
        for n in range(total):
            print(f"étape {n + 1}/{total}", flush=True)
            images.append(capturer(serveur.server_port, n, Path(tmp)))
    serveur.shutdown()
    if "--images" in sys.argv:
        dossier = Path(sys.argv[sys.argv.index("--images") + 1])
        dossier.mkdir(parents=True, exist_ok=True)
        for n, img in enumerate(images):
            img.save(dossier / f"etape-{n:02d}.png")

    images[0].save(SORTIE / "saisie-demo.jpg", quality=85)
    sortie = SORTIE / "saisie-demo.mp4"
    ecrire = imageio_ffmpeg.write_frames(str(sortie), (720, 1280), fps=IPS, codec="libx264", quality=None,
                                         output_params=["-crf", "26", "-preset", "slow", "-pix_fmt", "yuv420p",
                                                        "-movflags", "+faststart"])
    ecrire.send(None)
    nf = int(FONDU * IPS)
    for n, img in enumerate(images):
        reste = int(duree(n, total) * IPS) - (nf if n < total - 1 else 0)
        for _ in range(reste):
            ecrire.send(img.tobytes())
        if n < total - 1:
            for k in range(1, nf + 1):
                ecrire.send(Image.blend(img, images[n + 1], k / (nf + 1)).tobytes())
    ecrire.close()
    print(f"{sortie.relative_to(RACINE)} : {sortie.stat().st_size / 1e6:.1f} Mo, "
          f"{sum(duree(n, total) for n in range(total)):.0f} s")


if __name__ == "__main__":
    main()
