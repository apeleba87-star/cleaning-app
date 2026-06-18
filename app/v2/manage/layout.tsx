'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { v2Prefetch } from '@/lib/v2/client'

const nav = [
  { href: '/v2/manage', label: '대시보드', api: ['/api/v2/stores/summary'] },
  { href: '/v2/manage/stores', label: '매장', api: ['/api/v2/stores'] },
  { href: '/v2/manage/users', label: '사용자', api: ['/api/v2/users', '/api/v2/stores'] },
  { href: '/v2/manage/issues', label: '이슈', api: ['/api/v2/issues'] },
]

export default function V2ManageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const prefetchNav = (item: (typeof nav)[number]) => {
    router.prefetch(item.href)
    item.api.forEach((path) => v2Prefetch(path))
  }

  useEffect(() => {
    const run = () => nav.forEach(prefetchNav)
    const id = window.setTimeout(run, 50)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-56 bg-white border-b md:border-b-0 md:border-r p-4">
        <p className="font-bold text-blue-700 mb-4">관리자</p>
        <nav className="flex md:flex-col gap-2 overflow-x-auto">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onMouseEnter={() => prefetchNav(item)}
              onFocus={() => prefetchNav(item)}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                pathname.startsWith(item.href)
                  ? 'bg-blue-100 text-blue-800 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/v2/work" className="block mt-4 text-sm text-blue-600">
          직원모드 →
        </Link>
      </aside>
      <div className="flex-1 p-4 md:p-6">{children}</div>
    </div>
  )
}
