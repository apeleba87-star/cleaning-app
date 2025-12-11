import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can confirm lost items')
    }

    const supabase = await createServerSupabaseClient()
    const lostItemId = params.id

    const { error } = await supabase
      .from('lost_items')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', lostItemId)

    if (error) {
      throw new Error(`Failed to confirm lost item: ${error.message}`)
    }

    return Response.json({
      success: true,
      message: 'Lost item confirmed successfully',
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}


