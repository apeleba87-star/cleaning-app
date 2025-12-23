import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can check store status changes')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const { searchParams } = new URL(request.url)
    const lastCheckTimestamp = searchParams.get('lastCheckTimestamp')

    if (!lastCheckTimestamp) {
      return Response.json({ has_changed: true, message: 'No timestamp provided, assuming change' })
    }

    const supabase = await createServerSupabaseClient()

    // 회사에 속한 매장 ID 목록
    const { data: companyStores } = await supabase
      .from('stores')
      .select('id')
      .eq('company_id', user.company_id)
      .is('deleted_at', null)

    const storeIds = companyStores?.map((s) => s.id) || []

    if (storeIds.length === 0) {
      return Response.json({ has_changed: false, message: 'No stores found' })
    }

    // 매장 업데이트 확인
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, updated_at')
      .in('id', storeIds)
      .gte('updated_at', lastCheckTimestamp)

    if (storesError) {
      throw new Error(`Failed to check store updates: ${storesError.message}`)
    }

    if (stores && stores.length > 0) {
      return Response.json({ has_changed: true, message: 'Stores updated' })
    }

    // 출근 업데이트 확인
    const { count: attendanceCount, error: attendanceError } = await supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .gte('updated_at', lastCheckTimestamp)

    if (attendanceError) {
      throw new Error(`Failed to check attendance updates: ${attendanceError.message}`)
    }

    if (attendanceCount && attendanceCount > 0) {
      return Response.json({ has_changed: true, message: 'Attendance updated' })
    }

    // 문제보고 업데이트 확인
    const { count: issuesCount, error: issuesError } = await supabase
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .gte('updated_at', lastCheckTimestamp)

    if (issuesError) {
      throw new Error(`Failed to check issues updates: ${issuesError.message}`)
    }

    if (issuesCount && issuesCount > 0) {
      return Response.json({ has_changed: true, message: 'Issues updated' })
    }

    // 물품 요청 업데이트 확인
    const { count: supplyCount, error: supplyError } = await supabase
      .from('supply_requests')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .gte('updated_at', lastCheckTimestamp)

    if (supplyError) {
      throw new Error(`Failed to check supply requests updates: ${supplyError.message}`)
    }

    if (supplyCount && supplyCount > 0) {
      return Response.json({ has_changed: true, message: 'Supply requests updated' })
    }

    // 청소 사진 업데이트 확인
    const { count: photosCount, error: photosError } = await supabase
      .from('cleaning_photos')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .gte('updated_at', lastCheckTimestamp)

    if (photosError) {
      throw new Error(`Failed to check cleaning photos updates: ${photosError.message}`)
    }

    if (photosCount && photosCount > 0) {
      return Response.json({ has_changed: true, message: 'Cleaning photos updated' })
    }

    // 체크리스트 업데이트 확인
    const { count: checklistCount, error: checklistError } = await supabase
      .from('checklist')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .gte('updated_at', lastCheckTimestamp)

    if (checklistError) {
      throw new Error(`Failed to check checklist updates: ${checklistError.message}`)
    }

    if (checklistCount && checklistCount > 0) {
      return Response.json({ has_changed: true, message: 'Checklist updated' })
    }

    // 요청란 업데이트 확인
    const { count: requestsCount, error: requestsError } = await supabase
      .from('requests')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .gte('updated_at', lastCheckTimestamp)

    if (requestsError) {
      throw new Error(`Failed to check requests updates: ${requestsError.message}`)
    }

    if (requestsCount && requestsCount > 0) {
      return Response.json({ has_changed: true, message: 'Requests updated' })
    }

    return Response.json({ has_changed: false, message: 'No changes detected' })
  } catch (error: any) {
    return handleApiError(error)
  }
}


















