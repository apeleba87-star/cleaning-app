import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

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
      throw new ForbiddenError('Only business owners can view requests')
    }

    const supabase = await createServerSupabaseClient()
    const storeId = params.id

    // 최근 30일
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const { data: requests, error } = await supabase
      .from('requests')
      .select('id, title, description, photo_url, status, confirmed_at, completion_photo_url, created_at')
      .eq('store_id', storeId)
      .in('status', ['received', 'in_progress', 'completed'])
      .gte('created_at', thirtyDaysAgo.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch requests: ${error.message}`)
    }

    const received = requests?.filter((r) => r.status === 'received') || []
    const inProgress = requests?.filter((r) => r.status === 'in_progress') || []
    const completed = requests?.filter((r) => r.status === 'completed') || []

    return Response.json({
      success: true,
      data: {
        received: received,
        in_progress: inProgress,
        completed: completed,
      },
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}


