import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { UserRole } from '@/types/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      password,
      name,
      phone,
      signup_code,
    } = body

    // 필수 필드 검증
    if (!email || !password || !name || !signup_code) {
      return NextResponse.json(
        { error: '이메일, 비밀번호, 이름, 업체 코드는 필수입니다.' },
        { status: 400 }
      )
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: '올바른 이메일 주소를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    // Service role key로 접근 (인증 없이 접근 가능해야 함)
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

    // 회사 코드 검증 (대소문자 구분 없이) - RLS 우회
    const trimmedCode = signup_code.trim().toUpperCase()
    console.log('Signup - Validating code:', trimmedCode)
    
    const { data: companies, error: fetchError } = await adminSupabase
      .from('companies')
      .select('id, name, signup_code, signup_code_active, requires_approval, default_role')
      .eq('signup_code_active', true)
      .is('deleted_at', null)

    if (fetchError) {
      console.error('Error fetching companies:', fetchError)
      return NextResponse.json(
        { error: '올바른 업체 코드를 입력해주세요.' },
        { status: 400 }
      )
    }

    console.log('Signup - Found companies:', companies?.length || 0)
    console.log('Signup - Companies with codes:', companies?.map(c => ({ id: c.id, code: c.signup_code })))

    if (!companies || companies.length === 0) {
      return NextResponse.json(
        { error: '올바른 업체 코드를 입력해주세요.' },
        { status: 400 }
      )
    }

    // signup_code가 null이 아니고, 대소문자 구분 없이 코드 찾기
    const company = companies.find(
      c => {
        if (!c.signup_code) return false
        const dbCode = c.signup_code.trim().toUpperCase()
        const match = dbCode === trimmedCode
        if (match) {
          console.log('Signup - Code matched!', { dbCode, trimmedCode, companyName: c.name })
        }
        return match
      }
    )

    if (!company) {
      return NextResponse.json(
        { error: '올바른 업체 코드를 입력해주세요.' },
        { status: 400 }
      )
    }

    // Supabase Auth에 계정 생성 (이메일 중복 체크는 여기서 처리됨)
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: email.trim(),
      password: password.trim(),
      email_confirm: true,
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      // 이메일 중복 오류 처리
      if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
        return NextResponse.json(
          { error: '이미 가입된 이메일입니다.' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: authError.message || '계정 생성에 실패했습니다.' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: '계정 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    // users 테이블에 사용자 정보 저장 (email은 auth.users에만 저장됨)
    // 이미 존재할 수 있으므로 upsert 사용
    const approvalStatus = company.requires_approval ? 'pending' : 'approved'
    const now = new Date().toISOString()

    const { data: newUser, error: userError } = await adminSupabase
      .from('users')
      .upsert({
        id: authData.user.id,
        name: name.trim(),
        phone: phone?.trim() || null,
        company_id: company.id,
        role: company.default_role || 'staff',
        approval_status: approvalStatus,
        employment_active: approvalStatus === 'approved',
        approved_at: approvalStatus === 'approved' ? now : null,
        updated_at: now,
      }, {
        onConflict: 'id',
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating user in users table:', userError)
      // 롤백: Auth 계정 삭제
      await adminSupabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: `사용자 정보 저장에 실패했습니다: ${userError.message || '알 수 없는 오류'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: newUser,
      requires_approval: company.requires_approval,
      message: company.requires_approval
        ? '가입 신청이 완료되었습니다. 관리자 승인 후 로그인하실 수 있습니다.'
        : '가입이 완료되었습니다. 지금 로그인하실 수 있습니다.',
    })
  } catch (error: any) {
    console.error('Error in POST /api/auth/signup:', error)
    return NextResponse.json(
      { error: `서버 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}

