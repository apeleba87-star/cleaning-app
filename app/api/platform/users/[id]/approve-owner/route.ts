import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'platform_admin') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { data: targetUser, error: targetError } = await dataClient
      .from('users')
      .select('id, role, approval_status, signup_type')
      .eq('id', params.id)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (targetUser.role !== 'business_owner' || targetUser.signup_type !== 'owner_self_signup') {
      return NextResponse.json({ error: '업체관리자 셀프가입 계정만 승인할 수 있습니다.' }, { status: 400 })
    }

    if (targetUser.approval_status !== 'pending') {
      return NextResponse.json({ error: '승인 대기 상태가 아닙니다.' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const { data: approvedUser, error: updateError } = await dataClient
      .from('users')
      .update({
        approval_status: 'approved',
        approved_at: now,
        approved_by: user.id,
        employment_active: true,
        updated_at: now,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error approving owner signup:', updateError)
      return NextResponse.json({ error: '승인 처리에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ user: approvedUser })
  } catch (error) {
    console.error('Error in PATCH /api/platform/users/[id]/approve-owner:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
