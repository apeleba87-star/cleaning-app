'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { homepagePrefetch } from '@/lib/homepage/client'

const nav = [
  { href: '/homepage-admin', label: '내 홈페이지', api: ['/api/homepage/sites'] },
]

export default function HomepageAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const prefetchNav = (item: (typeof nav)[number]) => {
    router.prefetch(item.href)
    item.api.forEach((path) => homepagePrefetch(path))
  }

  useEffect(() => {
    const id = window.setTimeout(() => nav.forEach(prefetchNav), 50)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      <aside className="border-b bg-white p-4 md:min-h-screen md:w-60 md:border-b-0 md:border-r">
        <Link href="/homepage-admin" className="block text-lg font-black text-blue-700">
          홈페이지 관리자
        </Link>
        <p className="mt-1 text-xs text-gray-500">가격, 문구, 문의를 쉽게 관리합니다.</p>
        <nav className="mt-5 flex gap-2 overflow-x-auto md:flex-col">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => prefetchNav(item)}
              onFocus={() => prefetchNav(item)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? 'bg-blue-100 font-bold text-blue-800'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/v2/manage" className="mt-6 block text-sm text-blue-600">
          무플 관리로 이동
        </Link>
      </aside>
      <div className="flex-1 p-4 md:p-6">{children}</div>
    </div>
  )
}
