'use client'

const homepageGetCache = new Map<string, { expiresAt: number; data: unknown }>()
const homepageInFlightGets = new Map<string, Promise<unknown>>()

export async function homepageFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '요청 실패')
  return data as T
}

export async function homepageGetCached<T>(path: string, ttlMs = 30_000): Promise<T> {
  const now = Date.now()
  const cached = homepageGetCache.get(path)
  if (cached && cached.expiresAt > now) return cached.data as T

  const existing = homepageInFlightGets.get(path)
  if (existing) return existing as Promise<T>

  const request: Promise<T> = homepageFetch<T>(path)
    .then((data) => {
      if (homepageInFlightGets.get(path) === request) {
        homepageGetCache.set(path, { data, expiresAt: Date.now() + ttlMs })
      }
      return data
    })
    .finally(() => {
      if (homepageInFlightGets.get(path) === request) {
        homepageInFlightGets.delete(path)
      }
    })

  homepageInFlightGets.set(path, request)
  return request
}

export function homepagePrefetch(path: string, ttlMs = 60_000) {
  homepageGetCached(path, ttlMs).catch(() => {})
}

export function homepagePrimeCache(path: string, data: unknown, ttlMs = 60_000) {
  homepageGetCache.set(path, { data, expiresAt: Date.now() + ttlMs })
}

export function homepageInvalidateCache(prefix = '/api/homepage') {
  for (const key of Array.from(homepageGetCache.keys())) {
    if (key.startsWith(prefix)) homepageGetCache.delete(key)
  }
  for (const key of Array.from(homepageInFlightGets.keys())) {
    if (key.startsWith(prefix)) homepageInFlightGets.delete(key)
  }
}
