import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// 출근 기록 삭제 (관리자가 직원 실수 출근 취소용)
// - business_owner: 자기 회사 매장 출근만 취소 가능
// - platform_admin: 전체 취소 가능
// - 관리완료(clock_out_at 있음) 건은 취소 불가
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }
    if (user.role !== 'business_owner' && user.role !== 'platform_admin') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }
    const { id: attendanceId } = await params

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: '출근 취소 처리에 실패했습니다.' },
        { status: 500 }
      )
    }
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: attendance, error: fetchError } = await adminSupabase
      .from('attendance')
      .select('id, store_id, clock_out_at')
      .eq('id', attendanceId)
      .single()

    if (fetchError || !attendance) {
      return NextResponse.json(
        { error: '출근 기록을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 관리완료(퇴근 완료) 건은 취소 불가
    if (attendance.clock_out_at) {
      return NextResponse.json(
        { error: '관리 완료된 출근은 취소할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 업체관리자인 경우: 매장이 자기 회사 소속인지 확인
    if (user.role === 'business_owner' && user.company_id) {
      const { data: store } = await adminSupabase
        .from('stores')
        .select('id, company_id')
        .eq('id', attendance.store_id)
        .eq('company_id', user.company_id)
        .is('deleted_at', null)
        .single()

      if (!store) {
        return NextResponse.json(
          { error: '해당 매장의 출근 취소 권한이 없습니다.' },
          { status: 403 }
        )
      }
    }

    const { error: deleteError } = await adminSupabase
      .from('attendance')
      .delete()
      .eq('id', attendanceId)

    if (deleteError) {
      console.error('Attendance delete error:', deleteError)
      return NextResponse.json(
        { error: '출근 취소 처리에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/business/attendances/[id]:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
