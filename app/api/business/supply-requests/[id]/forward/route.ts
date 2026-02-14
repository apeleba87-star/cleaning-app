import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
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
      throw new ForbiddenError('Only business owners can forward supply requests')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const requestId = params.id

    const { data: supplyRequest, error: fetchError } = await dataClient
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

    // 접수 상태만 점주 전달 가능
    if (supplyRequest.status !== 'received') {
      return NextResponse.json(
        { error: '접수 상태인 요청만 점주에게 전달할 수 있습니다.' },
        { status: 400 }
      )
    }

    const { error: updateError } = await dataClient
      .from('supply_requests')
      .update({ 
        status: 'manager_in_progress',
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

