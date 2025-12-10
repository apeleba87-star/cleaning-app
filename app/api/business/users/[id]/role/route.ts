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

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { role } = body

    if (!role || !['staff', 'manager'].includes(role)) {
      return NextResponse.json(
        { error: '유효하지 않은 역할입니다. (staff 또는 manager만 가능)' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // business_owner는 자신의 회사 직원만 변경 가능
    if (user.role === 'business_owner') {
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

    const { error } = await supabase
      .from('users')
      .update({
        role: role as UserRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (error) {
      console.error('Error updating user role:', error)
      return NextResponse.json(
        { error: '역할 변경에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, role })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/users/[id]/role:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}



