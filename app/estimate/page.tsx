'use client'

import Link from 'next/link'
import CleaningEstimateCalculator from '@/components/CleaningEstimateCalculator'

export default function EstimatePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4 sm:gap-8">
              <Link href="/" className="text-xl sm:text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
                무플
              </Link>
              <Link href="/features" className="text-sm sm:text-base text-gray-600 hover:text-gray-900 font-medium transition-colors">
                기능 소개
              </Link>
              <Link href="/case-studies" className="text-sm sm:text-base text-gray-600 hover:text-gray-900 font-medium transition-colors">
                관리 사례
              </Link>
              <Link href="/pricing" className="text-sm sm:text-base text-gray-600 hover:text-gray-900 font-medium transition-colors">
                요금제
              </Link>
              <Link href="/estimate" className="text-sm sm:text-base text-blue-600 font-medium border-b-2 border-blue-600">
                청소 표준 견적 진단기
              </Link>
            </div>
            <Link href="/login" className="px-4 sm:px-5 py-2 bg-gray-900 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-gray-800 transition-colors duration-200">
              로그인
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-16">
        <CleaningEstimateCalculator />
      </main>
    </div>
  )
}
