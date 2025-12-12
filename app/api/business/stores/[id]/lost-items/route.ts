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
      throw new ForbiddenError('Only business owners can view lost items')
    }

    const supabase = await createServerSupabaseClient()
    const storeId = params.id

    // 최근 30일
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const { data: lostItems, error } = await supabase
      .from('lost_items')
      .select('id, type, description, photo_url, status, storage_location, created_at')
      .eq('store_id', storeId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch lost items: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: lostItems || [],
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}



