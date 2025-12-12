import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'business_owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 사용자의 회사에 속하는지 확인
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, company_id')
      .eq('id', params.id)
      .single()

    if (storeError || !store || store.company_id !== user.company_id) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // 최근 30일 요청란 조회
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const { data: allRequests, error: requestsError } = await supabase
      .from('requests')
      .select('id, title, description, photo_url, status, created_at, updated_at')
      .eq('store_id', params.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    if (requestsError) {
      console.error('Error fetching requests:', requestsError)
      return NextResponse.json(
        { error: 'Failed to fetch requests' },
        { status: 500 }
      )
    }

    // 상태별로 분류
    const received = (allRequests || []).filter(r => r.status === 'received')
    const inProgress = (allRequests || []).filter(r => r.status === 'in_progress')
    const completed = (allRequests || []).filter(r => r.status === 'completed')

    return NextResponse.json({
      success: true,
      data: {
        received,
        in_progress: inProgress,
        completed,
      },
    })
  } catch (error: any) {
    console.error('Error in GET /api/business/stores/[id]/requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

