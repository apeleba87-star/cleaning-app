import type { Metadata } from 'next'
import Link from 'next/link'
import BlogCheckRequestForm from './BlogCheckRequestForm'

const PHONE_DISPLAY = '010-7212-2387'
const PHONE_TEL = '01072122387'
const BRAND_NAME = '맨즈컴퍼니'
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1600&q=85'

const marketStats = [
  ['검색', '○○구', '지역 키워드 확인'],
  ['블로그', '노출', '현재 상태 점검'],
  ['키워드', '제공', '상위노출 후보 안내'],
]

const offerCards = [
  ['문제점', '블로그에서 부족한 부분', 'SCAN'],
  ['노출', '네이버 검색 상태', 'N'],
  ['키워드', '상위노출 후보 제공', 'KEY'],
]

const workCards = [
  ['01', '블로그 문제점', '보호자 관점으로 확인'],
  ['02', '검색 노출 상태', '네이버에서 어떻게 보이는지 확인'],
  ['03', '상위노출 키워드', '노릴 수 있는 키워드 제공'],
]

export const metadata: Metadata = {
  title: `노인주간보호센터 블로그 무료점검 | ${BRAND_NAME}`,
  description: '주간보호센터 원장님을 위한 블로그 노출 상태, 문제점, 상위노출 키워드 무료점검 신청 페이지입니다.',
}

export default function SilverConsultingPage() {
  return (
    <main className="min-h-screen bg-[#F5F8FA] text-[#1A1A2E]">
      <header className="sticky top-0 z-50 border-b border-white/15 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/silver-consulting" className="min-w-0">
            <p className="text-xl font-black tracking-[-0.055em] text-[#2E6DA4]">{BRAND_NAME}</p>
            <p className="text-xs font-bold text-slate-500">노인주간보호센터 블로그 무료점검</p>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-black text-slate-700 lg:flex">
            <a href="#work" className="hover:text-[#2E6DA4]">무료점검</a>
            <a href="#checklist" className="hover:text-[#2E6DA4]">체크리스트</a>
            <a href="#offer" className="hover:text-[#2E6DA4]">점검내용</a>
            <a href="#contact" className="hover:text-[#2E6DA4]">신청</a>
          </nav>
          <a href="#contact" className="rounded-full bg-[#2E6DA4] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-900/20">
            무료 신청
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
              주간보호센터 블로그 무료점검
            </span>
            <h1 className="mt-7 text-[2.85rem] font-black leading-[1.04] tracking-[-0.075em] sm:text-7xl">
              우리 센터 블로그
              <br />
              검색하면 잘 보이나요?
            </h1>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
              {[
                ['01', '검색'],
                ['02', '노출'],
                ['03', '키워드'],
              ].map(([num, label]) => (
                <div key={num} className="rounded-3xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur-md">
                  <p className="text-sm font-black text-[#B9E5F6]">{num}</p>
                  <p className="mt-1 text-xl font-black">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#contact" className="rounded-full bg-[#2E6DA4] px-8 py-4 text-center text-base font-black text-white shadow-xl shadow-blue-950/30">
                무료 점검 신청하기
              </a>
              <a href={`tel:${PHONE_TEL}`} className="rounded-full border border-white/30 bg-white/10 px-8 py-4 text-center text-base font-black text-white backdrop-blur-md">
                전화 무료 상담
              </a>
            </div>
          </div>

          <div id="contact" className="rounded-[2rem] border border-white/15 bg-white p-7 text-center text-[#1A1A2E] shadow-2xl shadow-blue-950/25">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#2E6DA4]">contact</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.06em]">점검내용 받으실 곳</h2>
            <BlogCheckRequestForm />
          </div>
        </div>
      </section>

      <section id="work" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-[#2E6DA4]">work</p>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.055em] text-[#1A202C] sm:text-5xl">
                맨즈컴퍼니가
                <br />
                무료로 확인합니다.
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

      <section id="checklist" className="py-20">
        <div className="mx-auto max-w-7xl px-5">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#2E6DA4]">checklist</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <h2 className="text-4xl font-black leading-tight tracking-[-0.055em] text-[#1A202C] sm:text-5xl">
              혹시 이런
              <br />
              상황이신가요?
            </h2>
            <div className="grid gap-3">
              {[
                '홈페이지가 없거나 오래됐다',
                '네이버에서 우리 센터가 검색이 안 된다',
                '새 어르신 모집을 지인 소개에만 의존한다',
                '온라인 홍보를 하고 싶은데 방법을 모른다',
                '경쟁 센터는 잘 나오는데 우리는 안 나온다',
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white px-5 py-4 text-base font-black text-[#1A202C] shadow-sm">
                  ✓ {item}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {marketStats.map(([label, value, text]) => {
              const isCenter = label === '블로그'
              const color = label === '검색' ? '#38A169' : isCenter ? '#EF4444' : '#F59E0B'
              const bg = label === '검색' ? '#ECFDF5' : isCenter ? '#FEF2F2' : '#FFFBEB'

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
                    <div className="h-full rounded-full" style={{ width: label === '검색' ? '64%' : label === '블로그' ? '92%' : '76%', backgroundColor: color }} />
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
              보호자는
              <br />
              검색합니다.
            </h2>
          </div>
          <div className="grid gap-4">
            {[
              ['01', '네이버 검색', '○○구 주간보호센터'],
              ['02', '블로그 확인', '후기·식단·프로그램'],
              ['03', '문의 결정', '보이는 센터로 연락'],
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
          <p className="text-center text-sm font-black uppercase tracking-[0.24em] text-[#2E6DA4]">free check</p>
          <h2 className="mt-4 text-center text-4xl font-black tracking-[-0.055em] text-[#1A202C]">
            지금 신청하시면 무료로 드립니다.
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
          <div className="mx-auto mt-10 max-w-2xl rounded-[2rem] bg-white p-7 text-center shadow-lg shadow-slate-200/60">
            <p className="text-3xl font-black tracking-[-0.055em] text-[#1A202C]">비용 없습니다.</p>
            <p className="mt-3 text-xl font-black text-[#2E6DA4]">무료로 결과만 확인하세요.</p>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5">
          <p className="text-center text-sm font-black uppercase tracking-[0.24em] text-[#5BA3C9]">trust</p>
          <h2 className="mt-4 text-center text-4xl font-black tracking-[-0.055em] text-[#1A202C]">부담 없이 확인하세요.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {['점검 완전 무료', '결과 24시간 내 전달', '필요하실 때 연락주세요'].map((item) => (
              <div key={item} className="rounded-[2rem] bg-[#F5F8FA] p-8 text-center shadow-lg shadow-slate-200/50">
                <p className="text-4xl font-black text-[#2E6DA4]">✓</p>
                <h3 className="mt-4 text-2xl font-black tracking-[-0.045em] text-[#1A202C]">{item}</h3>
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
              24시간 내 점검 결과를 보내드립니다.
            </h2>
          </div>
          <div className="rounded-[2rem] bg-white p-7 text-[#1A202C]">
            <h3 className="text-2xl font-black tracking-[-0.045em]">문자로 문의 신청</h3>
            <a href={`tel:${PHONE_TEL}`} className="mt-6 flex rounded-full bg-[#2E6DA4] px-6 py-4 text-center font-black text-white">
              전화 문의
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
