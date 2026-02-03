'use client'

import { usePathname } from 'next/navigation'
import { KAKAO_CHAT_URL } from '@/lib/constants'

const PUBLIC_PATHS = ['/', '/pricing', '/features', '/case-studies']

function isPublicPage(pathname: string | null): boolean {
  if (!pathname) return false
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (pathname.startsWith('/pages/')) return true
  return false
}

export default function KakaoConsultFab() {
  const pathname = usePathname()
  if (!isPublicPage(pathname)) return null

  return (
    <a
      href={KAKAO_CHAT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-full bg-[#FEE500] px-4 py-3 shadow-lg transition hover:bg-[#FADA0A] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#FEE500] focus:ring-offset-2"
      title="카카오톡으로 문의하기"
      aria-label="카카오톡 상담하기"
    >
      <span className="text-black font-medium">상담하기</span>
      <svg
        className="h-5 w-5 shrink-0 text-black"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path d="M12 3c5.5 0 10 3.58 10 8s-4.5 8-10 8c-1.24 0-2.43-.18-3.53-.5C5.55 21 2 21 2 21c2.33-2.33 2.7-3.9 2.75-4.5C3.05 15.07 3 14.1 3 13c0-4.42 4.5-8 9-8z" />
      </svg>
    </a>
  )
}
