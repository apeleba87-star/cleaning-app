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

    if (!user || user.role !== 'business_owner') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    if (!user.company_id) {
      return NextResponse.json({ error: '회사 정보가 없습니다.' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: '시작일과 종료일이 필요합니다.' }, { status: 400 })
    }

    // 매장이 회사에 속해있는지 확인
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (storeError || !store) {
      return NextResponse.json({ error: '매장을 찾을 수 없습니다.' }, { status: 404 })
    }

    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    // RLS 정책 문제로 인해 attendance 조회 시 서비스 역할 키 사용
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
    
    // attendance 테이블 조회용 클라이언트 (서비스 역할 키 우선 사용)
    const attendanceClient = adminSupabase || supabase

    // 병렬 쿼리 실행: 모든 데이터를 동시에 조회
    const [
      checklistsResult,
      cleaningPhotosResult,
      productPhotosResult,
      problemReportsResult,
      lostItemsResult,
      requestsResult,
      attendanceResult,
    ] = await Promise.all([
      // 1. 관리전후 사진 (체크리스트에서)
      supabase
        .from('checklist')
        .select('id, items, created_at, work_date')
        .eq('store_id', params.id)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .order('work_date', { ascending: false }),

      // 1-2. 관리전후 사진 (cleaning_photos 테이블 - created_at 기준)
      supabase
        .from('cleaning_photos')
        .select('id, area_category, kind, photo_url, created_at')
        .eq('store_id', params.id)
        .neq('area_category', 'inventory') // 입고/보관 사진 제외
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false }),

      // 2. 제품입고 및 보관 사진
      supabase
        .from('product_photos')
        .select('id, photo_urls, type, photo_type, description, created_at')
        .eq('store_id', params.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false }),

      // 3. 매장상황 - 문제보고
      supabase
        .from('problem_reports')
        .select('id, title, description, photo_url, status, created_at, updated_at')
        .eq('store_id', params.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false }),

      // 4. 매장상황 - 분실물
      supabase
        .from('lost_items')
        .select('id, type, description, photo_url, status, storage_location, created_at, updated_at')
        .eq('store_id', params.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false }),

      // 5. 요청란
      supabase
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
        .order('created_at', { ascending: false }),

      // 6. 출퇴근 기록 (attendance)
      attendanceClient
        .from('attendance')
        .select('id, work_date, clock_in_at, clock_out_at, user_id, users:user_id(id, name)')
        .eq('store_id', params.id)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .order('work_date', { ascending: false }),
    ])

    const checklists = checklistsResult.data
    const cleaningPhotos = cleaningPhotosResult.data
    const productPhotos = productPhotosResult.data
    const problemReports = problemReportsResult.data
    const lostItems = lostItemsResult.data
    const requests = requestsResult.data
    const attendances = attendanceResult.data || []

    // 관리전후 사진 처리
    const beforeAfterPhotosMap = new Map<string, {
      id: string
      before_photo_url: string | null
      after_photo_url: string | null
      area: string
      created_at: string
      work_date: string
    }>()

    // 1. 체크리스트에서 관리전후 사진 추출
    if (checklists) {
      checklists.forEach((checklist: any) => {
        const items = checklist.items || []
        items.forEach((item: any, index: number) => {
          // photo, before_photo, after_photo, before_after_photo 타입 모두 확인
          const isPhotoType = item.type === 'photo' || 
                             item.type === 'before_photo' || 
                             item.type === 'after_photo' || 
                             item.type === 'before_after_photo'
          
          if (isPhotoType && (item.before_photo_url || item.after_photo_url)) {
            const area = item.area || `구역${index}`
            const workDate = checklist.work_date || checklist.created_at?.split('T')[0] || ''
            const key = `${area}-${workDate}`
            if (!beforeAfterPhotosMap.has(key)) {
              beforeAfterPhotosMap.set(key, {
                id: `checklist-${checklist.id}-photo-${index}`,
                before_photo_url: item.before_photo_url || null,
                after_photo_url: item.after_photo_url || null,
                area: area,
                created_at: checklist.created_at,
                work_date: workDate,
              })
            }
          }
        })
      })
    }

    // 2. cleaning_photos 테이블에서 관리전후 사진 추출 및 병합
    if (cleaningPhotos && cleaningPhotos.length > 0) {
      // area_category별로 그룹화하여 before/after 쌍으로 변환
      const photosByArea = new Map<string, { before?: any; after?: any }>()
      
      cleaningPhotos.forEach((photo: any) => {
        const areaKey = photo.area_category || '구역'
        const photoDate = photo.created_at?.split('T')[0] || ''
        const key = `${areaKey}-${photoDate}`
        
        if (!photosByArea.has(key)) {
          photosByArea.set(key, {})
        }
        const areaData = photosByArea.get(key)!
        if (photo.kind === 'before') {
          areaData.before = photo
        } else if (photo.kind === 'after') {
          areaData.after = photo
        }
      })

      // 그룹화된 cleaning_photos를 기존 맵에 병합
      photosByArea.forEach((areaData, key) => {
        // 이미 checklist에서 가져온 데이터가 있으면 병합, 없으면 새로 추가
        if (beforeAfterPhotosMap.has(key)) {
          const existing = beforeAfterPhotosMap.get(key)!
          // 기존 데이터에 cleaning_photos의 사진이 없으면 추가
          if (!existing.before_photo_url && areaData.before?.photo_url) {
            existing.before_photo_url = areaData.before.photo_url
          }
          if (!existing.after_photo_url && areaData.after?.photo_url) {
            existing.after_photo_url = areaData.after.photo_url
          }
        } else {
          // 새로운 항목 추가
          const photoDate = areaData.before?.created_at?.split('T')[0] || 
                           areaData.after?.created_at?.split('T')[0] || ''
          const areaKey = areaData.before?.area_category || 
                         areaData.after?.area_category || '구역'
          beforeAfterPhotosMap.set(key, {
            id: `cleaning-${key}-${Date.now()}`,
            before_photo_url: areaData.before?.photo_url || null,
            after_photo_url: areaData.after?.photo_url || null,
            area: areaKey,
            created_at: areaData.before?.created_at || areaData.after?.created_at || new Date().toISOString(),
            work_date: photoDate,
          })
        }
      })
    }

    const beforeAfterPhotosArray = Array.from(beforeAfterPhotosMap.values())

    // 제품입고 및 보관 사진 처리
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

    // 출퇴근 기록을 날짜별로 그룹화
    const attendanceByDate: { [date: string]: Array<{
      work_date: string
      clock_in_at: string | null
      clock_out_at: string | null
      user_name: string | null
    }> } = {}
    
    attendances.forEach((attendance: any) => {
      const date = attendance.work_date
      if (!attendanceByDate[date]) {
        attendanceByDate[date] = []
      }
      attendanceByDate[date].push({
        work_date: date,
        clock_in_at: attendance.clock_in_at,
        clock_out_at: attendance.clock_out_at,
        user_name: attendance.users?.name || null,
      })
    })

    return NextResponse.json({
      data: {
        before_after_photos: beforeAfterPhotosArray,
        product_inflow_photos: productInflowPhotos,
        storage_photos: storagePhotos,
        problem_reports: problemReports || [],
        lost_items: lostItems || [],
        requests: requests || [],
        attendance_by_date: attendanceByDate,
      },
    })
  } catch (error: any) {
    console.error('Error in GET /api/business/stores/[id]/detail-data:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}



