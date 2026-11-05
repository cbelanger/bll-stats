"use strict";
// Demi-patinoire de ringuette (zone d'attaque) vue par la tireuse : filet en haut, ligne bleue en bas,
// cercles de passe libre et ligne de ringuette (free play line) entre les deux.
// Utilisé par le site (js/app.js) et la saisie (js/saisie.js).
// Points : {x, y} de 0 à 100 (x : gauche → droite ; y : bande du fond → ligne bleue),
// cls "nous" (bleu) ou "adv" (rouge), lab = texte dans le point, but = identifiant (data-but), titre = info-bulle.
// Échelle : 85 pi de large, 75 pi de la bande du fond à la ligne bleue (10 unités par pied).
const PAT_W = 850, PAT_H = 750;

// "42,63" → {x: 42, y: 63} ; null si absent ou invalide
function lireLieu(t) {
  const m = /^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/.exec(t || "");
  return m && +m[1] <= 100 && +m[2] <= 100 ? { x: +m[1], y: +m[2] } : null;
}

// Zones de chaleur : densité des points (noyau gaussien de 7 pi) sur une grille, en 5 paliers de la couleur
// de l'équipe, floutés et coupés au contour de la patinoire.
let nbPatinoires = 0;   // identifiants uniques (plusieurs patinoires par page)
function chaleurPat(points, id, contour) {
  const pas = 25, sigma = 70, nx = PAT_W / pas, ny = PAT_H / pas;
  const couches = ["nous", "adv"].map(cls => {
    const pts = points.filter(p => p.cls === cls).map(p => [p.x / 100 * PAT_W, p.y / 100 * PAT_H]);
    if (!pts.length) return "";
    const d = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const cx = (i + .5) * pas, cy = (j + .5) * pas;
      d.push(pts.reduce((s, [x, y]) => s + Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * sigma * sigma)), 0));
    }
    const max = Math.max(...d);
    const cases = d.map((v, k) => {
      const niv = Math.ceil(5 * v / max - .5);   // 0 à 5 ; sous un dixième du maximum : rien
      return niv > 0 ? `<rect x="${(k % nx) * pas}" y="${Math.floor(k / nx) * pas}" width="${pas}" height="${pas}" fill-opacity="${(niv * .14).toFixed(2)}"/>` : "";
    }).join("");
    return `<g clip-path="url(#${id}-c)"><g filter="url(#${id}-f)" fill="${cls === "nous" ? "#16336B" : "#D7192D"}" shape-rendering="crispEdges">${cases}</g></g>`;
  }).join("");
  return couches && `<defs><clipPath id="${id}-c"><path d="${contour}"/></clipPath>
    <filter id="${id}-f" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="14"/></filter></defs>${couches}`;
}

function patinoire(points = [], aria = "Demi-patinoire, filet en haut", rayon = 27, chaleur = false) {
  const W = PAT_W, H = PAT_H, cx = W / 2, r = 280, gl = 110;   // coins de 28 pi, ligne des buts à 11 pi du fond
  const xb = r - Math.sqrt(r * r - (r - gl) ** 2);             // la ligne des buts rejoint la bande arrondie
  // Cercles de passe libre (ringuette) : ligne bleue au centre, parallèle à la ligne des buts, un point de chaque côté
  const cy = gl + 270, rc = 155, jeu = gl + 430;   // centres à 27 pi de la ligne des buts ; ligne de ringuette à 43 pi
  const cercle = dx => `<circle cx="${cx + dx}" cy="${cy}" r="${rc}" fill="none" stroke="#D7192D" stroke-width="4"/>
    <line x1="${cx + dx - rc}" y1="${cy}" x2="${cx + dx + rc}" y2="${cy}" stroke="#2F64C0" stroke-width="5"/>
    <circle cx="${cx + dx}" cy="${cy - 75}" r="11" fill="#2F64C0"/><circle cx="${cx + dx}" cy="${cy + 75}" r="11" fill="#2F64C0"/>`;
  const contour = `M0 ${H} V${r} A${r} ${r} 0 0 1 ${r} 0 H${W - r} A${r} ${r} 0 0 1 ${W} ${r} V${H} Z`;
  const trait = Math.max(3, Math.round(rayon * .19));   // contour blanc des points, proportionnel à leur taille
  const pts = points.map(p => {
    const x = p.x / 100 * W, y = p.y / 100 * H;
    const fond = p.cls === "nous" ? "#16336B" : "#D7192D";
    return `<g class="pt-pat ${p.cls}"${p.but ? ` data-but="${p.but}"` : ""}>${p.titre ? `<title>${p.titre}</title>` : ""}
      <circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rayon}" fill="${fond}" stroke="#fff" stroke-width="${trait}"/>
      ${p.lab != null ? `<text x="${x.toFixed(0)}" y="${(y + rayon * .37).toFixed(0)}" text-anchor="middle" fill="#fff" font-size="${Math.round(rayon * 1.07)}" font-weight="700" font-family="Barlow, system-ui, sans-serif">${p.lab}</text>` : ""}</g>`;
  }).join("");
  return `<svg class="patinoire" viewBox="-6 -6 ${W + 12} ${H + 12}" role="img" aria-label="${aria}">
    <path d="${contour}" fill="#FBFDFF" stroke="#8A9BB8" stroke-width="8"/>
    ${chaleur ? chaleurPat(points, `pat-${++nbPatinoires}`, contour) : ""}
    <line x1="${xb}" y1="${gl}" x2="${W - xb}" y2="${gl}" stroke="#D7192D" stroke-width="5"/>
    <path d="M${cx - 80} ${gl} A80 80 0 0 0 ${cx + 80} ${gl} Z" fill="#CFE0F5" stroke="#D7192D" stroke-width="4"/>
    <rect x="${cx - 30}" y="${gl - 40}" width="60" height="40" rx="8" fill="#fff" stroke="#D7192D" stroke-width="6"/>
    ${cercle(-230)}${cercle(230)}
    <line x1="0" y1="${jeu}" x2="${W}" y2="${jeu}" stroke="#D7192D" stroke-width="5"/>
    <text x="${cx}" y="${jeu - 12}" text-anchor="middle" fill="#B8475A" font-size="24" font-family="Barlow, system-ui, sans-serif">ligne de ringuette</text>
    <rect x="0" y="${H - 30}" width="${W}" height="30" fill="#2F64C0"/>
    ${pts}
  </svg>`;
}
