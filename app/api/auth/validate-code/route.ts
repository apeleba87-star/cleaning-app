import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')

    if (!code || code.trim().length === 0) {
      return NextResponse.json(
        { valid: false, error: '코드를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 회사 코드 검증 (대소문자 구분 없이)
    // 인증 없이 접근 가능해야 하므로 Service role key 사용
    const trimmedCode = code.trim().toUpperCase()
    console.log('Validating code:', trimmedCode)

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('Missing service role key or supabase URL')
      return NextResponse.json(
        { valid: false, error: '서버 설정 오류입니다.' },
        { status: 500 }
      )
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 모든 활성화된 회사 조회 (RLS 우회)
    const { data: companies, error: fetchError } = await adminSupabase
      .from('companies')
      .select('id, name, signup_code, signup_code_active')
      .eq('signup_code_active', true)
      .is('deleted_at', null)

    if (fetchError) {
      console.error('Error fetching companies:', fetchError)
      return NextResponse.json({
        valid: false,
        error: '올바른 코드를 입력해주세요.',
      })
    }

    console.log('Found companies:', companies?.length || 0)
    console.log('Companies with codes:', companies?.map(c => ({ id: c.id, code: c.signup_code })))

    if (!companies || companies.length === 0) {
      return NextResponse.json({
        valid: false,
        error: '올바른 코드를 입력해주세요.',
      })
    }

    // signup_code가 null이 아니고, 대소문자 구분 없이 코드 찾기
    const company = companies.find(
      c => {
        if (!c.signup_code) return false
        const dbCode = c.signup_code.trim().toUpperCase()
        const match = dbCode === trimmedCode
        if (match) {
          console.log('Code matched!', { dbCode, trimmedCode, companyName: c.name })
        }
        return match
      }
    )

    if (!company) {
      console.log('No matching company found for code:', trimmedCode)
      return NextResponse.json({
        valid: false,
        error: '올바른 코드를 입력해주세요.',
      })
    }

    return NextResponse.json({
      valid: true,
      companyId: company.id,
      companyName: company.name,
    })
  } catch (error: any) {
    console.error('Error in GET /api/auth/validate-code:', error)
    return NextResponse.json(
      { valid: false, error: '코드 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

