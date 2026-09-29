"use strict";

const CACHE_PREFIX = "ga-management-";
const STATIC_CACHE = `${CACHE_PREFIX}static-v1`;
const OFFLINE_URL = "/offline.html";
const STATIC_PATHS = new Set([
  "/apple-icon.png",
  "/favicon.ico",
  "/icon.png",
  "/manifest.webmanifest",
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== STATIC_CACHE)
          .map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Authenticated pages and their React Server Component payloads always come
  // from the server. Only show a public, data-free fallback when navigation
  // cannot reach the network.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (
        (await caches.match(OFFLINE_URL)) || Response.error()
      )),
    );
    return;
  }

  const isStaticAsset = url.pathname.startsWith("/_next/static/") || STATIC_PATHS.has(url.pathname);
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          void caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      });
    }),
  );
});
