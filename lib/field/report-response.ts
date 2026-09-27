import { randomBytes } from 'node:crypto'

function supabaseOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin
  } catch {
    return ''
  }
}

export function createNonce() {
  return randomBytes(16).toString('base64')
}

// Private 데이터: 캐시 금지, 검색 노출 금지, Referer로 토큰이 새지 않게.
export function reportSecurityHeaders(nonce?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  }
  if (nonce) {
    headers['Content-Security-Policy'] = [
      "default-src 'none'",
      `img-src ${supabaseOrigin()}`,
      `style-src 'nonce-${nonce}'`,
      `script-src 'nonce-${nonce}'`,
      "connect-src 'self'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join('; ')
  }
  return headers
}
