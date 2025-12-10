import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { issueCreateSchema } from '@/zod/schemas'
import { handleApiError, ValidationError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'staff') {
      throw new ForbiddenError('Only staff can create issues')
    }

    const body = await request.json()
    const validated = issueCreateSchema.safeParse(body)

    if (!validated.success) {
      throw new ValidationError('Invalid input', validated.error.flatten())
    }

    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('issues')
      .insert({
        ...validated.data,
        user_id: user.id,
        status: 'submitted',
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create issue: ${error.message}`)
    }

    return Response.json(
      {
        success: true,
        data,
      },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}


