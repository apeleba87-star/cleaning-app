// Report HTML escaping / CSP compatibility test. Run: npm run test:field
import { writeFileSync } from 'node:fs'
import { renderReportHtml, renderUnavailableHtml } from '../../lib/field/report-html'

const svg = (color: string, text: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="100%" height="100%" fill="${color}"/>` +
      `<text x="50%" y="50%" font-size="28" text-anchor="middle" fill="#fff" font-family="sans-serif">${text}</text></svg>`
  )

const photo = (color: string, text: string) => ({ thumbUrl: svg(color, text), fullUrl: svg(color, text), width: 1600, height: 1200 })

const report = {
  companyName: '깨끗한청소 <script>alert(1)</script>',
  title: '강남구 입주청소 "34평"',
  serviceType: '입주청소',
  region: '서울특별시 강남구',
  workDate: '2026-09-27',
  completed: true,
  areas: [{ id: 'a1', name: '거실' }],
  totalPairs: 30,
  pairs: Array.from({ length: 12 }, (_, i) => ({
    id: `p${i}`,
    areaId: 'a1',
    caption: i === 0 ? '<img src=x onerror=alert(1)> 창틀 먼지 제거' : i % 3 === 0 ? '주방 후드 기름때 제거' : null,
    before: photo('#9ca3af', `전 ${i + 1}`),
    after: i === 5 ? null : photo('#2563eb', `후 ${i + 1}`),
  })),
}

const html = renderReportHtml(report, 'TESTNONCE')

if (process.env.FIELD_REPORT_SAMPLE_OUT) {
  writeFileSync(process.env.FIELD_REPORT_SAMPLE_OUT, html)
  writeFileSync(process.env.FIELD_REPORT_SAMPLE_OUT.replace(/\.html$/, '-unavailable.html'), renderUnavailableHtml('TESTNONCE'))
}

let fail = 0
const check = (cond: boolean, name: string) => {
  console.log(cond ? '  PASS' : '  FAIL', name)
  if (!cond) fail++
}

console.log('[report html]')
check(!html.includes('<script>alert(1)</script>'), 'company name script escaped')
check(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'company name shown as text')
check(!html.includes('<img src=x'), 'caption img escaped')
check(html.includes('&quot;34평&quot;'), 'quotes escaped')
check((html.match(/<script/g) ?? []).length === 1 && html.includes('<script nonce="TESTNONCE">'), 'only nonce script present')
check(!/ style="/.test(html), 'no inline style attributes (CSP)')
check(html.includes('data-offset="12"') && html.includes('data-total="30"'), 'load-more button for remaining pairs')
check(html.includes('noindex') && html.includes('no-referrer'), 'noindex + no-referrer meta')

console.log(fail ? `\n${fail} failed` : '\nall passed')
process.exit(fail ? 1 : 0)
