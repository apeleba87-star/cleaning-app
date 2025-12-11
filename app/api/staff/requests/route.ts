import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

// 직원용 요청란 조회 (처리중인 것만)
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'staff') {
      throw new ForbiddenError('Only staff can view their requests')
    }

    const supabase = await createServerSupabaseClient()

    // 직원이 배정받은 매장 ID 목록
    const { data: storeAssignments, error: assignError } = await supabase
      .from('store_assign')
      .select('store_id')
      .eq('user_id', user.id)

    if (assignError) {
      throw new Error(`Failed to fetch store assignments: ${assignError.message}`)
    }

    const storeIds = storeAssignments?.map((sa) => sa.store_id) || []

    if (storeIds.length === 0) {
      return Response.json({
        success: true,
        data: [],
      })
    }

    // 처리중인 요청란만 조회
    const { data: requests, error } = await supabase
      .from('requests')
      .select(`
        *,
        stores:store_id (
          id,
          name
        ),
        created_by_user:created_by (
          id,
          name
        )
      `)
      .in('store_id', storeIds)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch requests: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: requests || [],
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}


