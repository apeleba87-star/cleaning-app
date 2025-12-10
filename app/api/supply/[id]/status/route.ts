import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { supplyRequestStatusUpdateSchema } from '@/zod/schemas'
import { handleApiError, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors'
import { SupplyRequestStatus } from '@/types/db'

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

    const body = await request.json()
    const validated = supplyRequestStatusUpdateSchema.safeParse(body)

    if (!validated.success) {
      throw new ValidationError('Invalid input', validated.error.flatten())
    }

    const supabase = await createServerSupabaseClient()

    // 현재 상태 및 store_id 조회 (RLS 및 권한 확인용)
    const { data: request, error: findError } = await supabase
      .from('supply_requests')
      .select('status, store_id, user_id')
      .eq('id', id)
      .single()

    if (findError || !request) {
      throw new NotFoundError('Supply request not found')
    }

    const newStatus = validated.data.status
    const currentStatus = request.status as SupplyRequestStatus

    // 권한 및 상태 전이 검증
    if (user.role === 'manager') {
      // Manager: requested → received, received/completed/rejected 조회 가능
      if (currentStatus === 'requested' && newStatus === 'received') {
        // 배정된 매장인지 확인 (RLS에서도 확인되지만 이중 체크)
        const { data: isAssigned } = await supabase
          .rpc('is_assigned', { uid: user.id, sid: request.store_id })

        if (!isAssigned) {
          throw new ForbiddenError('Not assigned to this store')
        }
      } else if (currentStatus !== 'requested' || newStatus !== 'received') {
        throw new ForbiddenError('Managers can only change requested → received')
      }
    } else if (user.role === 'staff') {
      // Staff: received → completed (본인 요청 또는 admin 허용)
      if (currentStatus === 'received' && newStatus === 'completed') {
        if (request.user_id !== user.id) {
          throw new ForbiddenError('Can only update own requests')
        }
      } else if (!['received', 'completed'].includes(newStatus)) {
        throw new ForbiddenError('Staff can only mark as completed')
      }
    } else if (user.role === 'admin') {
      // Admin: 모든 전이 허용 (RLS가 허용하는 범위 내)
    } else {
      throw new ForbiddenError('Insufficient permissions')
    }

    // 상태 업데이트
    const { data, error } = await supabase
      .from('supply_requests')
      .update({
        status: newStatus,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update supply request: ${error.message}`)
    }

    return Response.json({
      success: true,
      data,
    })
  } catch (error) {
    return handleApiError(error)
  }
}



