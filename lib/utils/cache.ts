/**
 * 출근 관리 최적화를 위한 캐싱 유틸리티
 * 네임스페이스를 사용하여 기존 localStorage 키와 충돌 방지
 */

const CACHE_NAMESPACE = 'attendance_optimization'

// 캐시 키 생성기
const CACHE_KEYS = {
  STORE: (storeId: string) => `${CACHE_NAMESPACE}:store:${storeId}`,
  WORK_DATE: (params: string) => `${CACHE_NAMESPACE}:work_date:${params}`,
  NETWORK_STATUS: `${CACHE_NAMESPACE}:network_status`,
} as const

// 캐시 TTL (Time To Live)
const CACHE_TTL = {
  STORE: 60 * 60 * 1000, // 1시간
  WORK_DATE: 60 * 1000, // 1분
  NETWORK_STATUS: 30 * 1000, // 30초
} as const

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

/**
 * 캐시에 데이터 저장
 */
export function setCache<T>(key: string, data: T, ttl: number): void {
  if (typeof window === 'undefined') return

  try {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    }
    localStorage.setItem(key, JSON.stringify(item))
  } catch (error) {
    // localStorage 용량 초과 등 에러는 무시
    console.warn('Failed to set cache:', error)
  }
}

/**
 * 캐시에서 데이터 조회
 */
export function getCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null

  try {
    const itemStr = localStorage.getItem(key)
    if (!itemStr) return null

    const item: CacheItem<T> = JSON.parse(itemStr)
    const now = Date.now()

    // TTL 확인
    if (now - item.timestamp > item.ttl) {
      localStorage.removeItem(key)
      return null
    }

    return item.data
  } catch (error) {
    // 파싱 에러 등은 캐시 삭제
    localStorage.removeItem(key)
    return null
  }
}

/**
 * 캐시 삭제
 */
export function removeCache(key: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(key)
}

/**
 * 매장 정보 캐싱
 */
export function cacheStore(storeId: string, store: any): void {
  setCache(CACHE_KEYS.STORE(storeId), store, CACHE_TTL.STORE)
}

/**
 * 매장 정보 조회 (캐시 우선)
 */
export function getCachedStore(storeId: string): any | null {
  return getCache(CACHE_KEYS.STORE(storeId))
}

/**
 * work_date 계산 결과 캐싱
 */
export function cacheWorkDate(
  params: { isNightShift: boolean; workStartHour: number; workEndHour: number; currentHour: number },
  workDate: string
): void {
  const key = JSON.stringify(params)
  setCache(CACHE_KEYS.WORK_DATE(key), workDate, CACHE_TTL.WORK_DATE)
}

/**
 * work_date 계산 결과 조회 (캐시 우선)
 */
export function getCachedWorkDate(params: {
  isNightShift: boolean
  workStartHour: number
  workEndHour: number
  currentHour: number
}): string | null {
  const key = JSON.stringify(params)
  return getCache<string>(CACHE_KEYS.WORK_DATE(key))
}

/**
 * 네트워크 상태 캐싱
 */
export function cacheNetworkStatus(status: 'online' | 'offline' | 'slow' | 'unknown'): void {
  setCache(CACHE_KEYS.NETWORK_STATUS, status, CACHE_TTL.NETWORK_STATUS)
}

/**
 * 네트워크 상태 조회 (캐시 우선)
 */
export function getCachedNetworkStatus(): 'online' | 'offline' | 'slow' | 'unknown' | null {
  return getCache(CACHE_KEYS.NETWORK_STATUS)
}

/**
 * 네임스페이스의 모든 캐시 삭제 (디버깅용)
 */
export function clearAllCache(): void {
  if (typeof window === 'undefined') return

  const keys = Object.keys(localStorage)
  keys.forEach(key => {
    if (key.startsWith(CACHE_NAMESPACE + ':')) {
      localStorage.removeItem(key)
    }
  })
}
