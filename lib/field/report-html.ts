import type { Report, ReportPair, ReportPhoto } from './report'
import { REPORT_FIRST_PAGE_PAIRS } from './report'

// 고객 Report는 루트 레이아웃(분석 스크립트, 상담 버튼)을 거치지 않도록 Route Handler에서 HTML을 직접 만든다.
// 토큰이 들어간 URL이 외부 분석 서비스로 전송되지 않게 하기 위함. 모든 값은 escapeHtml을 거친다.

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatWorkDate(value: string | null) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  return `${match[1]}년 ${Number(match[2])}월 ${Number(match[3])}일`
}

function photoHtml(photo: ReportPhoto | null, label: string) {
  if (!photo) {
    return `<figure class="ph empty"><div class="box">사진 없음</div><figcaption>${label}</figcaption></figure>`
  }
  return (
    `<figure class="ph"><button type="button" class="box" data-full="${escapeHtml(photo.fullUrl)}" aria-label="${label} 크게 보기">` +
    `<img src="${escapeHtml(photo.thumbUrl)}" alt="${label}" loading="lazy" decoding="async" width="320" height="320">` +
    `</button><figcaption>${label}</figcaption></figure>`
  )
}

export function pairHtml(pair: ReportPair) {
  const caption = pair.caption ? `<p class="cap">${escapeHtml(pair.caption)}</p>` : ''
  return (
    `<article class="pair" data-area="${escapeHtml(pair.areaId)}">` +
    `<div class="row">${photoHtml(pair.before, '작업 전')}${photoHtml(pair.after, '작업 후')}</div>${caption}</article>`
  )
}

const STYLE = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;background:#f4f6f8;color:#111827;line-height:1.5}
main{max-width:720px;margin:0 auto;padding:20px 16px 48px}
header{background:#fff;border-radius:16px;padding:20px;margin-bottom:16px}
.company{font-size:14px;color:#2563eb;font-weight:700}
h1{font-size:22px;margin-top:4px;word-break:keep-all}
.meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.tag{font-size:13px;background:#eef2ff;color:#3730a3;border-radius:999px;padding:3px 10px}
.tag.done{background:#dcfce7;color:#166534}
section{margin-top:20px}
h2{font-size:17px;margin:0 4px 8px}
.pair{background:#fff;border-radius:14px;padding:10px;margin-bottom:10px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ph .box{display:block;width:100%;border:0;padding:0;background:#e5e7eb;border-radius:10px;overflow:hidden;cursor:zoom-in}
.ph img{display:block;width:100%;height:auto;aspect-ratio:1/1;object-fit:cover}
.ph.empty .box{aspect-ratio:1/1;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:13px;cursor:default}
figcaption{font-size:12px;color:#6b7280;text-align:center;margin-top:4px}
.cap{font-size:14px;color:#374151;margin-top:8px;padding:0 2px}
.more{display:block;margin:12px auto 0;border:0;background:#111827;color:#fff;border-radius:10px;padding:12px 20px;font-size:15px}
.hint{text-align:center;color:#6b7280;font-size:13px;margin-top:10px}
footer{text-align:center;color:#9ca3af;font-size:12px;margin-top:32px}
#lb{position:fixed;inset:0;background:rgba(0,0,0,.92);display:none;align-items:center;justify-content:center;z-index:10}
#lb.open{display:flex}
#lb img{max-width:100%;max-height:100%;object-fit:contain}
#lb button{position:absolute;top:12px;right:12px;background:rgba(255,255,255,.15);color:#fff;border:0;border-radius:999px;width:40px;height:40px;font-size:20px}
.empty-state{background:#fff;border-radius:16px;padding:40px 20px;text-align:center;color:#6b7280}
.unavailable{font-size:18px;color:#111827}
`

// 추가 페이지: DOM API로만 노드를 만든다 (innerHTML 미사용).
const SCRIPT = `
(function(){
  var lb=document.getElementById('lb'),lbImg=lb.querySelector('img');
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-full]');
    if(b){lbImg.src=b.getAttribute('data-full');lb.classList.add('open');return}
    if(e.target.closest('#lb')){lb.classList.remove('open');lbImg.removeAttribute('src')}
  });
  var list=document.getElementById('pairs'),btn=document.getElementById('more');
  if(!btn)return;
  var loading=false;
  function el(tag,cls){var n=document.createElement(tag);if(cls)n.className=cls;return n}
  function photo(p,label){
    var f=el('figure','ph'),box;
    if(p){box=el('button','box');box.type='button';box.setAttribute('data-full',p.fullUrl);box.setAttribute('aria-label',label+' 크게 보기');
      var img=el('img');img.src=p.thumbUrl;img.alt=label;img.loading='lazy';img.decoding='async';img.width=320;img.height=320;box.appendChild(img)}
    else{f.className='ph empty';box=el('div','box');box.textContent='사진 없음'}
    var c=el('figcaption');c.textContent=label;f.appendChild(box);f.appendChild(c);return f}
  function load(){
    if(loading)return;loading=true;btn.disabled=true;btn.textContent='불러오는 중...';
    var offset=Number(btn.getAttribute('data-offset'));
    fetch(location.pathname.replace(/\\/$/,'')+'/media?offset='+offset,{cache:'no-store'})
      .then(function(r){if(!r.ok)throw 0;return r.json()})
      .then(function(d){
        d.pairs.forEach(function(p){var a=el('article','pair'),row=el('div','row');
          row.appendChild(photo(p.before,'작업 전'));row.appendChild(photo(p.after,'작업 후'));a.appendChild(row);
          if(p.caption){var cap=el('p','cap');cap.textContent=p.caption;a.appendChild(cap)}list.appendChild(a)});
        var next=offset+d.pairs.length;btn.setAttribute('data-offset',next);
        if(!d.pairs.length||next>=Number(btn.getAttribute('data-total'))){btn.remove();obs&&obs.disconnect()}
        else{btn.disabled=false;btn.textContent='사진 더 보기'}
        loading=false})
      .catch(function(){btn.disabled=false;btn.textContent='다시 시도';loading=false});
  }
  btn.addEventListener('click',load);
  var obs='IntersectionObserver' in window?new IntersectionObserver(function(es){if(es[0].isIntersecting)load()},{rootMargin:'600px'}):null;
  if(obs)obs.observe(btn);
})();
`

function documentHtml(title: string, body: string, nonce: string, extraHead = '') {
  return (
    `<!doctype html><html lang="ko"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex,nofollow">` +
    `<meta name="referrer" content="no-referrer">` +
    `<title>${escapeHtml(title)}</title>${extraHead}` +
    `<style nonce="${nonce}">${STYLE}</style></head><body>${body}</body></html>`
  )
}

export function renderReportHtml(report: Report, nonce: string) {
  const workDate = formatWorkDate(report.workDate)
  const tags = [
    `<span class="tag">${escapeHtml(report.serviceType)}</span>`,
    report.region ? `<span class="tag">${escapeHtml(report.region)}</span>` : '',
    workDate ? `<span class="tag">${escapeHtml(workDate)}</span>` : '',
    report.completed ? `<span class="tag done">작업 완료</span>` : '',
  ].join('')

  const pairs = report.pairs.map(pairHtml).join('')
  const loaded = Math.min(report.pairs.length, REPORT_FIRST_PAGE_PAIRS)
  const more =
    report.totalPairs > loaded
      ? `<button id="more" class="more" type="button" data-offset="${loaded}" data-total="${report.totalPairs}">사진 더 보기</button>`
      : ''

  const content =
    report.totalPairs === 0
      ? `<div class="empty-state">아직 공유된 사진이 없습니다.</div>`
      : `<section><h2>작업 사진 ${report.totalPairs}건</h2><div id="pairs">${pairs}</div>${more}` +
        `<p class="hint">사진을 누르면 크게 볼 수 있습니다.</p></section>`

  const body =
    `<main><header><p class="company">${escapeHtml(report.companyName)}</p>` +
    `<h1>${escapeHtml(report.title)}</h1><div class="meta">${tags}</div></header>` +
    `${content}<footer>무플로 작성된 작업 보고서입니다.</footer></main>` +
    `<div id="lb" role="dialog" aria-modal="true"><button type="button" aria-label="닫기">✕</button><img alt="확대 사진"></div>` +
    `<script nonce="${nonce}">${SCRIPT}</script>`

  const title = `${report.companyName} 작업 보고서`
  const og = `<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:type" content="website">`
  return documentHtml(title, body, nonce, og)
}

export function renderUnavailableHtml(nonce: string) {
  const body =
    `<main><div class="empty-state"><h1 class="unavailable">보고서를 열 수 없습니다</h1>` +
    `<p class="hint">링크가 만료되었거나 업체가 공유를 중지했습니다.<br>업체에 새 링크를 요청해 주세요.</p></div></main>`
  return documentHtml('보고서를 열 수 없습니다', body, nonce)
}
