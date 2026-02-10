/**
 * 앱 캐시 삭제 (촬영 반복 등 문제 해결용)
 * - Cache API 전체 삭제
 * - Service Worker 해제
 * - localStorage/sessionStorage는 건드리지 않음 (로그인 유지)
 */

export async function clearAppCache(): Promise<void> {
  if (typeof window === 'undefined') return

  // 1. Cache API 삭제
  if ('caches' in window) {
    try {
      const names = await caches.keys()
      await Promise.all(names.map((name) => caches.delete(name)))
    } catch (e) {
      console.warn('Cache API clear failed:', e)
    }
  }

  // 2. Service Worker 해제
  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    } catch (e) {
      console.warn('ServiceWorker unregister failed:', e)
    }
  }

  // localStorage/sessionStorage는 삭제하지 않음 (인증 토큰 등 유지)
}
