import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

// 요청란 상태 변경
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    const body = await req.json()
    const { status, completion_photo_url, completion_description, rejection_photo_url, rejection_description } = body

    if (!status || !['received', 'in_progress', 'completed', 'rejected'].includes(status)) {
      throw new Error('Invalid status. Must be one of: received, in_progress, completed, rejected')
    }

    const supabase = await createServerSupabaseClient()

    // 요청란 조회
    const { data: requestData, error: requestError } = await supabase
      .from('requests')
      .select(`
        *,
        stores:store_id (
          company_id
        )
      `)
      .eq('id', params.id)
      .single()

    if (requestError || !requestData) {
      throw new ForbiddenError('Request not found')
    }

    // 권한 확인
    let hasPermission = false

    if (user.role === 'business_owner') {
      // 업체관리자는 자신의 회사 매장 요청란만 수정 가능
      if (requestData.stores?.company_id === user.company_id) {
        // 접수건을 처리중으로 승인 가능
        if (status === 'in_progress' && requestData.status === 'received') {
          hasPermission = true
        }
        // 처리중인 요청을 완료/반려 처리 가능
        else if ((status === 'completed' || status === 'rejected') && requestData.status === 'in_progress') {
          hasPermission = true
        }
      }
    } else if (user.role === 'staff') {
      // 직원은 처리중인 요청란을 완료 처리 또는 반려 처리 가능
      if ((status === 'completed' || status === 'rejected') && requestData.status === 'in_progress') {
        // 배정된 매장인지 확인
        const { data: storeAssign } = await supabase
          .from('store_assign')
          .select('id')
          .eq('user_id', user.id)
          .eq('store_id', requestData.store_id)
          .maybeSingle()

        if (storeAssign) {
          hasPermission = true
        }
      }
    } else if (user.role === 'platform_admin') {
      hasPermission = true
    }

    if (!hasPermission) {
      throw new ForbiddenError('You do not have permission to update this request')
    }

    // 상태 업데이트
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    // 완료 처리 시 완료 정보 업데이트
    // completed_by 컬럼이 없을 수 있으므로 선택적으로 업데이트
    if (status === 'completed' && user.role === 'staff') {
      updateData.completion_photo_url = completion_photo_url || null
      updateData.completion_description = completion_description || null
      // completed_by 컬럼이 있는 경우에만 설정 (컬럼이 없으면 에러 발생)
      // 일단 주석 처리하고, 컬럼이 있으면 나중에 활성화
      // updateData.completed_by = user.id
      // updateData.completed_at = new Date().toISOString()
    }

    // 반려 처리 시 반려 정보 업데이트
    // rejection_description 컬럼이 없을 수 있으므로, description 필드에 반려 정보 추가
    if (status === 'rejected' && user.role === 'staff' && rejection_description) {
      // 기존 description에 반려 정보 추가 (컬럼이 없을 경우 대비)
      const existingDescription = requestData.description || ''
      const rejectionInfo = `\n\n[반려 처리] ${rejection_description}`
      updateData.description = existingDescription + rejectionInfo
    }

    // 먼저 기본 정보만 업데이트 (status, updated_at, description)
    const basicUpdateData: any = {
      status: updateData.status,
      updated_at: updateData.updated_at,
    }
    
    if (updateData.description) {
      basicUpdateData.description = updateData.description
    }

    let { data: updatedRequest, error } = await supabase
      .from('requests')
      .update(basicUpdateData)
      .eq('id', params.id)
      .select(`
        *,
        stores:store_id (
          id,
          name
        ),
        created_by_user:created_by (
          id,
          name,
          role
        )
      `)
      .single()

    if (error) {
      console.error('Error updating request:', error)
      throw new Error(`Failed to update request: ${error.message}`)
    }

    // 반려 처리인 경우, rejection 컬럼들을 별도로 업데이트 시도 (컬럼이 있을 경우)
    if (status === 'rejected' && user.role === 'staff' && rejection_description) {
      try {
        const rejectionUpdateData: any = {}
        if (rejection_photo_url !== undefined) {
          rejectionUpdateData.rejection_photo_url = rejection_photo_url
        }
        if (rejection_description !== undefined) {
          rejectionUpdateData.rejection_description = rejection_description
        }
        // rejected_by와 rejected_at도 저장 시도
        rejectionUpdateData.rejected_by = user.id
        rejectionUpdateData.rejected_at = new Date().toISOString()
        
        // rejection 컬럼이 있으면 업데이트 시도
        if (Object.keys(rejectionUpdateData).length > 0) {
          const { error: rejectionError } = await supabase
            .from('requests')
            .update(rejectionUpdateData)
            .eq('id', params.id)
          
          if (rejectionError) {
            // 컬럼이 없으면 에러가 발생하지만, description에는 이미 저장했으므로 계속 진행
            console.error('rejection 컬럼 업데이트 실패 (컬럼이 없을 수 있음):', {
              message: rejectionError.message,
              code: rejectionError.code,
              details: rejectionError.details,
              hint: rejectionError.hint
            })
          } else {
            console.log('rejection 컬럼 업데이트 성공:', {
              rejection_photo_url: rejection_photo_url ? '있음' : '없음',
              rejection_description: rejection_description ? '있음' : '없음'
            })
            // 성공하면 업데이트된 데이터 다시 조회
            const { data: updatedWithRejection } = await supabase
              .from('requests')
              .select('*')
              .eq('id', params.id)
              .single()
            
            if (updatedWithRejection) {
              updatedRequest = updatedWithRejection
            }
          }
        }
      } catch (rejectionUpdateError: any) {
        // rejection 컬럼 업데이트 실패해도 description에는 저장되었으므로 계속 진행
        console.error('rejection 컬럼 업데이트 중 오류 (무시됨, description에는 저장됨):', rejectionUpdateError?.message || rejectionUpdateError)
      }
    }

    // completed_by_user 정보는 별도로 조회 (컬럼이 있을 경우)
    let completedByUser = null
    if (updatedRequest && (updatedRequest as any).completed_by) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('id, name')
          .eq('id', (updatedRequest as any).completed_by)
          .single()
        
        if (userData) {
          completedByUser = userData
        }
      } catch (userError) {
        // 사용자 조회 실패해도 계속 진행
        console.error('Error fetching completed_by user:', userError)
      }
    }

    // 응답에 completed_by_user 정보 추가
    // created_by_user의 role 정보가 이미 포함되어 있으므로 그대로 사용
    const responseData = {
      ...updatedRequest,
      completed_by_user: completedByUser
    }

    console.log(`[API Status Update] Request ${params.id} updated:`, {
      status: responseData.status,
      created_by: responseData.created_by,
      created_by_user: responseData.created_by_user,
      role: responseData.created_by_user?.role
    })

    return Response.json({
      success: true,
      request: responseData,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}




