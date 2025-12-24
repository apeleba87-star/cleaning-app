import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { calculateChecklistProgress } from '@/lib/utils/checklist'
import { createClient } from '@supabase/supabase-js'
import { getTodayDateKST } from '@/lib/utils/date'

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
    
    if (serviceRoleKey && supabaseUrl) {
      adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
      console.log('서비스 역할 키를 사용하여 attendance 테이블 조회 (RLS 우회)')
    } else {
      console.warn('서비스 역할 키가 설정되지 않음. RLS 정책에 따라 attendance 조회가 실패할 수 있습니다.')
    }
    
    // attendance 테이블 조회용 클라이언트 (서비스 역할 키 우선 사용)
    const attendanceClient = adminSupabase || supabase

    // 회사에 속한 모든 매장 조회
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, address, management_days, updated_at')
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
    
    // 한국 시간대 객체 생성 (요일 확인용)
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    
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
    
    console.log(`=== Store Status API 호출 ===`)
    console.log(`오늘 날짜 (KST): ${todayDateKST}`)
    console.log(`오늘 날짜 (UTC): ${todayDateUTC}`)
    console.log(`오늘 요일: ${todayDayName}`)

    // 각 매장별 상태 조회
    const storeStatuses = await Promise.all(
      stores.map(async (store) => {
        try {
        // 오늘이 출근일인지 확인
        const isWorkDay = store.management_days
          ? store.management_days.split(',').map((d) => d.trim()).includes(todayDayName)
          : false

        // 매장에 배정된 모든 직원 조회
        let assignedUserIds: string[] = []
        try {
          const { data: assignedStaff, error: assignError } = await supabase
            .from('store_assign')
            .select('user_id')
            .eq('store_id', store.id)

          if (assignError) {
            console.error(`Store ${store.name}: store_assign 조회 오류:`, assignError)
            // 에러가 발생해도 빈 배열로 처리하여 계속 진행
            assignedUserIds = []
          } else {
            assignedUserIds = assignedStaff?.map(s => s.user_id) || []
            console.log(`Store ${store.name}: 배정된 직원 ID 목록:`, assignedUserIds)
          }
        } catch (error) {
          console.error(`Store ${store.name}: store_assign 조회 중 예외 발생:`, error)
          // 예외 발생 시 빈 배열로 처리하여 계속 진행
          assignedUserIds = []
        }

        // 해당 매장의 오늘 출근 정보 조회 (store_id만으로 조회하여 배정과 무관하게 실제 출근 기록 확인)
        let todayAttendances: any[] = []
        try {
          console.log(`Store ${store.name} (${store.id}): 출근 기록 조회 시작`)
          console.log(`  - 오늘 날짜 (KST): ${todayDateKST}, (UTC): ${todayDateUTC}`)
          console.log(`  - clock_in_at 범위 (UTC): ${todayStart.toISOString()} ~ ${todayEnd.toISOString()}`)
          console.log(`  - 한국 시간 현재: ${koreaTime.toLocaleString('ko-KR')}`)
          
          // 먼저 해당 매장의 최근 출근 기록 조회 (배정 여부와 무관하게)
          // store_id만으로 조회하여 실제로 출근 기록이 있는지 확인
          // RLS 정책 문제로 인해 서비스 역할 키 사용
          const { data: recentAttendances, error: recentError } = await attendanceClient
            .from('attendance')
            .select('work_date, clock_in_at, clock_out_at, user_id, store_id')
            .eq('store_id', store.id)
            .order('clock_in_at', { ascending: false })
            .limit(10)
          
          // RLS 에러인 경우 상세 로그 출력
          if (recentError) {
            console.error(`Store ${store.name}: attendance 조회 에러 상세:`, {
              message: recentError.message,
              code: recentError.code,
              details: recentError.details,
              hint: recentError.hint,
              usingServiceRole: !!adminSupabase
            })
          }
          
          // 배정된 직원의 user_id로 모든 출근 기록 조회 (store_id 필터 없이)
          let allUserAttendances: any[] = []
          if (assignedUserIds.length > 0) {
            const { data: userAttendances, error: userAttendanceError } = await attendanceClient
              .from('attendance')
              .select('work_date, clock_in_at, clock_out_at, user_id, store_id')
              .in('user_id', assignedUserIds)
              .order('clock_in_at', { ascending: false })
              .limit(20)
            
            if (userAttendanceError) {
              console.error(`Store ${store.name}: 배정된 직원 출근 기록 조회 오류:`, userAttendanceError)
            } else {
              allUserAttendances = userAttendances || []
              console.log(`Store ${store.name}: 배정된 직원(${assignedUserIds[0]})의 모든 출근 기록: ${allUserAttendances.length}건`)
              if (allUserAttendances.length > 0) {
                console.log(`Store ${store.name}: 배정된 직원의 모든 출근 기록:`, allUserAttendances.map(a => ({
                  user_id: a.user_id,
                  store_id: a.store_id,
                  expected_store_id: store.id,
                  store_id_match: a.store_id === store.id,
                  work_date: a.work_date,
                  clock_in_at: a.clock_in_at,
                  clock_out_at: a.clock_out_at
                })))
                
                // 이 매장의 출근 기록만 필터링
                const thisStoreAttendances = allUserAttendances.filter(a => a.store_id === store.id)
                console.log(`Store ${store.name}: 이 매장(${store.id})의 출근 기록: ${thisStoreAttendances.length}건`)
                
                // 오늘 날짜의 출근 기록 필터링 (KST와 UTC 둘 다 확인)
                const todayStoreAttendances = thisStoreAttendances.filter(a => 
                  a.work_date === todayDateKST || a.work_date === todayDateUTC
                )
                console.log(`Store ${store.name}: 오늘(${todayDateKST} 또는 ${todayDateUTC}) 이 매장의 출근 기록: ${todayStoreAttendances.length}건`)
                
                if (todayStoreAttendances.length > 0) {
                  // 이 기록들을 todayAttendances에 추가
                  todayAttendances = todayStoreAttendances
                  console.log(`Store ${store.name}: 배정된 직원의 오늘 출근 기록 사용:`, todayAttendances.map(a => ({
                    user_id: a.user_id,
                    store_id: a.store_id,
                    work_date: a.work_date,
                    clock_in_at: a.clock_in_at,
                    clock_out_at: a.clock_out_at
                  })))
                }
              }
            }
          }
          
          // 디버깅: store_id로 조회한 결과 확인
          console.log(`Store ${store.name}: attendance 테이블 조회 조건 - store_id=${store.id}`)

          if (recentError) {
            console.error(`Store ${store.name}: 최근 출근 기록 조회 오류:`, recentError)
          } else {
            console.log(`Store ${store.name}: 최근 출근 기록 조회 결과 - 총 ${recentAttendances?.length || 0}건`)
            if (recentAttendances && recentAttendances.length > 0) {
              console.log(`Store ${store.name}: 최근 출근 기록 (전체, 배정 무관):`, recentAttendances.map(a => ({
                user_id: a.user_id,
                work_date: a.work_date,
                work_date_type: typeof a.work_date,
                clock_in_at: a.clock_in_at,
                clock_out_at: a.clock_out_at
              })))
              
              // store_id로 조회한 결과에서 오늘 날짜 필터링
              const todayFromStoreId = recentAttendances.filter(a => {
                const recordDate = a.work_date
                return recordDate === todayDateKST || recordDate === todayDateUTC
              })
              
              if (todayFromStoreId.length > 0) {
                console.log(`Store ${store.name}: store_id 조회 결과에서 오늘 날짜 필터링: ${todayFromStoreId.length}건`)
                // 이 결과를 todayAttendances에 추가
                if (todayAttendances.length === 0) {
                  todayAttendances = todayFromStoreId
                  console.log(`Store ${store.name}: store_id 조회 결과 사용:`, todayAttendances.map(a => ({
                    user_id: a.user_id,
                    work_date: a.work_date,
                    clock_in_at: a.clock_in_at,
                    clock_out_at: a.clock_out_at
                  })))
                }
              }
              
              // 배정된 직원과 실제 출근한 직원 비교
              const userIdSet = new Set<string>()
              recentAttendances.forEach(a => userIdSet.add(a.user_id))
              const recentUserIds = Array.from(userIdSet)
              console.log(`Store ${store.name}: 최근 출근한 직원 ID:`, recentUserIds)
              console.log(`Store ${store.name}: 배정된 직원 ID:`, assignedUserIds)
              const mismatch = recentUserIds.filter(id => !assignedUserIds.includes(id))
              if (mismatch.length > 0) {
                console.warn(`Store ${store.name}: 배정되지 않은 직원이 출근함:`, mismatch)
              }
            } else {
              console.log(`Store ${store.name}: 최근 출근 기록이 없습니다.`)
            }
          }

          // 직원 앱과 동일한 방식으로 조회: user_id로 직접 조회
          // 방법 0: 배정된 직원의 user_id로 직접 조회 (직원 앱과 동일한 방식)
          let attendancesByUserId: any[] = []
          if (assignedUserIds.length > 0) {
            // 먼저 해당 user_id의 최근 출근 기록을 모두 조회하여 work_date 형식 확인
            const { data: allRecentAttendances, error: allRecentError } = await supabase
              .from('attendance')
              .select('clock_in_at, clock_out_at, user_id, work_date, store_id')
              .in('user_id', assignedUserIds)
              .order('clock_in_at', { ascending: false })
              .limit(10)
            
            if (allRecentError) {
              console.error(`Store ${store.name}: 최근 출근 기록 전체 조회 오류:`, allRecentError)
            } else if (allRecentAttendances && allRecentAttendances.length > 0) {
              console.log(`Store ${store.name}: 배정된 직원의 최근 출근 기록 (전체, 날짜 무관):`, allRecentAttendances.map(a => ({
                user_id: a.user_id,
                store_id: a.store_id,
                work_date: a.work_date,
                work_date_type: typeof a.work_date,
                clock_in_at: a.clock_in_at,
                clock_out_at: a.clock_out_at
              })))
            } else {
              console.log(`Store ${store.name}: 배정된 직원의 최근 출근 기록이 전혀 없습니다.`)
            }
            
            // 직원 앱과 동일하게: user_id와 work_date로 조회
            // 직원 앱에서는 `new Date().toISOString().split('T')[0]`를 사용하므로
            // 브라우저의 로컬 시간대 기준 날짜를 사용합니다 (한국 시간대라면 KST)
            const { data: attendancesByUser, error: userError } = await attendanceClient
              .from('attendance')
              .select('clock_in_at, clock_out_at, user_id, work_date, store_id')
              .in('user_id', assignedUserIds)
              .eq('work_date', todayDateKST) // 직원 앱과 동일하게 KST 날짜 사용
              .order('clock_in_at', { ascending: false })
            
            if (userError) {
              console.error(`Store ${store.name}: user_id 조회 오류:`, userError)
            } else {
              attendancesByUserId = (attendancesByUser || []).filter(a => a.store_id === store.id)
              console.log(`Store ${store.name}: user_id(${assignedUserIds[0]}) + work_date(${todayDateKST}) 조회 결과: ${attendancesByUser?.length || 0}건 (이 매장: ${attendancesByUserId.length}건)`)
              if (attendancesByUser && attendancesByUser.length > 0) {
                console.log(`Store ${store.name}: user_id 조회 상세:`, attendancesByUser.map(a => ({
                  user_id: a.user_id,
                  store_id: a.store_id,
                  expected_store_id: store.id,
                  store_id_match: a.store_id === store.id,
                  work_date: a.work_date,
                  clock_in_at: a.clock_in_at,
                  clock_out_at: a.clock_out_at
                })))
              }
            }
          }
          
          // 오늘 날짜로 정확히 조회 (store_id만으로, 배정 여부와 무관하게)
          // 방법 1: work_date로 조회 (KST와 UTC 둘 다 확인)
          const { data: attendancesByWorkDateKST, error: workDateKSTError } = await attendanceClient
            .from('attendance')
            .select('clock_in_at, clock_out_at, user_id, work_date')
            .eq('store_id', store.id)
            .eq('work_date', todayDateKST)
            .order('clock_in_at', { ascending: false })
          
          const { data: attendancesByWorkDateUTC, error: workDateUTCError } = await attendanceClient
            .from('attendance')
            .select('clock_in_at, clock_out_at, user_id, work_date')
            .eq('store_id', store.id)
            .eq('work_date', todayDateUTC)
            .order('clock_in_at', { ascending: false })
          
          // 방법 2: clock_in_at 범위로 조회 (가장 신뢰할 수 있는 방법)
          const { data: attendancesByClockIn, error: clockInError } = await attendanceClient
          .from('attendance')
            .select('clock_in_at, clock_out_at, user_id, work_date')
          .eq('store_id', store.id)
            .gte('clock_in_at', todayStart.toISOString())
            .lte('clock_in_at', todayEnd.toISOString())
          .order('clock_in_at', { ascending: false })

          console.log(`Store ${store.name}: work_date(KST=${todayDateKST}) 조회 결과: ${attendancesByWorkDateKST?.length || 0}건`)
          if (workDateKSTError) {
            console.error(`Store ${store.name}: work_date(KST) 조회 오류:`, workDateKSTError)
          }
          
          console.log(`Store ${store.name}: work_date(UTC=${todayDateUTC}) 조회 결과: ${attendancesByWorkDateUTC?.length || 0}건`)
          if (workDateUTCError) {
            console.error(`Store ${store.name}: work_date(UTC) 조회 오류:`, workDateUTCError)
          }
          
          console.log(`Store ${store.name}: clock_in_at 범위 조회 결과: ${attendancesByClockIn?.length || 0}건`)
          if (clockInError) {
            console.error(`Store ${store.name}: clock_in_at 범위 조회 오류:`, clockInError)
          }
          
          // 우선순위: user_id 조회 > clock_in_at 범위 조회 > work_date 조회
          if (attendancesByUserId && attendancesByUserId.length > 0) {
            // 직원 앱과 동일한 방식으로 조회한 결과를 우선 사용
            todayAttendances = attendancesByUserId
            console.log(`Store ${store.name}: user_id 기준 결과 사용 (${todayAttendances.length}건):`, todayAttendances.map(a => ({
              user_id: a.user_id,
              work_date: a.work_date,
              clock_in_at: a.clock_in_at,
              clock_out_at: a.clock_out_at
            })))
          } else if (attendancesByClockIn && attendancesByClockIn.length > 0) {
            // clock_in_at 범위 조회가 가장 신뢰할 수 있으므로 우선 사용
            todayAttendances = attendancesByClockIn
            console.log(`Store ${store.name}: clock_in_at 기준 결과 사용 (${todayAttendances.length}건):`, todayAttendances.map(a => ({
              user_id: a.user_id,
              work_date: a.work_date,
              clock_in_at: a.clock_in_at,
              clock_out_at: a.clock_out_at
            })))
          } else if (attendancesByWorkDateKST && attendancesByWorkDateKST.length > 0) {
            todayAttendances = attendancesByWorkDateKST
            console.log(`Store ${store.name}: work_date(KST) 기준 결과 사용 (${todayAttendances.length}건):`, todayAttendances.map(a => ({
              user_id: a.user_id,
              work_date: a.work_date,
              clock_in_at: a.clock_in_at,
              clock_out_at: a.clock_out_at
            })))
          } else if (attendancesByWorkDateUTC && attendancesByWorkDateUTC.length > 0) {
            todayAttendances = attendancesByWorkDateUTC
            console.log(`Store ${store.name}: work_date(UTC) 기준 결과 사용 (${todayAttendances.length}건):`, todayAttendances.map(a => ({
              user_id: a.user_id,
              work_date: a.work_date,
              clock_in_at: a.clock_in_at,
              clock_out_at: a.clock_out_at
            })))
          } else {
            console.log(`Store ${store.name}: 오늘 출근 기록 없음 (user_id: ${attendancesByUserId?.length || 0}건, work_date KST: ${attendancesByWorkDateKST?.length || 0}건, work_date UTC: ${attendancesByWorkDateUTC?.length || 0}건, clock_in_at: ${attendancesByClockIn?.length || 0}건)`)
            todayAttendances = []
          }
        } catch (error) {
          console.error(`Store ${store.name}: attendance 조회 중 예외 발생:`, error)
          // 예외 발생 시 빈 배열로 처리하여 계속 진행
          todayAttendances = []
        }

        // 출근한 직원 정보 조회 (가장 최근 출근한 직원)
        let staffName: string | null = null
        const latestAttendance = todayAttendances.length > 0 ? todayAttendances[0] : null
        if (latestAttendance?.user_id) {
          const { data: staff } = await supabase
            .from('users')
            .select('name')
            .eq('id', latestAttendance.user_id)
            .single()
          staffName = staff?.name || null
        }

        // 최근 30일 문제보고 (매장 문제 보고, 자판기 내부 문제, 분실물)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        thirtyDaysAgo.setHours(0, 0, 0, 0)

        const { data: problemReports, error: problemReportsError } = await supabase
          .from('problem_reports')
          .select('id, category, status, title, created_at')
          .eq('store_id', store.id)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .lte('created_at', todayEnd.toISOString())

        // 분실물 조회 - 최근 30일간 생성되었거나 최근에 업데이트된 모든 분실물
        // created_at 또는 updated_at이 30일 이내인 항목 조회 (확인된 항목도 포함)
        // Supabase의 or 쿼리는 괄호로 그룹화 필요
        const { data: lostItems, error: lostItemsError } = await supabase
          .from('lost_items')
          .select('id, status, created_at, updated_at')
          .eq('store_id', store.id)
          .or(`created_at.gte.${thirtyDaysAgo.toISOString()},updated_at.gte.${thirtyDaysAgo.toISOString()}`)
        
        if (lostItemsError) {
          console.error(`Error fetching lost items for store ${store.id} (${store.name}):`, lostItemsError)
          // 에러 발생 시 빈 배열로 처리하여 다른 데이터는 정상 조회되도록 함
        }
        
        console.log(`Lost items query for ${store.name}: found ${lostItems?.length || 0} items`)

        // 디버깅: 실제 저장된 category 값 확인
        console.log(`\n=== Store ${store.id} (${store.name}) ===`)
        if (problemReportsError) {
          console.error('Error fetching problem reports:', problemReportsError)
        }
        console.log(`Total problem reports found: ${problemReports?.length || 0}`)
        if (problemReports && problemReports.length > 0) {
          // 모든 고유한 category 값 확인
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

        // 미처리/처리 완료 카운트 (매장 문제 보고)
        const unprocessedStoreProblems = problemReports?.filter((p: any) => {
          const cat = String(p.category || '').toLowerCase().trim()
          const title = String(p.title || '').toLowerCase()
          const categoryMatch = cat === 'store_problem' || cat === 'store-problem' || cat === 'storeproblem'
          const titleMatch = title.includes('매장 문제') || title.includes('자판기 고장') || title.includes('제품 관련') || title.includes('무인택배함') || title.includes('매장 시설')
          const isStoreProblem = categoryMatch || (titleMatch && !title.includes('자판기 수량') && !title.includes('자판기 제품 걸림'))
          return isStoreProblem && (p.status === 'pending' || p.status === 'received' || p.status === 'submitted')
        }).length || 0
        
        const completedStoreProblems = problemReports?.filter((p: any) => {
          const cat = String(p.category || '').toLowerCase().trim()
          const title = String(p.title || '').toLowerCase()
          const categoryMatch = cat === 'store_problem' || cat === 'store-problem' || cat === 'storeproblem'
          const titleMatch = title.includes('매장 문제') || title.includes('자판기 고장') || title.includes('제품 관련') || title.includes('무인택배함') || title.includes('매장 시설')
          const isStoreProblem = categoryMatch || (titleMatch && !title.includes('자판기 수량') && !title.includes('자판기 제품 걸림'))
          return isStoreProblem && p.status === 'completed'
        }).length || 0

        // 미확인/확인 카운트 (자판기 내부 문제, 분실물)
        const unconfirmedVendingProblems = problemReports?.filter((p: any) => {
          const cat = String(p.category || '').toLowerCase().trim()
          const title = String(p.title || '').toLowerCase()
          const categoryMatch = cat === 'vending_machine' || cat === 'vending-machine' || cat === 'vendingmachine'
          const titleMatch = (title.includes('자판기 수량') || title.includes('자판기 제품 걸림')) && title.includes('자판기')
          const isVendingProblem = categoryMatch || titleMatch
          return isVendingProblem && (p.status === 'pending' || p.status === 'received' || p.status === 'submitted')
        }).length || 0
        
        const confirmedVendingProblems = problemReports?.filter((p: any) => {
          const cat = String(p.category || '').toLowerCase().trim()
          const title = String(p.title || '').toLowerCase()
          const categoryMatch = cat === 'vending_machine' || cat === 'vending-machine' || cat === 'vendingmachine'
          const titleMatch = (title.includes('자판기 수량') || title.includes('자판기 제품 걸림')) && title.includes('자판기')
          const isVendingProblem = categoryMatch || titleMatch
          return isVendingProblem && p.status === 'completed'
        }).length || 0

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

        // 분실물 상태별 카운트 - 'completed' 상태만 확인된 것으로 간주 (issue_status enum 사용)
        const unconfirmedLostItems = lostItems?.filter(
          (l: any) => l.status !== 'completed'
        ).length || 0
        const confirmedLostItems = lostItems?.filter(
          (l: any) => l.status === 'completed'
        ).length || 0

        console.log(`Lost items counts for ${store.name}: unconfirmed=${unconfirmedLostItems}, confirmed=${confirmedLostItems}`)
        console.log(`Lost items status breakdown:`, lostItems?.map((l: any) => ({ id: l.id, status: l.status })))

        // 오늘 제품 입고 사진 (type = 'receipt')
        // 테이블이 없을 수 있으므로 에러 처리 추가
        let todayProductInflow: any[] = []
        try {
          const { data, error } = await supabase
            .from('product_photos')
            .select('id')
            .eq('store_id', store.id)
            .eq('type', 'receipt')
            .gte('created_at', todayStart.toISOString())
            .lte('created_at', todayEnd.toISOString())
          
          if (!error && data) {
            todayProductInflow = data
          }
        } catch (error) {
          console.error(`Error fetching product inflow for store ${store.id}:`, error)
          // 테이블이 없거나 오류 발생 시 빈 배열 유지
        }

        // 최근 보관 사진 (type = 'storage') - 최신 사진만 (최대 2개)
        // 테이블이 없을 수 있으므로 에러 처리 추가
        let recentStoragePhotos: any[] = []
        try {
          const { data: recentStoragePhotosData, error: storageError } = await supabase
            .from('product_photos')
            .select('id, photo_urls, created_at')
            .eq('store_id', store.id)
            .eq('type', 'storage')
            .order('created_at', { ascending: false })
            .limit(1)

          if (!storageError && recentStoragePhotosData && recentStoragePhotosData.length > 0) {
            // photo_urls 배열에서 첫 번째 사진만 추출
            recentStoragePhotos = recentStoragePhotosData.flatMap((item: any) => {
              const urls = Array.isArray(item.photo_urls) ? item.photo_urls : []
              return urls.slice(0, 2).map((url: string, idx: number) => ({
                id: `${item.id}-${idx}`,
                photo_url: url,
              }))
            })
          }
        } catch (error) {
          console.error(`Error fetching storage photos for store ${store.id}:`, error)
          // 테이블이 없거나 오류 발생 시 빈 배열 유지
        }

        // 최근 30일 요청란 (접수, 진행중, 완료, 반려)
        let receivedRequestCount = 0
        let inProgressRequestCount = 0
        let completedRequestCount = 0
        let rejectedRequestCount = 0
        let unconfirmedCompletedCount = 0
        let unconfirmedRejectedCount = 0

        try {
          const { data: recentRequests, error: requestsError } = await supabase
            .from('requests')
            .select('id, title, status, created_at')
            .eq('store_id', store.id)
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false })

          if (requestsError) {
            console.error(`Error fetching requests for store ${store.id} (${store.name}):`, requestsError)
            console.error('Requests error details:', JSON.stringify(requestsError, null, 2))
          } else {
            console.log(`Store ${store.id} (${store.name}): Found ${recentRequests?.length || 0} requests in last 30 days`)
            const receivedRequests = recentRequests?.filter((r: any) => r.status === 'received') || []
            const inProgressRequests = recentRequests?.filter((r: any) => r.status === 'in_progress') || []
            const completedRequests = recentRequests?.filter((r: any) => r.status === 'completed') || []
            const rejectedRequests = recentRequests?.filter((r: any) => r.status === 'rejected') || []
            receivedRequestCount = receivedRequests.length
            inProgressRequestCount = inProgressRequests.length
            completedRequestCount = completedRequests.length
            rejectedRequestCount = rejectedRequests.length
            // confirmed_at 컬럼이 없으므로 completed 상태인 모든 요청을 미확인으로 처리
            unconfirmedCompletedCount = completedRequests.length
            unconfirmedRejectedCount = rejectedRequests.length
            console.log(`Store ${store.id} counts - received: ${receivedRequestCount}, in_progress: ${inProgressRequestCount}, completed: ${completedRequestCount}, rejected: ${rejectedRequestCount}`)
          }
        } catch (error) {
          console.error(`Error processing requests for store ${store.id}:`, error)
          // 에러 발생 시 기본값 유지 (모두 0)
        }

        // 물품 요청 접수 건수 조회 (status = 'received')
        let receivedSupplyRequestCount = 0
        try {
          const { data: recentSupplyRequests, error: supplyRequestsError } = await supabase
            .from('supply_requests')
            .select('id, status, created_at')
            .eq('store_id', store.id)
            .eq('status', 'received')
            .gte('created_at', thirtyDaysAgo.toISOString())

          if (supplyRequestsError) {
            console.error(`Error fetching supply requests for store ${store.id} (${store.name}):`, supplyRequestsError)
          } else {
            receivedSupplyRequestCount = recentSupplyRequests?.length || 0
            console.log(`Store ${store.id} (${store.name}): Found ${receivedSupplyRequestCount} received supply requests`)
            if (receivedSupplyRequestCount > 0) {
              console.log(`  - Supply request IDs:`, recentSupplyRequests?.map((r: any) => ({ id: r.id, status: r.status, created_at: r.created_at })))
            }
          }
        } catch (error) {
          console.error(`Error processing supply requests for store ${store.id}:`, error)
          // 에러 발생 시 기본값 유지 (0)
        }

        // 물품 요청 처리중 건수 조회 (status = 'in_progress' 또는 'manager_in_progress')
        let inProgressSupplyRequestCount = 0
        try {
          const { data: inProgressSupplyRequests, error: inProgressSupplyRequestsError } = await supabase
            .from('supply_requests')
            .select('id, status, created_at')
            .eq('store_id', store.id)
            .in('status', ['in_progress', 'manager_in_progress'])
            .gte('created_at', thirtyDaysAgo.toISOString())

          if (inProgressSupplyRequestsError) {
            console.error(`Error fetching in-progress supply requests for store ${store.id} (${store.name}):`, inProgressSupplyRequestsError)
          } else {
            inProgressSupplyRequestCount = inProgressSupplyRequests?.length || 0
            console.log(`Store ${store.id} (${store.name}): Found ${inProgressSupplyRequestCount} in-progress supply requests`)
          }
        } catch (error) {
          console.error(`Error processing in-progress supply requests for store ${store.id}:`, error)
          // 에러 발생 시 기본값 유지 (0)
        }

        // 오늘 체크리스트 수행률 (KST와 UTC 둘 다 확인)
        const { data: todayChecklistsKST } = await supabase
          .from('checklist')
          .select('items, updated_at')
          .eq('store_id', store.id)
          .eq('work_date', todayDateKST)
        
        const { data: todayChecklistsUTC } = await supabase
          .from('checklist')
          .select('items, updated_at')
          .eq('store_id', store.id)
          .eq('work_date', todayDateUTC)
        
        const todayChecklists = [...(todayChecklistsKST || []), ...(todayChecklistsUTC || [])]

        // 오늘 관리전후사진
        const { data: todayCleaningPhotos } = await supabase
          .from('cleaning_photos')
          .select('id, kind, created_at')
          .eq('store_id', store.id)
          .neq('area_category', 'inventory')
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString())

        const beforePhotos = todayCleaningPhotos?.filter((p: any) => p.kind === 'before') || []
        const afterPhotos = todayCleaningPhotos?.filter((p: any) => p.kind === 'after') || []

        // 체크리스트에서 관리전후 사진 추출 (중복 제거: area 기준)
        const beforeAfterPhotosMap = new Map<string, { id: string; before_photo_url: string | null; after_photo_url: string | null; area: string }>()
        if (todayChecklists && todayChecklists.length > 0) {
          todayChecklists.forEach((checklist: any) => {
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

        if (todayChecklists && todayChecklists.length > 0) {
          todayChecklists.forEach((checklist: any) => {
            // calculateChecklistProgress 함수를 사용하여 정확한 진행률 계산
            const progress = calculateChecklistProgress(checklist)
            checklistTotal += progress.totalItems
            checklistCompleted += progress.completedItems
          })

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
          if (!isToday) {
            console.log(`Store ${store.name}: 어제 출근 기록 제외 (work_date: ${recordDate}, 오늘: ${todayDateKST})`)
          }
          return isToday
        })
        
        let attendanceStatus: 'not_clocked_in' | 'clocked_in' | 'clocked_out' = 'not_clocked_in'
        let clockInTime: string | null = null
        let clockOutTime: string | null = null

        console.log(`Store ${store.name}: 배정된 직원 수: ${assignedUserIds.length}, 전체 출근 기록 수: ${todayAttendances.length}, 오늘 출근 기록 수: ${todayOnlyAttendances.length}`)

        if (todayOnlyAttendances.length > 0) {
          // 출근 중인 직원이 있는지 확인 (출근했지만 퇴근하지 않은 경우)
          const clockedInStaff = todayOnlyAttendances.find(a => !a.clock_out_at)
          
          if (clockedInStaff) {
            // 한 명이라도 출근 중이면 "출근중"
            attendanceStatus = 'clocked_in'
            clockInTime = clockedInStaff.clock_in_at
            console.log(`Store ${store.name}: 출근중 상태 (user_id: ${clockedInStaff.user_id})`)
          } else {
            // 모두 퇴근했으면 "퇴근완료" (가장 최근 퇴근 시간 기준)
            const latestClockOut = todayOnlyAttendances
              .filter(a => a.clock_out_at)
              .sort((a, b) => new Date(b.clock_out_at).getTime() - new Date(a.clock_out_at).getTime())[0]
            
            if (latestClockOut) {
              attendanceStatus = 'clocked_out'
              clockOutTime = latestClockOut.clock_out_at
              clockInTime = latestClockOut.clock_in_at
              console.log(`Store ${store.name}: 퇴근완료 상태 (user_id: ${latestClockOut.user_id})`)
            }
          }
        } else {
          console.log(`Store ${store.name}: 출근전 상태 (배정된 직원: ${assignedUserIds.length}명, 오늘 출근 기록 없음)`)
        }

        const hasProblem = storeProblemCount > 0 || vendingProblemCount > 0 || lostItemCount > 0

        return {
          store_id: store.id,
          store_name: store.name,
          store_address: store.address,
          management_days: store.management_days,
          work_day: store.management_days, // 정렬을 위해 추가
          is_work_day: isWorkDay,
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
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

