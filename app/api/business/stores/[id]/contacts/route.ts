import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

// 매장 담당자 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view store contacts')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 회사에 속해있는지 확인
    const { data: store } = await supabase
      .from('stores')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!store) {
      throw new ForbiddenError('Store not found or access denied')
    }

    // 담당자 조회
    const { data: contacts, error } = await supabase
      .from('store_contacts')
      .select('*')
      .eq('store_id', params.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch contacts: ${error.message}`)
    }

    return Response.json({
      success: true,
      data: contacts || [],
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// 매장 담당자 생성/수정
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
      throw new ForbiddenError('Only business owners can manage store contacts')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 회사에 속해있는지 확인
    const { data: store } = await supabase
      .from('stores')
      .select('id, company_id')
      .eq('id', params.id)
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .single()

    if (!store) {
      throw new ForbiddenError('Store not found or access denied')
    }

    const body = await request.json()
    const { contacts } = body

    if (!Array.isArray(contacts)) {
      throw new Error('contacts must be an array')
    }

    // 기존 담당자 삭제 (Soft Delete)
    await supabase
      .from('store_contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('store_id', params.id)
      .is('deleted_at', null)

    // 새 담당자 생성
    const contactsToInsert = contacts.map((contact: any) => ({
      store_id: params.id,
      company_id: user.company_id,
      name: contact.name?.trim() || '',
      phone: contact.phone?.trim() || null,
      position: contact.position?.trim() || null,
      contact_role: contact.contact_role || 'extra',
    }))

    if (contactsToInsert.length > 0) {
      const { data: newContacts, error } = await supabase
        .from('store_contacts')
        .insert(contactsToInsert)
        .select()

      if (error) {
        throw new Error(`Failed to create contacts: ${error.message}`)
      }

      return Response.json({
        success: true,
        data: newContacts || [],
      })
    }

    return Response.json({
      success: true,
      data: [],
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

