'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export type ActiveNav = 'home' | 'features' | 'case-studies' | 'pricing' | 'estimate' | null

interface PublicHeaderProps {
  active?: ActiveNav
}

const navItems: { href: string; label: string; key: ActiveNav }[] = [
  { href: '/features', label: '기능 소개', key: 'features' },
  { href: '/case-studies', label: '관리 사례', key: 'case-studies' },
  { href: '/pricing', label: '요금제', key: 'pricing' },
  { href: '/estimate', label: '청소 표준 견적 진단기', key: 'estimate' },
]

export default function PublicHeader({ active = null }: PublicHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const mobileMenu = menuOpen && (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-[90] md:hidden"
        aria-hidden
        onClick={() => setMenuOpen(false)}
      />
      <nav
        className="fixed top-14 sm:top-16 left-0 right-0 bottom-0 z-[95] md:hidden bg-white border-t border-gray-200 overflow-y-auto shadow-lg"
        aria-label="메인 메뉴"
      >
        <div className="px-4 py-6 space-y-1">
          {navItems.map(({ href, label, key }) => (
            <Link
              key={key}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-4 rounded-xl text-base font-medium transition-colors ${
                active === key
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  )

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-sm border-b border-gray-200 safe-area-inset-top">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
          <Link
            href="/"
            className="text-lg sm:text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors shrink-0"
            onClick={() => setMenuOpen(false)}
          >
            무플
          </Link>

          {/* 데스크톱 네비 */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-8">
            {navItems.map(({ href, label, key }) => (
              <Link
                key={key}
                href={href}
                className={`text-sm lg:text-base font-medium transition-colors ${
                  active === key
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:block shrink-0">
            <Link
              href="/login"
              className="px-4 lg:px-5 py-2 bg-gray-900 text-white rounded-lg text-sm lg:text-base font-medium hover:bg-gray-800 transition-colors duration-200"
            >
              로그인
            </Link>
          </div>

          {/* 모바일: 햄버거 + 메뉴 */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/login"
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              onClick={() => setMenuOpen(false)}
            >
              로그인
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
        </div>
      </header>

      {/* 모바일 풀 메뉴: body에 포탈로 렌더해 stacking/overflow 영향 제거 */}
      {mounted &&
        typeof document !== 'undefined' &&
        createPortal(mobileMenu, document.body)}
    </>
  )
}
