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
const moy = (n, d, dec = 2) => (d ? (n / d).toFixed(dec).replace(".", ",") : "–");
const dateFr = iso => new Date(iso + "T12:00").toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
const dateCourte = iso => new Date(iso + "T12:00").toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
const resultat = m => (m.buts.nous > m.buts.adv ? "V" : m.buts.nous < m.buts.adv ? "D" : "N");
const cleGardienne = g => (g.numero != null ? "#" + g.numero : g.nom || "?");
const nomGardienne = g => [g.nom, g.numero != null ? "#" + g.numero : ""].filter(Boolean).join(" ") || "Non indiquée";
const svArret = m => (m.tirs.adv ? (m.tirs.adv - m.buts.adv) / m.tirs.adv : null);

function filtres() {
  return etat.matchs.filter(m => m.saison === etat.saison && m.equipe === etat.equipe);
}

/* ---------- Composants */
function filet(valeurs, mode) {
  // mode "numeros" : valeurs[zone] = [1, 4] ; mode "chaleur" : valeurs[zone] = nombre
  const W = 360, H = 240, x0 = 14, y0 = 14, w = W - 28, h = H - 18, cw = w / 3, ch = h / 3;
  const max = mode === "chaleur" ? Math.max(1, ...Object.values(valeurs)) : 1;
  let s = `<svg class="filet" viewBox="0 0 ${W} ${H}" role="img" aria-label="Filet vu de face">`;
  ZONES.forEach((ligne, r) => ligne.forEach((z, k) => {
    const x = x0 + k * cw, y = y0 + r * ch;
    let fond = "transparent", txt = "", coul = "var(--rouge)", codeCoul = "";
    if (mode === "chaleur") {
      const n = valeurs[z] || 0, niv = n ? Math.min(4, Math.ceil(4 * n / max)) : 0;
      fond = `var(--chaleur-${niv})`; txt = n ? n : ""; coul = niv >= 3 ? "#fff" : "var(--encre)"; if (niv >= 3) codeCoul = ' style="fill:#C9D6EE"';
    } else {
      txt = (valeurs[z] || []).join(", ");
    }
    s += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${fond}"/>`;
    s += `<text class="code" x="${x + 7}" y="${y + 17}"${codeCoul}>${z}</text>`;
    if (txt !== "") s += `<text class="val" x="${x + cw / 2}" y="${y + ch / 2 + 6}" fill="${coul}"${String(txt).length > 6 ? ' style="font-size:20px"' : ""}>${txt}</text>`;
  }));
  for (let k = 1; k < 3; k++) {
    s += `<line class="maille" x1="${x0 + k * cw}" y1="${y0}" x2="${x0 + k * cw}" y2="${y0 + h}"/>`;
    s += `<line class="maille" x1="${x0}" y1="${y0 + k * ch}" x2="${x0 + w}" y2="${y0 + k * ch}"/>`;
  }
  s += `<path class="cadre" d="M${x0} ${y0 + h} V${y0} H${x0 + w} V${y0 + h}"/></svg>`;
  if (mode === "chaleur") {
    s += `<div class="legende-chaleur">moins ${[0, 1, 2, 3, 4].map(i => `<i style="background:var(--chaleur-${i})"></i>`).join("")} plus</div>`;
  }
  return s;
}

function barresTypes(compte, total) {
  const lignes = Object.keys(TYPES).filter(c => compte[c]).sort((a, b) => compte[b] - compte[a]);
  if (!lignes.length) return `<p class="vide">Aucun but accordé détaillé.</p>`;
  return `<div class="barres">${lignes.map(c => `
    <div class="barre-l"><span><span class="code-t">${c}</span>${TYPES[c]}</span>
      <div class="piste"><div class="rempli r" style="width:${100 * compte[c] / total}%"></div></div>
      <b>${compte[c]}</b></div>`).join("")}</div>`;
}

function tendance(points) {
  // points : [{date, v (0-1)}]
  if (points.length < 2) return "";
  const W = 640, H = 130, px = 38, py = 14;
  const vals = points.map(p => p.v), lo = Math.max(0, Math.min(.85, ...vals) - .03), hi = 1;
  const X = i => px + i * (W - px - 8) / (points.length - 1);
  const Y = v => py + (hi - v) / (hi - lo) * (H - 2 * py);
  const d = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(" ");
  const ref = .9;
  return `<svg class="tendance" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pourcentage d’arrêts match après match">
    <line class="ref" x1="${px}" x2="${W}" y1="${Y(ref)}" y2="${Y(ref)}"/>
    <text x="0" y="${Y(ref) + 4}">90 %</text>
    <path class="ligne" d="${d}"/>
    ${points.map((p, i) => `<circle class="pt" cx="${X(i)}" cy="${Y(p.v)}" r="5"><title>${dateCourte(p.date)} : ${(p.v * 100).toFixed(1)} %</title></circle>`).join("")}
  </svg>`;
}

function agregerButs(matchs) {
  const zones = {}, types = {};
  let n = 0;
  matchs.forEach(m => m.buts_accordes.forEach(b => {
    if (b.zone) zones[b.zone] = (zones[b.zone] || 0) + 1;
    if (b.type) types[b.type] = (types[b.type] || 0) + 1;
    n++;
  }));
  return { zones, types, n };
}

/* ---------- Vues */
function vueMatchs() {
  // Du plus vieux au plus récent
  const ms = filtres().sort((a, b) => (a.date + (a.heure_debut || "")).localeCompare(b.date + (b.heure_debut || "")));
  if (!ms.length) return `<h1>Matchs ${etat.equipe}</h1><p class="vide">Aucun match ${etat.equipe} pour la saison ${etat.saison}. Dépose un sommaire dans pdf/ et lance tools/extract.py.</p>`;
  return `<h1>Matchs ${etat.equipe}</h1><p class="sous">Saison ${etat.saison}, ${ms.length} match${ms.length > 1 ? "s" : ""}</p>
  <div class="panneau defile" style="margin-top:1rem"><table>
    <thead><tr><th>No</th><th>Date</th><th>Adversaire</th><th>Rés.</th><th class="n">Score</th><th class="n">Tirs</th><th>Gardienne</th><th class="n">% arrêts</th></tr></thead>
    <tbody>${ms.map(m => `
      <tr class="lien" tabindex="0" data-id="${esc(m.id)}">
        <td>${esc(m.no_match || "–")}</td><td>${dateCourte(m.date)}</td><td>${esc(m.adversaire)}</td>
        <td><span class="res ${resultat(m)}">${resultat(m)}</span></td>
        <td class="n">${m.buts.nous}–${m.buts.adv}</td>
        <td class="n">${m.tirs.nous ?? "–"}–${m.tirs.adv ?? "–"}</td>
        <td>${esc(nomGardienne(m.gardienne))}</td>
        <td class="n">${svArret(m) == null ? "–" : pct(m.tirs.adv - m.buts.adv, m.tirs.adv)}</td>
      </tr>`).join("")}</tbody></table></div>`;
}

function vueMatch(id) {
  const m = etat.matchs.find(x => x.id === id);
  if (!m) return `<a class="retour" href="#/matchs">← Matchs</a><p class="vide">Ce match n’existe pas ou n’a pas encore été publié.</p>`;
  const nums = {};
  m.buts_accordes.forEach(b => { if (b.zone) (nums[b.zone] = nums[b.zone] || []).push(b.no); });
  const tp = m.tirs_par_periode;
  const ligneP = (lab, o, tot) => `<div class="l">${lab}</div>${PERIODES.map(([k]) => `<div>${o ? o[k] ?? "–" : "–"}</div>`).join("")}<div class="tot">${tot ?? "–"}</div>`;
  const sz = m.sorties_zone;
  return `<a class="retour" href="#/matchs">← Matchs</a>
  <h1>${esc(m.equipe)} contre ${esc(m.adversaire)}</h1>
  <p class="sous">${dateFr(m.date)}${m.heure_debut ? `, ${m.heure_debut}${m.heure_fin ? "–" + m.heure_fin : ""}` : ""}${m.no_match ? `, match no ${esc(m.no_match)}` : ""}</p>
  <div class="score">
    <div class="eq">BLL ${esc(m.equipe)}<small>${m.tirs.nous ?? "–"} tirs cadrés</small></div>
    <div class="pts">${m.buts.nous}–${m.buts.adv}</div>
    <div class="eq droite">${esc(m.adversaire)}<small>${m.tirs.adv ?? "–"} tirs cadrés</small></div>
  </div>

  <div class="grille g2" style="margin-top:1rem">
    <section class="panneau">
      <h3>Buts accordés</h3>
      <p class="sous" style="margin-bottom:.75rem">Gardienne : ${esc(nomGardienne(m.gardienne))}, ${pct(m.tirs.adv - m.buts.adv, m.tirs.adv)} d’arrêts</p>
      ${filet(nums, "numeros")}
    </section>
    <section class="panneau">
      <h3>Détail par but</h3>
      ${m.buts_accordes.length ? `<div class="defile"><table>
        <thead><tr><th>But</th><th>Pér.</th><th>Temps</th><th>Type de jeu</th><th>Zone</th></tr></thead>
        <tbody>${m.buts_accordes.map(b => `<tr><td>${b.no}</td><td>${esc(b.periode || "–")}</td><td>${esc(b.temps || "–")}</td>
          <td>${b.type ? `<span class="code-t">${b.type}</span>${TYPES[b.type] || ""}` : "–"}</td><td>${esc(b.zone || "–")}</td></tr>`).join("")}</tbody>
      </table></div>` : `<p class="vide">Aucun but accordé détaillé.</p>`}
    </section>
  </div>

  <div class="grille g2" style="margin-top:1rem">
    <section class="panneau">
      <h3>Tirs cadrés par période</h3>
      <div class="periodes">
        <div></div>${PERIODES.map(([, l]) => `<div class="t">${l}</div>`).join("")}<div class="t">Total</div>
        ${ligneP("Nous", tp.nous, m.tirs.nous)}${ligneP("Adv.", tp.adv, m.tirs.adv)}
      </div>
    </section>
    <section class="panneau">
      <h3>Sorties de zone</h3>
      <div class="chiffres">
        <div class="chiffre"><b>${sz.reussies ?? "–"}</b><span>réussies</span></div>
        <div class="chiffre"><b>${sz.tentatives ?? "–"}</b><span>tentatives</span></div>
        <div class="chiffre accent"><b>${pct(sz.reussies, sz.tentatives)}</b><span>taux de réussite</span></div>
      </div>
    </section>
  </div>
  ${m.notes ? `<section class="panneau" style="margin-top:1rem"><h3>Observations et notes</h3><p class="notes">${esc(m.notes)}</p></section>` : ""}`;
}

function vueGardiennes() {
  const ms = filtres();
  if (!ms.length) return `<h1>Gardiennes ${etat.equipe}</h1><p class="vide">Aucun match ${etat.equipe} pour la saison ${etat.saison}.</p>`;
  const groupes = {};
  ms.forEach(m => { const k = cleGardienne(m.gardienne); (groupes[k] = groupes[k] || { g: m.gardienne, ms: [] }).ms.push(m); });
  const cartes = Object.values(groupes).sort((a, b) => b.ms.length - a.ms.length).map(({ g, ms }) => {
    const avecTirs = ms.filter(m => m.tirs.adv != null);
    const tirs = avecTirs.reduce((s, m) => s + m.tirs.adv, 0);
    const ba = ms.reduce((s, m) => s + m.buts.adv, 0);
    const baTirs = avecTirs.reduce((s, m) => s + m.buts.adv, 0);
    const ag = agregerButs(ms);
    const v = ms.filter(m => resultat(m) === "V").length, d = ms.filter(m => resultat(m) === "D").length, n = ms.length - v - d;
    const pts = [...avecTirs].sort((a, b) => a.date.localeCompare(b.date)).map(m => ({ date: m.date, v: svArret(m) }));
    // Tableau match par match, du plus vieux au plus récent ; la moyenne de la saison n'apparaît qu'au total
    const lignes = [...ms].sort((a, b) => (a.date + (a.heure_debut || "")).localeCompare(b.date + (b.heure_debut || ""))).map(m => `
      <tr class="lien" tabindex="0" data-id="${esc(m.id)}">
        <td>${dateCourte(m.date)}</td><td>${esc(m.adversaire)}</td>
        <td class="n">${m.tirs.adv ?? "–"}</td><td class="n">${m.buts.adv}</td>
        <td class="n">${svArret(m) == null ? "–" : pct(m.tirs.adv - m.buts.adv, m.tirs.adv)}</td>
        <td class="n">${moy(m.buts.adv, 1)}</td></tr>`).join("");
    return `<section class="panneau gardienne">
      <h3>${esc(g.nom || "Gardienne")}${g.numero != null ? ` <span class="no">#${g.numero}</span>` : ""}</h3>
      <div class="chiffres">
        <div class="chiffre accent"><b>${pct(tirs - baTirs, tirs)}</b><span>% d’arrêts</span></div>
        <div class="chiffre"><b>${moy(ba, ms.length)}</b><span>buts accordés / match</span></div>
        <div class="chiffre"><b>${ms.length}</b><span>matchs (${v}-${d}-${n})</span></div>
        <div class="chiffre"><b>${tirs}</b><span>tirs reçus</span></div>
        <div class="chiffre"><b>${ba}</b><span>buts accordés</span></div>
      </div>
      <h3 style="margin-top:1.25rem">Buts accordés match par match</h3>
      <div class="defile"><table>
        <thead><tr><th>Date</th><th>Adversaire</th><th class="n">Tirs reçus</th><th class="n">Buts accordés</th><th class="n">% arrêts</th><th class="n">Moy. buts / match</th></tr></thead>
        <tbody>${lignes}</tbody>
        <tfoot><tr><td>Total</td><td>${ms.length} match${ms.length > 1 ? "s" : ""}</td>
          <td class="n">${tirs}</td><td class="n">${ba}</td><td class="n">${pct(tirs - baTirs, tirs)}</td><td class="n">${moy(ba, ms.length)}</td></tr></tfoot>
      </table></div>
      ${pts.length > 1 ? `<h3 style="margin-top:1.25rem">% d’arrêts match après match</h3>${tendance(pts)}` : ""}
      <div class="grille g2" style="margin-top:1.25rem">
        <div><h3>Où entrent les buts</h3>${filet(ag.zones, "chaleur")}</div>
        <div><h3>Types de jeu</h3>${barresTypes(ag.types, ag.n)}</div>
      </div>
    </section>`;
  });
  return `<h1>Gardiennes ${etat.equipe}</h1><p class="sous">Cumulatif de la saison ${etat.saison}. V-D-N = victoires, défaites, nuls.</p>
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
  const ag = agregerButs(ms);
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
  <div class="grille g2" style="margin-top:1rem">
    <section class="panneau">
      <h3>Tirs cadrés moyens par période</h3>
      <div class="periodes">
        <div></div>${PERIODES.map(([, l]) => `<div class="t">${l}</div>`).join("")}<div class="t"></div>
        <div class="l">Pour</div>${PERIODES.map(([k]) => `<div>${moyP("nous", k)}</div>`).join("")}<div></div>
        <div class="l">Contre</div>${PERIODES.map(([k]) => `<div>${moyP("adv", k)}</div>`).join("")}<div></div>
      </div>
      <p class="sous" style="font-size:.85rem">Sur ${avecP.length} match${avecP.length > 1 ? "s" : ""} avec tirs par période.</p>
    </section>
    <section class="panneau">
      <h3>Buts accordés par type de jeu</h3>${barresTypes(ag.types, ag.n)}
    </section>
  </div>
  <section class="panneau" style="margin-top:1rem">
    <h3>Où entrent les buts accordés</h3>${filet(ag.zones, "chaleur")}
  </section>`;
}

/* ---------- Navigation */
function afficher() {
  const [, vue = "matchs", id] = location.hash.split("/");
  document.querySelectorAll(".onglets a").forEach(a => {
    if (a.dataset.vue === (vue === "match" ? "matchs" : vue)) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  el.innerHTML = vue === "match" ? vueMatch(decodeURIComponent(id || ""))
    : vue === "gardiennes" ? vueGardiennes()
    : vue === "equipe" ? vueEquipe()
    : vueMatchs();
  el.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function majFiltres() {
  document.querySelectorAll(".bascule button").forEach(b => b.setAttribute("aria-pressed", b.dataset.equipe === etat.equipe));
  try { localStorage.setItem("bll-filtres", JSON.stringify({ saison: etat.saison, equipe: etat.equipe })); } catch (e) { /* stockage indisponible */ }
}

async function demarrer() {
  try {
    const r = await fetch("data/matchs.json", { cache: "no-cache" });
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    etat.matchs = data.matchs || [];
    $("#maj").textContent = `Données mises à jour le ${dateFr(data.genere_le)}.`;
  } catch (e) {
    el.innerHTML = `<p class="vide">Impossible de lire data/matchs.json. Lance tools/extract.py, puis ouvre le site par un serveur (Live Server ou python -m http.server), pas en double-cliquant sur le fichier.</p>`;
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
    if (location.hash.startsWith("#/match/")) location.hash = "#/matchs"; else afficher();
  }));
  el.addEventListener("click", e => { const tr = e.target.closest("tr[data-id]"); if (tr) location.hash = "#/match/" + encodeURIComponent(tr.dataset.id); });
  el.addEventListener("keydown", e => { const tr = e.target.closest("tr[data-id]"); if (tr && e.key === "Enter") location.hash = "#/match/" + encodeURIComponent(tr.dataset.id); });
  window.addEventListener("hashchange", afficher);
  majFiltres();
  afficher();
}

demarrer();
