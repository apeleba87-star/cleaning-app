import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { getTodayDateKST } from '@/lib/utils/date'

// 점주용 날짜별 상세 정보 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'store_manager') {
      throw new ForbiddenError('Only store managers can view daily details')
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // YYYY-MM-DD 형식
    const storeId = searchParams.get('store_id') // 선택적

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('date parameter is required and must be in YYYY-MM-DD format')
    }

    const supabase = await createServerSupabaseClient()

    // 점주가 관리하는 매장 목록 조회
    const { data: storeAssignments, error: assignmentError } = await supabase
      .from('store_assign')
      .select('store_id')
      .eq('user_id', user.id)

    if (assignmentError) {
      throw new Error(`Failed to fetch store assignments: ${assignmentError.message}`)
    }

    const assignedStoreIds = storeAssignments?.map((a) => a.store_id) || []

    if (assignedStoreIds.length === 0) {
      return Response.json({
        success: true,
        data: {
          cleaning_photos: [],
          issues: [],
          product_photos: [],
        },
      })
    }

    // 필터링할 매장 ID 목록
    const targetStoreIds = storeId ? [storeId] : assignedStoreIds

    // 권한 확인: 선택된 매장이 배정된 매장인지 확인
    const validStoreIds = targetStoreIds.filter((id) => assignedStoreIds.includes(id))

    if (validStoreIds.length === 0) {
      throw new ForbiddenError('You do not have access to the specified store')
    }

    // 날짜 범위 설정 (해당 날짜의 00:00:00 ~ 23:59:59) - UTC 변환 고려
    const startDate = `${date} 00:00:00`
    const endDate = `${date} 23:59:59`
    
    // UTC로 변환 (KST는 UTC+9이므로 9시간 빼기)
    const startDateUTC = new Date(`${date}T00:00:00+09:00`).toISOString()
    const endDateUTC = new Date(`${date}T23:59:59+09:00`).toISOString()

    // 1-1. 관리 전후 사진 조회 (checklist 테이블의 work_date 기준)
    const { data: checklists, error: checklistError } = await supabase
      .from('checklist')
      .select(`
        id,
        store_id,
        user_id,
        items,
        work_date,
        created_at,
        stores:store_id (
          id,
          name
        ),
        users:user_id (
          id,
          name
        )
      `)
      .in('store_id', validStoreIds)
      .eq('work_date', date)
      .order('created_at', { ascending: false })

    if (checklistError) {
      console.error('Error fetching checklists:', checklistError)
    }

    // checklist에서 관리 전후 사진 추출 (체크리스트 아이템 단위로 그룹화)
    const beforeAfterPhotosFromChecklist: any[] = []
    if (checklists) {
      checklists.forEach((checklist: any) => {
        const items = checklist.items || []
        items.forEach((item: any, index: number) => {
          if (item.type === 'before_after_photo' || item.type === 'before_photo' || item.type === 'after_photo') {
            // 체크리스트 아이템 단위로 하나의 객체로 묶어서 반환
            beforeAfterPhotosFromChecklist.push({
              id: `checklist-${checklist.id}-item-${index}`,
              store_id: checklist.store_id,
              user_id: checklist.user_id,
              area_category: item.area || '구역',
              checklist_item_type: item.type, // 'before_photo', 'after_photo', 'before_after_photo'
              before_photo_url: item.before_photo_url || null,
              after_photo_url: item.after_photo_url || null,
              created_at: checklist.created_at,
              stores: checklist.stores,
              users: checklist.users,
            })
          }
        })
      })
    }

    // 1-2. 관리 전후 사진 조회 (cleaning_photos 테이블 - created_at 기준)
    const { data: cleaningPhotos, error: cleaningError } = await supabase
      .from('cleaning_photos')
      .select(`
        id,
        store_id,
        user_id,
        area_category,
        kind,
        photo_url,
        created_at,
        stores:store_id (
          id,
          name
        ),
        users:user_id (
          id,
          name
        )
      `)
      .in('store_id', validStoreIds)
      .gte('created_at', startDateUTC)
      .lte('created_at', endDateUTC)
      .order('created_at', { ascending: false })

    if (cleaningError) {
      console.error('Error fetching cleaning photos:', cleaningError)
    }

    // cleaning_photos를 area_category별로 그룹화하여 before/after 쌍으로 변환
    const cleaningPhotosGrouped: any[] = []
    if (cleaningPhotos && cleaningPhotos.length > 0) {
      const photosByArea = new Map<string, { before?: any; after?: any }>()
      
      cleaningPhotos.forEach((photo: any) => {
        const areaKey = photo.area_category || '구역'
        if (!photosByArea.has(areaKey)) {
          photosByArea.set(areaKey, {})
        }
        const areaData = photosByArea.get(areaKey)!
        if (photo.kind === 'before') {
          areaData.before = photo
        } else if (photo.kind === 'after') {
          areaData.after = photo
        }
      })

      // 그룹화된 데이터를 체크리스트 아이템 형식으로 변환
      photosByArea.forEach((areaData, areaKey) => {
        cleaningPhotosGrouped.push({
          id: `cleaning-${areaKey}-${Date.now()}`,
          store_id: areaData.before?.store_id || areaData.after?.store_id,
          user_id: areaData.before?.user_id || areaData.after?.user_id,
          area_category: areaKey,
          checklist_item_type: null, // cleaning_photos는 체크리스트 아이템이 아님
          before_photo_url: areaData.before?.photo_url || null,
          after_photo_url: areaData.after?.photo_url || null,
          created_at: areaData.before?.created_at || areaData.after?.created_at,
          stores: areaData.before?.stores || areaData.after?.stores,
          users: areaData.before?.users || areaData.after?.users,
        })
      })
    }

    // 두 소스의 데이터 병합
    const allCleaningPhotos = [
      ...beforeAfterPhotosFromChecklist,
      ...cleaningPhotosGrouped
    ]

    // 2-1. 매장 문제 조회 (problem_reports 테이블)
    let problemReports: any[] = []
    try {
      const { data: problemReportsData, error: problemReportsError } = await supabase
        .from('problem_reports')
        .select(`
          id,
          store_id,
          user_id,
          title,
          description,
          photo_url,
          status,
          created_at,
          stores:store_id (
            id,
            name
          ),
          users:user_id (
            id,
            name
          )
        `)
        .in('store_id', validStoreIds)
        .gte('created_at', startDateUTC)
        .lte('created_at', endDateUTC)
        .order('created_at', { ascending: false })

      if (!problemReportsError && problemReportsData) {
        problemReports = problemReportsData.map((report: any) => ({
          ...report,
          title: report.title || '매장 문제',
        }))
      }
    } catch (error) {
      console.log('problem_reports table may not exist:', error)
    }

    // 2-2. 매장 문제 조회 (issues - category가 'store_problem'인 것만)
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select(`
        id,
        store_id,
        user_id,
        title,
        description,
        photo_url,
        status,
        created_at,
        stores:store_id (
          id,
          name
        ),
        users:user_id (
          id,
          name
        ),
        request_categories:category_id (
          id,
          name
        )
      `)
      .in('store_id', validStoreIds)
      .gte('created_at', startDateUTC)
      .lte('created_at', endDateUTC)
      .order('created_at', { ascending: false })

    if (issuesError) {
      console.error('Error fetching issues:', issuesError)
    }

    // 매장 문제만 필터링 (category가 '매장 문제' 또는 'store_problem'인 것)
    const storeProblemsFromIssues = (issues || []).filter((issue: any) => {
      const categoryName = issue.request_categories?.name || ''
      return categoryName === '매장 문제' || 
             categoryName.includes('매장') ||
             issue.title?.includes('매장 문제') ||
             issue.title?.includes('매장상황')
    })

    // 두 소스의 매장 문제 병합
    const allStoreProblems = [...problemReports, ...storeProblemsFromIssues]

    // 3. 제품 입고/보관 사진 조회 (product_photos)
    // product_photos 테이블이 있는지 확인하고 조회
    let productPhotos: any[] = []
    try {
      const { data: productPhotosData, error: productPhotosError } = await supabase
        .from('product_photos')
        .select(`
          id,
          store_id,
          user_id,
          product_name,
          location,
          photo_url,
          photo_urls,
          type,
          photo_type,
          description,
          created_at,
          stores:store_id (
            id,
            name
          ),
          users:user_id (
            id,
            name
          )
        `)
        .in('store_id', validStoreIds)
        .gte('created_at', startDateUTC)
        .lte('created_at', endDateUTC)
        .order('created_at', { ascending: false })

      if (!productPhotosError && productPhotosData) {
        // photo_urls가 배열인 경우 처리
        productPhotosData.forEach((photo: any) => {
          const urls = photo.photo_urls 
            ? (Array.isArray(photo.photo_urls) ? photo.photo_urls : [photo.photo_urls])
            : (photo.photo_url ? [photo.photo_url] : [])
          
          urls.forEach((url: string, idx: number) => {
            productPhotos.push({
              id: `product-${photo.id}-${idx}`,
              store_id: photo.store_id,
              user_id: photo.user_id,
              product_name: photo.product_name || (photo.type === 'receipt' ? '제품 입고' : '제품 보관'),
              location: photo.location,
              photo_url: url,
              photo_type: photo.photo_type || photo.type,
              description: photo.description,
              created_at: photo.created_at,
              stores: photo.stores,
              users: photo.users,
            })
          })
        })
      }
    } catch (error) {
      // product_photos 테이블이 없을 수 있으므로 에러 무시
      console.log('product_photos table may not exist:', error)
    }

    return Response.json({
      success: true,
      data: {
        cleaning_photos: allCleaningPhotos || [],
        issues: allStoreProblems || [],
        product_photos: productPhotos || [],
      },
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}
