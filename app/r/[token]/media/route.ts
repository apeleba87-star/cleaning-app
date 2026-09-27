import { getReportPairs } from '@/lib/field/report'
import { reportSecurityHeaders } from '@/lib/field/report-response'

export const dynamic = 'force-dynamic'

const MAX_OFFSET = 5000

export async function GET(request: Request, { params }: { params: { token: string } }) {
  const headers = reportSecurityHeaders()
  const offset = Number(new URL(request.url).searchParams.get('offset'))

  if (!Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET) {
    return Response.json({ error: 'invalid_offset' }, { status: 400, headers })
  }

  try {
    const pairs = await getReportPairs(params.token, offset)
    if (!pairs) return Response.json({ error: 'not_found' }, { status: 404, headers })
    return Response.json({ pairs }, { headers })
  } catch (error) {
    console.error('[field-report] media failed', error instanceof Error ? error.message : 'unknown')
    return Response.json({ error: 'server_error' }, { status: 500, headers })
  }
}
