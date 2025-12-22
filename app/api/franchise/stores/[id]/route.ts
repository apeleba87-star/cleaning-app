import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

// 매장 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'franchise_manager') {
      throw new ForbiddenError('Only franchise managers can view stores')
    }

    const supabase = await createServerSupabaseClient()

    // franchise_manager의 경우 franchise_id를 별도로 조회
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('franchise_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData || !userData.franchise_id) {
      throw new ForbiddenError('Franchise ID is required')
    }

    const userFranchiseId = userData.franchise_id

    // 매장이 프렌차이즈에 속해있는지 확인
    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', params.id)
      .eq('franchise_id', userFranchiseId)
      .is('deleted_at', null)
      .single()

    if (error || !store) {
      throw new ForbiddenError('Store not found or access denied')
    }

    return Response.json({
      success: true,
      data: store,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 매장 삭제 (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'franchise_manager') {
      throw new ForbiddenError('Only franchise managers can delete stores')
    }

    const supabase = await createServerSupabaseClient()

    // franchise_manager의 경우 franchise_id를 별도로 조회
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('franchise_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData || !userData.franchise_id) {
      throw new ForbiddenError('Franchise ID is required')
    }

    const userFranchiseId = userData.franchise_id

    // 매장이 프렌차이즈에 속해있는지 확인
    const { data: existingStore, error: checkError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', params.id)
      .eq('franchise_id', userFranchiseId)
      .is('deleted_at', null)
      .single()

    if (checkError || !existingStore) {
      throw new ForbiddenError('Store not found or access denied')
    }

    // Soft delete
    const { error } = await supabase
      .from('stores')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (error) {
      throw new Error(`Failed to delete store: ${error.message}`)
    }

    return Response.json({
      success: true,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

