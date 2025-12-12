import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can create requests')
    }

    const body = await request.json()
    const { store_id, title, description, photo_urls } = body

    if (!store_id || !title || !description) {
      return Response.json(
        { error: 'store_id, title, description are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 회사에 속해있는지 확인
    const { data: store } = await supabase
      .from('stores')
      .select('company_id')
      .eq('id', store_id)
      .single()

    if (!store || store.company_id !== user.company_id) {
      throw new ForbiddenError('Store not found or access denied')
    }

    // 업체관리자가 요청 접수 시 바로 처리중으로 설정
    const { data: newRequest, error } = await supabase
      .from('requests')
      .insert({
        store_id,
        created_by: user.id,
        created_by_role: 'business_owner',
        title,
        description,
        photo_url: photo_urls && photo_urls.length > 0 ? JSON.stringify(photo_urls) : null,
        status: 'in_progress', // 업체관리자는 바로 처리중
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create request: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: newRequest,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}
