'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  { href: '/v2/work', label: '홈' },
  { href: '/v2/work/checklist', label: '체크리스트' },
  { href: '/v2/work/issues', label: '이슈' },
]

export default function V2WorkLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="pb-20">
      {children}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 z-40">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm px-3 py-2 rounded-lg ${
              pathname === item.href ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-600'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
