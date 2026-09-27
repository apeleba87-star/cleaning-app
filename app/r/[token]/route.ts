import { getReport } from '@/lib/field/report'
import { renderReportHtml, renderUnavailableHtml } from '@/lib/field/report-html'
import { createNonce, reportSecurityHeaders } from '@/lib/field/report-response'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const nonce = createNonce()
  const headers = { 'Content-Type': 'text/html; charset=utf-8', ...reportSecurityHeaders(nonce) }

  try {
    const report = await getReport(params.token)
    if (!report) {
      return new Response(renderUnavailableHtml(nonce), { status: 404, headers })
    }
    return new Response(renderReportHtml(report, nonce), { status: 200, headers })
  } catch (error) {
    console.error('[field-report] load failed', error instanceof Error ? error.message : 'unknown')
    return new Response(renderUnavailableHtml(nonce), { status: 500, headers })
  }
}
