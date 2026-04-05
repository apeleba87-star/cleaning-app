import { NextRequest, NextResponse } from 'next/server'

export type RateLimitConfig = {
  /** Sliding window length in ms */
  windowMs: number
  /** Max hits allowed per window per key */
  max: number
}

type Bucket = { count: number; windowStart: number }

const buckets = new Map<string, Bucket>()

const CLEANUP_EVERY = 200
let opsSinceCleanup = 0

function cleanupStale(now: number) {
  opsSinceCleanup += 1
  if (opsSinceCleanup < CLEANUP_EVERY) return
  opsSinceCleanup = 0
  const cutoff = now - 3600_000
  buckets.forEach((b, k) => {
    if (b.windowStart < cutoff) buckets.delete(k)
  })
}

/**
 * In-memory sliding-window rate limit. Suitable for single-instance / dev.
 * On Vercel serverless, each isolate has its own map (mitigation only).
 */
export function rateLimitHit(key: string, config: RateLimitConfig): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  cleanupStale(now)

  let b = buckets.get(key)
  if (!b || now - b.windowStart >= config.windowMs) {
    b = { count: 1, windowStart: now }
    buckets.set(key, b)
    return { ok: true }
  }

  if (b.count >= config.max) {
    const retryAfterMs = config.windowMs - (now - b.windowStart)
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
  }

  b.count += 1
  return { ok: true }
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  return 'unknown'
}

/** 차등 한도 (초기 보수값 — 429 로그 보며 조정) */
export const RateLimitPresets = {
  /** 익명 공개: 이메일 존재 확인 등 */
  anonymousPublic: { windowMs: 60_000, max: 20 } satisfies RateLimitConfig,
  /** 가입·민감 익명 POST */
  anonymousSignup: { windowMs: 60_000, max: 5 } satisfies RateLimitConfig,
  /** 로그인 후 무거운 강제 새로고침 (회사 단위) */
  heavyRefreshPerCompany: { windowMs: 60_000, max: 8 } satisfies RateLimitConfig,
} as const

export function rateLimitResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', retryAfter: retryAfterSec },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSec) },
    }
  )
}
