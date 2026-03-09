// pwabuilder-sw.js

importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.3/workbox-sw.js');

if (workbox) {
    workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);
}

const CACHE = "lanly-offline";
const offlineFallbackPage = "index.html";

self.addEventListener("install", function (event) {
    console.log("[SW] Install Event processing");

    event.waitUntil(
        caches.open(CACHE).then(function (cache) {
            console.log("[SW] Cached offline page during install");
            return cache.add(offlineFallbackPage);
        })
    );
});

self.addEventListener("fetch", function (event) {
    if (event.request.method !== "GET") return;
    
    // Prevent caching API calls, socket.io or external non-http urls
    const urlStr = event.request.url || '';
    if (urlStr.includes('/api/') || urlStr.includes('socket.io') || !urlStr.startsWith('http')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(function (response) {
                // Must clone synchronously before passing response back to the browser
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    event.waitUntil(
                        caches.open(CACHE).then(function (cache) {
                            cache.put(event.request, responseToCache).catch(err => console.error("Cache Put Error:", err));
                        })
                    );
                }
                return response;
            })
            .catch(function (error) {
                return caches.open(CACHE).then(function (cache) {
                    return cache.match(event.request).then(function (matching) {
                        if (!matching) {
                            return cache.match(offlineFallbackPage);
                        } else {
                            return matching;
                        }
                    });
                });
            })
    );
});

// PUSH NOTIFICATIONS
self.addEventListener('push', function (event) {
    if (!(self.Notification && self.Notification.permission === 'granted')) {
        return;
    }

    const data = (event.data && event.data.json) ? event.data.json() : {};

    const title = data.title || "Nova mensagem no Lanly";
    const options = {
        body: data.body || "Você tem uma nova notificação.",
        icon: data.icon || '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: data.url || '/',
        vibrate: [100, 50, 100],
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// CLICK NOTIFICATION
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const urlToOpen = event.notification.data || '/';

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function (windowClients) {
            let matchingClient = null;

            for (let i = 0; i < windowClients.length; i++) {
                const windowClient = windowClients[i];
                if (windowClient.url.includes(urlToOpen)) {
                    matchingClient = windowClient;
                    break;
                }
            }

            if (matchingClient) {
                return matchingClient.focus();
            } else {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
