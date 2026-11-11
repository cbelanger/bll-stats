"use strict";

const TYPES = {
  P: "Pick / écran", T: "Triangle", L: "Tir de loin", R: "Rebond",
  E: "Échappée", D: "Déviation", FC: "Fille de coin", A: "Autre"
};
const ZONES = [["HG", "HC", "HD"], ["CG", "C", "CD"], ["BG", "BC", "BD"]];
const PERIODES = [["p1", "P1"], ["p2", "P2"], ["p3", "P3"], ["p4", "P4"], ["prol", "Prol."]];

const etat = { matchs: [], saison: null, equipe: "U19AA" };
const $ = (s, r = document) => r.querySelector(s);
const el = $("#contenu");

/* ---------- Utilitaires */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (n, d) => (d ? (100 * n / d).toFixed(1).replace(".", ",") + " %" : "–");
// Sans « % » : rangées « % » des tableaux par période (l'étiquette le dit ; sinon trop large sur téléphone)
const pctN = (n, d) => pct(n, d).replace(" %", "");
// « % » masqué sur téléphone seulement (colonnes « % … » de la liste des matchs)
const pctC = (n, d) => pct(n, d).replace(" %", '<span class="pc">&nbsp;%</span>');
const moy = (n, d, dec = 2) => (d ? (n / d).toFixed(dec).replace(".", ",") : "–");
const dateFr = iso => new Date(iso + "T12:00").toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
const dateHeure = d => d.toLocaleString("fr-CA", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dateCourte =iso => new Date(iso + "T12:00").toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
const resultat = m => (m.buts.nous > m.buts.adv ? "V" : m.buts.nous < m.buts.adv ? "D" : "N");
const cleGardienne = g => (g.numero != null ? "#" + g.numero : g.nom || "?");
const nomGardienne = g => [g.nom, g.numero != null ? "#" + g.numero : ""].filter(Boolean).join(" ") || "Non indiquée";
const svArret = m => (m.tirs.adv ? (m.tirs.adv - m.buts.adv) / m.tirs.adv : null);
// Gardiennes d'un match (extract.py, parts_gardiennes) : une entrée par gardienne qui a joué, avec ses minutes,
// buts accordés, tirs reçus, décision (V, D, N ou null) et blanchissage. Repli pour un ancien matchs.json.
const partsG = m => m.gardiennes || [{ ...m.gardienne, debut: null, minutes: 40, buts: m.buts.adv, tirs: m.tirs.adv,
  decision: resultat(m), blanchissage: m.buts.adv === 0 }];
const nomsGardiennes = m => partsG(m).map(nomGardienne).join(" / ");
// Fiche de match : la gardienne et son % d'arrêts ; s'il y a eu un changement, la part de chacune et la décision
function gardiennesMatch(m) {
  const ps = partsG(m);
  if (ps.length === 1) return `Gardienne : ${esc(nomGardienne(ps[0]))}, ${pct(m.tirs.adv - m.buts.adv, m.tirs.adv)} d’arrêts`;
  const per = x => (/^\d$/.test(x) ? "P" + x : x);
  const dec = { V: "victoire", D: "défaite", N: "nul" };
  return "Gardiennes : " + ps.map(p => `${esc(nomGardienne(p))}${p.debut ? ` (à partir de ${esc(per(p.debut.periode))} ${esc(p.debut.temps)})` : ""} :
    ${p.buts} but${p.buts > 1 ? "s" : ""} accordé${p.buts > 1 ? "s" : ""}${p.tirs != null ? `, ${pct(p.tirs - p.buts, p.tirs)} d’arrêts` : ""}${p.decision ? `, ${dec[p.decision]}` : ""}`).join(" ; ") + ".";
}
// Temps de glace (minutes) en « mm:ss » et moyenne de buts accordés par 40 minutes (un match complet)
const tg = min => { const s = Math.round(min * 60); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const moy40 = (buts, min) => (min ? (buts * 40 / min).toFixed(2).replace(".", ",") : "–");

function filtres() {
  return etat.matchs.filter(m => m.saison === etat.saison && m.equipe === etat.equipe);
}

/* ---------- Composants */
let nbFilets = 0;   // identifiant unique du motif de mailles (plusieurs filets par page)
function filet(valeurs, mode, nous = false) {
  // mode "numeros" : valeurs[zone] = [1, 4] (en bleu pour nos buts) ; mode "chaleur" : valeurs[zone] = nombre
  // Ouverture 6 pi × 4 pi (ratio 1,5), poteaux arrondis, mailles en losange, ligne des buts au sol
  const W = 360, H = 250, x0 = 20, y0 = 18, w = W - 40, h = 214, cw = w / 3, ch = h / 3, yb = y0 + h, r = 14;
  const max = mode === "chaleur" ? Math.max(1, ...Object.values(valeurs)) : 1;
  const id = `mailles-${++nbFilets}`;
  const cadre = (dx, dy) => `M${x0 + dx} ${yb} V${y0 + r + dy} Q${x0 + dx} ${y0 + dy} ${x0 + r + dx} ${y0 + dy} H${x0 + w - r + dx} Q${x0 + w + dx} ${y0 + dy} ${x0 + w + dx} ${y0 + r + dy} V${yb}`;
  let s = `<svg class="filet" viewBox="0 0 ${W} ${H}" role="img" aria-label="Filet vu de face">
    <defs><pattern id="${id}" width="13" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <path class="mailles" d="M0 0H13M0 0V13"/></pattern></defs>
    <line class="ligne-but" x1="0" y1="${yb + 1}" x2="${W}" y2="${yb + 1}"/>
    <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#${id})"/>
    <path class="fond-filet" d="M${x0 + 8} ${yb} C${x0 + 40} ${yb - 26} ${x0 + w - 40} ${yb - 26} ${x0 + w - 8} ${yb}"/>`;
  ZONES.forEach((ligne, r) => ligne.forEach((z, k) => {
    const x = x0 + k * cw, y = y0 + r * ch;
    let fond = "transparent", txt = "", coul = "var(--rouge)", codeCoul = "";
    if (mode === "chaleur") {
      const n = valeurs[z] || 0, niv = n ? Math.min(4, Math.ceil(4 * n / max)) : 0;
      fond = `var(--chaleur-${niv})`; txt = n ? n : ""; coul = niv >= 3 ? "#fff" : "var(--encre)"; if (niv >= 3) codeCoul = ' style="fill:#C9D6EE"';
    } else {
      txt = (valeurs[z] || []).join(", ");
    }
    // data-buts : buts de la zone, pour l'allumer quand on touche un but ailleurs dans la fiche
    const ids = mode === "chaleur" ? "" : (valeurs[z] || []).map(n => `${nous ? "nous" : "adv"}-${n}`).join(" ");
    s += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${fond}" fill-opacity=".85"${ids ? ` data-buts="${ids}"` : ""}/>`;
    s += `<text class="code" x="${x + 10}" y="${y + 20}"${codeCoul}>${z}</text>`;
    if (txt !== "") s += `<text class="val${nous && mode !== "chaleur" ? " nous" : ""}" x="${x + cw / 2}" y="${y + ch / 2 + 6}" fill="${coul}"${String(txt).length > 6 ? ' style="font-size:20px"' : ""}>${txt}</text>`;
  }));
  for (let k = 1; k < 3; k++) {
    s += `<line class="maille" x1="${x0 + k * cw}" y1="${y0}" x2="${x0 + k * cw}" y2="${y0 + h}"/>`;
    s += `<line class="maille" x1="${x0}" y1="${y0 + k * ch}" x2="${x0 + w}" y2="${y0 + k * ch}"/>`;
  }
  // Poteaux et barre horizontale : ombre, tube rouge, reflet
  s += `<path class="cadre-ombre" d="${cadre(1.5, 1.5)}"/><path class="cadre" d="${cadre(0, 0)}"/><path class="cadre-reflet" d="${cadre(-2, -2)}"/></svg>`;
  if (mode === "chaleur") {
    s += `<div class="legende-chaleur">moins ${[0, 1, 2, 3, 4].map(i => `<i style="background:var(--chaleur-${i})"></i>`).join("")} plus</div>`;
  }
  return s;
}

// nous = nos buts (barres bleues) ; sinon buts accordés (barres rouges)
function barresTypes(compte, total, nous = false) {
  const lignes = Object.keys(TYPES).filter(c => compte[c]).sort((a, b) => compte[b] - compte[a]);
  if (!lignes.length) return `<p class="vide">${nous ? "Aucun de nos buts n’a de type de jeu noté." : "Aucun but accordé détaillé."}</p>`;
  return `<div class="barres">${lignes.map(c => `
    <div class="barre-l"><span><span class="code-t">${c}</span>${TYPES[c]}</span>
      <div class="piste"><div class="rempli${nous ? "" : " r"}" style="width:${100 * compte[c] / total}%"></div></div>
      <b>${compte[c]}</b></div>`).join("")}</div>`;
}

function tendance(points) {
  // points : [{date, v (0-1), m (le match), tirs, buts (de cette gardienne)}] ; survol ou toucher = valeurs du match
  if (points.length < 2) return "";
  const W = 640, H = 130, px = 38, py = 14;
  const vals = points.map(p => p.v), lo = Math.max(0, Math.min(.85, ...vals) - .03), hi = 1;
  const X = i => px + i * (W - px - 8) / (points.length - 1);
  const Y = v => py + (hi - v) / (hi - lo) * (H - 2 * py);
  const d = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(" ");
  const ref = .9;
  const lg = (W - px) / points.length;
  return `<div class="prog"><svg class="tendance progression" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pourcentage d’arrêts match après match">
    <line class="ref" x1="${px}" x2="${W}" y1="${Y(ref)}" y2="${Y(ref)}"/>
    <text x="0" y="${Y(ref) + 4}">90 %</text>
    <path class="ligne" d="${d}"/>
    ${points.map((p, i) => `<circle class="pt" cx="${X(i)}" cy="${Y(p.v)}" r="5"/>`).join("")}
    ${points.map((p, i) => `<rect class="survol" x="${Math.max(0, X(i) - lg / 2)}" y="0" width="${lg}" height="${H}" data-match="${esc(p.m.id)}"
      data-titre="${esc(`${dateCourte(p.date)} · ${p.m.adversaire} (${p.m.buts.nous}–${p.m.buts.adv})`)}"
      data-vals="${esc(`${pct(p.tirs - p.buts, p.tirs)} d’arrêts (${p.buts} buts sur ${p.tirs} tirs)`)}"/>`).join("")}
  </svg><p class="prog-info" aria-live="polite">Survoler ou toucher un match pour voir ses valeurs.</p></div>`;
}

// Progression match après match (onglet Équipe). series : [{lab, cls ("nous" | "adv"), val: m => nombre | null}].
// Un match sans valeur coupe la ligne ; survol d'une colonne = valeurs du match.
// nom : ce que montre le graphique, pour la ligne d'info (« Tirs cadrés : 13–37 ») ; vide = rien de plus que le score
function progression(ms, series, unite = "", nom = "") {
  if (!series.some(se => ms.filter(m => se.val(m) != null).length >= 2))
    return `<p class="vide">Pas encore assez de matchs avec cette donnée (il en faut au moins 2).</p>`;
  // Largeur réelle de l'écran : le texte garde sa taille sur téléphone (redessiné si la fenêtre change)
  // dx : marge de droite pour les étiquettes au bout des lignes (« BLL U19AA »)
  const W = Math.max(320, Math.min(1000, el.clientWidth - 70)), H = 200, gx = 38, hy = 14, by = H - 30;
  const dx = 16 + 7 * Math.max(...series.map(se => se.lab.length));
  const vals = series.flatMap(s => ms.map(s.val)).filter(v => v != null);
  const pas = unite === "%" ? 25 : [1, 2, 5, 10, 20].find(p => Math.max(...vals) / p <= 5) || 50;
  const hi = unite === "%" ? 100 : Math.max(pas, Math.ceil(Math.max(...vals) / pas) * pas);
  const X = i => gx + 8 + i * (W - gx - 8 - dx) / (ms.length - 1), Y = v => by - v / hi * (by - hy);
  const fmt = v => v == null ? "–" : `${unite === "%" ? Math.round(v) : v}${unite === "%" ? " %" : ""}`;
  const chaque = Math.ceil(ms.length / Math.floor((W - gx - dx) / 55)), etiq = [];   // dates espacées d'au moins 55 px
  let s = `<svg class="progression" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map(x => x.lab).join(" et "))}, match après match">`;
  for (let v = 0; v <= hi; v += pas) s += `<line class="grille-l" x1="${gx}" x2="${W - dx + 8}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axe" x="${gx - 6}" y="${Y(v) + 4}" text-anchor="end">${v}${unite === "%" ? " %" : ""}</text>`;
  ms.forEach((m, i) => { if (i % chaque === 0 || i === ms.length - 1) s += `<text class="axe" x="${X(i)}" y="${H - 10}" text-anchor="middle">${dateCourte(m.date)}</text>`; });
  for (const se of series) {
    // segments continus entre matchs qui ont une valeur
    const d = ms.map((m, i) => [i, se.val(m)]).reduce((a, [i, v], k, arr) =>
      v == null ? a : a + `${k && arr[k - 1][1] != null ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)} `, "");
    s += `<path class="ligne ${se.cls}" d="${d}"/>`;
    ms.forEach((m, i) => { const v = se.val(m); if (v != null) s += `<circle class="pt ${se.cls}" cx="${X(i)}" cy="${Y(v)}" r="4.5"/>`; });
    const dern = ms.length - 1 - [...ms].reverse().findIndex(m => se.val(m) != null);
    if (dern < ms.length) etiq.push({ x: X(dern) + 9, y: Y(se.val(ms[dern])) + 4, lab: se.lab });
  }
  // étiquettes au bout des lignes, écartées si elles se chevauchent
  etiq.sort((a, b) => a.y - b.y).forEach((e, k) => { if (k && e.y - etiq[k - 1].y < 13) e.y = etiq[k - 1].y + 13; });
  etiq.forEach(e => { s += `<text class="etiq" x="${e.x}" y="${e.y}">${esc(e.lab)}</text>`; });
  // Zones de survol (plus larges que les points) : survol à la souris ou toucher sur téléphone = valeurs du match
  // dans la ligne d'info sous le graphique (infoProgression() ; une info-bulle <title> n'existe pas au toucher)
  const lg = (W - gx - dx) / ms.length;
  ms.forEach((m, i) => { s += `<rect class="survol" x="${X(i) - lg / 2}" y="${hy}" width="${lg}" height="${by - hy}" data-i="${i}"
    data-match="${esc(m.id)}" data-titre="${esc(`${dateCourte(m.date)} · ${m.adversaire} (${m.buts.nous}–${m.buts.adv})`)}"
    data-vals="${esc(nom ? `${nom} : ${series.map(se => fmt(se.val(m))).join("–")}` : "")}"/>`; });
  // Valeurs à côté des points, cachées : affichées pour le match touché (la plus haute au-dessus de son point,
  // l'autre en dessous si les deux points sont proches)
  ms.forEach((m, i) => {
    const pts = series.map(se => ({ se, v: se.val(m) })).filter(p => p.v != null).map(p => ({ ...p, y: Y(p.v) })).sort((a, b) => a.y - b.y);
    pts.forEach((p, k) => {
      const dessous = k > 0 && p.y - pts[k - 1].y < 22;
      s += `<text class="val-pt v-${p.se.cls}" data-i="${i}" x="${X(i)}" y="${(dessous ? p.y + 19 : p.y - 10).toFixed(1)}" text-anchor="middle">${fmt(p.v)}</text>`;
    });
  });
  return `<div class="prog">${s}</svg><p class="prog-info" aria-live="polite">Survoler ou toucher un match pour voir ses valeurs.</p></div>`
    + (series.length > 1 ? `<div class="legende-l">${series.map(se => `<span><i class="${se.cls}"></i>${esc(se.lab)}</span>`).join("")}</div>` : "");
}
// Tableau triable (gardiennes) : un clic sur un en-tête trie les lignes du corps selon data-v de la colonne
// (nombres : du plus grand au plus petit d'abord ; texte : alphabétique) ; un 2e clic inverse. Le pied (Équipe) ne bouge pas.
function trierTableau(th) {
  const table = th.closest("table"), i = th.cellIndex, corps = table.tBodies[0];
  const lignes = [...corps.rows], val = r => r.cells[i]?.dataset.v ?? "";
  const nombres = lignes.every(r => val(r) === "" || !isNaN(Number(val(r))));
  const avant = th.getAttribute("aria-sort");
  const sens = avant === "none" ? (nombres ? "descending" : "ascending") : avant === "descending" ? "ascending" : "descending";
  table.querySelectorAll("thead th").forEach(x => x.setAttribute("aria-sort", "none"));
  th.setAttribute("aria-sort", sens);
  const k = sens === "ascending" ? 1 : -1;
  lignes.sort((a, b) => {
    const x = val(a), y = val(b);
    if (x === "" || y === "") return (x === "") - (y === "");   // valeur inconnue toujours à la fin
    return k * (nombres ? Number(x) - Number(y) : x.localeCompare(y, "fr"));
  }).forEach(r => corps.append(r));
}
function infoProgression(r) {
  const p = r.closest(".prog");
  p.querySelectorAll(".survol.actif").forEach(x => x.classList.remove("actif"));
  r.classList.add("actif");
  p.querySelectorAll(".val-pt").forEach(t => t.classList.toggle("on", t.dataset.i === r.dataset.i));
  p.querySelector(".prog-info").innerHTML = `<b>${esc(r.dataset.titre)}</b> ${esc(r.dataset.vals)}
    <a href="#/match/${encodeURIComponent(r.dataset.match)}">Voir le match →</a>`;
}

// cle : "buts_accordes" (buts contre) ou "buts_marques" (nos buts, zone = filet adverse)
function agregerButs(matchs, cle = "buts_accordes") {
  const zones = {}, types = {};
  let n = 0;
  matchs.forEach(m => (m[cle] || []).forEach(b => {
    if (b.zone) zones[b.zone] = (zones[b.zone] || 0) + 1;
    if (b.type) types[b.type] = (types[b.type] || 0) + 1;
    n++;
  }));
  return { zones, types, n };
}

// D'où partent les buts (saisie téléphone) : points sur la demi-patinoire, filet en haut, vue de la tireuse.
// cle : "buts_accordes" (rouge) ou "buts_marques" (bleu) ; un seul match : numéros des buts, liés au Sommaire.
function ptsLieux(ms, cle, unMatch = false) {
  const cls = cle === "buts_marques" ? "nous" : "adv";
  return ms.flatMap(m => (m[cle] || []).filter(b => b.lieu).map(b => ({
    x: b.lieu[0], y: b.lieu[1], cls,
    lab: unMatch ? b.no : null, but: unMatch ? `${cls}-${b.no}` : null,
    titre: esc(`${unMatch ? "" : `${dateCourte(m.date)}, ${m.adversaire} : `}${cls === "nous" ? "but BLL" : "but accordé"} ${b.no}${b.periode ? `, P${b.periode}` : ""}${b.temps ? ` ${b.temps}` : ""}${b.type ? ` (${TYPES[b.type] || b.type})` : ""}`),
  })));
}
function carteButs(ms, cle, vide) {
  const pts = ptsLieux(ms, cle);
  const n = ms.reduce((s, m) => s + (m[cle] || []).length, 0);
  // Plusieurs matchs : petits points sans numéro et zones de chaleur (plus foncé = plus de buts)
  return pts.length ? `${patinoire(pts, undefined, 11, true)}<p class="sous" style="font-size:.85rem">${pts.length} but${pts.length > 1 ? "s" : ""} placé${pts.length > 1 ? "s" : ""} sur ${n}. Filet en haut, vu de la tireuse ; plus la zone est foncée, plus il en part de buts.</p>`
    : `<p class="vide">${vide}</p>`;
}
const aLieux = (ms, cle) => ms.some(m => (m[cle] || []).some(b => b.lieu));

// Situation au moment du but, du point de vue du BLL (EG égalité, AN avantage, DN désavantage numérique,
// 5v3 / 3v5 double avantage / désavantage)
const SITS = [["EG", "À égalité"], ["AN", "BLL en avantage numérique"], ["5v3", "BLL à 5 contre 3"],
  ["DN", "BLL en désavantage numérique"], ["3v5", "BLL à 3 contre 5"]];
const nomSit = k => (SITS.find(s => s[0] === k) || [k, k])[1];
const aSits = ms => ms.some(m => [...m.buts_accordes, ...(m.buts_marques || [])].some(b => b.sit));
function situations(ms) {
  const compte = (cle, s) => ms.reduce((t, m) => t + (m[cle] || []).filter(b => b.sit === s).length, 0);
  const lignes = SITS.map(([k, l]) => ({ l, pour: compte("buts_marques", k), contre: compte("buts_accordes", k) }));
  const pour = lignes.reduce((s, x) => s + x.pour, 0), contre = lignes.reduce((s, x) => s + x.contre, 0);
  const bp = ms.reduce((s, m) => s + m.buts.nous, 0), bc = ms.reduce((s, m) => s + m.buts.adv, 0);
  return `<table><thead><tr><th>Situation</th><th class="n">BLL</th><th class="n">Contre</th></tr></thead>
    <tbody>${lignes.map(x => `<tr><td class="txt">${x.l}</td><td class="n">${x.pour}</td><td class="n">${x.contre}</td></tr>`).join("")}</tbody></table>
    <p class="sous" style="font-size:.85rem">Situation notée pour ${pour} de nos ${bp} buts et ${contre} des ${bc} buts accordés.
      « Contre » en désavantage numérique : buts accordés pendant une punition au BLL.</p>`;
}

/* ---------- Vues */
function vueMatchs() {
  // Du plus vieux au plus récent
  const ms = filtres().sort((a, b) => (a.date + (a.heure_debut || "")).localeCompare(b.date + (b.heure_debut || "")));
  if (!ms.length) return `<h1>Matchs ${etat.equipe}</h1><p class="vide">Aucun match ${etat.equipe} pour la saison ${etat.saison}.</p>`;
  // Dernier match en vedette : score et quelques faits saillants, un clic ouvre sa fiche
  const der = ms[ms.length - 1], faits = faitsSaillants(der, true).slice(0, 3);
  return `<h1>Matchs ${etat.equipe}</h1><p class="sous">Saison ${etat.saison}, ${ms.length} match${ms.length > 1 ? "s" : ""}</p>
  <a class="panneau vedette faits" href="#/match/${encodeURIComponent(der.id)}">
    <span class="ved-tag">Dernier match · ${dateFr(der.date)}</span>
    <span class="ved-score"><span class="eq">BLL ${esc(der.equipe)}</span><b>${der.buts.nous}–${der.buts.adv}</b><span class="eq">${esc(der.adversaire)}</span>
      <span class="res ${resultat(der)}">${resultat(der)}</span></span>
    ${faits.length ? `<ul>${faits.map(t => `<li>${t}</li>`).join("")}</ul>` : ""}
    <span class="ved-lien">Voir le match →</span>
  </a>
  <div class="panneau defile" style="margin-top:1rem"><table class="liste-matchs">
    <thead><tr><th class="opt">No</th><th>Date</th><th>Adversaire</th><th>Rés.</th><th class="n">Score</th><th class="n opt">Tirs</th><th class="opt">Gardienne</th><th class="n" title="Sorties de zone réussies">% sorties</th><th class="n">% arrêts</th></tr></thead>
    <tbody>${ms.map(m => `
      <tr class="lien" tabindex="0" data-id="${esc(m.id)}">
        <td class="opt">${esc(m.no_match || "–")}</td><td>${dateCourte(m.date)}</td><td class="txt">${esc(m.adversaire)}</td>
        <td><span class="res ${resultat(m)}">${resultat(m)}</span></td>
        <td class="n">${m.buts.nous}–${m.buts.adv}</td>
        <td class="n opt">${m.tirs.nous == null && m.tirs.adv == null ? "–" : `${m.tirs.nous ?? "?"}–${m.tirs.adv ?? "?"}`}</td>
        <td class="opt">${esc(nomsGardiennes(m))}</td>
        <td class="n">${pctC(m.sorties_zone.reussies, m.sorties_zone.tentatives)}</td>
        <td class="n">${svArret(m) == null ? "–" : pctC(m.tirs.adv - m.buts.adv, m.tirs.adv)}</td>
      </tr>`).join("")}</tbody></table></div>`;
}

// Index dans PERIODES (0 à 4, -1 si inconnue) et temps au chrono en secondes
const idxP = p => { const v = String(p ?? "").trim().toLowerCase().replace(/^p/, "").replace(/\.$/, "");
  return v.startsWith("rol") || v.startsWith("prol") ? 4 : ["1", "2", "3", "4"].indexOf(v); };
const sec = t => { const x = /^(\d+):(\d{2})$/.exec(t || ""); return x ? 60 * x[1] + Number(x[2]) : null; };

// Buts des deux équipes dans l'ordre du match : période, puis temps décroissant (le chrono descend).
// Score après chaque but seulement si tous les buts ont leur période et leur temps (sinon l'ordre est incertain).
function deroulement(m) {
  const adv = m.buts_accordes.map(b => ({ eq: "adv", ...b }));
  let nous = (m.buts_marques || []).map(b => ({ eq: "nous", ...b }));
  if (!nous.length && m.buts_par_periode?.nous)   // vieux matchs : seulement le nombre de buts par période
    nous = PERIODES.flatMap(([k], i) => Array.from({ length: m.buts_par_periode.nous[k] || 0 }, () => ({ eq: "nous", periode: String(i + 1), temps: null })));
  const tous = [...adv, ...nous].map(b => ({ ...b, i: idxP(b.periode), s: sec(b.temps) }));
  if (!tous.length) return m.buts.nous + m.buts.adv ? `<p class="vide">Détail des buts non disponible.</p>` : `<p class="vide">Aucun but.</p>`;
  tous.sort((a, b) => ((a.i < 0 ? 9 : a.i) - (b.i < 0 ? 9 : b.i)) || ((b.s ?? -1) - (a.s ?? -1)));
  const complet = adv.length === m.buts.adv && nous.length === m.buts.nous && tous.every(b => b.i >= 0 && b.s != null);
  const sc = { nous: 0, adv: 0 };
  const lignes = tous.map(b => {
    sc[b.eq]++;
    return `<tr class="${b.eq === "nous" ? "but-nous" : "but-adv"}"${b.no != null ? ` data-but="${b.eq}-${b.no}"` : ""}>
      <td>${b.i >= 0 ? PERIODES[b.i][1] : "?"}</td><td>${esc(b.temps || "–")}</td>
      <td class="txt equipe">${b.eq === "nous" ? `BLL ${esc(m.equipe)}` : esc(m.adversaire)}${b.sit && b.sit !== "EG" ? ` <span class="sit" title="${nomSit(b.sit)}">${b.sit}</span>` : ""}</td>
      <td class="txt">${b.type ? `<span class="code-t">${b.type}</span><span class="opt">${TYPES[b.type] || ""}</span>` : "–"}</td>
      <td>${esc(b.zone || "")}</td>${complet ? `<td class="n score-c">${sc.nous}–${sc.adv}</td>` : ""}</tr>`;
  }).join("");
  const manque = m.buts.nous + m.buts.adv - tous.length;
  return `<div class="defile"><table class="deroulement">
    <thead><tr><th>Pér.</th><th>Temps</th><th>But</th><th>Type de jeu</th><th>Zone</th>${complet ? `<th class="n">Score</th>` : ""}</tr></thead>
    <tbody>${lignes}</tbody></table></div>
    ${tous.some(b => b.sit && b.sit !== "EG") ? `<p class="sous" style="font-size:.85rem">${SITS.filter(([k]) => k !== "EG" && tous.some(b => b.sit === k)).map(([k, l]) => `${k} : ${l}`).join(" ; ")}.</p>` : ""}
    ${complet ? "" : `<p class="sous" style="font-size:.85rem">${manque > 0 ? `${manque} but${manque > 1 ? "s" : ""} sans détail. ` : ""}Ordre approximatif : période ou temps manquant pour certains buts.</p>`}`;
}

// Déroulement du match : une bande par période, nos buts au-dessus (bleu), ceux de l'adversaire en dessous (rouge).
// Seuls les buts avec période et temps sont placés ; score à la fin de chaque période si tous le sont.
const DUREE_P = 600;   // périodes de 10 minutes
function ligneTemps(m) {
  const buts = [...m.buts_accordes.map(b => ({ eq: "adv", ...b })), ...(m.buts_marques || []).map(b => ({ eq: "nous", ...b }))]
    .map(b => ({ ...b, i: idxP(b.periode), s: sec(b.temps) })).filter(b => b.i >= 0 && b.s != null);
  if (!buts.length) return "";
  const duree = Math.max(DUREE_P, ...buts.map(b => b.s));
  const complet = buts.length === m.buts.nous + m.buts.adv;
  const prol = buts.some(b => b.i === 4) || [m.tirs_par_periode?.nous, m.tirs_par_periode?.adv].some(o => o && o.prol != null);
  buts.sort((a, b) => a.i - b.i || b.s - a.s);
  const sc = { nous: 0, adv: 0 };
  buts.forEach(b => { sc[b.eq]++; b.score = `${sc.nous}–${sc.adv}`; b.x = (duree - b.s) / duree; });
  // Buts rapprochés de la même équipe : empilés vers l'extérieur
  let voies = 1;
  const bandes = PERIODES.slice(0, prol ? 5 : 4).map(([, lab], i) => {
    const bp = buts.filter(b => b.i === i);
    ["nous", "adv"].forEach(eq => {
      const fins = [];
      bp.filter(b => b.eq === eq).forEach(b => {
        let v = fins.findIndex(x => b.x - x >= 0.15);
        if (v < 0) v = fins.length;
        fins[v] = b.x; b.v = v; voies = Math.max(voies, v + 1);
      });
    });
    const fin = buts.filter(b => b.i <= i);
    const score = complet ? `${fin.filter(b => b.eq === "nous").length}–${fin.filter(b => b.eq === "adv").length}` : "";
    return `<div class="lt-per"><div class="lt-piste">${bp.map(b => `<button type="button" class="lt-but ${b.eq}" data-but="${b.eq}-${b.no}" style="left:calc(8px + (100% - 16px) * ${b.x.toFixed(3)});--v:${b.v}"
      title="${lab} ${esc(b.temps)} – ${b.eq === "nous" ? `BLL ${esc(m.equipe)}` : esc(m.adversaire)}${b.type ? ` (${esc(TYPES[b.type] || b.type)})` : ""}${complet ? `, ${b.score}` : ""}"></button>`).join("")}</div>
      <div class="lt-lab"><span>${lab}</span>${score ? `<b>${score}</b>` : ""}</div></div>`;
  }).join("");
  const manque = m.buts.nous + m.buts.adv - buts.length;
  return `<section class="panneau" style="margin-top:1rem">
    <h3>Déroulement du match</h3>
    <div class="legende-l" style="margin:0 0 .6rem"><span><i class="pt nous"></i>BLL ${esc(m.equipe)}</span><span><i class="pt adv"></i>${esc(m.adversaire)}</span></div>
    <div class="ligne-temps" style="--voies:${voies}">${bandes}</div>
    ${complet ? `<p class="sous" style="font-size:.85rem;margin-top:.4rem">Score à la fin de chaque période.</p>`
      : `<p class="sous" style="font-size:.85rem;margin-top:.4rem">${manque} but${manque > 1 ? "s" : ""} sans période ou sans temps, non placé${manque > 1 ? "s" : ""}.</p>`}
  </section>`;
}

// Faits saillants : quelques phrases neutres tirées des données (retournement, séries de buts, but gagnant,
// période décisive, gardienne, tirs, records de la saison). Les records exigent au moins 3 matchs comparables.
function faitsSaillants(m, liste = false) {
  const saison = etat.matchs.filter(x => x.saison === m.saison && x.equipe === m.equipe);
  const nomEq = eq => (eq === "nous" ? `BLL ${esc(m.equipe)}` : esc(m.adversaire));
  const ord = i => (i === 4 ? "la prolongation" : `la ${i + 1}<sup>${i ? "e" : "re"}</sup> période`);
  const duree = s => [Math.floor(s / 60) ? `${Math.floor(s / 60)} min` : "", s % 60 ? `${s % 60} s` : ""].filter(Boolean).join(" ");
  const record = (val, liste) => liste.length >= 3 && val(m) != null && liste.every(x => x === m || val(x) == null || val(x) < val(m));
  const f = [];
  const buts = [...m.buts_accordes.map(b => ({ eq: "adv", ...b })), ...(m.buts_marques || []).map(b => ({ eq: "nous", ...b }))]
    .map(b => ({ ...b, i: idxP(b.periode), s: sec(b.temps) })).filter(b => b.i >= 0 && b.s != null)
    .sort((a, b) => a.i - b.i || b.s - a.s);
  const r = resultat(m);
  if (buts.length && buts.length === m.buts.nous + m.buts.adv) {
    const sc = { nous: 0, adv: 0 };
    let pire = 0, meilleur = 0;
    buts.forEach(b => {
      b.avant = `${sc.nous}–${sc.adv}`; sc[b.eq]++; b.apres = `${sc.nous}–${sc.adv}`;
      b.t = b.i * DUREE_P + (DUREE_P - b.s);   // temps écoulé dans le match
      pire = Math.min(pire, sc.nous - sc.adv); meilleur = Math.max(meilleur, sc.nous - sc.adv);
    });
    if (pire <= -2 && r !== "D") f.push(`BLL ${esc(m.equipe)} efface un retard de ${-pire} buts et ${r === "V" ? "gagne" : "obtient la nulle"}.`);
    if (meilleur >= 2 && r !== "V") f.push(`${nomEq("adv")} efface une avance de ${meilleur} buts de BLL ${esc(m.equipe)}.`);
    if (r === "V") {
      const gb = buts.filter(b => b.eq === "nous")[m.buts.adv];
      f.push(`But gagnant à ${esc(gb.temps)} dans ${ord(gb.i)}${gb.type ? ` (${esc(TYPES[gb.type] || gb.type)})` : ""}.`);
    }
    // Plus longue série de buts d'une même équipe (sauf si elle a marqué tous les buts du match)
    let serie = null;
    for (let a = 0; a < buts.length;) {
      let z = a; while (z + 1 < buts.length && buts[z + 1].eq === buts[a].eq) z++;
      if (!serie || z - a > serie.n - 1) serie = { eq: buts[a].eq, n: z - a + 1, de: buts[a].avant, a: buts[z].apres };
      a = z + 1;
    }
    if (serie.n >= 3 && serie.n < buts.length) f.push(`${serie.n} buts de suite pour ${nomEq(serie.eq)}, de ${serie.de} à ${serie.a}.`);
    // Rafale : au moins 3 buts d'une même équipe en 5 minutes de jeu ou moins
    ["nous", "adv"].forEach(eq => {
      const t = buts.filter(b => b.eq === eq);
      let best = null;
      for (let a = 0; a < t.length; a++) for (let z = a + 2; z < t.length && t[z].t - t[a].t <= 300; z++)
        if (!best || z - a + 1 > best.n || (z - a + 1 === best.n && t[z].t - t[a].t < best.duree)) best = { n: z - a + 1, duree: t[z].t - t[a].t, i: t[a].i, j: t[z].i };
      if (best) f.push(`${best.n} buts de ${nomEq(eq)} en ${duree(best.duree)}${best.i === best.j ? ` dans ${ord(best.i)}` : ""}.`);
    });
  }
  // Période décisive : écart de 3 buts ou plus dans une période
  const bp = m.buts_par_periode;
  if (bp?.nous && bp?.adv) PERIODES.forEach(([k], i) => {
    const n = bp.nous[k] ?? 0, a = bp.adv[k] ?? 0;
    if (Math.abs(n - a) >= 3) f.push(`${nomEq(n > a ? "nous" : "adv")} remporte ${ord(i)} ${Math.max(n, a)}–${Math.min(n, a)}.`);
  });
  const g = m.gardienne?.nom ? esc(m.gardienne.nom) : "La gardienne";
  if (partsG(m).length > 1) f.push(`Changement de gardienne : ${partsG(m).map(p => esc(p.nom || "?")).join(", puis ")}.`);
  else if (m.tirs.adv) {
    const rec = record(x => svArret(x), saison.filter(x => x.tirs.adv));
    f.push(m.buts.adv === 0 ? `Blanchissage pour ${g} : ${m.tirs.adv} arrêts.`
      : `${g} arrête ${m.tirs.adv - m.buts.adv} des ${m.tirs.adv} tirs (${pct(m.tirs.adv - m.buts.adv, m.tirs.adv)})${rec ? " : meilleur % d’arrêts de la saison" : ""}.`);
  }
  if (m.tirs.nous != null && m.tirs.adv != null) {
    const [hi, lo, eq] = m.tirs.nous >= m.tirs.adv ? [m.tirs.nous, m.tirs.adv, "nous"] : [m.tirs.adv, m.tirs.nous, "adv"];
    if (hi - lo >= 10 || (lo && hi >= 2 * lo)) f.push(`${nomEq(eq)} domine aux tirs cadrés, ${hi} à ${lo}.`);
    if (record(x => x.tirs.nous, saison.filter(x => x.tirs.nous != null))) f.push(`${m.tirs.nous} tirs cadrés : sommet de la saison pour BLL ${esc(m.equipe)}.`);
  }
  const sz = m.sorties_zone;
  if (sz.tentatives && record(x => x.sorties_zone.tentatives ? x.sorties_zone.reussies / x.sorties_zone.tentatives : null, saison.filter(x => x.sorties_zone.tentatives)))
    f.push(`Meilleur taux de sorties de zone de la saison : ${pct(sz.reussies, sz.tentatives)} (${sz.reussies} sur ${sz.tentatives}).`);
  if (liste) return f;   // carte du dernier match (liste des matchs)
  if (!f.length) return "";
  return `<section class="panneau faits" style="margin-top:1rem"><h3>Faits saillants</h3>
    <ul>${f.slice(0, 6).map(t => `<li>${t}</li>`).join("")}</ul></section>`;
}

function vueMatch(id) {
  const m = etat.matchs.find(x => x.id === id);
  if (!m) return `<a class="retour" href="#/matchs">← Matchs</a><p class="vide">Ce match n’existe pas ou n’a pas encore été publié.</p>`;
  const nums = {}, numsN = {};
  m.buts_accordes.forEach(b => { if (b.zone) (nums[b.zone] = nums[b.zone] || []).push(b.no); });
  (m.buts_marques || []).forEach(b => { if (b.zone) (numsN[b.zone] = numsN[b.zone] || []).push(b.no); });
  const tp = m.tirs_par_periode;
  const ligneP = (lab, o, tot) => `<div class="l">${lab}</div>${PERIODES.map(([k]) => `<div>${o ? o[k] ?? "–" : "–"}</div>`).join("")}<div class="tot">${tot ?? "–"}</div>`;
  const sz = m.sorties_zone, szp = sz.par_periode;
  const pctP = k => szp && szp.tentatives[k] ? pctN(szp.reussies[k], szp.tentatives[k]) : "–";
  return `<a class="retour" href="#/matchs">← Matchs</a>
  <h1>${esc(m.equipe)} contre ${esc(m.adversaire)}</h1>
  <p class="sous">${dateFr(m.date)}${m.heure_debut ? `, ${m.heure_debut}${m.heure_fin ? "–" + m.heure_fin : ""}` : ""}${m.no_match ? `, match no ${esc(m.no_match)}` : ""}</p>
  <div class="score">
    <div class="eq">BLL ${esc(m.equipe)}<small>${m.tirs.nous ?? "–"} tirs cadrés</small></div>
    <div class="pts">${m.buts.nous}–${m.buts.adv}</div>
    <div class="eq droite">${esc(m.adversaire)}<small>${m.tirs.adv ?? "–"} tirs cadrés</small></div>
  </div>
  ${faitsSaillants(m)}
  ${ligneTemps(m)}

  <div class="grille g2" style="margin-top:1rem">
    <section class="panneau">
      <h3>Sommaire</h3>
      ${deroulement(m)}
    </section>
    <section class="panneau">
      <h3>Par période</h3>
      <div class="periodes">
        <div></div>${PERIODES.map(([, l]) => `<div class="t">${l}</div>`).join("")}<div class="t">Total</div>
        <div class="sec">Buts</div>
        ${ligneP("BLL", m.buts_par_periode?.nous, m.buts.nous)}${ligneP("Adv.", m.buts_par_periode?.adv, m.buts.adv)}
        <div class="sec">Tirs cadrés</div>
        ${ligneP("BLL", tp.nous, m.tirs.nous)}${ligneP("Adv.", tp.adv, m.tirs.adv)}
      </div>
      ${m.buts_par_periode?.nous && m.buts_par_periode?.adv && tp.nous && tp.adv ? "" : `<p class="sous" style="font-size:.85rem">– : donnée non disponible pour ce match.</p>`}
    </section>
  </div>

  <div class="grille g2" style="margin-top:1rem">
    <section class="panneau">
      <h3>Buts accordés</h3>
      <p class="sous" style="margin-bottom:.75rem">${gardiennesMatch(m)}</p>
      ${filet(nums, "numeros")}
    </section>
    <section class="panneau">
      <h3>Où entrent nos buts</h3>
      ${Object.keys(numsN).length ? `<p class="sous" style="margin-bottom:.75rem">Numéros des buts BLL dans le filet adverse</p>${filet(numsN, "numeros", true)}`
        : `<p class="vide">${m.buts.nous ? "Zone non notée pour nos buts." : "Aucun but marqué."}</p>`}
    </section>
  </div>
  ${aLieux([m], "buts_marques") || aLieux([m], "buts_accordes") ? `<section class="panneau carte-m" style="margin-top:1rem">
    <h3>D’où partent les buts</h3>
    <div class="legende-l" style="margin:0 0 .6rem"><span><i class="pt nous"></i>BLL ${esc(m.equipe)} (dans leur zone)</span><span><i class="pt adv"></i>${esc(m.adversaire)} (dans notre zone)</span></div>
    ${patinoire([...ptsLieux([m], "buts_marques", true), ...ptsLieux([m], "buts_accordes", true)], undefined, 21)}
    <p class="sous" style="font-size:.85rem">Filet en haut, vu de la tireuse ; numéros des buts. Toucher un point allume sa ligne dans le Sommaire et sa zone dans le filet.</p>
  </section>` : ""}

  <div class="grille g2" style="margin-top:1rem">
    <section class="panneau">
      <h3>Sorties de zone</h3>
      <div class="chiffres">
        <div class="chiffre"><b>${sz.reussies ?? "–"}</b><span>réussies</span></div>
        <div class="chiffre"><b>${sz.tentatives ?? "–"}</b><span>tentatives</span></div>
        <div class="chiffre accent"><b>${pct(sz.reussies, sz.tentatives)}</b><span>taux de réussite</span></div>
      </div>
      ${szp ? `<div class="periodes" style="margin-top:1rem">
        <div></div>${PERIODES.map(([, l]) => `<div class="t">${l}</div>`).join("")}<div class="t">Total</div>
        ${ligneP("Réussies", szp.reussies, sz.reussies)}${ligneP("Tentées", szp.tentatives, sz.tentatives)}
        <div class="l">%</div>${PERIODES.map(([k]) => `<div>${pctP(k)}</div>`).join("")}<div class="tot">${pctN(sz.reussies, sz.tentatives)}</div>
      </div>` : sz.tentatives ? `<p class="sous" style="font-size:.85rem">Détail par période non disponible pour ce match.</p>` : ""}
    </section>
    ${m.notes ? `<section class="panneau"><h3>Observations et notes</h3><p class="notes">${esc(m.notes)}</p></section>` : ""}
  </div>`;
}

function vueGardiennes() {
  const ms = filtres();
  if (!ms.length) return `<h1>Gardiennes ${etat.equipe}</h1><p class="vide">Aucun match ${etat.equipe} pour la saison ${etat.saison}.</p>`;
  // Une « apparition » par gardienne et par match : copie du match réduite à sa part (buts accordés pendant
  // qu'elle était dans le filet, tirs reçus) ; _p = sa part (minutes, décision, blanchissage), _complet = seule du match
  const groupes = {};
  ms.forEach(m => partsG(m).forEach((p, i) => {
    const k = cleGardienne(p);
    (groupes[k] = groupes[k] || { g: p, ms: [] }).ms.push({ ...m, _p: p, _complet: partsG(m).length === 1,
      buts: { ...m.buts, adv: p.buts }, tirs: { ...m.tirs, adv: p.tirs },
      buts_accordes: m.buts_accordes.filter(b => (b.gardienne ?? 0) === i) });
  }));
  const tries = Object.entries(groupes).sort(([, a], [, b]) => b.ms.length - a.ms.length);
  // Ligne Équipe : par match (décision du match, blanchissage d'équipe, minutes de toutes les gardiennes)
  const equipe = ms.map(m => ({ ...m, _p: { decision: resultat(m), blanchissage: m.buts.adv === 0,
    minutes: partsG(m).reduce((s, p) => s + p.minutes, 0) } }));
  const minutes = ms => ms.reduce((s, m) => s + m._p.minutes, 0);
  // Tableau comparatif : une ligne par gardienne (un clic descend à sa fiche détaillée)
  const ligneG = (nom, ms, cle) => {
    const avecTirs = ms.filter(m => m.tirs.adv != null);
    const tc = avecTirs.reduce((s, m) => s + m.tirs.adv, 0), baT = avecTirs.reduce((s, m) => s + m.buts.adv, 0);
    const ba = ms.reduce((s, m) => s + m.buts.adv, 0);
    const dec = x => ms.filter(m => m._p.decision === x).length;
    const bl = ms.filter(m => m._p.blanchissage).length;   // blanchissages : seule dans le filet, aucun but accordé
    // data-v : valeur brute pour le tri par colonne (trierTableau)
    const min = minutes(ms), cell = (v, txt, cls = "n") => `<td class="${cls}" data-v="${v ?? ""}">${txt}</td>`;
    return `<tr${cle ? ` class="lien" tabindex="0" data-g="${esc(cle)}"` : ""}>
      <td class="txt nom-g" data-v="${esc(nom.replace(/<[^>]+>/g, ""))}">${nom}</td>${cell(ms.length, ms.length)}
      ${cell(dec("V"), dec("V"), "n v")}${cell(dec("D"), dec("D"), "n d")}${cell(dec("N"), dec("N"))}
      ${cell(ba, ba)}${cell(bl, bl)}${cell(tc, tc)}
      ${cell(tc ? (tc - baT) / tc : null, pct(tc - baT, tc), "n fort")}${cell(min ? ba * 40 / min : null, moy40(ba, min))}${cell(min, tg(min), "n opt")}</tr>`;
  };
  const th = (lab, cls = "n") => `<th class="${cls}" tabindex="0" aria-sort="none" title="Trier">${lab}</th>`;
  const tableau = `<section class="panneau sommaire-g" style="margin-top:1rem"><div class="defile"><table class="triable">
    <thead><tr>${th("Gardienne", "")}${th("MJ")}${th("V")}${th("D")}${th("N")}
      ${th("BA")}${th("BL")}${th("TC")}${th("% arr.")}${th("MOY")}${th("TG", "n opt")}</tr></thead>
    <tbody>${tries.map(([cle, { g, ms }]) => ligneG(`${esc(g.nom || "Non indiquée")}${g.numero != null ? ` <span class="no">#${g.numero}</span>` : ""}`, ms, cle)).join("")}</tbody>
    ${tries.length > 1 ? `<tfoot>${ligneG("Équipe", equipe)}</tfoot>` : ""}
  </table></div>
  <p class="legende-g"><b>MJ</b> matchs joués · <b>V/D/N</b> victoires, défaites, nulles (la décision va à la gardienne dans le filet au
    but gagnant, ou au dernier but d’un nul) · <b>BA</b> buts accordés · <b>BL</b> blanchissages (seule dans le filet, aucun but accordé) ·
    <b>TC</b> tirs cadrés contre · <b>% arr.</b> pourcentage d’arrêts · <b>MOY</b> buts accordés par 40 minutes de jeu (un match) ·
    <b>TG</b> temps de glace. TC et % arr. : matchs où les tirs sont notés. Toucher un en-tête pour trier (deux fois : ordre inverse).</p></section>`;
  const cartes = tries.map(([cle, { g, ms }]) => {
    const avecTirs = ms.filter(m => m.tirs.adv != null);
    const tirs = avecTirs.reduce((s, m) => s + m.tirs.adv, 0);
    const ba = ms.reduce((s, m) => s + m.buts.adv, 0);
    const baTirs = avecTirs.reduce((s, m) => s + m.buts.adv, 0);
    const ag = agregerButs(ms);
    const v = ms.filter(m => m._p.decision === "V").length, d = ms.filter(m => m._p.decision === "D").length;
    const n = ms.filter(m => m._p.decision === "N").length, min = minutes(ms);
    const pts = [...avecTirs].filter(m => m.tirs.adv).sort((a, b) => a.date.localeCompare(b.date))
      .map(m => ({ date: m.date, v: svArret(m), m, tirs: m.tirs.adv, buts: m.buts.adv }));
    // Par période : matchs joués au complet (seule dans le filet) où chaque but accordé a sa période ;
    // % d'arrêts si les tirs par période sont connus aussi. Prolongation null = pas jouée.
    const avecBP = ms.filter(m => m._complet && m.buts_par_periode?.adv), avecTP = avecBP.filter(m => m.tirs_par_periode.adv);
    const parP = k => {
      const b = avecBP.map(m => m.buts_par_periode.adv[k]).filter(v => v != null);
      const t = avecTP.filter(m => m.tirs_par_periode.adv[k] != null && m.buts_par_periode.adv[k] != null);
      const tirsP = t.reduce((s, m) => s + m.tirs_par_periode.adv[k], 0), butsT = t.reduce((s, m) => s + m.buts_par_periode.adv[k], 0);
      return { buts: b.length ? b.reduce((s, v) => s + v, 0) : null, n: b.length,
               arrets: pctN(tirsP - butsT, tirsP) };   // 1 décimale : l'écart entre gardiennes est souvent minime
    };
    const P = Object.fromEntries(PERIODES.map(([k]) => [k, parP(k)]));
    const totBP = PERIODES.reduce((s, [k]) => s + (P[k].buts ?? 0), 0);
    const tirsTP = avecTP.reduce((s, m) => s + m.tirs.adv, 0), butsTP = avecTP.reduce((s, m) => s + m.buts.adv, 0);
    const blocP = avecBP.length ? `
      <h3 style="margin-top:1.25rem">Buts accordés par période</h3>
      <div class="periodes">
        <div></div>${PERIODES.map(([, l]) => `<div class="t">${l}</div>`).join("")}<div class="t">Total</div>
        <div class="l">Buts</div>${PERIODES.map(([k]) => `<div>${P[k].buts ?? "–"}</div>`).join("")}<div class="tot">${totBP}</div>
        <div class="l">Moy.</div>${PERIODES.map(([k]) => `<div>${P[k].n ? moy(P[k].buts, P[k].n) : "–"}</div>`).join("")}<div class="tot">${moy(totBP, avecBP.length)}</div>
        <div class="l">% arr.</div>${PERIODES.map(([k]) => `<div>${P[k].arrets}</div>`).join("")}<div class="tot">${pctN(tirsTP - butsTP, tirsTP)}</div>
      </div>
      <p class="sous" style="font-size:.85rem">Moy. = buts accordés par match. Buts et moyenne : ${avecBP.length} sur ${ms.length} match${ms.length > 1 ? "s" : ""}
        (joués au complet, où la période de chaque but est connue). % d’arrêts : ${avecTP.length} match${avecTP.length > 1 ? "s" : ""} où les tirs par période sont connus aussi.</p>` : "";
    // Tableau match par match, du plus vieux au plus récent ; la moyenne de la saison n'apparaît qu'au total
    const lignes = [...ms].sort((a, b) => (a.date + (a.heure_debut || "")).localeCompare(b.date + (b.heure_debut || ""))).map(m => `
      <tr class="lien" tabindex="0" data-id="${esc(m.id)}">
        <td>${dateCourte(m.date)}</td><td class="txt">${esc(m.adversaire)}</td>
        <td>${m._p.decision ? `<span class="res ${m._p.decision}">${m._p.decision}</span>` : "–"}</td>
        <td class="n">${m.tirs.adv ?? "–"}</td><td class="n">${m.buts.adv}</td>
        <td class="n">${svArret(m) == null ? "–" : pct(m.tirs.adv - m.buts.adv, m.tirs.adv)}</td>
        <td class="n opt">${tg(m._p.minutes)}</td></tr>`).join("");
    return `<section class="panneau gardienne" id="g-${esc(cle.replace(/[^\w-]/g, "_"))}">
      <header class="entete-g">
        ${g.numero != null ? `<span class="dossard">${g.numero}</span>` : ""}
        <h2>${esc(g.nom || "Gardienne")}</h2>
        <span class="bilan-g">${ms.length} MJ · ${v}-${d}-${n} · ${pct(tirs - baTirs, tirs)}</span>
      </header>
      <div class="chiffres">
        <div class="chiffre accent"><b>${pct(tirs - baTirs, tirs)}</b><span>% d’arrêts</span></div>
        <div class="chiffre"><b>${moy40(ba, min)}</b><span>buts accordés / 40 min</span></div>
        <div class="chiffre"><b>${ms.length}</b><span>matchs (${v}-${d}-${n})</span></div>
        <div class="chiffre"><b>${tirs}</b><span>tirs reçus</span></div>
        <div class="chiffre"><b>${ba}</b><span>buts accordés</span></div>
        <div class="chiffre"><b>${tg(min)}</b><span>temps de glace</span></div>
      </div>
      <h3 style="margin-top:1.25rem">Buts accordés match par match</h3>
      <div class="defile"><table class="serre">
        <thead><tr><th>Date</th><th>Adversaire</th><th>Déc.</th><th class="n">Tirs</th><th class="n">BA</th><th class="n">% arr.</th><th class="n opt">TG</th></tr></thead>
        <tbody>${lignes}</tbody>
        <tfoot><tr><td>Total</td><td>${ms.length} match${ms.length > 1 ? "s" : ""}</td><td>${v}-${d}-${n}</td>
          <td class="n">${tirs}</td><td class="n">${ba}</td><td class="n">${pct(tirs - baTirs, tirs)}</td><td class="n opt">${tg(min)}</td></tr></tfoot>
      </table></div>
      ${blocP}
      ${pts.length > 1 ? `<h3 style="margin-top:1.25rem">% d’arrêts match après match</h3>${tendance(pts)}` : ""}
      <div class="grille g2" style="margin-top:1.25rem">
        <div><h3>Où entrent les buts</h3>${filet(ag.zones, "chaleur")}</div>
        <div><h3>Types de jeu</h3>${barresTypes(ag.types, ag.n)}</div>
      </div>
      ${aLieux(ms, "buts_accordes") ? `<div class="carte-g"><h3 style="margin-top:1.25rem">D’où partent les buts</h3>${carteButs(ms, "buts_accordes", "")}</div>` : ""}
    </section>`;
  });
  return `<h1>Gardiennes ${etat.equipe}</h1><p class="sous">Cumulatif de la saison ${etat.saison}. V-D-N = victoires, défaites, nulles.</p>
    ${tableau}
    <div class="grille" style="margin-top:1rem">${cartes.join("")}</div>`;
}

function vueEquipe() {
  const ms = filtres();
  if (!ms.length) return `<h1>Équipe ${etat.equipe}</h1><p class="vide">Aucun match ${etat.equipe} pour la saison ${etat.saison}.</p>`;
  const somme = f => ms.reduce((s, m) => s + (f(m) ?? 0), 0);
  const v = ms.filter(m => resultat(m) === "V").length, d = ms.filter(m => resultat(m) === "D").length, n = ms.length - v - d;
  const bp = somme(m => m.buts.nous), bc = somme(m => m.buts.adv);
  const avecTn = ms.filter(m => m.tirs.nous != null), avecTa = ms.filter(m => m.tirs.adv != null);
  const tp = somme(m => m.tirs.nous), tc = somme(m => m.tirs.adv);
  const szT = somme(m => m.sorties_zone.tentatives), szR = somme(m => m.sorties_zone.reussies);
  const avecP = ms.filter(m => m.tirs_par_periode.nous && m.tirs_par_periode.adv);
  const moyP = (cote, k) => {
    // La prolongation est null quand il n'y en a pas eu : on ne compte que les matchs où la période existe
    const vals = avecP.map(m => m.tirs_par_periode[cote][k]).filter(v => v != null);
    return vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1).replace(".", ",") : "–";
  };
  // Buts par période : seulement les matchs où chaque but a sa période (pas les premiers matchs de la saison)
  const avecB = { nous: ms.filter(m => m.buts_par_periode?.nous), adv: ms.filter(m => m.buts_par_periode?.adv) };
  const totB = (cote, k) => {
    const vals = avecB[cote].map(m => m.buts_par_periode[cote][k]).filter(v => v != null);
    return vals.length ? vals.reduce((s, v) => s + v, 0) : null;
  };
  const ligneB = (lab, cote) => `<div class="l">${lab}</div>${PERIODES.map(([k]) => `<div>${totB(cote, k) ?? "–"}</div>`).join("")}
    <div class="tot">${avecB[cote].length ? PERIODES.reduce((s, [k]) => s + (totB(cote, k) ?? 0), 0) : "–"}</div>`;
  const nbM = n => `${n} match${n > 1 ? "s" : ""}`;
  const chrono = [...ms].sort((a, b) => (a.date + (a.heure_debut || "")).localeCompare(b.date + (b.heure_debut || "")));
  // Sorties de zone par période : totaux des matchs où le détail par période est connu
  const avecSz = ms.filter(m => m.sorties_zone.par_periode);
  const totSz = (x, k) => { const v = avecSz.map(m => m.sorties_zone.par_periode[x][k]).filter(v => v != null);
    return v.length ? v.reduce((s, n) => s + n, 0) : null; };
  const szP = Object.fromEntries(PERIODES.map(([k]) => [k, { r: totSz("reussies", k), t: totSz("tentatives", k) }]));
  const szPt = avecSz.reduce((s, m) => s + m.sorties_zone.tentatives, 0), szPr = avecSz.reduce((s, m) => s + m.sorties_zone.reussies, 0);
  const ag = agregerButs(ms), agN = agregerButs(ms, "buts_marques");
  const detN = ms.reduce((s, m) => s + (m.buts_marques || []).filter(b => b.type || b.zone).length, 0);
  return `<h1>Équipe ${etat.equipe}</h1><p class="sous">Cumulatif de la saison ${etat.saison}</p>
  <section class="panneau" style="margin-top:1rem">
    <div class="chiffres" style="margin-top:0">
      <div class="chiffre"><b>${v}-${d}-${n}</b><span>fiche V-D-N</span></div>
      <div class="chiffre"><b>${bp}–${bc}</b><span>buts pour et contre</span></div>
      <div class="chiffre"><b>${moy(bp, ms.length)}</b><span>buts pour / match</span></div>
      <div class="chiffre"><b>${moy(bc, ms.length)}</b><span>buts contre / match</span></div>
      <div class="chiffre"><b>${moy(tp, avecTn.length, 1)}</b><span>tirs pour / match</span></div>
      <div class="chiffre"><b>${moy(tc, avecTa.length, 1)}</b><span>tirs contre / match</span></div>
      <div class="chiffre accent"><b>${pct(szR, szT)}</b><span>sorties de zone réussies</span></div>
    </div>
  </section>
  ${ms.length > 1 ? `<section class="panneau" style="margin-top:1rem">
    <h3>Progression de la saison</h3>
    <p class="sous" style="font-size:.85rem">Match après match, du plus vieux au plus récent.</p>
    <h4 class="titre-g">Buts par match</h4>
    ${progression(chrono, [{ lab: `BLL ${etat.equipe}`, cls: "nous", val: m => m.buts.nous }, { lab: "Contre", cls: "adv", val: m => m.buts.adv }])}
    <h4 class="titre-g">Tirs cadrés par match</h4>
    ${progression(chrono, [{ lab: `BLL ${etat.equipe}`, cls: "nous", val: m => m.tirs.nous }, { lab: "Contre", cls: "adv", val: m => m.tirs.adv }], "", "Tirs cadrés")}
    ${chrono.filter(m => m.sorties_zone.tentatives).length > 1 ? `<h4 class="titre-g">Sorties de zone réussies</h4>
    ${progression(chrono, [{ lab: "Réussies", cls: "nous", val: m => m.sorties_zone.tentatives ? 100 * m.sorties_zone.reussies / m.sorties_zone.tentatives : null }], "%", "Sorties de zone réussies")}` : ""}
  </section>` : ""}
  <div class="grille g2" style="margin-top:1rem">
    <section class="panneau">
      <h3>Tirs cadrés moyens par période</h3>
      <div class="periodes">
        <div></div>${PERIODES.map(([, l]) => `<div class="t">${l}</div>`).join("")}<div class="t"></div>
        <div class="l">BLL</div>${PERIODES.map(([k]) => `<div>${moyP("nous", k)}</div>`).join("")}<div></div>
        <div class="l">Contre</div>${PERIODES.map(([k]) => `<div>${moyP("adv", k)}</div>`).join("")}<div></div>
      </div>
      <p class="sous" style="font-size:.85rem">Sur ${avecP.length} match${avecP.length > 1 ? "s" : ""} avec tirs par période.</p>
    </section>
    <section class="panneau">
      <h3>Buts par période</h3>
      <div class="periodes">
        <div></div>${PERIODES.map(([, l]) => `<div class="t">${l}</div>`).join("")}<div class="t">Total</div>
        ${ligneB("BLL", "nous")}${ligneB("Contre", "adv")}
      </div>
      <p class="sous" style="font-size:.85rem">Total de la saison, seulement pour les matchs où la période de chaque but est connue :
        ${avecB.nous.length} sur ${nbM(ms.length)} pour la ligne BLL, ${avecB.adv.length} sur ${nbM(ms.length)} pour la ligne Contre.</p>
    </section>
  </div>
  ${aSits(ms) ? `<section class="panneau" style="margin-top:1rem"><h3>Buts selon la situation</h3>${situations(ms)}</section>` : ""}
  ${avecSz.length ? `<section class="panneau" style="margin-top:1rem">
    <h3>Sorties de zone par période</h3>
    <div class="periodes">
      <div></div>${PERIODES.map(([, l]) => `<div class="t">${l}</div>`).join("")}<div class="t">Total</div>
      <div class="l">Réussies</div>${PERIODES.map(([k]) => `<div>${szP[k].r ?? "–"}</div>`).join("")}<div class="tot">${szPr}</div>
      <div class="l">Tentées</div>${PERIODES.map(([k]) => `<div>${szP[k].t ?? "–"}</div>`).join("")}<div class="tot">${szPt}</div>
      <div class="l">%</div>${PERIODES.map(([k]) => `<div>${pctN(szP[k].r, szP[k].t)}</div>`).join("")}<div class="tot">${pctN(szPr, szPt)}</div>
    </div>
    <p class="sous" style="font-size:.85rem">Total de la saison, seulement pour les matchs où les sorties de zone sont notées par période : ${avecSz.length} sur ${nbM(ms.length)}.</p>
  </section>` : ""}
  <div class="grille g2" style="margin-top:1rem">
    <section class="panneau">
      <h3>Nos buts par type de jeu</h3>${barresTypes(agN.types, agN.n, true)}
      <p class="sous" style="font-size:.85rem">${detN} de nos ${bp} buts ont un type ou une zone notés (saisie téléphone ou section 3 du Sommaire).</p>
    </section>
    <section class="panneau">
      <h3>Où entrent nos buts</h3>${Object.keys(agN.zones).length ? filet(agN.zones, "chaleur") : `<p class="vide">Aucun de nos buts n’a de zone notée.</p>`}    </section>
  </div>
  <div class="grille g2" style="margin-top:1rem">
    <section class="panneau">
      <h3>Buts accordés par type de jeu</h3>${barresTypes(ag.types, ag.n)}
    </section>
    <section class="panneau">
      <h3>Où entrent les buts accordés</h3>${filet(ag.zones, "chaleur")}
    </section>
  </div>
  ${aLieux(ms, "buts_marques") || aLieux(ms, "buts_accordes") ? `<div class="grille g2" style="margin-top:1rem">
    <section class="panneau"><h3>D’où partent nos buts</h3>${carteButs(ms, "buts_marques", "Aucun de nos buts n’a de position notée.")}</section>
    <section class="panneau"><h3>D’où partent les buts accordés</h3>${carteButs(ms, "buts_accordes", "Aucun but accordé n’a de position notée.")}</section>
  </div>` : ""}`;
}

/* ---------- Adversaires : dossier d'avant-match */
// Même adversaire malgré la casse, les accents ou les espaces (« Rive-Sud » = « rive sud »)
const cleAdv = nom => String(nom || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function parAdversaire(ms) {
  const g = {};
  ms.forEach(m => (g[cleAdv(m.adversaire)] = g[cleAdv(m.adversaire)] || []).push(m));
  // Nom affiché : celui du match le plus récent
  return Object.entries(g).map(([cle, l]) => {
    l.sort((a, b) => (a.date + (a.heure_debut || "")).localeCompare(b.date + (b.heure_debut || "")));
    return { cle, nom: l[l.length - 1].adversaire, ms: l };
  });
}

// Moyennes par match d'un groupe de matchs (dossier adversaire : contre elles / toute la saison)
function moyennes(ms) {
  const avec = f => ms.filter(m => f(m) != null);
  const tn = avec(m => m.tirs.nous), ta = avec(m => m.tirs.adv), sz = ms.filter(m => m.sorties_zone.tentatives);
  const s = (l, f) => l.reduce((t, m) => t + f(m), 0);
  return {
    bp: moy(s(ms, m => m.buts.nous), ms.length), bc: moy(s(ms, m => m.buts.adv), ms.length),
    tp: moy(s(tn, m => m.tirs.nous), tn.length, 1), tc: moy(s(ta, m => m.tirs.adv), ta.length, 1),
    arr: pct(s(ta, m => m.tirs.adv - m.buts.adv), s(ta, m => m.tirs.adv)),
    sz: pct(s(sz, m => m.sorties_zone.reussies), s(sz, m => m.sorties_zone.tentatives)),
  };
}

function vueAdversaires() {
  const groupes = parAdversaire(filtres()).sort((a, b) => b.ms[b.ms.length - 1].date.localeCompare(a.ms[a.ms.length - 1].date));
  if (!groupes.length) return `<h1>Adversaires ${etat.equipe}</h1><p class="vide">Aucun match ${etat.equipe} pour la saison ${etat.saison}.</p>`;
  return `<h1>Adversaires ${etat.equipe}</h1><p class="sous">Saison ${etat.saison}. Choisir une équipe pour voir son dossier.</p>
  <div class="panneau defile" style="margin-top:1rem"><table>
    <thead><tr><th>Adversaire</th><th class="n">PJ</th><th class="n">V-D-N</th><th class="n">Buts</th><th class="n opt">Dernier match</th></tr></thead>
    <tbody>${groupes.map(({ cle, nom, ms }) => {
      const v = ms.filter(m => resultat(m) === "V").length, d = ms.filter(m => resultat(m) === "D").length;
      return `<tr class="lien" tabindex="0" data-adv="${esc(cle)}">
        <td class="txt"><b>${esc(nom)}</b></td><td class="n">${ms.length}</td><td class="n">${v}-${d}-${ms.length - v - d}</td>
        <td class="n">${ms.reduce((s, m) => s + m.buts.nous, 0)}–${ms.reduce((s, m) => s + m.buts.adv, 0)}</td>
        <td class="n opt">${dateCourte(ms[ms.length - 1].date)}</td></tr>`;
    }).join("")}</tbody></table></div>`;
}

function vueAdversaire(cle) {
  const saison = filtres();
  const gr = parAdversaire(saison).find(x => x.cle === cle);
  if (!gr) return `<a class="retour" href="#/adversaires">← Adversaires</a><p class="vide">Aucun match ${etat.equipe} contre cette équipe pour la saison ${etat.saison}.</p>`;
  const { nom, ms } = gr;
  const v = ms.filter(m => resultat(m) === "V").length, d = ms.filter(m => resultat(m) === "D").length;
  const elles = moyennes(ms), tous = moyennes(saison);
  const ag = agregerButs(ms), agN = agregerButs(ms, "buts_marques");
  // Buts par période (matchs où chaque but a sa période) et moment dans la période (tiers de 3:20)
  const avecB = { nous: ms.filter(m => m.buts_par_periode?.nous), adv: ms.filter(m => m.buts_par_periode?.adv) };
  const totB = (cote, k) => { const vals = avecB[cote].map(m => m.buts_par_periode[cote][k]).filter(x => x != null);
    return vals.length ? vals.reduce((s, x) => s + x, 0) : null; };
  const ligneB = (lab, cote) => `<div class="l">${lab}</div>${PERIODES.map(([k]) => `<div>${totB(cote, k) ?? "–"}</div>`).join("")}
    <div class="tot">${avecB[cote].length ? PERIODES.reduce((s, [k]) => s + (totB(cote, k) ?? 0), 0) : "–"}</div>`;
  const TIERS = ["Début", "Milieu", "Fin"];
  const tiers = cleB => { const t = [0, 0, 0];
    ms.forEach(m => (m[cleB] || []).forEach(b => { const s = sec(b.temps); if (s != null) t[Math.min(2, Math.floor((DUREE_P - Math.min(s, DUREE_P)) / (DUREE_P / 3)))]++; }));
    return t; };
  const tA = tiers("buts_accordes"), tN = tiers("buts_marques");
  // À retenir : leurs habitudes, dès qu'il y a assez de buts pour que ce soit parlant
  const retenir = [];
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
  if (ag.n >= 3) {
    const [ty, nt] = top(ag.types) || [];
    if (nt >= 2) retenir.push(`Leur type de but le plus fréquent : <b>${esc(TYPES[ty] || ty)}</b> (${nt} sur ${ag.n}).`);
    const [z, nz] = top(ag.zones) || [];
    if (nz >= 2) retenir.push(`Zone du filet la plus touchée : <b>${z}</b> (${nz} sur ${ag.n}).`);
    const totTiers = tA.reduce((s, x) => s + x, 0), maxT = Math.max(...tA);
    if (totTiers >= 3 && maxT / totTiers >= .5) retenir.push(`Elles marquent surtout en <b>${TIERS[tA.indexOf(maxT)].toLowerCase()} de période</b> (${maxT} sur ${totTiers}).`);
  }
  if (avecB.adv.length) {
    const p = PERIODES.map(([k, l]) => [l, totB("adv", k) ?? 0]).sort((a, b) => b[1] - a[1]);
    if (p[0][1] >= 2 && p[0][1] > p[1][1]) retenir.push(`Leur période la plus productive : <b>${p[0][0]}</b> (${p[0][1]} buts).`);
  }
  if (agN.n >= 2) {
    const [ty, nt] = top(agN.types) || [];
    if (nt >= 2) retenir.push(`Nos buts contre elles viennent surtout de : <b>${esc(TYPES[ty] || ty)}</b> (${nt} sur ${agN.n}).`);
  }
  // Buts marqués mais sans type ni zone : le dire plutôt qu'afficher des panneaux vides
  const manque = [ag.n && !detail(ag) && "leurs buts", agN.n && !detail(agN) && "nos buts"].filter(Boolean);
  const ligneC = (lab, a, b) => `<tr><td class="txt">${lab}</td><td class="n fort">${a}</td><td class="n">${b}</td></tr>`;
  return `<a class="retour" href="#/adversaires">← Adversaires</a>
  <div class="titre-imp"><h1>${esc(nom)}</h1>
    <button type="button" class="imprimer" data-act="imprimer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3h10v6M7 17H4v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6h-3M7 14h10v7H7z"/></svg>Imprimer</button></div>
  <p class="sous">Dossier adversaire, ${esc(etat.equipe)}, saison ${etat.saison} : ${ms.length} match${ms.length > 1 ? "s" : ""}, fiche ${v}-${d}-${ms.length - v - d}</p>
  ${retenir.length ? `<section class="panneau faits" style="margin-top:1rem"><h3>À retenir</h3><ul>${retenir.map(t => `<li>${t}</li>`).join("")}</ul></section>` : ""}
  <div class="grille g2" style="margin-top:1rem">
    <section class="panneau">
      <h3>Nos affrontements</h3>
      <div class="defile"><table>
        <thead><tr><th>Date</th><th>Rés.</th><th class="n">Score</th><th class="n">Tirs</th><th class="opt">Gardienne</th></tr></thead>
        <tbody>${ms.map(m => `<tr class="lien" tabindex="0" data-id="${esc(m.id)}">
          <td>${dateCourte(m.date)}</td><td><span class="res ${resultat(m)}">${resultat(m)}</span></td>
          <td class="n">${m.buts.nous}–${m.buts.adv}</td><td class="n">${m.tirs.nous == null && m.tirs.adv == null ? "–" : `${m.tirs.nous ?? "?"}–${m.tirs.adv ?? "?"}`}</td>
          <td class="opt">${esc(nomsGardiennes(m))}</td></tr>`).join("")}</tbody>
      </table></div>
    </section>
    <section class="panneau">
      <h3>Contre elles et toute la saison</h3>
      <div class="defile"><table>
        <thead><tr><th>Moyenne par match</th><th class="n">Contre elles</th><th class="n">Saison</th></tr></thead>
        <tbody>${ligneC("Buts pour", elles.bp, tous.bp)}${ligneC("Buts contre", elles.bc, tous.bc)}
          ${ligneC("Tirs cadrés pour", elles.tp, tous.tp)}${ligneC("Tirs cadrés contre", elles.tc, tous.tc)}
          ${ligneC("% d’arrêts", elles.arr, tous.arr)}${ligneC("Sorties de zone réussies", elles.sz, tous.sz)}</tbody>
      </table></div>
    </section>
  </div>
  <div class="grille g2" style="margin-top:1rem">
    <section class="panneau">
      <h3>Buts par période</h3>
      <div class="periodes">
        <div></div>${PERIODES.map(([, l]) => `<div class="t">${l}</div>`).join("")}<div class="t">Total</div>
        ${ligneB("BLL", "nous")}${ligneB("Contre", "adv")}
      </div>
      <p class="sous" style="font-size:.85rem">Matchs où la période de chaque but est connue.</p>
    </section>
    <section class="panneau">
      <h3>Moment des buts dans la période</h3>
      <div class="periodes tiers">
        <div></div>${TIERS.map(t => `<div class="t">${t}</div>`).join("")}
        <div class="l">BLL</div>${tN.map(x => `<div>${x}</div>`).join("")}
        <div class="l">Contre</div>${tA.map(x => `<div>${x}</div>`).join("")}
      </div>
      <p class="sous" style="font-size:.85rem">Début : 10:00 à 6:40 au chrono ; milieu : 6:40 à 3:20 ; fin : 3:20 à 0:00. Buts dont le temps est noté.</p>
    </section>
  </div>
  ${aSits(ms) ? `<section class="panneau" style="margin-top:1rem"><h3>Buts selon la situation</h3>${situations(ms)}</section>` : ""}
  ${detail(ag) ? `<div class="grille g2" style="margin-top:1rem">
    <section class="panneau">
      <h3>Leurs buts par type de jeu</h3>${barresTypes(ag.types, ag.n)}
    </section>
    <section class="panneau">
      <h3>Où entrent leurs buts</h3>${Object.keys(ag.zones).length ? filet(ag.zones, "chaleur") : `<p class="vide">Aucune zone notée.</p>`}
    </section>
  </div>` : ""}
  ${detail(agN) ? `<div class="grille g2" style="margin-top:1rem">
    <section class="panneau">
      <h3>Nos buts par type de jeu</h3>${barresTypes(agN.types, agN.n, true)}
    </section>
    <section class="panneau">
      <h3>Où entrent nos buts</h3>${Object.keys(agN.zones).length ? filet(agN.zones, "chaleur") : `<p class="vide">Aucune zone notée.</p>`}
    </section>
  </div>` : ""}
  ${aLieux(ms, "buts_marques") || aLieux(ms, "buts_accordes") ? `<div class="grille g2" style="margin-top:1rem">
    <section class="panneau"><h3>D’où partent leurs buts</h3>${carteButs(ms, "buts_accordes", "Aucun de leurs buts n’a de position notée.")}</section>
    <section class="panneau"><h3>D’où partent nos buts</h3>${carteButs(ms, "buts_marques", agN.n ? "Aucun de nos buts n’a de position notée." : "Aucun but marqué contre elles.")}</section>
  </div>` : ""}
  ${manque.length ? `<p class="sous" style="font-size:.85rem;margin-top:1rem">Types de jeu et zones du filet :
    non notés pour ${manque.length > 1 ? "les buts" : manque[0]} de ces matchs.</p>` : ""}`;
}
// Au moins un but avec type ou zone
const detail = ag => Object.keys(ag.types).length + Object.keys(ag.zones).length > 0;

/* ---------- Navigation */
function afficher() {
  const [, vue = "matchs", id] = location.hash.split("/");
  document.querySelectorAll(".onglets a").forEach(a => {
    if (a.dataset.vue === ({ match: "matchs", adversaire: "adversaires" }[vue] || vue)) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  el.innerHTML = vue === "match" ? vueMatch(decodeURIComponent(id || ""))
    : vue === "gardiennes" ? vueGardiennes()
    : vue === "equipe" ? vueEquipe()
    : vue === "adversaires" ? vueAdversaires()
    : vue === "adversaire" ? vueAdversaire(decodeURIComponent(id || ""))
    : vueMatchs();
  el.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function majFiltres() {
  document.querySelectorAll(".bascule button").forEach(b => b.setAttribute("aria-pressed", b.dataset.equipe === etat.equipe));
  try { localStorage.setItem("bll-filtres", JSON.stringify({ saison: etat.saison, equipe: etat.equipe })); } catch (e) { /* stockage indisponible */ }
}

async function versionCode() {
  // Date du dernier commit qui touche le code : data/version.json, écrit par GitHub Actions.
  // En local (pas de version.json) : en-tête Last-Modified de app.js.
  try {
    let d = null;
    const v = await fetch("data/version.json", { cache: "no-cache" });
    if (v.ok) d = new Date((await v.json()).code);
    if (!d || isNaN(d)) {
      const r = await fetch("js/app.js", { method: "HEAD", cache: "no-cache" });
      d = new Date(r.headers.get("Last-Modified"));
    }
    if (!isNaN(d)) $("#version").textContent = `Code mis à jour : ${dateHeure(d)}`;
  } catch (e) { /* date indisponible : on n'affiche rien */ }
}

async function demarrer() {
  try {
    const r = await fetch("data/matchs.json", { cache: "no-cache" });
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    etat.matchs = data.matchs || [];
    // genere_le : « AAAA-MM-JJTHH:MM » (ancien format sans heure : date seulement)
    $("#maj").textContent = `Dernière mise à jour des stats : ${data.genere_le.includes("T") ? dateHeure(new Date(data.genere_le)) : dateFr(data.genere_le)}`;
    versionCode();
  } catch (e) {
    el.innerHTML = `<p class="vide">Les statistiques ne sont pas disponibles pour le moment. Réessayer plus tard.</p>`;
    // En local : lancer tools/extract.py, puis ouvrir le site par un serveur (Live Server ou python -m http.server)
    return;
  }
  const saisons = [...new Set(etat.matchs.map(m => m.saison))].sort().reverse();
  let pref = {};
  try { pref = JSON.parse(localStorage.getItem("bll-filtres") || "{}"); } catch (e) { /* rien */ }
  etat.saison = saisons.includes(pref.saison) ? pref.saison : saisons[0];
  if (pref.equipe) etat.equipe = pref.equipe;
  const sel = $("#f-saison");
  sel.innerHTML = saisons.map(s => `<option${s === etat.saison ? " selected" : ""}>${s}</option>`).join("") || "<option>–</option>";
  sel.addEventListener("change", () => { etat.saison = sel.value; majFiltres(); afficher(); });
  document.querySelectorAll(".bascule button").forEach(b => b.addEventListener("click", () => {
    etat.equipe = b.dataset.equipe; majFiltres();
    if (location.hash.startsWith("#/match/")) location.hash = "#/matchs";
    else if (location.hash.startsWith("#/adversaire/")) location.hash = "#/adversaires";
    else afficher();
  }));
  // Graphiques de progression : valeurs du match survolé (souris) ou touché (téléphone)
  el.addEventListener("mouseover", e => { const r = e.target.closest(".progression .survol"); if (r) infoProgression(r); });
  el.addEventListener("click", e => {
    const sv = e.target.closest(".progression .survol"); if (sv) infoProgression(sv);
    const ent = e.target.closest("table.triable thead th"); if (ent) trierTableau(ent);
    if (e.target.closest('[data-act="imprimer"]')) window.print();
    const tr = e.target.closest("tr[data-id]"); if (tr) location.hash = "#/match/" + encodeURIComponent(tr.dataset.id);
    const adv = e.target.closest("tr[data-adv]"); if (adv) location.hash = "#/adversaire/" + encodeURIComponent(adv.dataset.adv);
    const g = e.target.closest("tr[data-g]");
    if (g) document.getElementById("g-" + g.dataset.g.replace(/[^\w-]/g, "_"))?.scrollIntoView({ behavior: "smooth" });
    // Fiche de match : toucher un but (déroulement, Sommaire, patinoire) allume ce but partout
    // et la zone du filet où il est entré ; on fait défiler jusqu'au filet (sinon jusqu'à la ligne du Sommaire)
    const but = e.target.closest("[data-but]");
    if (but) {
      const id = but.dataset.but;
      el.querySelectorAll(".eclaire").forEach(x => x.classList.remove("eclaire"));
      el.querySelectorAll(`[data-but="${id}"], [data-buts~="${id}"]`).forEach(x => x.classList.add("eclaire"));
      const zone = el.querySelector(`[data-buts~="${id}"]`);
      if (!but.closest("tr")) (zone?.closest("svg") || el.querySelector(`tr[data-but="${id}"]`))?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });
  // Graphiques de progression dessinés à la largeur de l'écran : redessiner si la largeur change (rotation du téléphone)
  let largeur = el.clientWidth, minuterie;
  window.addEventListener("resize", () => {
    clearTimeout(minuterie);
    minuterie = setTimeout(() => {
      if (el.clientWidth === largeur || !location.hash.startsWith("#/equipe")) return;
      largeur = el.clientWidth;
      const y = window.scrollY; el.innerHTML = vueEquipe(); window.scrollTo(0, y);
    }, 200);
  });
  el.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.closest("tr[data-id], tr[data-g], tr[data-adv], table.triable thead th")) e.target.click(); });
  window.addEventListener("hashchange", afficher);
  majFiltres();
  afficher();
}

// Bouton clair / sombre du bandeau. Le choix est gardé dans le navigateur ; sans choix, on suit l'appareil
// (le petit script du <head> d'index.html applique le thème avant l'affichage).
function themeBouton() {
  const b = $("#theme"), sombre = () => document.documentElement.classList.contains("sombre");
  const maj = () => { b.setAttribute("aria-label", sombre() ? "Mode clair" : "Mode sombre"); b.title = b.getAttribute("aria-label"); };
  b.addEventListener("click", () => {
    document.documentElement.classList.toggle("sombre", !sombre());
    try { localStorage.setItem("bll-theme", sombre() ? "sombre" : "clair"); } catch (e) { /* rien */ }
    maj();
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
    let choix = null; try { choix = localStorage.getItem("bll-theme"); } catch (er) { /* rien */ }
    if (!choix) { document.documentElement.classList.toggle("sombre", e.matches); maj(); }
  });
  maj();
  // Impression toujours en clair (encre sur papier blanc), puis retour au thème choisi
  let avant = false;
  addEventListener("beforeprint", () => { avant = sombre(); document.documentElement.classList.remove("sombre"); });
  addEventListener("afterprint", () => document.documentElement.classList.toggle("sombre", avant));
}

themeBouton();
demarrer();
