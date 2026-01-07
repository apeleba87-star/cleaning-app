'use client'

import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    // Service Worker 등록 (PWA) - 프로덕션 모드에서만
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration)
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error)
        })
    }

    // 모바일 앱 설치 프롬프트 저장 (선택적)
    if (typeof window !== 'undefined') {
      let deferredPrompt: any
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault()
        deferredPrompt = e
        console.log('PWA install prompt available')
        // 필요시 전역 변수로 저장하여 설치 버튼에서 사용 가능
        ;(window as any).deferredPrompt = deferredPrompt
      })
    }
  }, [])

  return null
}
