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
      throw new ForbiddenError('Only business owners can complete problem reports')
    }

    const supabase = await createServerSupabaseClient()
    const problemReportId = params.id

    const body = await request.json()
    const { description, photo_urls } = body

    const updateData: any = {
      status: 'completed',
      updated_at: new Date().toISOString(),
    }

    if (description) {
      updateData.completion_description = description
    }

    if (photo_urls && Array.isArray(photo_urls)) {
      updateData.completion_photo_urls = photo_urls
    }

    const { error } = await supabase
      .from('problem_reports')
      .update(updateData)
      .eq('id', problemReportId)

    if (error) {
      throw new Error(`Failed to complete problem report: ${error.message}`)
    }

    return Response.json({
      success: true,
      message: 'Problem report completed successfully',
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}


