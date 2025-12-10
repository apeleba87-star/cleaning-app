import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { issueStatusUpdateSchema } from '@/zod/schemas'
import { handleApiError, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors'
import { IssueStatus } from '@/types/db'

const ALLOWED_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  submitted: ['in_progress', 'rejected'],
  in_progress: ['completed', 'rejected'],
  completed: [],
  rejected: [],
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'admin') {
      throw new ForbiddenError('Only admin can update issue status')
    }

    const body = await request.json()
    const validated = issueStatusUpdateSchema.safeParse(body)

    if (!validated.success) {
      throw new ValidationError('Invalid input', validated.error.flatten())
    }

    const supabase = await createServerSupabaseClient()

    // 현재 상태 조회
    const { data: issue, error: findError } = await supabase
      .from('issues')
      .select('status')
      .eq('id', id)
      .single()

    if (findError || !issue) {
      throw new NotFoundError('Issue not found')
    }

    // 상태 전이 검증
    const allowedStatuses = ALLOWED_TRANSITIONS[issue.status as IssueStatus]
    if (!allowedStatuses.includes(validated.data.status)) {
      throw new ValidationError(
        `Cannot transition from ${issue.status} to ${validated.data.status}`
      )
    }

    // 상태 업데이트
    const { data, error } = await supabase
      .from('issues')
      .update({
        status: validated.data.status,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update issue: ${error.message}`)
    }

    return Response.json({
      success: true,
      data,
    })
  } catch (error) {
    return handleApiError(error)
  }
}



