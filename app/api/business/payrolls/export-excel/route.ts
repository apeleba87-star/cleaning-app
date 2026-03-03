import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { assertBusinessFeature } from '@/lib/plan-features-server'
import { ForbiddenError, UnauthorizedError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/utils/encryption'
import * as XLSX from 'xlsx'

/**
 * GET: 인건비 엑셀 다운로드 (매월 기준)
 * - period=YYYY-MM 필수
 * - 시트1: 정규 직원 인건비 (이름, 주민등록번호, 금액)
 * - 시트2: 일당 관리 (이름, 주민등록번호, 금액)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }
    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can export payrolls')
    }
    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const feature = await assertBusinessFeature(user.company_id, 'payrolls')
    if (feature.allowed === false) {
      throw new ForbiddenError(feature.message)
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')
    if (!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      return NextResponse.json(
        { error: '기간(period)은 YYYY-MM 형식으로 지정해주세요. (매월만 조회 가능)' },
        { status: 400 }
      )
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const dataClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 해당 월 전체 인건비 조회 (도급 제외: payrolls 테이블만)
    const { data: payrolls, error: payrollsError } = await dataClient
      .from('payrolls')
      .select(`
        id,
        user_id,
        pay_period,
        amount,
        paid_at,
        status,
        worker_name,
        resident_registration_number_encrypted,
        work_days,
        daily_wage,
        users:user_id ( id, name )
      `)
      .eq('company_id', user.company_id)
      .eq('pay_period', period)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (payrollsError) {
      console.error('Export payrolls fetch error:', payrollsError)
      return NextResponse.json(
        { error: '인건비 목록 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    const list = payrolls || []
    const regularRows = list.filter((p: any) => p.user_id != null)
    const dailyRows = list.filter((p: any) => p.user_id == null)

    // 정규 직원: user_sensitive에서 주민등록번호 복호화
    const userIds = Array.from(new Set(regularRows.map((p: any) => p.user_id).filter(Boolean)))
    let sensitiveMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: sensitiveList } = await dataClient
        .from('user_sensitive')
        .select('user_id, resident_registration_number')
        .in('user_id', userIds)

      if (sensitiveList) {
        for (const row of sensitiveList) {
          if (row.resident_registration_number) {
            try {
              sensitiveMap[row.user_id] = decrypt(row.resident_registration_number)
            } catch {
              sensitiveMap[row.user_id] = ''
            }
          }
        }
      }
    }

    // 시트1: 정규 직원 인건비
    const regularData = [
      ['이름', '주민등록번호', '금액', '기간', '지급일', '상태'],
      ...regularRows.map((p: any) => [
        (p.users?.name ?? '-') as string,
        sensitiveMap[p.user_id] ?? '',
        p.amount ?? 0,
        p.pay_period ?? period,
        p.paid_at ?? '',
        p.status === 'paid' ? '지급완료' : '예정',
      ]),
    ]

    // 시트2: 일당 관리 (주민등록번호 복호화)
    const dailyData: (string | number)[][] = [
      ['이름', '주민등록번호', '금액', '기간', '근무일수', '일당', '지급일', '상태'],
    ]
    for (const p of dailyRows) {
      let rrn = ''
      if ((p as any).resident_registration_number_encrypted) {
        try {
          rrn = decrypt((p as any).resident_registration_number_encrypted)
        } catch {
          rrn = ''
        }
      }
      dailyData.push([
        (p as any).worker_name ?? '-',
        rrn,
        (p as any).amount ?? 0,
        (p as any).pay_period ?? period,
        (p as any).work_days ?? '',
        (p as any).daily_wage ?? '',
        (p as any).paid_at ?? '',
        (p as any).status === 'paid' ? '지급완료' : '예정',
      ])
    }

    const wb = XLSX.utils.book_new()
    const wsRegular = XLSX.utils.aoa_to_sheet(regularData)
    const wsDaily = XLSX.utils.aoa_to_sheet(dailyData)
    XLSX.utils.book_append_sheet(wb, wsRegular, '정규직원 인건비')
    XLSX.utils.book_append_sheet(wb, wsDaily, '일당 관리')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const [y, m] = period.split('-')
    const filename = `인건비_${y}년${m}월.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    })
  } catch (error: any) {
    console.error('Payroll export error:', error)
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: error instanceof UnauthorizedError ? 401 : 403 })
    }
    return NextResponse.json(
      { error: error.message || '엑셀 다운로드에 실패했습니다.' },
      { status: 500 }
    )
  }
}
