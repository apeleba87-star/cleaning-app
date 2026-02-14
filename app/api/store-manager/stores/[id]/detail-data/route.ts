import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || !['store_manager', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: '시작일과 종료일이 필요합니다.' }, { status: 400 })
    }

    // 매장이 store_manager/manager(점주)에게 배정되어 있는지 확인
    const { data: storeAssign, error: storeAssignError } = await supabase
      .from('store_assign')
      .select('id')
      .eq('user_id', user.id)
      .eq('store_id', params.id)
      .maybeSingle()

    if (storeAssignError || !storeAssign) {
      return NextResponse.json({ error: '매장을 찾을 수 없습니다.' }, { status: 404 })
    }

    // RLS 정책 문제로 인해 attendance 조회 시 서비스 역할 키 사용
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    let adminSupabase: ReturnType<typeof createClient> | null = null
    if (serviceRoleKey && supabaseUrl) {
      adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    }
    const attendanceClient = adminSupabase || supabase

    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    // 1. 관리전후 사진 (체크리스트에서)
    const { data: checklists } = await supabase
      .from('checklist')
      .select('id, items, created_at, work_date')
      .eq('store_id', params.id)
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .order('work_date', { ascending: false })

    // 1-2. 관리전후 사진 (cleaning_photos 테이블 - 업체관리자와 동일)
    const { data: cleaningPhotos } = await supabase
      .from('cleaning_photos')
      .select('id, area_category, kind, photo_url, created_at')
      .eq('store_id', params.id)
      .neq('area_category', 'inventory')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })

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

    if (cleaningPhotos && cleaningPhotos.length > 0) {
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
      photosByArea.forEach((areaData, key) => {
        if (beforeAfterPhotosMap.has(key)) {
          const existing = beforeAfterPhotosMap.get(key)!
          if (!existing.before_photo_url && areaData.before?.photo_url) {
            existing.before_photo_url = areaData.before.photo_url
          }
          if (!existing.after_photo_url && areaData.after?.photo_url) {
            existing.after_photo_url = areaData.after.photo_url
          }
        } else {
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

    // 2. 제품입고 및 보관 사진
    const { data: productPhotos } = await supabase
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
    const { data: problemReports } = await supabase
      .from('problem_reports')
      .select('id, title, description, photo_url, status, created_at, updated_at')
      .eq('store_id', params.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })

    const { data: lostItems } = await supabase
      .from('lost_items')
      .select('id, type, description, photo_url, status, storage_location, created_at, updated_at')
      .eq('store_id', params.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })

    // 4. 요청란
    const { data: requests } = await supabase
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
        storage_location,
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

    // 5. 출퇴근 기록 (attendance)
    const { data: attendances } = await attendanceClient
      .from('attendance')
      .select('id, work_date, clock_in_at, clock_out_at, user_id, users:user_id(id, name)')
      .eq('store_id', params.id)
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .order('work_date', { ascending: false })

    const attendanceByDate: { [date: string]: Array<{
      work_date: string
      clock_in_at: string | null
      clock_out_at: string | null
      user_name: string | null
    }> } = {}
    ;(attendances || []).forEach((attendance: any) => {
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
    console.error('Error in GET /api/store-manager/stores/[id]/detail-data:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}



