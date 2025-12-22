import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      phone,
      employment_contract_date,
      salary_date,
      salary_amount,
      employment_active,
    } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '이름은 필수입니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        name: name.trim(),
        phone: phone?.trim() || null,
        employment_contract_date: employment_contract_date || null,
        salary_date: salary_date ? parseInt(salary_date) : null,
        salary_amount: salary_amount ? parseFloat(salary_amount) : null,
        employment_active: employment_active !== undefined ? employment_active : true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json(
        { error: '직원 정보 수정에 실패했습니다.' },
        { status: 500 }
      )
    }

    if (!updatedUser) {
      return NextResponse.json(
        { error: '직원을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 매장 배정 처리
    const { store_ids } = body
    if (store_ids && Array.isArray(store_ids)) {
      // 기존 배정 삭제
      await supabase
        .from('store_assign')
        .delete()
        .eq('user_id', params.id)

      // 새 배정 추가
      if (store_ids.length > 0) {
        const assignments = store_ids.map((storeId: string) => ({
          user_id: params.id,
          store_id: storeId,
        }))

        await supabase
          .from('store_assign')
          .insert(assignments)
      }
    }

    return NextResponse.json({ user: updatedUser })
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/users/[id]:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

