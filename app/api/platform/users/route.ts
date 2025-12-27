import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { UserRole } from '@/types/db'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    // Service Role Key를 사용하여 RLS 우회
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: '서버 설정 오류입니다.' },
        { status: 500 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
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

    // users 테이블에서 조회
    let query = adminSupabase
      .from('users')
      .select('id, name, role, company_id')
      .order('name')

    if (role) {
      query = query.eq('role', role)
    }

    const { data: users, error } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: '사용자 목록을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // auth.users에서 email 가져오기 (Service Role Key 사용)
    const { data: authUsersData, error: authError } = await adminSupabase.auth.admin.listUsers()

    const usersWithEmail = (users || []).map(u => {
      const authUser = authUsersData?.users?.find((au: any) => au.id === u.id)
      return {
        ...u,
        email: authUser?.email || null,
      }
    })

    return NextResponse.json({ users: usersWithEmail })
  } catch (error: any) {
    console.error('Error in GET /api/platform/users:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'platform_admin') {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      email,
      password,
      name,
      role,
      phone,
      company_id,
      employment_contract_date,
      salary_date,
      salary_amount,
      employment_active,
      store_ids,
    } = body

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: '이메일, 비밀번호, 이름은 필수입니다.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    if (!role || !['staff', 'manager', 'business_owner', 'platform_admin', 'admin', 'franchise_manager', 'store_manager'].includes(role)) {
      return NextResponse.json(
        { error: '유효하지 않은 역할입니다.' },
        { status: 400 }
      )
    }

    // Service role key를 사용하여 admin API 접근
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: '서버 설정 오류입니다.' },
        { status: 500 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: '서버 설정 오류입니다.' },
        { status: 500 }
      )
    }

    // Service role client 생성
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 0. 이메일 중복 체크
    const trimmedEmail = email.trim().toLowerCase()
    const { data: existingUsers } = await adminSupabase.auth.admin.listUsers()
    const emailExists = existingUsers?.users?.some(
      (u: any) => u.email?.toLowerCase() === trimmedEmail
    )

    if (emailExists) {
      return NextResponse.json(
        { error: '이미 등록된 이메일 주소입니다.' },
        { status: 400 }
      )
    }

    // 1. Supabase Auth에 사용자 생성
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: trimmedEmail,
      password: password.trim(),
      email_confirm: true,
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      
      // 에러 메시지를 한국어로 번역
      let errorMessage = '사용자 생성에 실패했습니다.'
      if (authError.message) {
        const errorMsg = authError.message.toLowerCase()
        if (errorMsg.includes('email') && (errorMsg.includes('already') || errorMsg.includes('registered') || errorMsg.includes('exists'))) {
          errorMessage = '이미 등록된 이메일 주소입니다.'
        } else if (errorMsg.includes('password')) {
          errorMessage = '비밀번호가 유효하지 않습니다.'
        } else if (errorMsg.includes('invalid')) {
          errorMessage = '입력한 정보가 유효하지 않습니다.'
        }
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: '사용자 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 2. public.users에 사용자 정보 추가 (UPSERT)
    const { data: newUser, error: userError } = await adminSupabase
      .from('users')
      .upsert({
        id: authData.user.id,
        name: name.trim(),
        role: role as UserRole,
        phone: phone?.trim() || null,
        company_id: company_id || null,
        employment_contract_date: employment_contract_date || null,
        salary_date: salary_date ? parseInt(salary_date) : null,
        salary_amount: salary_amount ? parseFloat(salary_amount) : null,
        employment_active: employment_active !== undefined ? employment_active : true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating user in public.users:', userError)
      await adminSupabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: `사용자 정보 저장에 실패했습니다: ${userError.message || '알 수 없는 오류'}` },
        { status: 500 }
      )
    }

    // 3. 매장 배정
    if (store_ids && Array.isArray(store_ids) && store_ids.length > 0) {
      const assignments = store_ids.map((storeId: string) => ({
        user_id: authData.user.id,
        store_id: storeId,
      }))

      const { error: assignError } = await adminSupabase
        .from('store_assign')
        .insert(assignments)

      if (assignError) {
        console.error('Error assigning stores:', assignError)
      }
    }

    return NextResponse.json({ user: newUser })
  } catch (error: any) {
    console.error('Error in POST /api/platform/users:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

