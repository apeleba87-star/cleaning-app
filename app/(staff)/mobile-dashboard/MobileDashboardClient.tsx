'use client'

import { useEffect } from 'react'

export default function MobileDashboardClient() {
  useEffect(() => {
    // Service Worker 등록 (PWA) - 개발 모드에서는 비활성화
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      // 기존 Service Worker 모두 해제
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister()
        }
      })

      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration)
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error)
        })
    } else {
      // 개발 모드: 모든 Service Worker 해제
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister()
          }
        })
      }
    }

    // 모바일 앱 설치 프롬프트
    let deferredPrompt: any
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt = e
      console.log('PWA install prompt available')
    })
  }, [])

  return null
}


