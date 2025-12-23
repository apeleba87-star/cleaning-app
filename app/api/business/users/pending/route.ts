import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'franchise_manager' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    if ((user.role === 'business_owner' || user.role === 'franchise_manager') && !user.company_id) {
      return NextResponse.json(
        { error: '회사 정보가 없습니다.' },
        { status: 400 }
      )
    }

    // Service role key를 사용하여 auth.users에서 이메일 가져오기
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: '서버 설정 오류입니다.' },
        { status: 500 }
      )
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('users')
      .select('*')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false })

    if (user.role === 'business_owner' && user.company_id) {
      query = query.eq('company_id', user.company_id)
    } else if (user.role === 'franchise_manager') {
      const { data: userData } = await supabase
        .from('users')
        .select('franchise_id')
        .eq('id', user.id)
        .single()

      if (userData?.franchise_id && user.company_id) {
        // 프렌차이즈 매니저는 자신의 프렌차이즈에 속한 매장의 직원만 조회 가능
        // 하지만 간단하게 회사 전체로 조회
        query = query.eq('company_id', user.company_id)
      } else {
        return NextResponse.json({ users: [] })
      }
    }

    const { data: pendingUsers, error } = await query

    if (error) {
      console.error('Error fetching pending users:', error)
      return NextResponse.json(
        { error: '승인 대기 사용자 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    // auth.users에서 이메일 가져오기
    const { data: authUsersData, error: authError } = await adminSupabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
    }

    // 이메일 매핑
    const emailMap = new Map<string, string>()
    if (authUsersData?.users) {
      authUsersData.users.forEach((authUser: any) => {
        if (authUser.email) {
          emailMap.set(authUser.id, authUser.email)
        }
      })
    }

    // pendingUsers에 이메일 추가
    const usersWithEmail = (pendingUsers || []).map((u: any) => ({
      ...u,
      email: emailMap.get(u.id) || null,
    }))

    return NextResponse.json({ users: usersWithEmail })
  } catch (error: any) {
    console.error('Error in GET /api/business/users/pending:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

