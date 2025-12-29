import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

// 매장 상세 데이터 조회 (날짜별 통계)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view store details')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!startDate || !endDate) {
      throw new Error('start_date and end_date are required')
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 회사에 속해있는지 확인
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (storeError || !store) {
      throw new ForbiddenError('Store not found or access denied')
    }

    // 날짜 범위 생성
    const start = new Date(startDate)
    const end = new Date(endDate)
    const dates: string[] = []

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0])
    }

    // 각 날짜별 데이터 수집
    const detailData = await Promise.all(
      dates.map(async (date) => {
        const dateStart = new Date(date)
        dateStart.setHours(0, 0, 0, 0)
        const dateEnd = new Date(date)
        dateEnd.setHours(23, 59, 59, 999)

        // 출근 수
        const { count: attendanceCount } = await supabase
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', params.id)
          .eq('work_date', date)

        // 체크리스트
        const { data: checklists } = await supabase
          .from('checklist')
          .select('items')
          .eq('store_id', params.id)
          .eq('work_date', date)

        let checklistCount = 0
        let checklistCompleted = 0

        if (checklists) {
          checklistCount = checklists.length
          checklists.forEach((checklist: any) => {
            const items = checklist.items || []
            let allCompleted = true
            items.forEach((item: any) => {
              if (item.type === 'check') {
                if (!item.checked || (item.status === 'bad' && !item.comment)) {
                  allCompleted = false
                }
              } else if (item.type === 'photo') {
                if (!item.before_photo_url || !item.after_photo_url) {
                  allCompleted = false
                }
              }
            })
            if (allCompleted && items.length > 0) {
              checklistCompleted++
            }
          })
        }

        // 문제보고
        const { count: issueCount } = await supabase
          .from('issues')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', params.id)
          .gte('created_at', dateStart.toISOString())
          .lte('created_at', dateEnd.toISOString())

        // 물품 요청
        const { count: supplyRequestCount } = await supabase
          .from('supply_requests')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', params.id)
          .gte('created_at', dateStart.toISOString())
          .lte('created_at', dateEnd.toISOString())

        // 관리 사진
        const { count: cleaningPhotoCount } = await supabase
          .from('cleaning_photos')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', params.id)
          .neq('area_category', 'inventory')
          .gte('created_at', dateStart.toISOString())
          .lte('created_at', dateEnd.toISOString())

        // 입고/보관 사진
        const { count: inventoryPhotoCount } = await supabase
          .from('cleaning_photos')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', params.id)
          .eq('area_category', 'inventory')
          .gte('created_at', dateStart.toISOString())
          .lte('created_at', dateEnd.toISOString())

        return {
          date,
          attendance_count: attendanceCount || 0,
          checklist_count: checklistCount,
          checklist_completed: checklistCompleted,
          issue_count: issueCount || 0,
          supply_request_count: supplyRequestCount || 0,
          cleaning_photo_count: cleaningPhotoCount || 0,
          inventory_photo_count: inventoryPhotoCount || 0,
        }
      })
    )

    return Response.json({
      success: true,
      data: detailData,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}
























