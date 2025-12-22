import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { getTodayDateKST } from '@/lib/utils/date'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'franchise_manager') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()
    
    // RLS 정책 문제로 인해 서비스 역할 키 사용
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    let adminSupabase: ReturnType<typeof createClient> | null = null
    
    if (serviceRoleKey && supabaseUrl) {
      adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    }
    
    // 데이터 조회용 클라이언트 (서비스 역할 키 우선 사용)
    const dataClient = adminSupabase || supabase

    // franchise_manager의 경우 franchise_id를 별도로 조회
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('franchise_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData || !userData.franchise_id) {
      return NextResponse.json({ error: '프렌차이즈 정보가 없습니다.' }, { status: 403 })
    }

    const userFranchiseId = userData.franchise_id

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: '시작일과 종료일이 필요합니다.' }, { status: 400 })
    }

    // 매장이 프렌차이즈에 속해있는지 확인
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, franchise_id')
      .eq('id', params.id)
      .eq('franchise_id', userFranchiseId)
      .is('deleted_at', null)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: '매장을 찾을 수 없습니다.' }, { status: 404 })
    }

    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    // 1. 관리전후 사진 (체크리스트에서)
    const { data: checklists } = await dataClient
      .from('checklist')
      .select('id, items, created_at, work_date')
      .eq('store_id', params.id)
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .order('work_date', { ascending: false })

    const beforeAfterPhotos: Array<{
      id: string
      before_photo_url: string | null
      after_photo_url: string | null
      area: string
      created_at: string
      work_date: string
    }> = []
    const beforeAfterPhotosMap = new Map<string, {
      id: string
      before_photo_url: string | null
      after_photo_url: string | null
      area: string
      created_at: string
      work_date: string
    }>()

    if (checklists) {
      checklists.forEach((checklist: any) => {
        const items = checklist.items || []
        items.forEach((item: any, index: number) => {
          if (item.type === 'photo' && (item.before_photo_url || item.after_photo_url)) {
            const area = item.area || `구역${index}`
            const key = `${area}-${checklist.work_date}`
            if (!beforeAfterPhotosMap.has(key)) {
              beforeAfterPhotosMap.set(key, {
                id: `checklist-${checklist.id}-photo-${index}`,
                before_photo_url: item.before_photo_url || null,
                after_photo_url: item.after_photo_url || null,
                area: area,
                created_at: checklist.created_at,
                work_date: checklist.work_date || checklist.created_at?.split('T')[0] || '',
              })
            }
          }
        })
      })
    }
    const beforeAfterPhotosArray = Array.from(beforeAfterPhotosMap.values())

    // 2. 제품입고 및 보관 사진
    const { data: productPhotos } = await dataClient
      .from('product_photos')
      .select('id, photo_urls, type, photo_type, description, created_at')
      .eq('store_id', params.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })

    const productInflowPhotos: Array<{
      id: string
      photo_url: string
      photo_type: string
      description: string | null
      created_at: string
    }> = []
    const storagePhotos: Array<{
      id: string
      photo_url: string
      description: string | null
      created_at: string
    }> = []

    if (productPhotos) {
      productPhotos.forEach((photo: any) => {
        const urls = Array.isArray(photo.photo_urls) ? photo.photo_urls : (photo.photo_urls ? [photo.photo_urls] : [])
        if (photo.type === 'receipt') {
          urls.forEach((url: string, idx: number) => {
            productInflowPhotos.push({
              id: `product-${photo.id}-${idx}`,
              photo_url: url,
              photo_type: photo.photo_type || 'product',
              description: photo.description,
              created_at: photo.created_at,
            })
          })
        } else if (photo.type === 'storage') {
          urls.forEach((url: string, idx: number) => {
            storagePhotos.push({
              id: `storage-${photo.id}-${idx}`,
              photo_url: url,
              description: photo.description,
              created_at: photo.created_at,
            })
          })
        }
      })
    }

    // 3. 매장상황 (문제보고, 자판기 문제, 분실물)
    const { data: problemReports } = await dataClient
      .from('problem_reports')
      .select('id, title, description, photo_url, status, created_at, updated_at')
      .eq('store_id', params.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })

    const { data: lostItems } = await dataClient
      .from('lost_items')
      .select('id, type, description, photo_url, status, storage_location, created_at, updated_at')
      .eq('store_id', params.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })

    // 4. 요청란
    const { data: requests } = await dataClient
      .from('requests')
      .select(`
        id,
        title,
        description,
        photo_url,
        status,
        created_at,
        updated_at,
        completion_photo_url,
        completion_description,
        completed_by,
        completed_at,
        rejected_by,
        rejected_at,
        created_by_user:created_by (
          id,
          name,
          role
        ),
        completed_by_user:users!requests_completed_by_fkey(id, name),
        rejected_by_user:users!requests_rejected_by_fkey(id, name)
      `)
      .eq('store_id', params.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })

    return NextResponse.json({
      data: {
        before_after_photos: beforeAfterPhotosArray,
        product_inflow_photos: productInflowPhotos,
        storage_photos: storagePhotos,
        problem_reports: problemReports || [],
        lost_items: lostItems || [],
        requests: requests || [],
      },
    })
  } catch (error: any) {
    console.error('Error in GET /api/franchise/stores/[id]/detail-data:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}


