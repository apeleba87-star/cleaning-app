import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/** 이메일 인증 후 최초 로그인 시 companies/users 생성 (무료 1주일, 승인 없음) */
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: '서버 설정 오류입니다.' }, { status: 500 })
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: existingUser } = await adminSupabase
      .from('users')
      .select('id, company_id, role')
      .eq('id', user.id)
      .single()

    if (existingUser?.company_id && existingUser?.role === 'business_owner') {
      return NextResponse.json({ ok: true, already: true, role: 'business_owner' })
    }

    const meta = (user.user_metadata || {}) as Record<string, unknown>
    const name = typeof meta.name === 'string' ? meta.name.trim() : ''
    const company_name = typeof meta.company_name === 'string' ? meta.company_name.trim() : ''
    const phone = typeof meta.phone === 'string' ? meta.phone.trim() || null : null
    const business_registration_number =
      typeof meta.business_registration_number === 'string'
        ? meta.business_registration_number.trim() || null
        : null

    if (!name || !company_name) {
      return NextResponse.json(
        {
          error:
            '가입 정보가 없습니다. 이메일 인증 후 회원가입을 다시 진행해 주세요. (이름·회사명 필요)',
        },
        { status: 400 }
      )
    }

    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    // 회사 생성 (default_role: 'staff' = 이후 업체관리자가 초대하는 직원의 기본 역할)
    const { data: company, error: companyError } = await adminSupabase
      .from('companies')
      .insert({
        name: company_name,
        business_registration_number,
        subscription_plan: 'free',
        subscription_status: 'active',
        trial_ends_at: trialEndsAt,
        basic_units: 2,
        premium_units: 0,
        signup_code_active: false,
        requires_approval: false,
        default_role: 'staff',
      })
      .select('id, name')
      .single()

    if (companyError || !company) {
      console.error('complete-signup company error:', companyError)
      return NextResponse.json(
        { error: '회사 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    const now = new Date().toISOString()
    const userPayload = {
      name,
      phone,
      company_id: company.id,
      role: 'business_owner' as const,
      approval_status: 'approved' as const,
      employment_active: false,
      approved_at: now,
      approved_by: null,
      signup_type: 'owner_self_signup' as const,
      updated_at: now,
    }

    let userError: { message?: string } | null = null
    if (existingUser) {
      const res = await adminSupabase
        .from('users')
        .update(userPayload)
        .eq('id', user.id)
      userError = res.error
    } else {
      const res = await adminSupabase.from('users').insert({
        id: user.id,
        ...userPayload,
      })
      userError = res.error
    }

    if (userError) {
      console.error('complete-signup user error:', userError)
      await adminSupabase.from('companies').delete().eq('id', company.id)
      return NextResponse.json(
        { error: '사용자 정보 저장에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, role: 'business_owner' })
  } catch (e) {
    console.error('complete-signup error:', e)
    return NextResponse.json(
      { error: '회원가입 완료 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
