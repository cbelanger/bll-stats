"use strict";
// Garde la page de saisie disponible sans réseau (aréna).
// Réseau d'abord (toujours la dernière version publiée), copie en cache si le réseau manque.
// Seuls les fichiers de la saisie sont concernés ; le reste du site n'est pas touché.
const CACHE = "bll-saisie-v3";
const FICHIERS = ["saisie.html", "css/saisie.css", "js/saisie.js", "data/gardiennes.json", "assets/logo-bll.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(cles => Promise.all(cles.filter(k => k.startsWith("bll-saisie-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  const chemin = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  if (e.request.method !== "GET" || url.origin !== location.origin || !FICHIERS.includes(chemin)) return;
  // cache: "no-cache" : contourne le cache HTTP de GitHub Pages (10 min), sinon la page et le script
  // peuvent venir de deux versions différentes juste après une publication
  e.respondWith(
    fetch(url.href, { cache: "no-cache" })
      .then(r => { const copie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copie)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
