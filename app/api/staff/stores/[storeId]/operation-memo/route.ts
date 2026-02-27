import { NextRequest } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'

/**
 * 직원 앱: 배정된 매장의 운영 메모(출입정보, 특이사항) 조회
 * store_assign으로 본인 배정 매장만 조회 가능
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    const allowedRoles = ['staff', 'subcontract_individual', 'subcontract_company', 'business_owner']
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError('Only staff or business owner (staff mode) can view operation memo')
    }

    const storeId = params.storeId
    if (!storeId) {
      return Response.json({ error: 'storeId is required' }, { status: 400 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
      return Response.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 배정 확인: 본인이 해당 매장에 배정되어 있는지
    const { data: assignment } = await adminSupabase
      .from('store_assign')
      .select('store_id')
      .eq('user_id', user.id)
      .eq('store_id', storeId)
      .maybeSingle()

    if (!assignment) {
      return Response.json({ error: '해당 매장에 대한 권한이 없습니다.' }, { status: 403 })
    }

    const { data: store, error } = await adminSupabase
      .from('stores')
      .select('id, access_info, special_notes')
      .eq('id', storeId)
      .is('deleted_at', null)
      .single()

    if (error || !store) {
      return Response.json({ error: '매장 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    const hasMemo = Boolean(
      (store.access_info && store.access_info.trim()) ||
      (store.special_notes && store.special_notes.trim())
    )

    return Response.json({
      success: true,
      data: {
        access_info: store.access_info?.trim() || null,
        special_notes: store.special_notes?.trim() || null,
        has_memo: hasMemo,
      },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
