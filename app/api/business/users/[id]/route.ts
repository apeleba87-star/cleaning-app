import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'franchise_manager' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // business_owner와 franchise_manager는 자신의 회사 직원만 수정 가능
    if (user.role === 'business_owner' || user.role === 'franchise_manager') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', params.id)
        .single()

      if (!targetUser || targetUser.company_id !== user.company_id) {
        return NextResponse.json(
          { error: '권한이 없습니다.' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const {
      name,
      phone,
      role,
      position,
      employment_contract_date,
      salary_date,
      salary_amount,
      employment_active,
      store_ids,
      pay_type,
      pay_amount,
      salary_payment_method,
      bank_name,
      account_number,
      hire_date,
      resignation_date,
      employment_type,
      business_registration_number,
    } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '이름은 필수입니다.' },
        { status: 400 }
      )
    }

    // role이 제공된 경우 유효성 검사
    if (role) {
      const allowedRoles = ['staff', 'manager', 'franchise_manager', 'store_manager', 'subcontract_individual', 'subcontract_company']
      if (!allowedRoles.includes(role)) {
        return NextResponse.json(
          { error: '유효하지 않은 역할입니다.' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {
      name: name.trim(),
      phone: phone?.trim() || null,
      position: position?.trim() || null,
      employment_contract_date: employment_contract_date || null,
      salary_date: salary_date ? parseInt(salary_date) : null,
      salary_amount: salary_amount ? parseFloat(salary_amount) : null,
      employment_active: employment_active !== undefined ? employment_active : true,
      pay_type: pay_type || null,
      pay_amount: pay_amount ? parseFloat(pay_amount) : null,
      salary_payment_method: salary_payment_method || null,
      bank_name: bank_name?.trim() || null,
      account_number: account_number?.trim() || null,
      hire_date: hire_date || null,
      resignation_date: resignation_date || null,
      employment_type: employment_type || null,
      updated_at: new Date().toISOString(),
    }

    // role 업데이트
    if (role) {
      updateData.role = role
    }

    // business_registration_number 업데이트 (도급(업체)인 경우에만)
    if (business_registration_number !== undefined) {
      if (role === 'subcontract_company' || !role) {
        // role이 업체 도급이거나 role이 변경되지 않은 경우 기존 role 확인
        const { data: currentUser } = await supabase
          .from('users')
          .select('role')
          .eq('id', params.id)
          .single()
        
        if (role === 'subcontract_company' || currentUser?.role === 'subcontract_company') {
          updateData.business_registration_number = business_registration_number?.trim() || null
        }
      }
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json(
        { error: '사용자 정보 수정에 실패했습니다.' },
        { status: 500 }
      )
    }

    if (!updatedUser) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 매장 배정 처리
    if (store_ids && Array.isArray(store_ids)) {
      // business_owner와 franchise_manager는 자신의 회사 매장만 배정 가능
      if ((user.role === 'business_owner' || user.role === 'franchise_manager') && store_ids.length > 0) {
        const { data: stores } = await supabase
          .from('stores')
          .select('id, company_id')
          .in('id', store_ids)

        const invalidStores = stores?.filter(s => s.company_id !== user.company_id)
        if (invalidStores && invalidStores.length > 0) {
          return NextResponse.json(
            { error: '자신의 회사 매장만 배정할 수 있습니다.' },
            { status: 403 }
          )
        }
      }

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
    console.error('Error in PATCH /api/business/users/[id]:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

