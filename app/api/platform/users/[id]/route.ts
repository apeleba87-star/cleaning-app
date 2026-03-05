import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { UserRole } from '@/types/db'
import { createClient } from '@supabase/supabase-js'

async function getAdminSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceRoleKey || !supabaseUrl) throw new Error('서버 설정 오류')
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** 사용자 삭제 시 연관 데이터 모두 제거 후 auth.users 삭제 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'platform_admin') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const id = params.id
    if (!id) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 })
    }
    if (id === user.id) {
      return NextResponse.json({ error: '본인 계정은 삭제할 수 없습니다.' }, { status: 400 })
    }

    const adminSupabase = await getAdminSupabase()

    // 1) 세션
    await adminSupabase.from('user_sessions').delete().eq('user_id', id)
    // 2) 매장 배정
    await adminSupabase.from('store_assign').delete().eq('user_id', id)
    // 3) 민감정보 (user_sensitive)
    await adminSupabase.from('user_sensitive').delete().eq('user_id', id)
    // 4) 출퇴근
    await adminSupabase.from('attendance').delete().eq('user_id', id)
    // 5) 문제/요청 리포트
    await adminSupabase.from('problem_reports').delete().eq('user_id', id)
    // 6) 인건비(급여) - 해당 사용자 건
    await adminSupabase.from('payrolls').delete().eq('user_id', id)
    // 7) public.users
    const { error: userDelError } = await adminSupabase.from('users').delete().eq('id', id)
    if (userDelError) {
      console.error('users delete error:', userDelError)
      return NextResponse.json(
        { error: '사용자 삭제에 실패했습니다. 연관 데이터를 확인해 주세요.' },
        { status: 500 }
      )
    }
    // 8) Auth 사용자 삭제
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(id)
    if (authError) {
      console.error('auth deleteUser error:', authError)
      return NextResponse.json(
        { error: '인증 계정 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('DELETE /api/platform/users/[id]:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '이름은 필수입니다.' },
        { status: 400 }
      )
    }

    // role 유효성 검사
    if (role && !['staff', 'manager', 'business_owner', 'platform_admin', 'admin', 'franchise_manager', 'store_manager'].includes(role)) {
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

    // 사용자 정보 업데이트
    const updateData: any = {
      name: name.trim(),
      phone: phone?.trim() || null,
      company_id: company_id || null,
      employment_contract_date: employment_contract_date || null,
      salary_date: salary_date ? parseInt(salary_date) : null,
      salary_amount: salary_amount ? parseFloat(salary_amount) : null,
      employment_active: employment_active !== undefined ? employment_active : true,
      updated_at: new Date().toISOString(),
    }

    // role 업데이트 (제공된 경우)
    if (role) {
      updateData.role = role as UserRole
    }

    const { data: updatedUser, error } = await adminSupabase
      .from('users')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        companies:company_id (
          id,
          name
        )
      `)
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json(
        { error: '사용자 정보 수정에 실패했습니다.' },
        { status: 500 }
      )
    }

    if (!updatedUser) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 매장 배정 처리
    if (store_ids && Array.isArray(store_ids)) {
      // 기존 배정 삭제
      await adminSupabase
        .from('store_assign')
        .delete()
        .eq('user_id', params.id)

      // 새 배정 추가
      if (store_ids.length > 0) {
        const assignments = store_ids.map((storeId: string) => ({
          user_id: params.id,
          store_id: storeId,
        }))

        const { error: assignError } = await adminSupabase
          .from('store_assign')
          .insert(assignments)

        if (assignError) {
          console.error('Error assigning stores:', assignError)
          // 에러가 발생해도 사용자는 수정되었으므로 계속 진행
        }
      }
    }

    return NextResponse.json({ user: updatedUser })
  } catch (error: any) {
    console.error('Error in PATCH /api/platform/users/[id]:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}



