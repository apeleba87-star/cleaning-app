import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can confirm supply requests')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()
    const requestId = params.id

    // 요청 존재 확인 및 권한 확인 (회사 매장의 요청인지 확인)
    const { data: supplyRequest, error: fetchError } = await supabase
      .from('supply_requests')
      .select(`
        *,
        stores:store_id (
          company_id
        )
      `)
      .eq('id', requestId)
      .single()

    if (fetchError || !supplyRequest) {
      return NextResponse.json(
        { error: '물품 요청을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 회사 소유 확인
    if ((supplyRequest.stores as any)?.company_id !== user.company_id) {
      throw new ForbiddenError('You do not have permission to update this supply request')
    }

    // 접수 상태만 확인 가능
    if (supplyRequest.status !== 'received') {
      return NextResponse.json(
        { error: '접수 상태인 요청만 확인할 수 있습니다.' },
        { status: 400 }
      )
    }

    // 상태를 'in_progress'로 변경
    const { error: updateError } = await supabase
      .from('supply_requests')
      .update({ 
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Error updating supply request:', updateError)
      return NextResponse.json(
        { error: '물품 요청 상태 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return handleApiError(error)
  }
}

