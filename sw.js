const CACHE = 'finanzas-v3'

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/'])))
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return
  if (e.request.url.includes('/api/')) return

  // index.html: network first, cache como fallback
  if (e.request.url.endsWith('/') || e.request.url.includes('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const clone = r.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
          return r
        })
        .catch(() => caches.match(e.request))
    )
    return
  }

  // Resto de assets: cache first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  )
})

self.addEventListener('push', e => {
  const data = e.data?.json() || {}
  e.waitUntil(
    self.registration.showNotification(data.title || 'FinanzasApp', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' }
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(clients.openWindow(e.notification.data.url))
})
