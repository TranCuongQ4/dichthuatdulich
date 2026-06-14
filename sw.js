// sw.js - Service Worker cho phép chạy offline
const CACHE_NAME = 'dichthuat-du-lich-v7';  // 🔥 Đổi version
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './tienganh.js',
    './tiengtrung.js',
    './tiengando.js',
    './tiengmalai.js',
    './tiengphap.js'
];

self.addEventListener('install', event => {
    console.log('SW: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW: Caching files');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('SW: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // 🔥 Bỏ qua request đến Cloudflare Worker
    if (url.hostname === 'dichthuatdulich.cuongprovuidulieu.workers.dev') {
        event.respondWith(fetch(event.request));
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).catch(err => {
                    console.log('SW: Fetch failed (offline?)', event.request.url);
                    return new Response('Offline - Vui lòng kết nối mạng để dịch mới', {
                        status: 503,
                        statusText: 'Offline'
                    });
                });
            })
    );
});