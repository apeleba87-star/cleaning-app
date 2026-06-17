import {
  assertV2StoreAccess,
  getV2User,
  requireV2Role,
  v2ErrorResponse,
  v2Json,
  V2ApiError,
  V2UnauthorizedError,
  getV2AdminClient,
} from '@/lib/v2/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getV2User()
    if (!user) throw new V2UnauthorizedError()
    await assertV2StoreAccess(user, params.id)

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    if (!date) throw new V2ApiError('date 파라미터가 필요합니다.')

    const client = getV2AdminClient()

    const [attendance, runs, issues] = await Promise.all([
      client
        .from('v2_attendance')
        .select('id, work_date, clock_in_at, clock_out_at, user_id')
        .eq('store_id', params.id)
        .eq('work_date', date),
      client
        .from('v2_checklist_runs')
        .select('id, work_date, status, items, completed_at, user_id')
        .eq('store_id', params.id)
        .eq('work_date', date),
      client
        .from('v2_store_issues')
        .select('id, title, description, status, issue_type, created_at')
        .eq('store_id', params.id)
        .gte('created_at', `${date}T00:00:00`)
        .lte('created_at', `${date}T23:59:59`),
    ])

    return v2Json({
      date,
      attendance: attendance.data || [],
      checklist_runs: runs.data || [],
      issues: issues.data || [],
    })
  } catch (e) {
    return v2ErrorResponse(e)
  }
}
