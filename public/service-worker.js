// service-worker.js

const CACHE_NAME = 'hotelos-cache-v1';
const OFFLINE_URL = '/index.html';

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force SW to activate immediately
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim()); // Control clients immediately
});

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Focus existing window if open
            for (const client of clientList) {
                if (client.url && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open new window if none exists
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// Optional: Handle Push events from server (future proofing)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        self.registration.showNotification(data.title || 'DirectorOS', {
            body: data.body || 'Nouvelle notification',
            icon: '/pwa-192x192.svg',
            badge: '/pwa-192x192.svg',
            vibrate: [200, 100, 200]
        });
    }
});
