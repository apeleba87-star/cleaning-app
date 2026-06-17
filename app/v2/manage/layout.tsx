'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/v2/manage', label: '대시보드' },
  { href: '/v2/manage/stores', label: '매장' },
  { href: '/v2/manage/users', label: '사용자' },
  { href: '/v2/manage/issues', label: '이슈' },
]

export default function V2ManageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-56 bg-white border-b md:border-b-0 md:border-r p-4">
        <p className="font-bold text-blue-700 mb-4">관리자</p>
        <nav className="flex md:flex-col gap-2 overflow-x-auto">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
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
