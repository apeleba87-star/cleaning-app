import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { UserRole } from '@/types/db'

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

    // business_owner와 franchise_manager는 자신의 회사 직원만 역할 변경 가능
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
    const { role, franchise_id } = body

    if (!role) {
      return NextResponse.json(
        { error: '역할은 필수입니다.' },
        { status: 400 }
      )
    }

    // 프렌차이즈 관리자 역할은 franchise_id 필수
    if (role === 'franchise_manager' && !franchise_id) {
      return NextResponse.json(
        { error: '프렌차이즈관리자는 프렌차이즈를 선택해야 합니다.' },
        { status: 400 }
      )
    }

    // franchise_id가 있으면 해당 프렌차이즈가 회사에 속하는지 확인
    if (franchise_id) {
      const { data: franchise, error: franchiseError } = await supabase
        .from('franchises')
        .select('company_id')
        .eq('id', franchise_id)
        .single()

      if (franchiseError || !franchise) {
        return NextResponse.json(
          { error: '유효하지 않은 프렌차이즈입니다.' },
          { status: 400 }
        )
      }

      // business_owner는 자신의 회사 프렌차이즈만 선택 가능
      if (user.role === 'business_owner' && franchise.company_id !== user.company_id) {
        return NextResponse.json(
          { error: '자신의 회사 프렌차이즈만 선택할 수 있습니다.' },
          { status: 403 }
        )
      }
    }

    // 업체관리자 역할은 부여 불가 (각 업체는 1명만 존재)
    const allowedRoles: UserRole[] = ['staff', 'manager', 'franchise_manager', 'store_manager']

    if (!allowedRoles.includes(role as UserRole)) {
      return NextResponse.json(
        { error: '유효하지 않은 역할입니다.' },
        { status: 400 }
      )
    }

    // business_owner 역할로 변경하려고 하면 차단
    if (role === 'business_owner') {
      return NextResponse.json(
        { error: '업체관리자 역할은 부여할 수 없습니다. 각 업체는 1명의 업체관리자만 존재합니다.' },
        { status: 400 }
      )
    }

    // business_owner나 platform_admin은 역할 변경 불가
    const { data: targetUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', params.id)
      .single()

    if (targetUser && (targetUser.role === 'business_owner' || targetUser.role === 'platform_admin')) {
      return NextResponse.json(
        { error: '이 역할은 변경할 수 없습니다.' },
        { status: 403 }
      )
    }

    // 업데이트할 데이터 준비
    const updateData: any = {
      role: role as UserRole,
      updated_at: new Date().toISOString(),
    }

    // 프렌차이즈 관리자가 아닌 경우 franchise_id를 null로 설정
    if (role === 'franchise_manager') {
      updateData.franchise_id = franchise_id
    } else {
      // 다른 역할로 변경하는 경우 franchise_id 제거
      updateData.franchise_id = null
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user role:', error)
      return NextResponse.json(
        { error: '역할 변경에 실패했습니다.' },
        { status: 500 }
      )
    }

    if (!updatedUser) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user: updatedUser })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/users/[id]/role:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

