import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Server-only. Never import from client components: the service key must not reach the browser bundle.

let anonClient: SupabaseClient<any, 'field'> | null = null
let serviceClient: SupabaseClient | null = null

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env: ${name}`)
  return value
}

const clientOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
} as const

/** anon key + schema `field`. Report 데이터는 SECURITY DEFINER RPC로만 조회한다. */
export function getFieldAnonClient() {
  if (!anonClient) {
    anonClient = createClient<any, 'field'>(
      requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      { ...clientOptions, db: { schema: 'field' } }
    )
  }
  return anonClient
}

/** Private bucket Signed URL 생성 전용. RPC가 검증해 돌려준 경로에만 사용한다. */
export function getFieldStorageSigner() {
  if (!serviceClient) {
    serviceClient = createClient(
      requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      clientOptions
    )
  }
  return serviceClient
}
