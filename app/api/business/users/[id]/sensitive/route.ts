import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/utils/encryption'
import { createClient } from '@supabase/supabase-js'

/**
 * GET: 사용자 민감 정보 조회 (주민등록번호)
 * - business_owner만 자신의 회사 직원 정보 조회 가능
 * - 주민등록번호는 복호화하여 반환 (마스킹은 클라이언트에서 처리)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'business_owner') {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    if (!user.company_id) {
      return NextResponse.json(
        { error: '회사 정보가 없습니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 대상 사용자가 같은 회사에 속하는지 확인
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, company_id')
      .eq('id', params.id)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (targetUser.company_id !== user.company_id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 민감 정보 조회 (RLS 정책으로 보호됨)
    const { data: sensitive, error: sensitiveError } = await supabase
      .from('user_sensitive')
      .select('*')
      .eq('user_id', params.id)
      .single()

    if (sensitiveError && sensitiveError.code !== 'PGRST116') {
      // PGRST116은 "no rows returned" 에러 (데이터가 없는 경우)
      console.error('Error fetching sensitive data:', sensitiveError)
      return NextResponse.json(
        { error: '민감 정보 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 접근 감사 로그 기록 (선택적)
    // TODO: user_sensitive_access_log 테이블에 기록

    // 주민등록번호 복호화
    let residentRegistrationNumber: string | null = null
    if (sensitive?.resident_registration_number) {
      try {
        residentRegistrationNumber = decrypt(sensitive.resident_registration_number)
      } catch (error) {
        console.error('주민등록번호 복호화 실패:', error)
        return NextResponse.json(
          { error: '주민등록번호 복호화에 실패했습니다.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        user_id: params.id,
        resident_registration_number: residentRegistrationNumber,
        created_at: sensitive?.created_at,
        updated_at: sensitive?.updated_at,
      },
    })
  } catch (error: any) {
    console.error('Error in GET /api/business/users/[id]/sensitive:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * PATCH: 사용자 민감 정보 업데이트 (주민등록번호)
 * - business_owner만 자신의 회사 직원 정보 수정 가능
 * - 주민등록번호는 암호화하여 저장
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'business_owner') {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    if (!user.company_id) {
      return NextResponse.json(
        { error: '회사 정보가 없습니다.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { resident_registration_number } = body

    // 주민등록번호 형식 검증 (YYYYMMDD-GXXXXXX 또는 YYYYMMDDGXXXXXX)
    if (resident_registration_number) {
      const cleaned = resident_registration_number.replace(/[-\s]/g, '')
      if (cleaned.length !== 13 || !/^\d{13}$/.test(cleaned)) {
        return NextResponse.json(
          { error: '주민등록번호 형식이 올바르지 않습니다. (13자리 숫자)' },
          { status: 400 }
        )
      }
    }

    const supabase = await createServerSupabaseClient()

    // 대상 사용자가 같은 회사에 속하는지 확인
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, company_id')
      .eq('id', params.id)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (targetUser.company_id !== user.company_id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    // Service role key를 사용하여 RLS 우회 (암호화된 데이터 저장)
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

    // 주민등록번호 암호화
    let encryptedRRN: string | null = null
    if (resident_registration_number) {
      try {
        // 하이픈 제거 후 암호화
        const cleaned = resident_registration_number.replace(/[-\s]/g, '')
        // 하이픈 추가 (YYYYMMDD-GXXXXXX 형식)
        const formatted = `${cleaned.substring(0, 6)}-${cleaned.substring(6)}`
        encryptedRRN = encrypt(formatted)
      } catch (error) {
        console.error('주민등록번호 암호화 실패:', error)
        return NextResponse.json(
          { error: '주민등록번호 암호화에 실패했습니다.' },
          { status: 500 }
        )
      }
    }

    // UPSERT로 민감 정보 저장/업데이트
    const { data: sensitive, error: sensitiveError } = await adminSupabase
      .from('user_sensitive')
      .upsert(
        {
          user_id: params.id,
          company_id: user.company_id,
          resident_registration_number: encryptedRRN,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single()

    if (sensitiveError) {
      console.error('Error saving sensitive data:', sensitiveError)
      return NextResponse.json(
        { error: '민감 정보 저장에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 접근 감사 로그 기록 (선택적)
    // TODO: user_sensitive_access_log 테이블에 기록

    return NextResponse.json({
      success: true,
      data: {
        user_id: params.id,
        updated_at: sensitive?.updated_at,
      },
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/users/[id]/sensitive:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

