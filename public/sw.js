// Service Worker for PWA
const CACHE_NAME = 'mupl-cleaning-app-v1'
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
]

// Install event - 캐시 생성
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    })
  )
})

// Activate event - 오래된 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Fetch event - 네트워크 우선, 캐시 폴백
self.addEventListener('fetch', (event) => {
  // API 요청은 캐싱하지 않음
  if (event.request.url.includes('/api/')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 응답이 유효한 경우 캐시에 저장
        if (response && response.status === 200) {
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return response
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 반환
        return caches.match(event.request)
      })
  )
})

self.addEventListener('push', (event) => {
  let payload = {
    title: '새 알림',
    body: '확인할 알림이 있습니다.',
    url: '/',
  }

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() }
    } catch (error) {
      payload.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: {
        url: payload.url || '/',
      },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl)
    })
  )
})
