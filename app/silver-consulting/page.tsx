import type { Metadata } from 'next'
import Link from 'next/link'
import { HOMEPAGE_TEMPLATES } from '@/lib/homepage/templates'

const PHONE_DISPLAY = '010-7601-8915'
const PHONE_TEL = '01076018915'
const BRAND_NAME = '맨즈컴퍼니'
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1600&q=85'

const silverTemplates = HOMEPAGE_TEMPLATES.filter((template) => template.category === 'silver')

const marketStats = [
  ['수급자', '2배', '늘었습니다'],
  ['센터', '2.74배', '더 빠르게 늘었습니다'],
  ['경쟁 속도', '1.7배', '시설 증가가 더 빠릅니다'],
]

const offerCards = [
  ['진단', '온라인 상태 확인', 'SCAN'],
  ['동선', '검색부터 전화까지', 'FLOW'],
  ['홈페이지', '보호자용 정보 정리', 'WEB'],
  ['전화 CTA', '상담 버튼 집중 배치', 'CALL'],
  ['네이버', '플레이스 기본 점검', 'N'],
  ['콘텐츠', '식단·시설·프로그램 정리', 'PHOTO'],
]

const workCards = [
  ['01', '진단', '현재 온라인 상태 확인'],
  ['02', '설계', '보호자 검색 동선 정리'],
  ['03', '전환', '전화상담 버튼 집중 배치'],
]

const processSteps = [
  ['01', '센터 상태 진단', '현재 수급자 유입 경로와 온라인 노출 상태를 확인합니다.'],
  ['02', '보호자 관점 분석', '처음 검색한 보호자가 어떤 정보를 못 찾는지 짚어냅니다.'],
  ['03', '상담 구조 제안', '홈페이지, 네이버 플레이스, 전화 버튼 흐름을 한 팀으로 설계합니다.'],
  ['04', '템플릿 적용', '센터 성격에 맞는 실버 템플릿을 선택해 빠르게 샘플 화면을 만듭니다.'],
  ['05', '전화상담 연결', '방문자가 센터에 전화하도록 화면과 문장을 최종 정리합니다.'],
]

export const metadata: Metadata = {
  title: `노인주간보호센터 온라인 수급자 모집 컨설팅 | ${BRAND_NAME}`,
  description: '주간보호센터 원장님을 위한 온라인 수급자 모집 컨설팅, 홈페이지 제작, 네이버 플레이스 점검, 전화상담 전환 구조 설계입니다.',
}

export default function SilverConsultingPage() {
  return (
    <main className="min-h-screen bg-[#F5F8FA] text-[#1A1A2E]">
      <header className="sticky top-0 z-50 border-b border-white/15 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/silver-consulting" className="min-w-0">
            <p className="text-xl font-black tracking-[-0.055em] text-[#2E6DA4]">{BRAND_NAME}</p>
            <p className="text-xs font-bold text-slate-500">노인주간보호센터 온라인 수급자 모집</p>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-black text-slate-700 lg:flex">
            <a href="#work" className="hover:text-[#2E6DA4]">하는일</a>
            <a href="#market" className="hover:text-[#2E6DA4]">시장변화</a>
            <a href="#offer" className="hover:text-[#2E6DA4]">제공내용</a>
            <a href="#templates" className="hover:text-[#2E6DA4]">템플릿</a>
            <a href="#contact" className="hover:text-[#2E6DA4]">상담신청</a>
          </nav>
          <a href={`tel:${PHONE_TEL}`} className="rounded-full bg-[#2E6DA4] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-900/20">
            {PHONE_DISPLAY}
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#0F2740] text-white">
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage: `url(${HERO_IMAGE})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F2740] via-[#0F2740]/88 to-[#0F2740]/48" />
        <div className="absolute bottom-[-160px] right-[-120px] h-96 w-96 rounded-full bg-[#5BA3C9]/25 blur-3xl" />
        <div className="relative mx-auto grid min-h-[720px] max-w-7xl gap-10 px-5 py-14 pt-24 lg:grid-cols-[1fr_0.62fr] lg:items-center lg:py-24">
          <div>
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-[#B9E5F6] backdrop-blur-md">
              주간보호센터 수급자 모집 컨설팅
            </span>
            <h1 className="mt-7 text-[2.85rem] font-black leading-[1.04] tracking-[-0.075em] sm:text-7xl">
              소개만으론 부족.
              <br />
              검색에서 선택.
            </h1>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              {[
                ['01', '진단'],
                ['02', '설계'],
                ['03', '전화'],
              ].map(([num, label]) => (
                <div key={num} className="rounded-3xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur-md">
                  <p className="text-sm font-black text-[#B9E5F6]">{num}</p>
                  <p className="mt-1 text-xl font-black">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#contact" className="rounded-full bg-[#2E6DA4] px-8 py-4 text-center text-base font-black text-white shadow-xl shadow-blue-950/30">
                우리센터 무료 컨설팅 받기
              </a>
              <a href="#templates" className="rounded-full border border-white/30 bg-white/10 px-8 py-4 text-center text-base font-black text-white backdrop-blur-md">
                샘플 템플릿 보기
              </a>
            </div>
          </div>

          <div id="contact" className="rounded-[2rem] border border-white/15 bg-white p-7 text-center text-[#1A1A2E] shadow-2xl shadow-blue-950/25">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2E6DA4]">contact</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.06em]">무료 컨설팅</h2>
            <div className="my-7 rounded-[1.6rem] bg-[#F5F8FA] p-6">
              <p className="text-sm font-black text-slate-500">전화상담</p>
              <p className="mt-2 text-3xl font-black tracking-[-0.05em] text-[#2E6DA4]">{PHONE_DISPLAY}</p>
            </div>
            <a href={`tel:${PHONE_TEL}`} className="block rounded-full bg-[#2E6DA4] px-6 py-4 text-center font-black text-white shadow-lg shadow-blue-900/20">
              바로 전화하기
            </a>
          </div>
        </div>
      </section>

      <section id="work" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#2E6DA4]">work</p>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.055em] text-[#1A202C] sm:text-5xl">
                검색에서 신뢰.
                <br />
                전화상담 연결.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
              {workCards.map(([num, title, text]) => (
                <div key={num} className="rounded-[1.6rem] border border-slate-200 bg-[#F5F8FA] p-6 shadow-lg shadow-slate-200/50">
                  <div className="flex items-center gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#2E6DA4] text-lg font-black text-white">{num}</span>
                    <div>
                      <h3 className="text-2xl font-black text-[#1A202C]">{title}</h3>
                      <p className="mt-1 text-sm font-bold text-slate-500">{text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="market" className="py-20">
        <div className="mx-auto max-w-7xl px-5">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#2E6DA4]">market</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <h2 className="text-4xl font-black leading-tight tracking-[-0.055em] text-[#1A202C] sm:text-5xl">
              경쟁은
              <br />
              더 빨라집니다.
            </h2>
            <p className="text-2xl font-black leading-9 text-[#2E6DA4]">
              같은 수급자를 더 많은 센터가 나눠 갖는 구조입니다.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {marketStats.map(([label, value, text]) => {
              const isCenter = label === '센터'
              const color = label === '수급자' ? '#38A169' : isCenter ? '#EF4444' : '#F59E0B'
              const bg = label === '수급자' ? '#ECFDF5' : isCenter ? '#FEF2F2' : '#FFFBEB'

              return (
                <div
                  key={label}
                  className={`relative overflow-hidden rounded-[2rem] border bg-white p-7 shadow-lg transition ${
                    isCenter ? 'md:-translate-y-4 md:scale-[1.06]' : ''
                  }`}
                  style={{ borderColor: color, boxShadow: isCenter ? '0 24px 60px rgba(239, 68, 68, 0.18)' : undefined }}
                >
                  {isCenter && (
                    <span className="absolute right-5 top-5 rounded-full bg-[#EF4444] px-3 py-1 text-xs font-black text-white">
                      핵심
                    </span>
                  )}
                  <div className="absolute right-[-28px] top-[-28px] h-24 w-24 rounded-full" style={{ backgroundColor: bg }} />
                  <p className="text-sm font-black text-slate-500">{label}</p>
                  <p className={`mt-4 font-black tracking-[-0.07em] ${isCenter ? 'text-6xl' : 'text-5xl'}`} style={{ color }}>
                    {value}
                  </p>
                  <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">{text}</p>
                  <div className="mt-6 h-3 overflow-hidden rounded-full bg-[#E5E7EB]">
                    <div className="h-full rounded-full" style={{ width: value === '2배' ? '58%' : value === '2.74배' ? '92%' : '70%', backgroundColor: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#5BA3C9]">search</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.055em] text-[#1A202C]">
              소개받아도
              <br />
              검색합니다.
            </h2>
          </div>
          <div className="grid gap-4">
            {[
              ['01', '네이버 검색', '첫 신뢰 화면'],
              ['02', '홈페이지 확인', '시설·식단·프로그램'],
              ['03', '전화상담', '입소 가능 여부 문의'],
            ].map(([title, text]) => (
              <div key={title} className="flex items-center gap-5 rounded-[1.5rem] bg-[#F7FAFC] p-6">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-xl font-black text-[#2E6DA4] shadow-md">{title}</span>
                <div>
                  <h3 className="text-xl font-black text-[#1A202C]">{text}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">{title === '01' ? '소개 후 재검색' : title === '02' ? '보호자 판단' : '상담 전환'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="offer" className="py-20">
        <div className="mx-auto max-w-7xl px-5">
          <p className="text-center text-sm font-black uppercase tracking-[0.24em] text-[#2E6DA4]">service</p>
          <h2 className="mt-4 text-center text-4xl font-black tracking-[-0.055em] text-[#1A202C]">
            목표는 상담 전화입니다.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {offerCards.map(([title, text, icon]) => (
              <div key={title} className="rounded-[2rem] border border-slate-200 bg-white p-7 text-center shadow-lg shadow-slate-200/60">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAF4FA] text-sm font-black text-[#2E6DA4]">
                  {icon}
                </div>
                <h3 className="mt-5 text-2xl font-black text-[#1A202C]">{title}</h3>
                <p className="mt-3 text-sm font-bold text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="templates" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#5BA3C9]">templates</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.055em] text-[#1A202C]">템플릿 메뉴</h2>
            </div>
            <Link href="/homepage-preview?audience=silver" className="rounded-full bg-[#2E6DA4] px-6 py-4 text-center font-black text-white">
              전체 실버 템플릿 보기
            </Link>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {silverTemplates.map((template, index) => (
              <article key={template.key} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
                <Link href={`/homepage-preview/${template.key}?audience=silver`} className="block bg-[#EDF7F4] p-3">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white">
                    <iframe
                      src={`/homepage-preview/${template.key}?embed=1&audience=silver`}
                      title={`${template.name} 미리보기`}
                      className="pointer-events-none h-[400%] w-[400%] origin-top-left scale-[0.25] border-0"
                      loading="lazy"
                      sandbox="allow-same-origin"
                      tabIndex={-1}
                    />
                  </div>
                </Link>
                <div className="p-6">
                  <p className="text-sm font-black text-[#2E6DA4]">템플릿{index + 1}</p>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.045em] text-[#1A202C]">{template.name}</h3>
                  <Link href={`/homepage-preview/${template.key}?audience=silver`} className="mt-6 inline-flex rounded-full bg-[#2E6DA4] px-5 py-3 text-sm font-black text-white">
                    미리보기 열기
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-5">
          <p className="text-center text-sm font-black uppercase tracking-[0.24em] text-[#2E6DA4]">process</p>
          <h2 className="mt-4 text-center text-4xl font-black tracking-[-0.055em] text-[#1A202C]">진행 방식</h2>
          <div className="mt-10 grid gap-4 lg:grid-cols-5">
            {processSteps.map(([num, title, text]) => (
              <div key={num} className="rounded-[1.6rem] border border-slate-200 bg-white p-6 text-center shadow-lg shadow-slate-200/60">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#2E6DA4] text-lg font-black text-white">{num}</span>
                <h3 className="mt-5 text-lg font-black text-[#1A202C]">{title}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#1A202C] px-5 py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.78fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#9AE6B4]">start</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.055em]">
              지금 시작해야 합니다.
            </h2>
          </div>
          <div className="rounded-[2rem] bg-white p-7 text-[#1A202C]">
            <h3 className="text-2xl font-black tracking-[-0.045em]">10분 전화 상담으로 시작하세요.</h3>
            <a href={`tel:${PHONE_TEL}`} className="mt-6 flex rounded-full bg-[#2E6DA4] px-6 py-4 text-center font-black text-white">
              {PHONE_DISPLAY} 전화하기
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
