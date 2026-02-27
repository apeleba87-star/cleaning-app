import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { assertStoreActive } from '@/lib/store-active'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const createSupplyRequestSchema = z.object({
  store_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.union([z.string().min(1), z.null()]).optional(),
  category: z.string().min(1).max(50),
  photo_url: z.union([z.string().url(), z.null(), z.literal('')]).optional(),
})

/** GET: 물품 요청 목록 조회 (RLS 우회) */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) throw new UnauthorizedError('Authentication required')

    const allowedRoles = ['staff', 'subcontract_individual', 'subcontract_company', 'business_owner']
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient =
      serviceRoleKey && supabaseUrl
        ? createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        : supabase

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0]

    let nonCompletedQuery = dataClient
      .from('supply_requests')
      .select('*, stores:store_id (id, name)')
      .eq('user_id', user.id)
      .neq('status', 'completed')

    let completedQuery = dataClient
      .from('supply_requests')
      .select('*, stores:store_id (id, name)')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .gte('completed_at', oneWeekAgoStr)

    if (storeId) {
      nonCompletedQuery = nonCompletedQuery.eq('store_id', storeId)
      completedQuery = completedQuery.eq('store_id', storeId)
    }

    const [nonCompletedRes, completedRes] = await Promise.all([
      nonCompletedQuery.order('created_at', { ascending: false }),
      completedQuery.order('completed_at', { ascending: false }),
    ])

    const nonCompleted = nonCompletedRes.data || []
    const completed = completedRes.data || []
    const allData = [...nonCompleted, ...completed].sort((a, b) => {
      const aTime = (a.completed_at || a.created_at) || ''
      const bTime = (b.completed_at || b.created_at) || ''
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

    return NextResponse.json({ success: true, data: allData })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    const allowedRoles = ['staff', 'subcontract_individual', 'subcontract_company', 'business_owner']
    if (!user || !allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    
    // photo_url이 빈 문자열이면 null로 변환
    if (body.photo_url === '') {
      body.photo_url = null
    }
    
    // description이 빈 문자열이면 null로 변환
    if (body.description === '') {
      body.description = null
    }
    
    const validated = createSupplyRequestSchema.parse(body)

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient =
      serviceRoleKey && supabaseUrl
        ? createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        : supabase

    const { data: storeAssignment, error: assignmentError } = await dataClient
      .from('store_assign')
      .select('store_id')
      .eq('user_id', user.id)
      .eq('store_id', validated.store_id)
      .single()

    if (assignmentError || !storeAssignment) {
      return NextResponse.json(
        { error: '해당 매장에 대한 권한이 없습니다.' },
        { status: 403 }
      )
    }
    await assertStoreActive(dataClient, validated.store_id)

    const insertData: any = {
      store_id: validated.store_id,
      user_id: user.id,
      title: validated.title,
      item_name: validated.title, // 하위 호환성을 위해 item_name도 title과 동일하게 설정
      description: validated.description || null,
      category: validated.category,
      photo_url: validated.photo_url || null,
      status: 'received', // 초기 상태는 '접수'
    }

    const { data: supplyRequest, error: insertError } = await dataClient
      .from('supply_requests')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating supply request:', insertError)
      console.error('Insert data:', insertData)
      return NextResponse.json(
        { error: `물품 요청 생성에 실패했습니다: ${insertError.message || insertError.code || '알 수 없는 오류'}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data: supplyRequest },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '입력값이 올바르지 않습니다.', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error in POST /api/staff/supply-requests:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

