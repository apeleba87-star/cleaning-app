import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

// 완료 후 30일 경과된 요청을 자동으로 아카이브 처리
// 이 API는 매일 실행되는 배치 작업으로 호출됩니다
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'business_owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.company_id) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // 완료 후 30일 경과 기준
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

    // 회사 매장 ID 목록
    const { data: companyStores } = await supabase
      .from('stores')
      .select('id')
      .eq('company_id', user.company_id)
      .is('deleted_at', null)

    const storeIds = companyStores?.map(s => s.id) || []

    if (storeIds.length === 0) {
      return NextResponse.json({ success: true, archived: 0 })
    }

    // 아카이브할 요청 조회 (완료 후 30일 경과, 아직 아카이브되지 않은 것)
    const { data: requestsToArchive, error: fetchError } = await supabase
      .from('requests')
      .select('id')
      .in('store_id', storeIds)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .lt('completed_at', thirtyDaysAgoISO)
      .eq('is_archived', false)

    if (fetchError) {
      console.error('Error fetching requests to archive:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch requests to archive' },
        { status: 500 }
      )
    }

    if (!requestsToArchive || requestsToArchive.length === 0) {
      return NextResponse.json({ success: true, archived: 0 })
    }

    const requestIds = requestsToArchive.map(r => r.id)

    // 아카이브 처리
    const { error: updateError } = await supabase
      .from('requests')
      .update({
        archived_at: new Date().toISOString(),
        is_archived: true,
      })
      .in('id', requestIds)

    if (updateError) {
      console.error('Error archiving requests:', updateError)
      return NextResponse.json(
        { error: 'Failed to archive requests' },
        { status: 500 }
      )
    }

    // supply_requests도 동일하게 처리
    const { data: supplyRequestsToArchive, error: supplyFetchError } = await supabase
      .from('supply_requests')
      .select('id')
      .in('store_id', storeIds)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .lt('completed_at', thirtyDaysAgoISO)
      .eq('is_archived', false)

    let supplyArchivedCount = 0
    if (!supplyFetchError && supplyRequestsToArchive && supplyRequestsToArchive.length > 0) {
      const supplyRequestIds = supplyRequestsToArchive.map(r => r.id)
      const { error: supplyUpdateError } = await supabase
        .from('supply_requests')
        .update({
          archived_at: new Date().toISOString(),
          is_archived: true,
        })
        .in('id', supplyRequestIds)

      if (!supplyUpdateError) {
        supplyArchivedCount = supplyRequestIds.length
      }
    }

    return NextResponse.json({
      success: true,
      archived: requestIds.length,
      supplyArchived: supplyArchivedCount,
      total: requestIds.length + supplyArchivedCount,
    })
  } catch (error: any) {
    console.error('Error in POST /api/business/requests/archive:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
