import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * auth.users 에 해당 이메일이 있는지 O(1) RPC로 조회.
 * DB에 migrations/add_auth_email_exists_function.sql 적용 필요.
 */
export async function authEmailExists(
  adminClient: SupabaseClient,
  email: string
): Promise<{ exists: boolean; error: string | null }> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) {
    return { exists: false, error: '이메일이 비어 있습니다.' }
  }

  const { data, error } = await adminClient.rpc('auth_email_exists', {
    p_email: normalized,
  })

  if (error) {
    console.error('auth_email_exists RPC error:', error)
    return { exists: false, error: '이메일 확인에 실패했습니다.' }
  }

  return { exists: Boolean(data), error: null }
}
