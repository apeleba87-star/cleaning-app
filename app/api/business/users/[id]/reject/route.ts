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

    // 거절 대상 사용자 조회
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
        { error: '승인 대기 중인 사용자만 거절할 수 있습니다.' },
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
    const { rejection_reason } = body

    // 거절 처리
    const { data: rejectedUser, error: updateError } = await supabase
      .from('users')
      .update({
        approval_status: 'rejected',
        rejection_reason: rejection_reason?.trim() || null,
        employment_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error rejecting user:', updateError)
      return NextResponse.json(
        { error: '거절 처리에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ user: rejectedUser })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/users/[id]/reject:', error)
    return NextResponse.json(
      { error: `서버 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}

