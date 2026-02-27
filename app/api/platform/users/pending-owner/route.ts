import { NextResponse } from 'next/server'
import { getServerUser, createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
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

    const { data: pendingOwners, error } = await dataClient
      .from('users')
      .select(`
        id,
        name,
        phone,
        role,
        company_id,
        approval_status,
        signup_type,
        created_at,
        companies:company_id (
          id,
          name
        )
      `)
      .eq('approval_status', 'pending')
      .eq('role', 'business_owner')
      .eq('signup_type', 'owner_self_signup')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending owner signups:', error)
      return NextResponse.json({ error: '가입 대기 목록 조회에 실패했습니다.' }, { status: 500 })
    }

    const { data: authUsersData, error: authError } = await dataClient.auth.admin.listUsers()
    if (authError) {
      console.error('Error fetching auth users for pending owners:', authError)
    }

    const emailMap = new Map<string, string>()
    if (authUsersData?.users) {
      authUsersData.users.forEach((authUser: any) => {
        if (authUser.email) {
          emailMap.set(authUser.id, authUser.email)
        }
      })
    }

    const usersWithEmail = (pendingOwners || []).map((u: any) => ({
      ...u,
      email: emailMap.get(u.id) || null,
    }))

    return NextResponse.json({ users: usersWithEmail })
  } catch (error) {
    console.error('Error in GET /api/platform/users/pending-owner:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
