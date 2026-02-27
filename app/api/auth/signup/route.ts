import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      password,
      name,
      phone,
      company_name,
      business_registration_number,
    } = body

    // 필수 필드 검증
    if (!email || !password || !name || !company_name) {
      return NextResponse.json(
        { error: '이메일, 비밀번호, 이름, 회사명은 필수입니다.' },
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

    if (typeof company_name !== 'string' || company_name.trim().length === 0) {
      return NextResponse.json(
        { error: '회사명을 입력해주세요.' },
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

    // 이메일 중복 사전 체크 (최종 중복 판정은 createUser에서도 수행됨)
    const { data: existingUsers, error: listError } = await adminSupabase.auth.admin.listUsers()
    if (listError) {
      console.error('Error checking duplicate email:', listError)
      return NextResponse.json(
        { error: '이메일 확인 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
    const normalizedEmail = email.trim().toLowerCase()
    const hasDuplicateEmail = (existingUsers?.users || []).some(
      (user) => user.email?.toLowerCase() === normalizedEmail
    )
    if (hasDuplicateEmail) {
      return NextResponse.json(
        { error: '이미 가입된 이메일입니다.' },
        { status: 400 }
      )
    }

    // Supabase Auth에 업체관리자 계정 생성
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: normalizedEmail,
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

    // 업체(회사) 생성: 무료 7일 체험 + 매장 3개 한도
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: company, error: companyError } = await adminSupabase
      .from('companies')
      .insert({
        name: company_name.trim(),
        business_registration_number: business_registration_number?.trim() || null,
        subscription_plan: 'free',
        subscription_status: 'active',
        trial_ends_at: trialEndsAt,
        basic_units: 3,
        premium_units: 0,
        signup_code_active: false,
        requires_approval: true,
        default_role: 'staff',
      })
      .select('id, name')
      .single()

    if (companyError || !company) {
      console.error('Error creating company during signup:', companyError)
      await adminSupabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: '회사 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    // users 테이블에 업체관리자 정보 저장
    const approvalStatus = 'pending'
    const now = new Date().toISOString()

    const { data: newUser, error: userError } = await adminSupabase
      .from('users')
      .upsert({
        id: authData.user.id,
        name: name.trim(),
        phone: phone?.trim() || null,
        company_id: company.id,
        role: 'business_owner',
        approval_status: approvalStatus,
        employment_active: false,
        approved_at: null,
        approved_by: null,
        signup_type: 'owner_self_signup',
        updated_at: now,
      }, {
        onConflict: 'id',
      })
      .select()
      .single()

    if (userError) {
      console.error('Error creating user in users table:', userError)
      // 롤백: users 저장 실패 시 auth/company 모두 정리
      await adminSupabase
        .from('companies')
        .delete()
        .eq('id', company.id)
      await adminSupabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: `사용자 정보 저장에 실패했습니다: ${userError.message || '알 수 없는 오류'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: newUser,
      company: {
        id: company.id,
        name: company.name,
      },
      requires_approval: true,
      message: '가입 신청이 완료되었습니다. 시스템 관리자 승인 후 로그인하실 수 있습니다.',
    })
  } catch (error: any) {
    console.error('Error in POST /api/auth/signup:', error)
    return NextResponse.json(
      { error: `서버 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}

