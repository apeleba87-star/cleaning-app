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
}

export default function HomepageMenu({
  site,
  items,
  currentPage,
  palette,
  showCalculator,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-11 w-11 items-center justify-center rounded-full border border-gray-950 bg-white"
        aria-label="메뉴 열기"
      >
        <span className="space-y-1.5">
          <span className="block h-0.5 w-5 bg-gray-950" />
          <span className="block h-0.5 w-5 bg-gray-950" />
          <span className="block h-0.5 w-5 bg-gray-950" />
        </span>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="메뉴 닫기"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside
            className="absolute right-0 top-0 flex h-full w-[min(460px,94vw)] flex-col overflow-hidden bg-white text-gray-950"
            style={palette.cssVars as CSSProperties}
          >
            <div className="hp-dark border-b border-gray-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="homepage-label text-xs font-black uppercase opacity-70">Navigation</p>
                  <h2 className="mt-3 text-3xl font-black leading-tight">{site.business_name || site.name}</h2>
                  <p className="mt-2 text-sm opacity-70">{items.length}페이지 구성 · {site.service_area || '청소 전문'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-10 w-10 rounded-full border border-white/20 bg-white/10 text-xl font-light text-white"
                  aria-label="메뉴 닫기"
                >
                  ×
                </button>
              </div>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto bg-white p-5 sm:p-6">
              <div>
                {items.map((item, index) => (
                  <a
                    key={item.slug}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-b border-gray-200 py-4 transition hover:bg-gray-50 ${
                      currentPage === item.slug ? 'font-black text-gray-950' : 'text-gray-700'
                    }`}
                  >
                    <span className={`text-sm font-black ${palette.accentText}`}>{String(index + 1).padStart(2, '0')}</span>
                    <span className="text-lg font-black">{HOMEPAGE_PAGE_LABELS[item.slug]}</span>
                    <span className={currentPage === item.slug ? palette.accentText : palette.subtext}>
                      {currentPage === item.slug ? '현재' : '보기'}
                    </span>
                  </a>
                ))}
              </div>
            </nav>

            <div className="shrink-0 border-t border-gray-200 bg-white p-5 sm:p-6">
              <div className="hp-soft border border-gray-200 p-4">
                <p className="text-base font-black">바로 상담</p>
                <p className={`mt-1 text-sm ${palette.subtext}`}>
                  {site.service_area || '서비스 지역'} · {site.business_hours || '상담 가능 시간 안내'}
                </p>
                <div className="mt-4 grid gap-2">
                  {showCalculator && (
                    <a
                      href={items.find((item) => item.slug === 'estimate')?.href || '#'}
                      onClick={() => setOpen(false)}
                      className="hp-primary px-4 py-3 text-center text-sm font-black"
                    >
                      견적계산
                    </a>
                  )}
                  {site.phone && (
                    <a
                      href={`tel:${site.phone}`}
                      className="bg-gray-950 px-4 py-3 text-center text-sm font-black text-white"
                    >
                      전화문의
                    </a>
                  )}
                  {site.kakao_url && (
                    <a href={site.kakao_url} className="bg-yellow-300 px-4 py-3 text-center text-sm font-black text-gray-950">
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
