import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // business_owner는 자신의 회사 프렌차이즈만 수정 가능
    if (user.role === 'business_owner') {
      const { data: franchise } = await supabase
        .from('franchises')
        .select('company_id')
        .eq('id', params.id)
        .single()

      if (!franchise || franchise.company_id !== user.company_id) {
        return NextResponse.json(
          { error: '권한이 없습니다.' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const {
      name,
      business_registration_number,
      address,
      phone,
      email,
      manager_name,
      contract_start_date,
      contract_end_date,
      status,
      notes,
    } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '프렌차이즈명은 필수입니다.' },
        { status: 400 }
      )
    }

    const { data: updatedFranchise, error } = await supabase
      .from('franchises')
      .update({
        name: name.trim(),
        business_registration_number: business_registration_number?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        manager_name: manager_name?.trim() || null,
        contract_start_date: contract_start_date || null,
        contract_end_date: contract_end_date || null,
        status: status || 'active',
        notes: notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating franchise:', error)
      return NextResponse.json(
        { error: '프렌차이즈 수정에 실패했습니다.' },
        { status: 500 }
      )
    }

    if (!updatedFranchise) {
      return NextResponse.json(
        { error: '프렌차이즈를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ franchise: updatedFranchise })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/franchises/[id]:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // business_owner는 자신의 회사 프렌차이즈만 삭제 가능
    if (user.role === 'business_owner') {
      const { data: franchise } = await supabase
        .from('franchises')
        .select('company_id')
        .eq('id', params.id)
        .single()

      if (!franchise || franchise.company_id !== user.company_id) {
        return NextResponse.json(
          { error: '권한이 없습니다.' },
          { status: 403 }
        )
      }
    }

    // Soft delete
    const { error } = await supabase
      .from('franchises')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting franchise:', error)
      return NextResponse.json(
        { error: '프렌차이즈 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/business/franchises/[id]:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}











