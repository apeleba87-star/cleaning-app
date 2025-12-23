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

    // 승인 대상 사용자 조회
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('*')
      .eq('id', params.id)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 승인 상태 확인
    if (targetUser.approval_status !== 'pending') {
      return NextResponse.json(
        { error: '승인 대기 중인 사용자만 승인할 수 있습니다.' },
        { status: 400 }
      )
    }

    // 권한 확인
    if (user.role === 'business_owner' || user.role === 'franchise_manager') {
      if (!user.company_id || targetUser.company_id !== user.company_id) {
        return NextResponse.json(
          { error: '권한이 없습니다.' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const { role, store_ids, memo } = body

    const now = new Date().toISOString()

    // 승인 처리
    const updateData: any = {
      approval_status: 'approved',
      approved_at: now,
      approved_by: user.id,
      employment_active: true,
      updated_at: now,
    }

    // 역할 변경 (제공된 경우)
    if (role) {
      const allowedRoles: UserRole[] = ['staff', 'manager', 'store_manager', 'subcontract_individual', 'subcontract_company']
      if (allowedRoles.includes(role as UserRole)) {
        updateData.role = role
      }
    }

    const { data: approvedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error approving user:', updateError)
      return NextResponse.json(
        { error: '승인 처리에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 매장 배정 (제공된 경우)
    if (store_ids && Array.isArray(store_ids) && store_ids.length > 0) {
      // 매장 권한 확인
      if (user.role === 'business_owner' || user.role === 'franchise_manager') {
        const { data: stores } = await supabase
          .from('stores')
          .select('id, company_id')
          .in('id', store_ids)

        const invalidStores = stores?.filter(s => s.company_id !== user.company_id)
        if (invalidStores && invalidStores.length > 0) {
          // 매장 배정 실패해도 승인은 완료
          console.error('Invalid stores for assignment:', invalidStores)
        } else {
          // 기존 배정 삭제
          await supabase
            .from('store_assign')
            .delete()
            .eq('user_id', params.id)

          // 새 배정 추가
          const assignments = store_ids.map((storeId: string) => ({
            user_id: params.id,
            store_id: storeId,
          }))

          await supabase
            .from('store_assign')
            .insert(assignments)
        }
      }
    }

    return NextResponse.json({ user: approvedUser })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/users/[id]/approve:', error)
    return NextResponse.json(
      { error: `서버 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}

