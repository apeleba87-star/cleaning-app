import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { calculateChecklistProgress } from '@/lib/utils/checklist'
import { createClient } from '@supabase/supabase-js'
import { getTodayDateKST, getCurrentHourKST, isWithinManagementPeriod, calculateWorkDateForNightShift, isManagementDay } from '@/lib/utils/date'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view store status')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()
    
    // RLS 정책 문제로 인해 attendance 조회 시 서비스 역할 키 사용
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    let adminSupabase: ReturnType<typeof createClient> | null = null
    
    // 디버그 정보 (배포 환경에서도 확인 가능하도록)
    const debugInfo: any = {
      has_service_role_key: !!serviceRoleKey,
      has_supabase_url: !!supabaseUrl,
      environment: process.env.NODE_ENV,
    }
    
    if (serviceRoleKey && supabaseUrl) {
      adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
      console.log('[Store Status API] 서비스 역할 키를 사용하여 attendance 테이블 조회 (RLS 우회)')
    } else {
      console.warn('[Store Status API] ⚠️ 서비스 역할 키가 설정되지 않음. RLS 정책에 따라 attendance 조회가 실패할 수 있습니다.')
      console.warn('[Store Status API] Debug Info:', debugInfo)
    }
    
    // attendance 테이블 조회용 클라이언트 (서비스 역할 키 우선 사용)
    const attendanceClient = adminSupabase || supabase

    // 회사에 속한 모든 매장 조회
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, address, management_days, is_night_shift, work_start_hour, work_end_hour, updated_at')
      .eq('company_id', user.company_id)
      .is('deleted_at', null)

    if (storesError) {
      throw new Error(`Failed to fetch stores: ${storesError.message}`)
    }

    if (!stores || stores.length === 0) {
      return Response.json({
        success: true,
        data: [],
        last_modified_at: new Date().toISOString(),
      })
    }

    // 오늘 날짜 (한국 시간 기준) - 통일된 함수 사용
    const todayDateKST = getTodayDateKST()
    
    // UTC 기준 오늘 날짜도 계산 (직원 앱에서 UTC 기준으로 저장할 수 있음)
    const now = new Date()
    const todayDateUTC = now.toISOString().split('T')[0]
    
    // 한국 시간대 객체 생성 (요일 확인용) - UTC offset 계산 방식 (서버리스 환경 안정성)
    const kstOffset = 9 * 60 // 분 단위
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
    const koreaTime = new Date(utc + (kstOffset * 60 * 1000))
    
    // 한국 시간 기준으로 오늘 00:00:00 ~ 23:59:59 (UTC로 변환)
    const todayStartKST = new Date(koreaTime)
    todayStartKST.setHours(0, 0, 0, 0)
    const todayEndKST = new Date(koreaTime)
    todayEndKST.setHours(23, 59, 59, 999)

    // UTC로 변환 (Supabase는 UTC로 저장)
    const todayStart = new Date(todayStartKST.toISOString())
    const todayEnd = new Date(todayEndKST.toISOString())

    // 오늘 요일 확인 (한국 시간 기준)
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const todayDayName = dayNames[koreaTime.getDay()]
    
    // 개발 환경에서만 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.log(`=== Store Status API 호출 ===`)
      console.log(`오늘 날짜 (KST): ${todayDateKST}`)
      console.log(`오늘 날짜 (UTC): ${todayDateUTC}`)
      console.log(`오늘 요일: ${todayDayName}`)
    }

    // 배치 쿼리 최적화: 모든 매장의 store_assign을 한 번에 조회
    const storeIds = stores.map(s => s.id)
    const { data: allStoreAssigns, error: allStoreAssignsError } = await supabase
      .from('store_assign')
      .select('store_id, user_id')
      .in('store_id', storeIds)

    if (allStoreAssignsError) {
      // 에러는 항상 로깅
      console.error('Error fetching all store assigns:', allStoreAssignsError)
    }

    // 매장별로 배정된 직원 ID 목록을 메모리에 저장
    const assignsByStore = new Map<string, string[]>()
    allStoreAssigns?.forEach(assign => {
      if (!assignsByStore.has(assign.store_id)) {
        assignsByStore.set(assign.store_id, [])
      }
      assignsByStore.get(assign.store_id)!.push(assign.user_id)
    })

    // 배치 쿼리 최적화: 모든 매장의 문제보고, 분실물, 요청란, 물품요청, 체크리스트, 청소사진, 출근기록, 제품사진을 한 번에 조회
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    // product_photos 쿼리 최적화: 7일 범위로 제한 (JSON 파싱 에러 방지)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    // 모든 배정된 직원 ID 수집
    const allAssignedUserIds = Array.from(new Set(Array.from(assignsByStore.values()).flat()))

    // Promise.allSettled 사용: 일부 쿼리 실패해도 나머지 데이터 반환 보장
    const results = await Promise.allSettled([
      supabase
        .from('problem_reports')
        .select('id, store_id, category, status, title, created_at, business_confirmed_at')
        .in('store_id', storeIds)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .lte('created_at', todayEnd.toISOString()),
      supabase
        .from('lost_items')
        .select('id, store_id, status, created_at, updated_at, business_confirmed_at')
        .in('store_id', storeIds)
        .or(`created_at.gte.${thirtyDaysAgo.toISOString()},updated_at.gte.${thirtyDaysAgo.toISOString()}`),
      supabase
        .from('requests')
        .select('id, store_id, title, status, created_at, business_confirmed_at')
        .in('store_id', storeIds)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('supply_requests')
        .select('id, store_id, status')
        .in('store_id', storeIds)
        .in('status', ['received', 'in_progress', 'manager_in_progress']),
      supabase
        .from('checklist')
        .select('id, store_id, items, updated_at, work_date, assigned_user_id')
        .in('store_id', storeIds)
        .or(`work_date.eq.${todayDateKST},work_date.eq.${todayDateUTC},work_date.eq.2000-01-01`),
      supabase
        .from('cleaning_photos')
        .select('id, store_id, kind, created_at, area_category')
        .in('store_id', storeIds)
        .neq('area_category', 'inventory')
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString()),
      // 모든 매장의 출근 기록을 한 번에 조회 (최적화: OR 조건 단순화)
      // work_date는 인덱스 활용을 위해 별도 쿼리로 분리하지 않고, clock_in_at 범위로 우선 조회
      attendanceClient
        .from('attendance')
        .select('store_id, user_id, work_date, clock_in_at, clock_out_at')
        .in('store_id', storeIds)
        .gte('clock_in_at', todayStart.toISOString())
        .lte('clock_in_at', todayEnd.toISOString())
        .order('clock_in_at', { ascending: false }),
      // 모든 매장의 제품 입고/보관 사진을 한 번에 조회 (7일 범위로 최적화)
      supabase
        .from('product_photos')
        .select('id, store_id, type, photo_urls, created_at')
        .in('store_id', storeIds)
        .in('type', ['receipt', 'storage'])
        .gte('created_at', sevenDaysAgo.toISOString())
        .lte('created_at', todayEnd.toISOString()),
    ])

    // Promise.allSettled 결과 처리: 에러가 있어도 데이터 추출
    const extractData = <T>(result: PromiseSettledResult<{ data: T | null; error: any }>, name: string): { data: T | null; error: any } => {
      if (result.status === 'fulfilled') {
        if (result.value.error) {
          console.error(`Error fetching ${name}:`, result.value.error)
        }
        return result.value
      } else {
        console.error(`Promise rejected for ${name}:`, result.reason)
        return { data: null, error: result.reason }
      }
    }

    const { data: allProblemReports, error: allProblemReportsError } = extractData(results[0], 'problem_reports')
    const { data: allLostItems, error: allLostItemsError } = extractData(results[1], 'lost_items')
    const { data: allRequests, error: allRequestsError } = extractData(results[2], 'requests')
    const { data: allSupplyRequests, error: allSupplyRequestsError } = extractData(results[3], 'supply_requests')
    const { data: allChecklists, error: allChecklistsError } = extractData(results[4], 'checklist')
    const { data: allCleaningPhotos, error: allCleaningPhotosError } = extractData(results[5], 'cleaning_photos')
    const { data: allAttendances, error: allAttendancesError } = extractData(results[6], 'attendance')
    const { data: allProductPhotos, error: allProductPhotosError } = extractData(results[7], 'product_photos')

    // product_photos 에러 특별 처리 (큰 JSON 파싱 에러 가능성)
    if (allProductPhotosError) {
      console.error('Error fetching all product photos:', allProductPhotosError)
      // JSON 파싱 에러인 경우 상세 로깅
      if (allProductPhotosError.message?.includes('SyntaxError') || allProductPhotosError.message?.includes('JSON')) {
        console.error('Product photos JSON parsing error detected. This may indicate very large response data.')
      }
    }

    // 모든 출근한 직원의 ID 수집
    const allUserIds = new Set<string>()
    allAttendances?.forEach(att => {
      if (att.user_id) allUserIds.add(att.user_id)
    })

    // 모든 직원 정보를 한 번에 조회
    let usersMap = new Map<string, string>()
    if (allUserIds.size > 0) {
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', Array.from(allUserIds))
      
      if (usersError) {
        console.error('Error fetching users:', usersError)
      } else {
        allUsers?.forEach(user => {
          usersMap.set(user.id, user.name)
        })
      }
    }

    // 메모리에서 매장별로 그룹화
    const problemReportsByStore = new Map<string, typeof allProblemReports>()
    const lostItemsByStore = new Map<string, typeof allLostItems>()
    const requestsByStore = new Map<string, typeof allRequests>()
    const supplyRequestsByStore = new Map<string, typeof allSupplyRequests>()
    const checklistsByStore = new Map<string, typeof allChecklists>()
    const cleaningPhotosByStore = new Map<string, typeof allCleaningPhotos>()
    const attendancesByStore = new Map<string, typeof allAttendances>()
    const productPhotosByStore = new Map<string, typeof allProductPhotos>()

    allProblemReports?.forEach(pr => {
      if (!problemReportsByStore.has(pr.store_id)) {
        problemReportsByStore.set(pr.store_id, [])
      }
      problemReportsByStore.get(pr.store_id)!.push(pr)
    })

    allLostItems?.forEach(li => {
      if (!lostItemsByStore.has(li.store_id)) {
        lostItemsByStore.set(li.store_id, [])
      }
      lostItemsByStore.get(li.store_id)!.push(li)
    })

    allRequests?.forEach(req => {
      if (!requestsByStore.has(req.store_id)) {
        requestsByStore.set(req.store_id, [])
      }
      requestsByStore.get(req.store_id)!.push(req)
    })

    allSupplyRequests?.forEach(sr => {
      if (!supplyRequestsByStore.has(sr.store_id)) {
        supplyRequestsByStore.set(sr.store_id, [])
      }
      supplyRequestsByStore.get(sr.store_id)!.push(sr)
    })

    allChecklists?.forEach(cl => {
      if (!checklistsByStore.has(cl.store_id)) {
        checklistsByStore.set(cl.store_id, [])
      }
      checklistsByStore.get(cl.store_id)!.push(cl)
    })

    allCleaningPhotos?.forEach(cp => {
      if (!cleaningPhotosByStore.has(cp.store_id)) {
        cleaningPhotosByStore.set(cp.store_id, [])
      }
      cleaningPhotosByStore.get(cp.store_id)!.push(cp)
    })

    // 출근 기록을 매장별로 그룹화
    allAttendances?.forEach(att => {
      if (!attendancesByStore.has(att.store_id)) {
        attendancesByStore.set(att.store_id, [])
      }
      attendancesByStore.get(att.store_id)!.push(att)
    })

    // 제품 사진을 매장별로 그룹화
    allProductPhotos?.forEach(photo => {
      if (!productPhotosByStore.has(photo.store_id)) {
        productPhotosByStore.set(photo.store_id, [])
      }
      productPhotosByStore.get(photo.store_id)!.push(photo)
    })

    // 각 매장별 상태 조회
    const storeStatuses = await Promise.all(
      stores.map(async (store) => {
        try {
        // 오늘이 출근일인지 확인
        // 제안 방식: 야간 매장은 09:00 경계를 기준으로 관리일에 속하는 날짜 확인
        let isWorkDay = false
        if (store.is_night_shift) {
          // 야간매장: 현재 시간 기준으로 관리일에 속하는 날짜 확인 (09:00 경계 기준)
          // checkDate를 전달하지 않으면 현재 시간 기준으로 자동 계산
          isWorkDay = isManagementDay(
            store.management_days,
            true,
            store.work_start_hour || 0,
            store.work_end_hour || 9,
            undefined // checkDate를 전달하지 않아 현재 시간 기준으로 계산
          )
        } else {
          // 일반 매장
          isWorkDay = store.management_days
            ? store.management_days.split(',').map((d) => d.trim()).includes(todayDayName)
            : false
        }

        // 배치 쿼리에서 가져온 배정된 직원 ID 목록 사용
        const assignedUserIds = assignsByStore.get(store.id) || []

        // 배치 쿼리에서 가져온 출근 기록 사용
        const storeAttendances = attendancesByStore.get(store.id) || []
        
        // 오늘 날짜의 출근 기록 필터링 (KST와 UTC 둘 다 확인)
        // 우선순위: 배정된 직원의 user_id로 조회한 결과 > clock_in_at 범위 > work_date
        let todayAttendances: any[] = []
        
        // 1. 배정된 직원의 user_id로 조회한 결과 (직원 앱과 동일한 방식)
        if (assignedUserIds.length > 0) {
          const attendancesByUserId = storeAttendances.filter(a => 
            assignedUserIds.includes(a.user_id) && 
            (a.work_date === todayDateKST || a.work_date === todayDateUTC)
          )
          if (attendancesByUserId.length > 0) {
            todayAttendances = attendancesByUserId
          }
        }
        
        // 2. clock_in_at 범위로 조회 (가장 신뢰할 수 있는 방법)
        if (todayAttendances.length === 0) {
          const attendancesByClockIn = storeAttendances.filter(a => {
            if (!a.clock_in_at) return false
            const clockInTime = new Date(a.clock_in_at)
            return clockInTime >= todayStart && clockInTime <= todayEnd
          })
          if (attendancesByClockIn.length > 0) {
            todayAttendances = attendancesByClockIn
          }
        }
        
        // 3. work_date로 조회 (KST 우선, UTC 대체)
        if (todayAttendances.length === 0) {
          const attendancesByWorkDateKST = storeAttendances.filter(a => a.work_date === todayDateKST)
          if (attendancesByWorkDateKST.length > 0) {
            todayAttendances = attendancesByWorkDateKST
          } else {
            const attendancesByWorkDateUTC = storeAttendances.filter(a => a.work_date === todayDateUTC)
            if (attendancesByWorkDateUTC.length > 0) {
              todayAttendances = attendancesByWorkDateUTC
            }
          }
        }

        // 출근한 직원 정보 조회 (배치 쿼리에서 가져온 usersMap 사용)
        let staffName: string | null = null
        const latestAttendance = todayAttendances.length > 0 ? todayAttendances[0] : null
        if (latestAttendance?.user_id) {
          staffName = usersMap.get(latestAttendance.user_id) || null
        }

        // 배치 쿼리에서 가져온 데이터 사용
        const problemReports = problemReportsByStore.get(store.id) || []
        const lostItems = lostItemsByStore.get(store.id) || []
        
        // 개발 환경에서만 디버깅 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log(`Lost items query for ${store.name}: found ${lostItems?.length || 0} items`)
          console.log(`\n=== Store ${store.id} (${store.name}) ===`)
          console.log(`Total problem reports found: ${problemReports?.length || 0}`)
          if (problemReports && problemReports.length > 0) {
            const categorySet = new Set<string>()
            problemReports.forEach((p: any) => {
              if (p.category) categorySet.add(p.category)
            })
            const uniqueCategories = Array.from(categorySet)
            console.log(`Unique category values in DB:`, uniqueCategories)
            console.log('All problem reports with raw category values:')
            problemReports.forEach((p: any, index: number) => {
              console.log(`  [${index + 1}] ID: ${p.id}, Category: "${p.category}", Status: ${p.status}, Title: ${p.title?.substring(0, 40)}`)
            })
          } else {
            console.log('No problem reports found for this store')
          }
        }

        // 문제보고 카운트 (카테고리별, 상태별)
        // category 값이 정확히 일치하지 않을 수 있으므로 다양한 형식 지원
        // 실제 저장된 값에 따라 필터링 (title이나 다른 필드로도 판단 가능)
        const storeProblemCount = problemReports?.filter((p: any) => {
          const cat = String(p.category || '').toLowerCase().trim()
          const title = String(p.title || '').toLowerCase()
          
          // category로 직접 매칭
          const categoryMatch = cat === 'store_problem' || cat === 'store-problem' || cat === 'storeproblem'
          
          // "자판기 고장/오류"는 매장 문제로 분류
          if (title.includes('자판기 고장') || title.includes('자판기 오류')) {
            return true
          }
          
          // "제품 걸림" 또는 "수량 오류"는 자판기 문제이므로 제외
          if (title.includes('제품 걸림') || title.includes('수량 오류')) {
            return false
          }
          
          // title에 "매장 문제"가 포함되어 있으면 매장 문제로 간주
          const titleMatch = title.includes('매장 문제') || title.includes('제품 관련') || title.includes('무인택배함') || title.includes('매장 시설')
          
          const matches = categoryMatch || titleMatch
          
          return matches
        }).length || 0
        
        const vendingProblemCount = problemReports?.filter((p: any) => {
          const cat = String(p.category || '').toLowerCase().trim()
          const title = String(p.title || '').toLowerCase()
          
          // category로 직접 매칭
          const categoryMatch = cat === 'vending_machine' || cat === 'vending-machine' || cat === 'vendingmachine'
          
          // "자판기 고장/오류"는 매장 문제이므로 제외
          if (title.includes('자판기 고장') || title.includes('자판기 오류')) {
            return false
          }
          
          // "제품 걸림" 또는 "수량 오류"는 자판기 내부 문제로 분류
          const titleMatch = title.includes('제품 걸림') || title.includes('수량 오류') || 
            (title.includes('자판기') && (title.includes('제품') || title.includes('수량')))
          
          const matches = categoryMatch || titleMatch
          
          return matches
        }).length || 0
        
        const lostItemCount = lostItems?.length || 0

        // 미처리/처리 완료 카운트 (매장 문제 보고) - business_confirmed_at이 null인 것만
        const unprocessedStoreProblems = problemReports?.filter((p: any) => {
          const cat = String(p.category || '').toLowerCase().trim()
          const title = String(p.title || '').toLowerCase()
          const categoryMatch = cat === 'store_problem' || cat === 'store-problem' || cat === 'storeproblem'
          const titleMatch = title.includes('매장 문제') || title.includes('자판기 고장') || title.includes('제품 관련') || title.includes('무인택배함') || title.includes('매장 시설')
          const isStoreProblem = categoryMatch || (titleMatch && !title.includes('자판기 수량') && !title.includes('자판기 제품 걸림'))
          return isStoreProblem && (p.status === 'pending' || p.status === 'received' || p.status === 'submitted') && !p.business_confirmed_at
        }).length || 0
        
        const completedStoreProblems = problemReports?.filter((p: any) => {
          const cat = String(p.category || '').toLowerCase().trim()
          const title = String(p.title || '').toLowerCase()
          const categoryMatch = cat === 'store_problem' || cat === 'store-problem' || cat === 'storeproblem'
          const titleMatch = title.includes('매장 문제') || title.includes('자판기 고장') || title.includes('제품 관련') || title.includes('무인택배함') || title.includes('매장 시설')
          const isStoreProblem = categoryMatch || (titleMatch && !title.includes('자판기 수량') && !title.includes('자판기 제품 걸림'))
          return isStoreProblem && p.status === 'completed'
        }).length || 0

        // 미확인/확인 카운트 (자판기 내부 문제, 분실물) - business_confirmed_at이 null인 것만
        const unconfirmedVendingProblems = problemReports?.filter((p: any) => {
          const cat = String(p.category || '').toLowerCase().trim()
          const title = String(p.title || '').toLowerCase()
          const categoryMatch = cat === 'vending_machine' || cat === 'vending-machine' || cat === 'vendingmachine'
          const titleMatch = (title.includes('자판기 수량') || title.includes('자판기 제품 걸림')) && title.includes('자판기')
          const isVendingProblem = categoryMatch || titleMatch
          return isVendingProblem && (p.status === 'pending' || p.status === 'received' || p.status === 'submitted') && !p.business_confirmed_at
        }).length || 0
        
        const confirmedVendingProblems = problemReports?.filter((p: any) => {
          const cat = String(p.category || '').toLowerCase().trim()
          const title = String(p.title || '').toLowerCase()
          const categoryMatch = cat === 'vending_machine' || cat === 'vending-machine' || cat === 'vendingmachine'
          const titleMatch = (title.includes('자판기 수량') || title.includes('자판기 제품 걸림')) && title.includes('자판기')
          const isVendingProblem = categoryMatch || titleMatch
          return isVendingProblem && p.status === 'completed'
        }).length || 0

        // 개발 환경에서만 디버깅 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log(`Counts for ${store.name}:`, {
            storeProblemCount,
            vendingProblemCount,
            lostItemCount,
            totalProblemReports: problemReports?.length || 0,
            unprocessedStoreProblems,
            completedStoreProblems,
            unconfirmedVendingProblems,
            confirmedVendingProblems
          })
          console.log(`=== End Store ${store.id} ===\n`)

          // 분실물 상태 디버깅
          if (lostItems && lostItems.length > 0) {
            console.log(`Lost items for ${store.name}:`)
            lostItems.forEach((l: any) => {
              console.log(`  - ID: ${l.id}, Status: "${l.status}"`)
            })
          }
        }

        // 분실물 상태별 카운트 - business_confirmed_at이 null인 것만 미확인으로 처리
        const unconfirmedLostItems = lostItems?.filter(
          (l: any) => !l.business_confirmed_at
        ).length || 0
        const confirmedLostItems = lostItems?.filter(
          (l: any) => l.status === 'completed'
        ).length || 0

        // 개발 환경에서만 디버깅 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log(`Lost items counts for ${store.name}: unconfirmed=${unconfirmedLostItems}, confirmed=${confirmedLostItems}`)
          console.log(`Lost items status breakdown:`, lostItems?.map((l: any) => ({ id: l.id, status: l.status })))
        }

        // 배치 쿼리에서 가져온 제품 사진 데이터 사용
        const storeProductPhotos = productPhotosByStore.get(store.id) || []
        
        // 오늘 제품 입고 사진 (type = 'receipt')
        const todayProductInflow = storeProductPhotos.filter((p: any) => 
          p.type === 'receipt' &&
          new Date(p.created_at) >= todayStart &&
          new Date(p.created_at) <= todayEnd
        )

        // 최근 보관 사진 (type = 'storage') - 최신 사진만 (최대 2개)
        const storagePhotos = storeProductPhotos
          .filter((p: any) => p.type === 'storage')
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 1)
        
        const recentStoragePhotos = storagePhotos.flatMap((item: any) => {
          const urls = Array.isArray(item.photo_urls) ? item.photo_urls : []
          return urls.slice(0, 2).map((url: string, idx: number) => ({
            id: `${item.id}-${idx}`,
            photo_url: url,
          }))
        })

        // 배치 쿼리에서 가져온 데이터 사용
        const recentRequests = requestsByStore.get(store.id) || []
        const receivedRequests = recentRequests.filter((r: any) => r.status === 'received')
        const inProgressRequests = recentRequests.filter((r: any) => r.status === 'in_progress')
        const completedRequests = recentRequests.filter((r: any) => r.status === 'completed')
        const rejectedRequests = recentRequests.filter((r: any) => r.status === 'rejected')
        const receivedRequestCount = receivedRequests.length
        const inProgressRequestCount = inProgressRequests.length
        const completedRequestCount = completedRequests.length
        const rejectedRequestCount = rejectedRequests.length
        // business_confirmed_at이 null인 완료/반려 요청만 미확인으로 처리
        const unconfirmedCompletedCount = completedRequests.filter((r: any) => !r.business_confirmed_at).length
        const unconfirmedRejectedCount = rejectedRequests.filter((r: any) => !r.business_confirmed_at).length

        // 배치 쿼리에서 가져온 물품 요청 데이터 사용
        const supplyRequests = supplyRequestsByStore.get(store.id) || []
        const receivedSupplyRequestCount = supplyRequests.filter((r: any) => r.status === 'received').length
        const inProgressSupplyRequestCount = supplyRequests.filter((r: any) => r.status === 'in_progress' || r.status === 'manager_in_progress').length

        // 배치 쿼리에서 가져온 체크리스트 데이터 사용
        const storeChecklists = checklistsByStore.get(store.id) || []
        const todayChecklistsKST = storeChecklists.filter((c: any) => c.work_date === todayDateKST)
        const todayChecklistsUTC = storeChecklists.filter((c: any) => c.work_date === todayDateUTC)
        const templateChecklists = storeChecklists.filter((c: any) => c.work_date === '2000-01-01' && !c.assigned_user_id)
        const todayChecklists = [...todayChecklistsKST, ...todayChecklistsUTC]
        const hasTodayChecklists = todayChecklists.length > 0
        const checklistsToUse = hasTodayChecklists ? todayChecklists : templateChecklists

        // 배치 쿼리에서 가져온 청소 사진 데이터 사용
        const todayCleaningPhotos = cleaningPhotosByStore.get(store.id) || []
        const beforePhotos = todayCleaningPhotos.filter((p: any) => p.kind === 'before')
        const afterPhotos = todayCleaningPhotos.filter((p: any) => p.kind === 'after')

        // 체크리스트에서 관리전후 사진 추출 (중복 제거: area 기준)
        const beforeAfterPhotosMap = new Map<string, { id: string; before_photo_url: string | null; after_photo_url: string | null; area: string }>()
        if (checklistsToUse && checklistsToUse.length > 0) {
          checklistsToUse.forEach((checklist: any) => {
            const items = checklist.items || []
            items.forEach((item: any, index: number) => {
              // 타입 정규화 (하위 호환성)
              let itemType: string = item.type || 'check'
              if (itemType === 'photo') {
                itemType = 'before_after_photo' // 구버전 호환
              }

              // area가 없는 항목은 제외
              if (!item.area || !item.area.trim()) {
                return
              }

              const area = item.area.trim()
              
              // 사진 타입 항목만 처리
              if (itemType === 'before_photo' || itemType === 'after_photo' || itemType === 'before_after_photo') {
                // before_photo_url 또는 after_photo_url이 있는 경우만 추가
                const hasBeforePhoto = item.before_photo_url && itemType !== 'after_photo'
                const hasAfterPhoto = item.after_photo_url && itemType !== 'before_photo'
                
                if (hasBeforePhoto || hasAfterPhoto) {
                  // 같은 area가 이미 있으면 업데이트 (더 최신 체크리스트의 사진 사용)
                  const existing = beforeAfterPhotosMap.get(area)
                  beforeAfterPhotosMap.set(area, {
                    id: `checklist-${checklist.id}-photo-${index}`,
                    before_photo_url: hasBeforePhoto ? item.before_photo_url : (existing?.before_photo_url || null),
                    after_photo_url: hasAfterPhoto ? item.after_photo_url : (existing?.after_photo_url || null),
                    area: area,
                  })
                }
              }
            })
          })
        }
        const beforeAfterPhotos = Array.from(beforeAfterPhotosMap.values())

        // 체크리스트 진행률 계산 (calculateChecklistProgress 함수 사용)
        let checklistCompletionRate = 0
        let checklistCompleted = 0
        let checklistTotal = 0

        if (checklistsToUse && checklistsToUse.length > 0) {
          if (hasTodayChecklists) {
            // 오늘 날짜 체크리스트가 있으면 진행률 계산
            checklistsToUse.forEach((checklist: any) => {
              const progress = calculateChecklistProgress(checklist)
              checklistTotal += progress.totalItems
              checklistCompleted += progress.completedItems
            })
          } else {
            // 템플릿 체크리스트만 있는 경우: 전체 항목 수만 계산 (완료 항목은 0)
            checklistsToUse.forEach((checklist: any) => {
              const items = checklist.items || []
              items.forEach((item: any) => {
                if (item.area && item.area.trim()) {
                  const itemType = item.type || 'check'
                  if (itemType === 'check') {
                    checklistTotal++
                  } else if (itemType === 'before_photo' || itemType === 'after_photo') {
                    checklistTotal++
                  } else if (itemType === 'before_after_photo' || itemType === 'photo') {
                    checklistTotal += 2
                  }
                }
              })
            })
          }

          checklistCompletionRate = checklistTotal > 0 ? Math.round((checklistCompleted / checklistTotal) * 100) : 0
        }

        // 마지막 업데이트 시간
        let lastUpdateTime: string | null = null
        const allUpdates = [
          ...todayAttendances.map(a => a.clock_in_at),
          ...todayAttendances.map(a => a.clock_out_at).filter(Boolean),
          todayChecklists?.[0]?.updated_at,
          todayCleaningPhotos?.[0]?.created_at,
        ].filter(Boolean)

        if (allUpdates.length > 0) {
          lastUpdateTime = allUpdates.sort().reverse()[0]
        }

        // 출근 상태 결정 (배정된 직원들의 출근 상태를 종합)
        // 오늘 날짜의 출근 기록만 필터링 (work_date가 정확히 오늘인 것만)
        const todayOnlyAttendances = todayAttendances.filter(a => {
          const recordDate = a.work_date
          // 한국 시간대 기준 오늘 날짜와 정확히 일치하는 것만
          const isToday = recordDate === todayDateKST
          if (!isToday && process.env.NODE_ENV === 'development') {
            console.log(`Store ${store.name}: 어제 출근 기록 제외 (work_date: ${recordDate}, 오늘: ${todayDateKST})`)
          }
          return isToday
        })
        
        let attendanceStatus: 'not_clocked_in' | 'clocked_in' | 'clocked_out' = 'not_clocked_in'
        let clockInTime: string | null = null
        let clockOutTime: string | null = null

        // 개발 환경에서만 디버깅 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log(`Store ${store.name}: 배정된 직원 수: ${assignedUserIds.length}, 전체 출근 기록 수: ${todayAttendances.length}, 오늘 출근 기록 수: ${todayOnlyAttendances.length}`)
        }

        if (todayOnlyAttendances.length > 0) {
          // 출근 중인 직원이 있는지 확인 (출근했지만 퇴근하지 않은 경우)
          const clockedInStaff = todayOnlyAttendances.find(a => !a.clock_out_at)
          
          if (clockedInStaff) {
            // 한 명이라도 출근 중이면 "출근중"
            attendanceStatus = 'clocked_in'
            clockInTime = clockedInStaff.clock_in_at
            if (process.env.NODE_ENV === 'development') {
              console.log(`Store ${store.name}: 출근중 상태 (user_id: ${clockedInStaff.user_id})`)
            }
          } else {
            // 모두 퇴근했으면 "퇴근완료" (가장 최근 퇴근 시간 기준)
            const latestClockOut = todayOnlyAttendances
              .filter(a => a.clock_out_at)
              .sort((a, b) => new Date(b.clock_out_at).getTime() - new Date(a.clock_out_at).getTime())[0]
            
            if (latestClockOut) {
              attendanceStatus = 'clocked_out'
              clockOutTime = latestClockOut.clock_out_at
              clockInTime = latestClockOut.clock_in_at
              if (process.env.NODE_ENV === 'development') {
                console.log(`Store ${store.name}: 퇴근완료 상태 (user_id: ${latestClockOut.user_id})`)
              }
            }
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log(`Store ${store.name}: 출근전 상태 (배정된 직원: ${assignedUserIds.length}명, 오늘 출근 기록 없음)`)
          }
        }

        // 휴무일일 때는 출퇴근 시간을 표시하지 않음
        if (!isWorkDay) {
          clockInTime = null
          clockOutTime = null
          attendanceStatus = 'not_clocked_in'
        }

        const hasProblem = storeProblemCount > 0 || vendingProblemCount > 0 || lostItemCount > 0

        // 야간매장 상태 메시지 생성 (상세 상태 안내)
        // 휴무일 경우 일반 매장과 동일하게 처리하기 위해 statusLabel을 설정하지 않음
        let statusLabel: string | null = null
        if (store.is_night_shift && 
            store.work_start_hour !== null && 
            store.work_end_hour !== null &&
            isWorkDay) { // 관리일일 때만 상태 메시지 생성
          const currentHour = getCurrentHourKST()
          const isWithinPeriod = isWithinManagementPeriod(
            true,
            store.work_start_hour,
            store.work_end_hour,
            currentHour
          )
          
          if (isWithinPeriod) {
            // 관리일 범위 내
            // 퇴근 완료 상태면 statusLabel을 null로 설정하여 프론트엔드에서 "퇴근완료" 표시
            if (attendanceStatus === 'clocked_out') {
              statusLabel = null
            } else {
              // 관리일일 때만 이 분기에 들어오므로 "관리일 (관리 가능)" 표시
              statusLabel = '관리일 (관리 가능)'
            }
          } else {
            // 관리일 범위 밖
            if (currentHour < store.work_start_hour) {
              // work_start_hour 이전
              statusLabel = `오늘 오후 ${store.work_start_hour}시부터 관리 시작 예정`
            } else if (currentHour >= store.work_end_hour) {
              // work_end_hour 이후
              if (attendanceStatus === 'clocked_out') {
                statusLabel = '관리완료'
              } else {
                statusLabel = `오늘이 관리일, 오후 ${store.work_start_hour}시부터 시작`
              }
            }
          }
        }

        return {
          store_id: store.id,
          store_name: store.name,
          store_address: store.address,
          management_days: store.management_days,
          work_day: store.management_days, // 정렬을 위해 추가
          is_work_day: isWorkDay,
          is_night_shift: store.is_night_shift || false, // 야간매장 여부
          status_label: statusLabel, // 야간매장 상태 메시지
          attendance_status: attendanceStatus,
          clock_in_time: clockInTime,
          clock_out_time: clockOutTime,
          staff_name: staffName,
          has_problem: hasProblem,
          // 문제 보고 카운트
          store_problem_count: storeProblemCount,
          vending_problem_count: vendingProblemCount,
          lost_item_count: lostItemCount,
          // 상태별 카운트
          unprocessed_store_problems: unprocessedStoreProblems,
          completed_store_problems: completedStoreProblems,
          unconfirmed_vending_problems: unconfirmedVendingProblems,
          confirmed_vending_problems: confirmedVendingProblems,
          unconfirmed_lost_items: unconfirmedLostItems,
          confirmed_lost_items: confirmedLostItems,
          // 제품 입고 및 보관 사진
          has_product_inflow_today: todayProductInflow.length > 0,
          has_storage_photos: recentStoragePhotos.length > 0,
          storage_photos: recentStoragePhotos,
          // 요청란
          received_request_count: receivedRequestCount,
          received_supply_request_count: receivedSupplyRequestCount,
          in_progress_supply_request_count: inProgressSupplyRequestCount,
          in_progress_request_count: inProgressRequestCount,
          completed_request_count: completedRequestCount,
          rejected_request_count: rejectedRequestCount,
          unconfirmed_completed_request_count: unconfirmedCompletedCount,
          unconfirmed_rejected_request_count: unconfirmedRejectedCount,
          // 체크리스트 및 사진
          before_photo_count: beforePhotos.length,
          after_photo_count: afterPhotos.length,
          before_after_photos: beforeAfterPhotos, // 체크리스트의 관리전후 사진 데이터
          checklist_completion_rate: checklistCompletionRate,
          checklist_completed: checklistCompleted,
          checklist_total: checklistTotal,
          last_update_time: lastUpdateTime,
        }
        } catch (storeError: any) {
          console.error(`Store ${store.name} (${store.id}) 처리 중 오류:`, storeError)
          // 에러가 발생한 매장은 기본값으로 반환하여 다른 매장은 정상 표시되도록 함
          return {
            store_id: store.id,
            store_name: store.name,
            store_address: store.address,
            management_days: store.management_days,
            work_day: store.management_days,
            is_work_day: store.management_days
              ? store.management_days.split(',').map((d: string) => d.trim()).includes(todayDayName)
              : false,
            is_night_shift: store.is_night_shift || false, // 야간매장 여부
            attendance_status: 'not_clocked_in' as const,
            clock_in_time: null,
            clock_out_time: null,
            staff_name: null,
            has_problem: false,
            store_problem_count: 0,
            vending_problem_count: 0,
            lost_item_count: 0,
            unprocessed_store_problems: 0,
            completed_store_problems: 0,
            unconfirmed_vending_problems: 0,
            confirmed_vending_problems: 0,
            unconfirmed_lost_items: 0,
            confirmed_lost_items: 0,
            has_product_inflow_today: false,
            has_storage_photos: false,
            storage_photos: [],
            received_request_count: 0,
            received_supply_request_count: 0,
            in_progress_supply_request_count: 0,
            in_progress_request_count: 0,
            completed_request_count: 0,
            rejected_request_count: 0,
            unconfirmed_completed_request_count: 0,
            unconfirmed_rejected_request_count: 0,
            before_photo_count: 0,
            after_photo_count: 0,
            before_after_photos: [],
            checklist_completion_rate: 0,
            checklist_completed: 0,
            checklist_total: 0,
            last_update_time: null,
          }
        }
      })
    )

    // 마지막 수정 시간 계산
    const allStoreUpdates = stores.map((s) => s.updated_at).filter(Boolean)
    const lastModifiedAt = allStoreUpdates.length > 0 
      ? allStoreUpdates.sort().reverse()[0] 
      : new Date().toISOString()

    return Response.json({
      success: true,
      data: storeStatuses,
      last_modified_at: lastModifiedAt,
      // 배포 환경 디버깅을 위한 정보 (개발 환경에서만 포함)
      ...(process.env.NODE_ENV === 'development' && {
        _debug: {
          ...debugInfo,
          total_stores: storeStatuses.length,
          stores_with_attendance: storeStatuses.filter((s: any) => s.attendance_status !== 'not_clocked_in').length,
        },
      }),
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

