'use client'

const getCache = new Map<string, { expiresAt: number; data: unknown }>()
const inFlightGets = new Map<string, Promise<unknown>>()

export async function v2Fetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '요청 실패')
  return data as T
}

export async function v2GetCached<T>(path: string, ttlMs = 15_000): Promise<T> {
  const now = Date.now()
  const cached = getCache.get(path)
  if (cached && cached.expiresAt > now) {
    return cached.data as T
  }

  const existing = inFlightGets.get(path)
  if (existing) {
    return existing as Promise<T>
  }

  const request: Promise<T> = v2Fetch<T>(path)
    .then((data) => {
      if (inFlightGets.get(path) === request) {
        getCache.set(path, { data, expiresAt: Date.now() + ttlMs })
      }
      return data
    })
    .finally(() => {
      if (inFlightGets.get(path) === request) {
        inFlightGets.delete(path)
      }
    })

  inFlightGets.set(path, request)
  return request
}

export function v2Prefetch(path: string, ttlMs = 60_000) {
  v2GetCached(path, ttlMs).catch(() => {})
}

export function v2PrimeCache(path: string, data: unknown, ttlMs = 60_000) {
  getCache.set(path, { data, expiresAt: Date.now() + ttlMs })
}

export function v2InvalidateCache(prefix = '/api/v2') {
  for (const key of Array.from(getCache.keys())) {
    if (key.startsWith(prefix)) getCache.delete(key)
  }
  for (const key of Array.from(inFlightGets.keys())) {
    if (key.startsWith(prefix)) inFlightGets.delete(key)
  }
}
