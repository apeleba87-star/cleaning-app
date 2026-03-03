'use client'

import Link from 'next/link'
import CleaningEstimateCalculator from '@/components/CleaningEstimateCalculator'

export default function EstimatePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 sm:h-16 gap-2 min-w-0">
            <div className="flex items-center gap-2 sm:gap-6 lg:gap-8 min-w-0 overflow-x-auto overflow-y-hidden py-2 -mx-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <Link href="/" className="text-lg sm:text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors shrink-0">
                무플
              </Link>
              <Link href="/features" className="text-xs sm:text-base text-gray-600 hover:text-gray-900 font-medium transition-colors shrink-0 whitespace-nowrap">
                기능 소개
              </Link>
              <Link href="/case-studies" className="text-xs sm:text-base text-gray-600 hover:text-gray-900 font-medium transition-colors shrink-0 whitespace-nowrap">
                관리 사례
              </Link>
              <Link href="/pricing" className="text-xs sm:text-base text-gray-600 hover:text-gray-900 font-medium transition-colors shrink-0 whitespace-nowrap">
                요금제
              </Link>
              <Link href="/estimate" className="text-xs sm:text-base text-blue-600 font-medium border-b-2 border-blue-600 shrink-0 whitespace-nowrap">
                견적 진단기
              </Link>
            </div>
            <Link href="/login" className="px-3 sm:px-5 py-1.5 sm:py-2 bg-gray-900 text-white rounded-lg text-xs sm:text-base font-medium hover:bg-gray-800 transition-colors duration-200 shrink-0">
              로그인
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-12 sm:pt-16">
        <CleaningEstimateCalculator />
      </main>
    </div>
  )
}
