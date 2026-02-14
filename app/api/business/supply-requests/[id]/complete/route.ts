import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { z } from 'zod'

const completeSchema = z.object({
  completion_photo_url: z.string().optional().nullable(),
  completion_description: z.string().optional().nullable(),
})

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
      throw new ForbiddenError('Only business owners can complete supply requests')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const body = await request.json()
    const validated = completeSchema.parse(body)

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
      throw new ForbiddenError('You do not have permission to complete this supply request')
    }

    // 처리중 상태만 완료 가능
    if (supplyRequest.status !== 'in_progress') {
      return NextResponse.json(
        { error: '처리중 상태인 요청만 완료할 수 있습니다.' },
        { status: 400 }
      )
    }

    const { error: updateError } = await dataClient
      .from('supply_requests')
      .update({ 
        status: 'completed',
        completion_photo_url: validated.completion_photo_url || null,
        completion_description: validated.completion_description || null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Error updating supply request:', updateError)
      return NextResponse.json(
        { error: '물품 요청 완료 처리에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '입력 데이터가 올바르지 않습니다.', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error)
  }
}

