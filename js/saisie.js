"use strict";

/* Saisie des stats sur téléphone pendant le match.
   Tout reste dans le navigateur (localStorage) ; « Terminer » exporte un fichier JSON
   avec les mêmes noms de champs que le PDF Sommaire, à déposer dans data/matchs/ (lu par tools/extract.py).
   « Ouvrir un match du site » recharge n'importe quel fichier de data/matchs/ pour le corriger. */

const PER = [["p1", "P1"], ["p2", "P2"], ["p3", "P3"], ["p4", "P4"], ["prol", "Prol."]];
const TYPES = [["P", "Pick / écran"], ["T", "Triangle"], ["L", "Tir de loin"], ["R", "Rebond"],
               ["E", "Échappée"], ["D", "Déviation"], ["FC", "Fille de coin"], ["A", "Autre"]];
const ZONES = ["HG", "HC", "HD", "CG", "C", "CD", "BG", "BC", "BD"];
const FORMAT = "bll-match-1";
const CLE = "bll-saisie-match", CLE_PREFS = "bll-saisie-prefs", CLE_PRECEDENT = "bll-saisie-precedent";

const $ = s => document.querySelector(s);
const nomP = k => (PER.find(p => p[0] === k) || [null, "?"])[1];   // « ? » : période inconnue
const somme = o => Object.values(o).reduce((a, b) => a + b, 0);
const vide = () => ({ p1: 0, p2: 0, p3: 0, p4: 0, prol: 0 });
// Période inconnue (buts BLL d'un match venu d'un PDF) : comptée dans le total seulement
const compteP = arr => { const o = vide(); arr.forEach(b => { if (b.periode in o) o[b.periode]++; }); return o; };
// Buts sans période (match rouvert) : « + » dans une période en place un au lieu d'en ajouter un.
// place = but placé ainsi : score et tirs inchangés ; « − » le remet sans période.
const sansPeriode = arr => arr.filter(b => !b.periode).length;
// Le but a-t-il ajouté un tir dans sa période ? Oui en saisie en direct ; non pour un but placé
// ou un match venu d'un PDF (tirs comptés à part sur papier) : changer sa période ne touche pas aux tirs.
const tirLie = b => !b.place && S.origine !== "pdf";
const detailButs = arr => detail(compteP(arr)) + (sansPeriode(arr) ? ` · <span class="manque-p">sans période&nbsp;${sansPeriode(arr)}</span>` : "");
const d2 = n => String(n).padStart(2, "0");
const aujourdhui = () => { const d = new Date(); return `${d.getFullYear()}-${d2(d.getMonth() + 1)}-${d2(d.getDate())}`; };
const maintenant = () => { const d = new Date(); return `${d2(d.getHours())}:${d2(d.getMinutes())}`; };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const texteGardienne = g => `${g.nom} #${g.numero}`;
const slug = s =>s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* ---------- État */
function lireStockage(cle) { try { return JSON.parse(localStorage.getItem(cle) || "null"); } catch (e) { return null; } }
function ecrireStockage(cle, v) { try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }

function nouveau() {
  const p = lireStockage(CLE_PREFS) || {};
  return {
    equipe: p.equipe || "U19AA", adversaire: "", date: aujourdhui(), no_match: "",
    heure_debut: "", heure_fin: "", responsable: p.responsable || "", gardienne: p.gardienne || "",
    periode: "p1", tirs: { nous: vide(), adv: vide() }, butsNous: [], butsAdv: [], sz: { r: 0, x: 0 },
    notes: "", exporte: false,
    fichier: null, origine: "saisie", ouvert: false,   // ouvert = rechargé depuis le site, pas encore modifié
    tirsInconnus: { nous: false, adv: false }          // tirs jamais saisis (match rouvert venu d'un PDF incomplet)
  };
}
const tirsInconnus = c => !!(S.tirsInconnus && S.tirsInconnus[c]);
const aDesDonnees = () => somme(S.tirs.nous) + somme(S.tirs.adv) + S.butsNous.length + S.butsAdv.length + S.sz.r + S.sz.x > 0;

let S = lireStockage(CLE) || nouveau();
let hist = [], courant = null, courantCote = "adv", brouillon = null;   // but ouvert dans la feuille
const buts = c => c === "nous" ? S.butsNous : S.butsAdv;

// Liste officielle (data/gardiennes.json) ; dernière copie gardée pour le hors-ligne
const CLE_GARDIENNES = "bll-saisie-gardiennes";
let GARDIENNES = lireStockage(CLE_GARDIENNES) || [];
let choixGardienne = null;   // index dans GARDIENNES, "autre" ou null
async function chargerGardiennes() {
  try {
    const r = await fetch("data/gardiennes.json", { cache: "no-cache" });
    if (r.ok) { GARDIENNES = (await r.json()).gardiennes || []; ecrireStockage(CLE_GARDIENNES, GARDIENNES); }
  } catch (e) { /* hors ligne : on garde la dernière copie */ }
}

function sauver() { ecrireStockage(CLE, S); }
function vibrer() { try { navigator.vibrate && navigator.vibrate(12); } catch (e) { /* rien */ } }
function toast(t) {
  const e = $("#toast"); e.textContent = t; e.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { e.hidden = true; }, 2600);
}
// Toute modification passe par ici : une étape d'annulation, sauvegarde, réaffichage.
// compte = événement de jeu : la première fixe l'heure de début si elle est vide.
function action(libelle, fn, compte = false) {
  hist.push({ libelle, etat: JSON.stringify(S) });
  if (hist.length > 100) hist.shift();
  if (compte && !S.heure_debut) S.heure_debut = maintenant();
  fn();
  S.exporte = false; S.ouvert = false;
  sauver(); afficher(); vibrer();
}
function annuler() {
  const h = hist.pop(); if (!h) return;
  S = JSON.parse(h.etat); sauver(); afficher(); toast("Annulé : " + h.libelle);
}

/* ---------- Affichage */
function detail(o) {
  return PER.filter(([k]) => o[k] || k === S.periode)
    .map(([k, l]) => k === S.periode ? `<b>${l}&nbsp;${o[k]}</b>` : `${l}&nbsp;${o[k]}`).join(" · ");
}
function afficher() {
  $("#t-equipe").textContent = S.equipe;
  $("#t-adv").textContent = S.adversaire || "adversaire ?";
  $("#score").textContent = `${S.butsNous.length}–${S.butsAdv.length}`;
  document.querySelectorAll("#periodes button").forEach(b => b.setAttribute("aria-pressed", b.dataset.p === S.periode));
  $("#per-cour").textContent = nomP(S.periode);
  for (const c of ["nous", "adv"]) {
    $("#tot-" + c).textContent = tirsInconnus(c) ? "–" : somme(S.tirs[c]);
    $("#det-" + c).innerHTML = tirsInconnus(c) ? "non saisis" : detail(S.tirs[c]);
  }
  $("#bn").textContent = S.butsNous.length; $("#det-bn").innerHTML = detailButs(S.butsNous);
  $("#ba").textContent = S.butsAdv.length; $("#det-ba").innerHTML = detailButs(S.butsAdv);
  const tot = S.sz.r + S.sz.x;
  $("#szr").textContent = S.sz.r; $("#szx").textContent = S.sz.x;
  $("#szp").textContent = tot ? `${Math.round(100 * S.sz.r / tot)} % réussies` : "";
  $("#gard").textContent = S.gardienne;

  // Buts des deux équipes dans l'ordre du match : période, puis temps décroissant (chrono qui descend),
  // sinon ordre de saisie. Les buts accordés gardent leur numéro (celui du filet sur le site).
  const m = '<i class="manque">?</i>';
  const ordreP = k => { const i = PER.findIndex(p => p[0] === k); return i < 0 ? 9 : i; };
  const sec = t => { const x = /^(\d+):(\d{2})$/.exec(t || ""); return x ? 60 * x[1] + Number(x[2]) : null; };
  const tous = ["adv", "nous"].flatMap(c => buts(c).map((b, i) => ({ b, i, c })))
    .sort((x, y) => ordreP(x.b.periode) - ordreP(y.b.periode)
      || (sec(x.b.temps) != null && sec(y.b.temps) != null ? sec(y.b.temps) - sec(x.b.temps) : 0));
  $("#liste").innerHTML = tous.length ? tous.map(({ b, i, c }) => `
    <li><button type="button" class="but ${c}" data-act="but-edit" data-c="${c}" data-i="${i}" aria-label="Modifier le but ${c === "nous" ? "BLL" : "accordé"} ${i + 1}">
      <span class="no">${c === "nous" ? "BLL" : i + 1}</span><span>${nomP(b.periode)}</span><span>${b.temps || m}</span>
      <span class="ty">${b.type ? `${b.type} <span>${TYPES.find(t => t[0] === b.type)[1]}</span>` : m}</span>
      <span>${b.zone || m}</span><span class="fl" aria-hidden="true">›</span>
    </button></li>`).join("")
    : `<li class="vide">Aucun but. Touche « + But » ou « + But accordé » au moment du but.</li>`;
  const incomplets = S.butsAdv.filter(b => !b.temps || !b.type || !b.zone).length + S.butsNous.filter(b => !b.temps || !b.type || !b.zone).length;
  $("#note-liste").textContent = incomplets ? `${incomplets} but${incomplets > 1 ? "s" : ""} à compléter (?) : touche la ligne quand le jeu est arrêté.` : "";
  $("#note-liste").hidden = !incomplets;

  $("#bandeau").hidden = !S.exporte;
  $("#bandeau-txt").textContent = S.ouvert ? `Match du site ouvert (${S.fichier}), sans modification.` : "Match exporté. Pour le suivant :";

  const h = hist[hist.length - 1];
  $("#annuler").disabled = !h;
  $("#annuler-l").textContent = h ? "Annuler : " + h.libelle : "Rien à annuler";
}

/* ---------- Feuille « but accordé » */
function construireFeuilleBut() {
  $("#fb-per").innerHTML = PER.map(([k, l]) => `<button type="button" class="puce" data-bp="${k}">${l}</button>`).join("");
  $("#fb-types").innerHTML = TYPES.map(([k, l]) => `<button type="button" class="puce" data-bt="${k}"><b>${k}</b><span>${l}</span></button>`).join("");
  $("#fb-zones").innerHTML = ZONES.map(z => `<button type="button" data-bz="${z}">${z}</button>`).join("");
}
function majFeuilleBut() {
  document.querySelectorAll("[data-bp]").forEach(b => b.setAttribute("aria-pressed", b.dataset.bp === brouillon.periode));
  document.querySelectorAll("[data-bt]").forEach(b => b.setAttribute("aria-pressed", b.dataset.bt === brouillon.type));
  document.querySelectorAll("[data-bz]").forEach(b => b.setAttribute("aria-pressed", b.dataset.bz === brouillon.zone));
}
function ouvrirBut(cote, i) {
  courant = i; courantCote = cote; brouillon = { temps: "", type: "", zone: "", ...buts(cote)[i] };
  $("#fb-titre").textContent = cote === "nous" ? `But BLL no ${i + 1}` : `But accordé no ${i + 1}`;
  $("#temps").value = brouillon.temps;
  $("#err-temps").hidden = true;
  majFeuilleBut();
  $("#f-but").showModal();
}
function normTemps(t) {
  const d = t.replace(/\D/g, "").slice(-4);
  if (!d) return "";
  const ss = d.slice(-2).padStart(2, "0"), mm = d.length > 2 ? String(Number(d.slice(0, -2))) : "0";
  return Number(ss) > 59 ? null : `${mm}:${ss}`;
}

/* ---------- Infos du match */
function ouvrirInfos() {
  document.querySelectorAll("[data-eq]").forEach(x => x.setAttribute("aria-pressed", x.dataset.eq === S.equipe));
  $("#fi-adv").value = S.adversaire; $("#fi-date").value = S.date; $("#fi-no").value = S.no_match;
  $("#fi-debut").value = S.heure_debut; $("#fi-fin").value = S.heure_fin;
  $("#fi-resp").value = S.responsable;
  // Gardienne : boutons de la liste officielle, sinon « Autre » (nom + numéro)
  const i = GARDIENNES.findIndex(g => texteGardienne(g) === S.gardienne);
  const m = S.gardienne.match(/^(.*?)\s*#\s*(\d+)\s*$/);
  choixGardienne = i >= 0 ? i : S.gardienne ? "autre" : null;
  $("#fi-gnom").value = i < 0 && S.gardienne ? (m ? m[1] : S.gardienne) : "";
  $("#fi-gno").value = i < 0 && m ? m[2] : "";
  $("#fi-gards").innerHTML = GARDIENNES.map((g, k) => `<button type="button" class="puce" data-gd="${k}">${esc(texteGardienne(g))}</button>`).join("")
    + `<button type="button" class="puce" data-gd="autre">Autre</button>`;
  majGardienne();
  if (!$("#f-infos").open) $("#f-infos").showModal();
}

function majGardienne() {
  document.querySelectorAll("[data-gd]").forEach(b => b.setAttribute("aria-pressed", b.dataset.gd === String(choixGardienne)));
  $("#fi-autre").hidden = choixGardienne !== "autre";
  $("#err-gard").hidden = true;
}
// Texte « Nom #numéro » (format du PDF), ou null si « Autre » est incomplet
function gardienneChoisie() {
  if (choixGardienne === null) return "";
  if (choixGardienne !== "autre") return texteGardienne(GARDIENNES[choixGardienne]);
  const nom = $("#fi-gnom").value.trim(), no = $("#fi-gno").value.replace(/\D/g, "");
  return nom && no ? `${nom} #${Number(no)}` : null;
}

/* ---------- Export (mêmes champs que le PDF Sommaire) */
function prolJouee() {
  return S.periode === "prol" || S.tirs.nous.prol > 0 || S.tirs.adv.prol > 0 ||
    S.butsNous.concat(S.butsAdv).some(b => b.periode === "prol");
}
function champs() {
  const tot = S.sz.r + S.sz.x;
  const c = {
    equipe_U16AA: S.equipe === "U16AA" ? "Oui" : "", equipe_U19AA: S.equipe === "U19AA" ? "Oui" : "",
    adversaire: S.adversaire, date: S.date, heure_debut: S.heure_debut, heure_fin: S.heure_fin,
    no_match: S.no_match, responsable: S.responsable, gardienne: S.gardienne,
    buts_nous: S.butsNous.length, buts_adv: S.butsAdv.length,
    tirs_nous: somme(S.tirs.nous), tirs_adv: somme(S.tirs.adv),
    sz_tentatives: tot || "", sz_reussies: tot ? S.sz.r : "",
    notes: S.notes
  };
  for (const cote of ["nous", "adv"]) {
    // Prolongation vide = pas de prolongation (extract.py la laisse à null) ; tirs jamais saisis = vides
    if (tirsInconnus(cote)) { c[`tirs_${cote}`] = ""; for (const [k] of PER) c[`tirs_${cote}_${k}`] = ""; continue; }
    for (const [k] of PER) c[`tirs_${cote}_${k}`] = k === "prol" && !prolJouee() ? "" : S.tirs[cote][k];
  }
  // Un but sans aucun détail (période inconnue, rien d'autre) ne donne pas de ligne : il compte dans buts_adv
  S.butsAdv.forEach((b, i) => {
    if (!b.periode && !b.temps && !b.type && !b.zone) return;
    const n = i + 1;
    c[`but_${n}_periode`] = !b.periode ? "" : b.periode === "prol" ? "Prol." : b.periode.slice(1);
    c[`but_${n}_temps`] = b.temps; c[`but_${n}_type`] = b.type; c[`but_${n}_zone`] = b.zone;
  });
  // Buts BLL : nombre par période, et une ligne par but détaillé (période, temps, type, zone du filet adverse)
  const bp = compteP(S.butsNous);
  for (const [k] of PER) if (bp[k]) c[`buts_nous_${k}`] = bp[k];
  S.butsNous.forEach((b, i) => {
    if (!b.periode && !b.temps && !b.type && !b.zone) return;
    const n = i + 1;
    c[`but_nous_${n}_periode`] = !b.periode ? "" : b.periode === "prol" ? "Prol." : b.periode.slice(1);
    c[`but_nous_${n}_temps`] = b.temps || ""; c[`but_nous_${n}_type`] = b.type || ""; c[`but_nous_${n}_zone`] = b.zone || "";
  });
  return c;
}
// Même règle que nom_fichier() dans tools/extract.py ; un match rouvert garde son nom pour remplacer le fichier
const nomFichier = () => S.fichier ||
  `${S.date || "sans-date"}_${S.equipe}_${slug(S.adversaire) || "adversaire"}${slug(S.no_match) ? "_" + slug(S.no_match) : ""}.json`;
const contenuExport = () => JSON.stringify(
  { format: FORMAT, exporte_le: new Date().toISOString(), source: S.origine || "saisie", champs: champs() }, null, 2);

/* ---------- Ouvrir un match du site (data/matchs/<fichier>) */
function depuisChamps(c, fichier, origine) {
  const t = k => { const v = c[k] == null ? "" : String(c[k]).trim(); return v === "/Off" || v === "Off" ? "" : v; };
  const n = k => { const v = parseFloat(t(k).replace(",", ".")); return isNaN(v) ? 0 : Math.trunc(v); };
  const s = { ...nouveau(), fichier, origine: origine || "saisie", exporte: true, ouvert: true };
  s.equipe = t("equipe_U16AA") ? "U16AA" : "U19AA";
  for (const k of ["adversaire", "date", "no_match", "heure_debut", "heure_fin", "responsable", "gardienne", "notes"]) s[k] = t(k);
  for (const cote of ["nous", "adv"]) {
    for (const [k] of PER) s.tirs[cote][k] = n(`tirs_${cote}_${k}`);
    if (!somme(s.tirs[cote])) s.tirs[cote].p1 = n(`tirs_${cote}`);   // PDF sans détail par période
    s.tirsInconnus[cote] = !PER.some(([k]) => t(`tirs_${cote}_${k}`)) && !t(`tirs_${cote}`);
  }
  // Buts BLL : lignes détaillées si présentes, sinon nombre par période ; le reste sans période (le total reste exact)
  const per = { "1": "p1", "2": "p2", "3": "p3", "4": "p4", "Prol.": "prol" };
  const maxN = Math.max(0, ...Object.keys(c).map(k => (k.match(/^but_nous_(\d+)_/) || [])[1] || 0).map(Number));
  for (let i = 1; i <= maxN; i++) {
    const b = { periode: per[t(`but_nous_${i}_periode`)] || null, temps: t(`but_nous_${i}_temps`),
                type: t(`but_nous_${i}_type`).split(/\s+[–-]\s+/)[0], zone: t(`but_nous_${i}_zone`) };
    if (t(`but_nous_${i}_periode`) || b.temps || b.type || b.zone) s.butsNous.push(b);
  }
  if (!maxN) for (const [k] of PER) for (let i = 0; i < n(`buts_nous_${k}`); i++) s.butsNous.push({ periode: k, temps: "", type: "", zone: "" });
  while (s.butsNous.length < n("buts_nous")) s.butsNous.push({ periode: null, temps: "", type: "", zone: "" });
  const max = Math.max(15, ...Object.keys(c).map(k => (k.match(/^but_(\d+)_periode$/) || [])[1] || 0).map(Number));
  for (let i = 1; i <= max; i++) {
    const b = { periode: per[t(`but_${i}_periode`)] || null, temps: t(`but_${i}_temps`),
                type: t(`but_${i}_type`).split(/\s+[–-]\s+/)[0], zone: t(`but_${i}_zone`) };
    if (t(`but_${i}_periode`) || b.temps || b.type || b.zone) s.butsAdv.push(b);
  }
  // Buts accordés sans ligne de détail : lignes vides à compléter, pour garder le bon score
  while (s.butsAdv.length < n("buts_adv")) s.butsAdv.push({ periode: null, temps: "", type: "", zone: "" });
  const tot = n("sz_tentatives"); s.sz = { r: n("sz_reussies"), x: Math.max(0, tot - n("sz_reussies")) };
  s.periode = [...PER].reverse().map(([k]) => k).find(k => s.tirs.nous[k] || s.tirs.adv[k]) || "p1";
  return s;
}
async function listerMatchs() {
  $("#fo-liste").innerHTML = `<li class="vide">Chargement…</li>`;
  $("#fo-avert").hidden = !(aDesDonnees() && !S.exporte);
  if (!$("#f-ouvrir").open) $("#f-ouvrir").showModal();
  try {
    const r = await fetch("data/matchs.json", { cache: "no-cache" });
    if (!r.ok) throw new Error(r.status);
    const ms = (await r.json()).matchs.filter(m => m.fichier && m.fichier.endsWith(".json"));
    $("#fo-liste").innerHTML = ms.length ? ms.map(m => `
      <li><button type="button" class="match-l" data-fichier="${esc(m.fichier)}">
        <span>${esc(m.date)} · ${esc(m.equipe)}</span><b>${esc(m.adversaire)}</b><span class="n">${m.buts.nous}–${m.buts.adv}</span>
      </button></li>`).join("") : `<li class="vide">Aucun match publié.</li>`;
  } catch (e) {
    $("#fo-liste").innerHTML = `<li class="vide">Liste indisponible : il faut du réseau pour ouvrir un match du site.</li>`;
  }
}
/* ---------- Match mis de côté (un seul, gardé même si l'application est fermée) */
const nonExporte = s => !s.exporte && somme(s.tirs.nous) + somme(s.tirs.adv) + s.butsNous.length + s.butsAdv.length + s.sz.r + s.sz.x > 0;
const resume = s => `${s.equipe} contre ${s.adversaire || "adversaire ?"}, ${s.butsNous.length}–${s.butsAdv.length}`;
function mettreDeCote() {
  if (nonExporte(S)) { ecrireStockage(CLE_PRECEDENT, S); return true; }
  return false;
}
function ouvrirMenu() {
  const p = lireStockage(CLE_PRECEDENT);
  $("#b-recuperer").hidden = !p;
  if (p) $("#b-recuperer").textContent = `Récupérer : ${resume(p)}`;
  if (!$("#f-menu").open) $("#f-menu").showModal();
}

async function ouvrirMatch(fichier) {
  try {
    const r = await fetch("data/matchs/" + encodeURIComponent(fichier), { cache: "no-cache" });
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    mettreDeCote();
    action("Ouvrir " + fichier, () => { S = depuisChamps(data.champs || {}, fichier, data.source); });
    S.exporte = true; S.ouvert = true; sauver(); afficher();   // action() les remet à false
    $("#f-ouvrir").close();
    const sp = sansPeriode(S.butsNous) + sansPeriode(S.butsAdv);
    toast(sp ? `Match ouvert : ${sp} but${sp > 1 ? "s" : ""} sans période. Choisis la période, puis « + » pour les placer.`
             : "Match ouvert. Corrige-le, puis « Terminer » pour le réexporter sous le même nom.");
  } catch (e) {
    toast("Impossible d’ouvrir ce match (réseau ?).");
  }
}

// Mêmes règles qu'extract.py : « er » bloque l'export, « av » est un avertissement
function verifications() {
  const v = [];
  if (!S.adversaire.trim()) v.push(["er", "Adversaire manquant (touche le nom du match en haut)."]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(S.date)) v.push(["er", "Date manquante."]);
  if (!tirsInconnus("adv") && S.butsAdv.length > somme(S.tirs.adv)) v.push(["er", "Plus de buts accordés que de tirs adverses."]);
  if (!tirsInconnus("nous") && S.butsNous.length > somme(S.tirs.nous)) v.push(["er", "Plus de buts BLL que de tirs BLL."]);
  if (!S.no_match.trim()) v.push(["av", "Numéro de match manquant."]);
  if (!S.gardienne.trim()) v.push(["av", "Gardienne non indiquée."]);
  const sp = sansPeriode(S.butsNous) + sansPeriode(S.butsAdv);
  if (sp) v.push(["av", `${sp} but${sp > 1 ? "s" : ""} sans période (choisir la période, puis « + »).`]);
  const inc = S.butsAdv.filter(b => !b.type || !b.zone).length;
  if (inc) v.push(["av", `${inc} but${inc > 1 ? "s" : ""} accordé${inc > 1 ? "s" : ""} sans type ou zone.`]);
  if (!v.length) v.push(["ok", "Tout est complet."]);
  return v;
}
function ouvrirTerminer() {
  if (!S.heure_fin) S.heure_fin = maintenant();
  $("#ff-fin").value = S.heure_fin;
  const v = verifications();
  const ic = { er: "✗", av: "!", ok: "✓" };
  $("#verifs").innerHTML = v.map(([n, t]) => `<li class="${n}"><span aria-hidden="true">${ic[n]}</span><span></span></li>`).join("");
  $("#verifs").querySelectorAll("li > span:last-child").forEach((s, i) => { s.textContent = v[i][1]; });
  $("#b-telecharger").disabled = $("#b-pdf").disabled = v.some(([n]) => n === "er");
  $("#nom-fichier").textContent = nomFichier() + (S.exporte ? " (déjà téléchargé)" : "");
  sauver();
  $("#f-fin").showModal();
}
function telecharger() {
  const url = URL.createObjectURL(new Blob([contenuExport()], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = nomFichier();
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  S.exporte = true; sauver();
  $("#nom-fichier").textContent = nomFichier() + " (déjà téléchargé)";
  toast("Fichier enregistré dans Téléchargements");
  afficher();   // bandeau « Nouveau match »
}
/* ---------- PDF Sommaire rempli (fiche vierge du site + pdf-lib, chargé seulement au besoin) */
const FICHE_SOMMAIRE = "fiches/BLL - Statistiques - Sommaire - Match.pdf";
const LIGNES_PDF = { adv: 15, nous: 8 };   // lignes de la section 2 et colonnes de la section 3 du Sommaire
function chargerPdfLib() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  return new Promise((ok, ko) => {
    const s = document.createElement("script");
    s.src = "js/vendor/pdf-lib.min.js"; s.onload = () => ok(window.PDFLib); s.onerror = ko;
    document.head.append(s);
  });
}
async function telechargerPdf() {
  const b = $("#b-pdf"); b.disabled = true; b.textContent = "Préparation du PDF…";
  try {
    const PDFLib = await chargerPdfLib();
    const r = await fetch(FICHE_SOMMAIRE);
    if (!r.ok) throw new Error("fiche " + r.status);
    const doc = await PDFLib.PDFDocument.load(await r.arrayBuffer());
    const form = doc.getForm();
    const c = champs();
    // Filet du PDF (calculé par Acrobat) : numéros des buts accordés par zone
    for (const z of ZONES) c[`zone_${z}`] = S.butsAdv.map((x, i) => x.zone === z && i < LIGNES_PDF.adv ? i + 1 : 0).filter(Boolean).join(", ");
    // Buts au-delà des lignes du PDF : recopiés dans les notes
    const extra = [
      ...S.butsAdv.slice(LIGNES_PDF.adv).map((x, i) => `But accordé ${LIGNES_PDF.adv + i + 1} : ${nomP(x.periode)} ${x.temps || "?"} ${x.type || "?"} ${x.zone || "?"}`),
      ...S.butsNous.slice(LIGNES_PDF.nous).map((x, i) => `But BLL ${LIGNES_PDF.nous + i + 1} : ${nomP(x.periode)} ${x.temps || "?"} ${x.type || "?"} ${x.zone || "?"}`)];
    if (extra.length) c.notes = [c.notes, ...extra].filter(Boolean).join("\n");
    for (const [nom, v] of Object.entries(c)) {
      const f = form.getFieldMaybe(nom);
      if (!f) continue;
      const val = v == null ? "" : String(v);
      if (f instanceof PDFLib.PDFCheckBox) { val ? f.check() : f.uncheck(); continue; }
      if (f instanceof PDFLib.PDFDropdown) {
        if (!val) continue;
        // Types de la section 2 : « R – Rebond » dans le PDF, « R » dans la saisie
        const opt = f.getOptions().find(o => o === val) || f.getOptions().find(o => o.startsWith(val + " –"));
        try { f.select(opt || val); } catch (e) { /* valeur absente d'une liste non éditable */ }
        continue;
      }
      if (f instanceof PDFLib.PDFTextField) f.setText(val);
    }
    form.updateFieldAppearances();
    const url = URL.createObjectURL(new Blob([await doc.save()], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url; a.download = nomFichier().replace(/\.json$/, ".pdf");
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(extra.length ? `PDF enregistré ; ${extra.length} but(s) de plus sont dans les notes` : "PDF enregistré dans Téléchargements");
  } catch (e) {
    toast("PDF impossible : " + (e.message || e));
  } finally {
    b.disabled = false; b.textContent = "Télécharger aussi le PDF Sommaire";
  }
}

function copier() {
  const txt = contenuExport();
  const repli = () => {
    const t = document.createElement("textarea");
    t.value = txt; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    $("#f-fin").append(t); t.select();
    try { document.execCommand("copy"); toast("Contenu copié"); } catch (e) { toast("Copie impossible sur ce navigateur"); }
    t.remove();
  };
  try { navigator.clipboard.writeText(txt).then(() => toast("Contenu copié"), repli); } catch (e) { repli(); }
}

/* ---------- Écran toujours allumé pendant le match (si le navigateur le permet) */
let verrou = null;
async function garderEveille() {
  try {
    if (!verrou && navigator.wakeLock && document.visibilityState === "visible") {
      verrou = await navigator.wakeLock.request("screen");
      verrou.addEventListener("release", () => { verrou = null; });
    }
  } catch (e) { /* refusé : sans conséquence */ }
}
document.addEventListener("pointerdown", garderEveille, { once: true });
document.addEventListener("visibilitychange", garderEveille);

/* ---------- Événements */
document.addEventListener("click", e => {
  // Clic sur le voile d'une feuille : fermer
  if (e.target.matches("dialog.feuille")) { e.target.close(); return; }

  const p = e.target.closest("#periodes button");
  if (p) { if (p.dataset.p !== S.periode) action("Période " + nomP(p.dataset.p), () => { S.periode = p.dataset.p; }); return; }

  const bp = e.target.closest("[data-bp]"), bt = e.target.closest("[data-bt]"), bz = e.target.closest("[data-bz]");
  if (bp) { brouillon.periode = bp.dataset.bp; majFeuilleBut(); return; }
  if (bt) { brouillon.type = brouillon.type === bt.dataset.bt ? "" : bt.dataset.bt; majFeuilleBut(); return; }
  if (bz) { brouillon.zone = brouillon.zone === bz.dataset.bz ? "" : bz.dataset.bz; majFeuilleBut(); return; }

  const fo = e.target.closest("[data-fichier]");
  if (fo) { ouvrirMatch(fo.dataset.fichier); return; }

  const gd = e.target.closest("[data-gd]");
  if (gd) {
    const v = gd.dataset.gd === "autre" ? "autre" : Number(gd.dataset.gd);
    choixGardienne = choixGardienne === v ? null : v;   // toucher à nouveau désélectionne
    majGardienne();
    return;
  }

  const eq = e.target.closest("[data-eq]");
  if (eq) { document.querySelectorAll("[data-eq]").forEach(b => b.setAttribute("aria-pressed", b === eq)); return; }

  const b = e.target.closest("[data-act]"); if (!b) return;
  const P = S.periode, lp = nomP(P);
  switch (b.dataset.act) {
    case "tir": {
      const c = b.dataset.c;
      action(`Tir ${c === "nous" ? "BLL" : "adv."} ${lp}`, () => { S.tirs[c][P]++; if (S.tirsInconnus) S.tirsInconnus[c] = false; }, true);
      break;
    }
    case "tir-moins": {
      const c = b.dataset.c;
      if (!S.tirs[c][P]) { toast(`Aucun tir ${c === "nous" ? "BLL" : "adverse"} en ${lp} à retirer.`); break; }
      action(`Retrait tir ${c === "nous" ? "BLL" : "adv."} ${lp}`, () => { S.tirs[c][P]--; });
      break;
    }
    case "but-nous": {
      const j = S.butsNous.findIndex(x => !x.periode);
      if (j >= 0) {
        action(`But BLL placé en ${lp}`, () => { S.butsNous[j] = { ...S.butsNous[j], periode: P, place: true }; });
        const n = sansPeriode(S.butsNous);
        toast(`But BLL placé en ${lp}, score inchangé${n ? ` (${n} encore sans période)` : ""}`);
        ouvrirBut("nous", j);
        break;
      }
      // Comme un but accordé : compte tout de suite, temps et type maintenant ou plus tard
      action(`But BLL ${lp}`, () => { S.butsNous.push({ periode: P, temps: "", type: "", zone: "" }); S.tirs.nous[P]++; }, true);
      ouvrirBut("nous", S.butsNous.length - 1);
      break;
    }
    case "but-nous-moins": {
      const i = S.butsNous.map(x => x.periode).lastIndexOf(P);
      if (i < 0) { toast(`Aucun but BLL en ${lp} à retirer.`); break; }
      if (!tirLie(S.butsNous[i])) {
        action(`But BLL remis sans période`, () => { S.butsNous[i] = { periode: null }; });
        toast("But remis sans période (score inchangé)");
        break;
      }
      action(`Retrait but BLL ${lp}`, () => { S.butsNous.splice(i, 1); S.tirs.nous[P] = Math.max(0, S.tirs.nous[P] - 1); });
      break;
    }
    case "but-adv": {
      const j = S.butsAdv.findIndex(x => !x.periode);
      if (j >= 0) {
        action(`But accordé placé en ${lp}`, () => { S.butsAdv[j] = { ...S.butsAdv[j], periode: P, place: true }; });
        const n = sansPeriode(S.butsAdv);
        toast(`But accordé no ${j + 1} placé en ${lp}, score inchangé${n ? ` (${n} encore sans période)` : ""}`);
        ouvrirBut("adv", j);
        break;
      }
      // Le but compte tout de suite ; le détail se complète maintenant ou plus tard
      action(`But accordé ${lp}`, () => { S.butsAdv.push({ periode: P, temps: "", type: "", zone: "" }); S.tirs.adv[P]++; }, true);
      ouvrirBut("adv", S.butsAdv.length - 1);
      break;
    }
    case "but-edit": ouvrirBut(b.dataset.c, Number(b.dataset.i)); break;
    case "but-ok": {
      const t = normTemps($("#temps").value);
      if (t === null) { $("#err-temps").hidden = false; break; }
      const i = courant, c = courantCote, nouv = { ...brouillon, temps: t };
      action(`Détail du but ${c === "nous" ? "BLL " : ""}${i + 1}`, () => {
        const ancien = buts(c)[i];
        if (ancien.periode !== nouv.periode && ancien.periode && nouv.periode && tirLie(ancien)) {
          S.tirs[c][ancien.periode] = Math.max(0, S.tirs[c][ancien.periode] - 1);
          S.tirs[c][nouv.periode]++;
        }
        buts(c)[i] = nouv;
      });
      $("#f-but").close();
      break;
    }
    case "but-suppr": {
      const i = courant, c = courantCote;
      action(`Suppression du but ${c === "nous" ? "BLL " : ""}${i + 1}`, () => {
        const x = buts(c).splice(i, 1)[0];
        if (x.periode && tirLie(x)) S.tirs[c][x.periode] = Math.max(0, S.tirs[c][x.periode] - 1);
      });
      $("#f-but").close();
      toast(S.origine === "pdf" ? "But supprimé (tirs inchangés). « Annuler » le remet."
        : `But supprimé (−1 tir ${c === "nous" ? "BLL" : "adverse"}). « Annuler » le remet.`);
      break;
    }
    case "sz": {
      const r = b.dataset.r;
      action(r === "r" ? "Sortie réussie" : "Sortie ratée", () => { S.sz[r]++; }, true);
      break;
    }
    case "sz-moins": {
      const r = b.dataset.r;
      if (!S.sz[r]) break;
      action(r === "r" ? "Retrait sortie réussie" : "Retrait sortie ratée", () => { S.sz[r]--; });
      break;
    }
    case "annuler": annuler(); break;
    case "infos": if ($("#f-menu").open) $("#f-menu").close(); ouvrirInfos(); break;
    case "infos-ok": {
      const gardienne = gardienneChoisie();
      if (gardienne === null) { $("#err-gard").hidden = false; break; }
      const eqSel = document.querySelector('[data-eq][aria-pressed="true"]');
      const v = {
        equipe: eqSel ? eqSel.dataset.eq : S.equipe, adversaire: $("#fi-adv").value.trim(),
        date: $("#fi-date").value, no_match: $("#fi-no").value.trim(),
        heure_debut: $("#fi-debut").value, heure_fin: $("#fi-fin").value,
        gardienne, responsable: $("#fi-resp").value.trim()
      };
      action("Infos du match", () => Object.assign(S, v));
      ecrireStockage(CLE_PREFS, { equipe: v.equipe, gardienne: v.gardienne, responsable: v.responsable });
      $("#f-infos").close();
      break;
    }
    case "nouveau": {
      // Une touche : le match en cours, s'il n'est pas exporté, est mis de côté (récupérable par le menu)
      const garde = mettreDeCote();
      action("Nouveau match", () => { S = nouveau(); });
      if ($("#f-menu").open) $("#f-menu").close();
      toast(garde ? "Match précédent mis de côté : Menu ☰ → Récupérer." : "Nouveau match.");
      ouvrirInfos();
      break;
    }
    case "recuperer": {
      // Échange : le match mis de côté revient, le match en cours (s'il n'est pas exporté) prend sa place
      const p = lireStockage(CLE_PRECEDENT); if (!p) break;
      if (nonExporte(S)) ecrireStockage(CLE_PRECEDENT, S);
      else try { localStorage.removeItem(CLE_PRECEDENT); } catch (e) { /* rien */ }
      action("Récupérer le match précédent", () => { S = p; });
      S.exporte = p.exporte; sauver(); afficher();   // action() remet exporte à false
      $("#f-menu").close();
      toast("Match récupéré : " + resume(S));
      break;
    }
    case "menu": ouvrirMenu(); break;
    case "notes": $("#notes").value = S.notes; $("#f-notes").showModal(); break;
    case "notes-ok": S.notes = $("#notes").value; S.exporte = false; sauver(); $("#f-notes").close(); toast("Notes enregistrées"); break;
    case "ouvrir": if ($("#f-menu").open) $("#f-menu").close(); listerMatchs(); break;
    case "terminer": ouvrirTerminer(); break;
    case "telecharger": telecharger(); break;
    case "telecharger-pdf": telechargerPdf(); break;
    case "copier": copier(); break;
    case "fermer": b.closest("dialog").close(); break;
  }
});

// Temps : chiffres seulement, le « : » s'ajoute tout seul (845 → 8:45)
$("#temps").addEventListener("input", e => {
  const d = e.target.value.replace(/\D/g, "").slice(0, 4);
  e.target.value = d.length > 2 ? d.slice(0, -2) + ":" + d.slice(-2) : d;
  $("#err-temps").hidden = true;
});
$("#ff-fin").addEventListener("input", e => { S.heure_fin = e.target.value; S.exporte = false; sauver(); });
document.querySelectorAll("dialog").forEach(d => d.addEventListener("close", afficher));

// Hors ligne : la page reste disponible dans l'aréna même sans réseau
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw-saisie.js").catch(() => { /* sans conséquence */ });

construireFeuilleBut();
afficher();
// Liste des gardiennes d'abord, pour que les infos du match s'ouvrent avec les bons boutons
if (!S.adversaire && !aDesDonnees()) chargerGardiennes().then(ouvrirInfos);
else chargerGardiennes();
