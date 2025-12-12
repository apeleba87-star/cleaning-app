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
      throw new ForbiddenError('Only business owners can confirm requests')
    }

    const supabase = await createServerSupabaseClient()
    const requestId = params.id

    const { error } = await supabase
      .from('requests')
      .update({
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('status', 'completed')

    if (error) {
      throw new Error(`Failed to confirm request: ${error.message}`)
    }

    return Response.json({
      success: true,
      message: 'Request confirmed successfully',
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}



