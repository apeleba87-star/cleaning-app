'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import { HOMEPAGE_PAGE_LABELS } from '@/lib/homepage/templates'
import type { HomepagePageSlug, HomepageSite } from '@/types/homepage'
import type { HomepagePalette } from '@/lib/homepage/templates'

export type HomepageMenuItem = {
  slug: HomepagePageSlug
  href: string
}

type Props = {
  site: HomepageSite
  items: HomepageMenuItem[]
  currentPage: HomepagePageSlug
  palette: HomepagePalette
  showCalculator: boolean
  inverseButton?: boolean
}

export default function HomepageMenu({
  site,
  items,
  currentPage,
  palette,
  showCalculator,
  inverseButton = false,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group flex h-12 w-12 items-center justify-center rounded-full border ${
          inverseButton ? 'border-white/35 bg-white/8' : `hp-surface ${palette.border}`
        }`}
        aria-label="메뉴 열기"
      >
        <span className="space-y-1.5">
          <span className="block h-0.5 w-5" style={{ background: inverseButton ? '#fff' : 'var(--hp-text)' }} />
          <span className="block h-0.5 w-5" style={{ background: inverseButton ? '#fff' : 'var(--hp-text)' }} />
          <span className="block h-0.5 w-5" style={{ background: inverseButton ? '#fff' : 'var(--hp-text)' }} />
        </span>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[80] p-3 sm:p-5">
          <button
            type="button"
            aria-label="메뉴 닫기"
            className="absolute inset-0 bg-black/45 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />
          <aside
            className="homepage-site relative ml-auto flex h-full w-[min(440px,94vw)] flex-col overflow-hidden border border-white/20 bg-white text-gray-950 shadow-2xl"
            style={palette.cssVars as CSSProperties}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-2xl font-light leading-none text-gray-950 shadow-lg ring-1 ring-black/10"
              aria-label="메뉴 닫기"
            >
              ×
            </button>
            <div className="hp-dark relative overflow-hidden p-7">
              <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10" />
              <div className="absolute bottom-0 right-8 h-20 w-20 rounded-full bg-white/5" />
              <div className="relative pr-12">
                <p className="homepage-label text-xs font-black uppercase text-white/55">Navigation</p>
                <h2 className="mt-4 text-4xl font-black leading-none text-white">{site.business_name || site.name}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/75">{items.length}페이지 구성</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/75">{site.service_area || '청소 전문'}</span>
                </div>
              </div>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto bg-white p-4 text-gray-950 sm:p-5">
              <div className="grid gap-2">
                {items.map((item) => (
                  <a
                    key={item.slug}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-2xl px-5 py-4 transition ${
                      currentPage === item.slug
                        ? 'shadow-sm'
                        : 'bg-white text-gray-950 hover:-translate-y-0.5 hover:bg-black/[0.03]'
                    }`}
                    style={currentPage === item.slug ? { background: 'var(--hp-primary)', color: inverseButton ? '#111827' : '#ffffff' } : undefined}
                  >
                    <span className="text-lg font-black">{HOMEPAGE_PAGE_LABELS[item.slug]}</span>
                  </a>
                ))}
              </div>
            </nav>

            <div className="shrink-0 border-t border-black/10 bg-white p-4 text-gray-950 sm:p-5">
              <div className={`border bg-gray-50 p-5 ${palette.border}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-black">바로 상담</p>
                    <p className="mt-1 text-xs font-bold text-gray-500">빠른 연결</p>
                  </div>
                  <span className={`h-3 w-3 rounded-full ${palette.primary}`} />
                </div>
                <p className={`mt-1 text-sm ${palette.subtext}`}>
                  {site.service_area || '서비스 지역'} · {site.business_hours || '상담 가능 시간 안내'}
                </p>
                <div className="mt-4 grid gap-2">
                  {showCalculator && (
                    <a
                      href={items.find((item) => item.slug === 'estimate')?.href || '#'}
                      onClick={() => setOpen(false)}
                      className="hp-primary rounded-full px-4 py-3 text-center text-sm font-black"
                    >
                      견적계산
                    </a>
                  )}
                  {site.phone && (
                    <a
                      href={`tel:${site.phone}`}
                      className="hp-dark rounded-full px-4 py-3 text-center text-sm font-black"
                    >
                      전화문의
                    </a>
                  )}
                  {site.kakao_url && (
                    <a href={site.kakao_url} className="rounded-full bg-yellow-300 px-4 py-3 text-center text-sm font-black text-gray-950">
                      카카오톡 상담
                    </a>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>,
        document.body
      )}
    </>
  )
}
