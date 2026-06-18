'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { v2GetCached, v2Prefetch } from '@/lib/v2/client'

const nav = [
  { href: '/v2/work', label: '홈', api: ['/api/v2/work/today'] },
  { href: '/v2/work/checklist', label: '체크리스트', api: ['/api/v2/work/today'] },
  { href: '/v2/work/photos', label: '사진', api: ['/api/v2/work/today'] },
  { href: '/v2/work/issues', label: '이슈', api: ['/api/v2/work/today', '/api/v2/issues'] },
]

export default function V2WorkLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [canManage, setCanManage] = useState(false)

  const prefetchNav = (item: (typeof nav)[number]) => {
    router.prefetch(item.href)
    item.api.forEach((path) => v2Prefetch(path))
  }

  const prefetchManage = () => {
    router.prefetch('/v2/manage')
    v2Prefetch('/api/v2/stores/summary')
  }

  useEffect(() => {
    const run = () => nav.forEach(prefetchNav)
    const id = window.setTimeout(run, 50)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    v2GetCached<{ role?: string }>('/api/v2/work/today', 30_000)
      .then((d) => setCanManage(d.role === 'business_owner' || d.role === 'platform_admin'))
      .catch(() => setCanManage(false))
  }, [])

  return (
    <div className="pb-20">
      {children}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 z-40 overflow-x-auto">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onMouseEnter={() => prefetchNav(item)}
            onFocus={() => prefetchNav(item)}
            className={`text-sm px-3 py-2 rounded-lg ${
              pathname === item.href ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-600'
            }`}
          >
            {item.label}
          </Link>
        ))}
        {canManage && (
          <Link
            href="/v2/manage"
            prefetch
            onMouseEnter={prefetchManage}
            onFocus={prefetchManage}
            className="text-sm px-3 py-2 rounded-lg text-blue-700 font-semibold bg-blue-50"
          >
            관리자모드
          </Link>
        )}
      </nav>
    </div>
  )
}
