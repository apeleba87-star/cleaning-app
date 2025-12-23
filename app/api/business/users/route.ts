import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { UserRole } from '@/types/db'
import { createClient } from '@supabase/supabase-js'

// 사용자 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    const supabase = await createServerSupabaseClient()

    if (!user || (user.role !== 'business_owner' && user.role !== 'franchise_manager' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    // Service role key를 사용하여 auth.users에서 이메일 가져오기
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    let adminSupabase: any = null
    if (serviceRoleKey && supabaseUrl) {
      const { createClient } = await import('@supabase/supabase-js')
      adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    }

    let query = supabase
      .from('users')
      .select('*')
      .eq('employment_active', true)

    if (user.role === 'business_owner' && user.company_id) {
      query = query.eq('company_id', user.company_id)
    } else if (user.role === 'franchise_manager') {
      // franchise_manager의 경우 franchise_id를 별도로 조회
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('franchise_id')
        .eq('id', user.id)
        .single()

      if (!userDataError && userData?.franchise_id) {
        query = query.eq('franchise_id', userData.franchise_id)
      } else {
        // franchise_id를 찾을 수 없으면 빈 결과 반환
        return NextResponse.json({ users: [] })
      }
    }

    const { data: users, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: '사용자 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    // auth.users에서 이메일 가져오기
    let usersWithEmail = users || []
    if (adminSupabase) {
      try {
        const { data: authUsersData, error: authError } = await adminSupabase.auth.admin.listUsers()
        
        if (!authError && authUsersData?.users) {
          const emailMap = new Map<string, string>()
          authUsersData.users.forEach((authUser: any) => {
            if (authUser.email) {
              emailMap.set(authUser.id, authUser.email)
            }
          })

          usersWithEmail = usersWithEmail.map((u: any) => ({
            ...u,
            email: emailMap.get(u.id) || null,
          }))
        }
      } catch (authErr) {
        console.error('Error fetching auth users:', authErr)
      }
    }

    return NextResponse.json({ users: usersWithEmail })
  } catch (error: any) {
    console.error('Error in GET /api/business/users:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      email,
      password,
      name,
      role,
      position,
      franchise_id,
      phone,
      company_id,
      employment_contract_date,
      salary_date,
      salary_amount,
      employment_active,
      store_ids,
      // 재무 관리 필드
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

    // 업체관리자 역할은 부여 불가 (각 업체는 1명만 존재)
    const allowedRoles: UserRole[] = ['staff', 'manager', 'franchise_manager', 'store_manager', 'subcontract_individual', 'subcontract_company']

    if (!role || !allowedRoles.includes(role as UserRole)) {
      return NextResponse.json(
        { error: '유효하지 않은 역할입니다.' },
        { status: 400 }
      )
    }

    // business_owner 역할로 생성하려고 하면 차단
    if (role === 'business_owner') {
      return NextResponse.json(
        { error: '업체관리자 역할은 부여할 수 없습니다. 각 업체는 1명의 업체관리자만 존재합니다.' },
        { status: 400 }
      )
    }

    // business_owner와 franchise_manager는 자신의 회사에만 사용자 추가 가능
    const targetCompanyId = (user.role === 'business_owner' || user.role === 'franchise_manager') ? user.company_id : (company_id || null)

    // franchise_manager 역할은 franchise_id 필수
    if (role === 'franchise_manager' && !franchise_id) {
      return NextResponse.json(
        { error: '프렌차이즈관리자는 프렌차이즈를 선택해야 합니다.' },
        { status: 400 }
      )
    }

    // franchise_id가 있으면 해당 프렌차이즈가 회사에 속하는지 확인
    if (franchise_id) {
      const supabase = await createServerSupabaseClient()
      const { data: franchise, error: franchiseError } = await supabase
        .from('franchises')
        .select('company_id')
        .eq('id', franchise_id)
        .single()

      if (franchiseError) {
        console.error('Error fetching franchise:', franchiseError)
        return NextResponse.json(
          { error: `프렌차이즈 조회 실패: ${franchiseError.message || '알 수 없는 오류'}. 프렌차이즈 테이블이 생성되었는지 확인하세요.` },
          { status: 500 }
        )
      }

      if (!franchise || franchise.company_id !== targetCompanyId) {
        return NextResponse.json(
          { error: '유효하지 않은 프렌차이즈입니다.' },
          { status: 400 }
        )
      }
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

    // 1. Supabase Auth에 사용자 생성
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: email.trim(),
      password: password.trim(),
      email_confirm: true,
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { error: authError.message || '사용자 생성에 실패했습니다.' },
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
        position: position?.trim() || null,
        franchise_id: franchise_id || null,
        phone: phone?.trim() || null,
        company_id: targetCompanyId,
        employment_contract_date: employment_contract_date || null,
        salary_date: salary_date ? parseInt(salary_date) : null,
        salary_amount: salary_amount ? parseFloat(salary_amount) : null,
        employment_active: employment_active !== undefined ? employment_active : true,
        // 재무 관리 필드
        pay_type: pay_type || null,
        pay_amount: pay_amount ? parseFloat(pay_amount) : null,
        salary_payment_method: salary_payment_method || null,
        bank_name: bank_name?.trim() || null,
        account_number: account_number?.trim() || null,
        hire_date: hire_date || null,
        resignation_date: resignation_date || null,
        employment_type: employment_type || null,
        business_registration_number: business_registration_number?.trim() || null,
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

    // 3. 매장 배정 (business_owner는 자신의 회사 매장만 배정 가능)
    if (store_ids && Array.isArray(store_ids) && store_ids.length > 0) {
      const supabase = await createServerSupabaseClient()
      const { data: stores } = await supabase
        .from('stores')
        .select('id, company_id, franchise_id')
        .in('id', store_ids)

      if (!stores || stores.length === 0) {
        await adminSupabase.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json(
          { error: '유효하지 않은 매장입니다.' },
          { status: 400 }
        )
      }

      // business_owner와 franchise_manager는 자신의 회사 매장만 배정 가능
      if (user.role === 'business_owner' || user.role === 'franchise_manager') {
        const invalidStores = stores.filter(s => s.company_id !== user.company_id)
        if (invalidStores.length > 0) {
          await adminSupabase.auth.admin.deleteUser(authData.user.id)
          return NextResponse.json(
            { error: '자신의 회사 매장만 배정할 수 있습니다.' },
            { status: 403 }
          )
        }
      }

      // store_manager 역할이고 franchise_id가 선택된 경우, 배정된 매장이 해당 프렌차이즈에 속하는지 확인
      if (role === 'store_manager' && franchise_id) {
        const invalidStores = stores.filter(s => s.franchise_id !== franchise_id)
        if (invalidStores.length > 0) {
          await adminSupabase.auth.admin.deleteUser(authData.user.id)
          return NextResponse.json(
            { error: '선택한 프렌차이즈에 속한 매장만 배정할 수 있습니다.' },
            { status: 400 }
          )
        }
      }

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
    console.error('Error in POST /api/business/users:', error)
    return NextResponse.json(
      { error: `서버 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}
