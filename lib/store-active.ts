import type { SupabaseClient } from '@supabase/supabase-js'
import { ForbiddenError } from '@/lib/errors'

const INACTIVE_MESSAGE = '비활성 매장입니다. 이 기능을 사용할 수 없습니다.'

/**
 * 매장이 활성(service_active === true)인지 확인하고, 비활성이면 ForbiddenError throw.
 * 출퇴근, 체크리스트, 요청 등 "활성" 기능 호출 전에 사용.
 */
export async function assertStoreActive(supabase: SupabaseClient, storeId: string): Promise<void> {
  const { data, error } = await supabase
    .from('stores')
    .select('service_active')
    .eq('id', storeId)
    .single()
  if (error || !data) throw new ForbiddenError('매장을 찾을 수 없습니다.')
  if (data.service_active === false) throw new ForbiddenError(INACTIVE_MESSAGE)
}

export { INACTIVE_MESSAGE }
