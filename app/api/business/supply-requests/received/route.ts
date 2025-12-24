import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view supply requests')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()

    // 회사 매장 ID 목록
    const { data: companyStores } = await supabase
      .from('stores')
      .select('id, name')
      .eq('company_id', user.company_id)
      .is('deleted_at', null)

    const storeIds = companyStores?.map(s => s.id) || []

    if (storeIds.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    // 접수 상태인 물품 요청만 조회
    const { data: supplyRequests, error } = await supabase
      .from('supply_requests')
      .select(`
        *,
        users:user_id (
          id,
          name
        ),
        stores:store_id (
          id,
          name
        )
      `)
      .in('store_id', storeIds)
      .eq('status', 'received')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching supply requests:', error)
      return NextResponse.json(
        { error: '물품 요청 목록을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: supplyRequests || [] })
  } catch (error: any) {
    return handleApiError(error)
  }
}

