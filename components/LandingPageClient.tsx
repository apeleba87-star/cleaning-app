'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { KAKAO_CHAT_URL } from '@/lib/constants'
import HeroSlider from './HeroSlider'

interface HeroSettings {
  tagline: string
  headline1: string
  headline2: string
  brandName: string
  subtitle: string
  fontSize?: {
    headline1?: string
    headline2?: string
    brandName?: string
    subtitle?: string
  }
  ctaButton1: {
    text: string
    link: string
    visible: boolean
  }
  ctaButton2: {
    text: string
    link: string
    visible: boolean
  }
  sliderInterval: number
}

interface CaseStudy {
  id: string
  title: string
  description: string | null
  blog_url: string
  thumbnail_url: string | null
  display_order: number
  is_active: boolean
}

interface LandingPageClientProps {
  heroImages: string[]
  heroSettings: HeroSettings
  caseStudies?: CaseStudy[]
}

export default function LandingPageClient({ heroImages, heroSettings, caseStudies = [] }: LandingPageClientProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 - 브라우니 스타일: 심플하고 깔끔한 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4 sm:gap-8">
              <Link href="/" className="text-xl sm:text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
                무플
              </Link>
              <Link
                href="/features"
                className="text-sm sm:text-base text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                기능 소개
              </Link>
              <Link
                href="/case-studies"
                className="text-sm sm:text-base text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                관리 사례
              </Link>
              <Link
                href="/pricing"
                className="text-sm sm:text-base text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                요금제
              </Link>
            </div>
            <Link
              href="/login"
              className="px-4 sm:px-5 py-2 bg-gray-900 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-gray-800 transition-colors duration-200"
            >
              로그인
            </Link>
          </div>
        </div>
      </header>

      {/* 히어로 섹션 - 브라우니와 동일한 스타일 */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* 배경 이미지 슬라이더 */}
        <HeroSlider images={heroImages} interval={heroSettings.sliderInterval || 5000} />

        {/* 히어로 콘텐츠 - 브라우니와 동일한 레이아웃 */}
        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            {/* 태그라인 - 브라우니 스타일: 작은 텍스트, 대괄호 */}
            <div className="mb-8">
              <p className="text-white/90 text-sm sm:text-base font-normal tracking-wide">
                {heroSettings.tagline}
              </p>
            </div>

            {/* 메인 헤드라인 - 브라우니 스타일: 매우 큰 텍스트 */}
            <div className="mb-6 leading-tight">
              <h1 className={`${heroSettings.fontSize?.headline1 || 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl'} font-bold text-white`}>
                {heroSettings.headline1}
              </h1>
              <h2 className={`${heroSettings.fontSize?.headline2 || 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl'} font-bold text-white`}>
                {heroSettings.headline2}
              </h2>
            </div>

            {/* 브랜드명 - 브라우니 스타일: 작은 볼드 텍스트 */}
            <p className={`${heroSettings.fontSize?.brandName || 'text-2xl sm:text-3xl md:text-4xl'} font-bold text-white mb-12`}>
              {heroSettings.brandName}
            </p>

            {/* 서브 타이틀 */}
            <p className={`${heroSettings.fontSize?.subtitle || 'text-lg sm:text-xl md:text-2xl'} text-white/90 mb-12 font-normal`}>
              {heroSettings.subtitle}
            </p>

            {/* CTA 버튼들 - 브라우니 스타일: 두 개의 버튼 */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {/* 메인 CTA 버튼 - 파란색, 아이콘 포함 */}
              {heroSettings.ctaButton1.visible && (
                <a
                  href={KAKAO_CHAT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-base sm:text-lg font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl min-w-[200px]"
                >
                  <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">m</span>
                  </span>
                  {heroSettings.ctaButton1.text}
                </a>
              )}

              {/* 보조 CTA 버튼 - 흰색, 문서 아이콘 */}
              {heroSettings.ctaButton2.visible && (
                <a
                  href={KAKAO_CHAT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-base sm:text-lg font-semibold rounded-lg transition-all duration-200 border border-white/30 min-w-[200px]"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {heroSettings.ctaButton2.text}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* 스크롤 인디케이터 - 브라우니 스타일 */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <svg
            className="w-5 h-5 text-white animate-bounce"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* 문제 인식 섹션 - 다이나믹하고 시각적인 디자인 */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
        {/* 배경 장식 요소 */}
        <div className="absolute top-0 left-0 w-full h-full opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div
            className={`transition-all duration-1000 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="text-center mb-16">
              <h3 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                현장의 진짜 문제는 무엇인가
              </h3>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                확장에만 집중하는 업계의 문제점
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* 카드 1 */}
              <div className="group bg-white rounded-2xl p-8 border-2 border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-100 to-orange-50 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-4 text-xl group-hover:text-orange-600 transition-colors">
                    확장에만 집중하는 경향
                  </h4>
                  <p className="text-gray-600 leading-relaxed text-base">
                    새로운 현장 획득에만 관심을 두다 보니, 기존 현장을 유지하는 데 소홀해집니다.
                  </p>
                </div>
              </div>

              {/* 카드 2 */}
              <div className="group bg-white rounded-2xl p-8 border-2 border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-100 to-red-50 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-4 text-xl group-hover:text-red-600 transition-colors">
                    '관리'라는 단어의 부담
                  </h4>
                  <p className="text-gray-600 leading-relaxed text-base">
                    '관리'라는 단어는 통제, 감시, 일방적 지시의 의미를 담고 있습니다.
                  </p>
                </div>
              </div>

              {/* 카드 3 */}
              <div className="group bg-white rounded-2xl p-8 border-2 border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-purple-50 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-4 text-xl group-hover:text-purple-600 transition-colors">
                    복잡한 시스템의 역효과
                  </h4>
                  <p className="text-gray-600 leading-relaxed text-base">
                    기능이 많고 복잡한 관리 시스템은 오히려 현장의 부담을 늘립니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 무플의 철학 섹션 - 다이나믹한 대비 디자인 */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div
            className={`transition-all duration-1000 delay-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="text-center mb-16">
              <h3 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
                관리가 아닌 유지
              </h3>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto rounded-full"></div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* 관리 - 부정적 */}
              <div className="group bg-white rounded-2xl p-10 border-2 border-red-100 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-red-50 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <h4 className="text-3xl font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                      '관리'의 의미
                    </h4>
                  </div>
                  <ul className="space-y-5 text-gray-700">
                    <li className="flex items-start gap-4 group/item">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-2 group-hover/item:scale-150 transition-transform"></div>
                      <span className="text-lg">통제와 감시</span>
                    </li>
                    <li className="flex items-start gap-4 group/item">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-2 group-hover/item:scale-150 transition-transform"></div>
                      <span className="text-lg">일방적 지시</span>
                    </li>
                    <li className="flex items-start gap-4 group/item">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-2 group-hover/item:scale-150 transition-transform"></div>
                      <span className="text-lg">부담감과 스트레스</span>
                    </li>
                    <li className="flex items-start gap-4 group/item">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-2 group-hover/item:scale-150 transition-transform"></div>
                      <span className="text-lg">자연스러운 흐름 방해</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 유지 - 긍정적 */}
              <div className="group bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-10 border-2 border-blue-500 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-400/20 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 border-2 border-white/30">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="text-3xl font-bold text-white">
                      '유지'의 의미
                    </h4>
                  </div>
                  <ul className="space-y-5 text-blue-50">
                    <li className="flex items-start gap-4 group/item">
                      <div className="w-2 h-2 rounded-full bg-blue-200 mt-2 group-hover/item:scale-150 transition-transform"></div>
                      <span className="text-lg">지속과 보존</span>
                    </li>
                    <li className="flex items-start gap-4 group/item">
                      <div className="w-2 h-2 rounded-full bg-blue-200 mt-2 group-hover/item:scale-150 transition-transform"></div>
                      <span className="text-lg">자연스러운 흐름</span>
                    </li>
                    <li className="flex items-start gap-4 group/item">
                      <div className="w-2 h-2 rounded-full bg-blue-200 mt-2 group-hover/item:scale-150 transition-transform"></div>
                      <span className="text-lg">안정성과 신뢰</span>
                    </li>
                    <li className="flex items-start gap-4 group/item">
                      <div className="w-2 h-2 rounded-full bg-blue-200 mt-2 group-hover/item:scale-150 transition-transform"></div>
                      <span className="text-lg">건강한 현장 문화</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-12 text-white text-center">
              <p className="text-2xl sm:text-3xl font-bold mb-2">
                무플은 현장을 "관리"하는 도구가 아니라
              </p>
              <p className="text-3xl sm:text-4xl font-bold">"유지"하게 만드는 구조입니다</p>
            </div>
          </div>
        </div>
      </section>

      {/* 무플이 현장을 유지하는 방식 - 다이나믹한 단계별 설명 */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/4 left-0 w-96 h-96 bg-green-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-teal-400 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div
            className={`transition-all duration-1000 delay-400 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="text-center mb-16">
              <h3 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
                무플이 현장을 유지하는 방식
              </h3>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                개념 중심의 해결 구조
              </p>
            </div>

            <div className="space-y-8">
              {/* 카드 1 */}
              <div className="group bg-white rounded-2xl p-10 border-2 border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-emerald-100 to-teal-50 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex items-start gap-8 relative z-10">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <span className="text-3xl text-white font-bold">1</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-3xl font-bold text-gray-900 mb-4 group-hover:text-emerald-600 transition-colors">
                      안정성의 기반
                    </h4>
                    <p className="text-gray-600 leading-relaxed text-lg">
                      일관된 프로세스와 예측 가능한 흐름을 만들어 현장의 안정성을 확보합니다.
                      신뢰 관계를 구축하고, 현장이 스스로 건강하게 운영될 수 있는 기반을 만듭니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* 카드 2 */}
              <div className="group bg-white rounded-2xl p-10 border-2 border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-100 to-cyan-50 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex items-start gap-8 relative z-10">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <span className="text-3xl text-white font-bold">2</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-3xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                      자연스러운 흐름
                    </h4>
                    <p className="text-gray-600 leading-relaxed text-lg">
                      강제가 아닌 자연스러운 작업 흐름을 만듭니다. 복잡하지 않은 구조로 현장에 맞는
                      유연성을 제공하며, 사용자가 고민하지 않아도 다음 행동이 명확하게 보이도록
                      설계합니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* 카드 3 */}
              <div className="group bg-white rounded-2xl p-10 border-2 border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-100 to-purple-50 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex items-start gap-8 relative z-10">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <span className="text-3xl text-white font-bold">3</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-3xl font-bold text-gray-900 mb-4 group-hover:text-indigo-600 transition-colors">
                      지속 가능성
                    </h4>
                    <p className="text-gray-600 leading-relaxed text-lg">
                      단기적 성과가 아닌 장기적 유지에 집중합니다. 현장의 건강한 상태를 유지하고,
                      지속 가능한 운영 구조를 만들어 확장보다 유지가 더 중요함을 실현합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 차별점 섹션 - 다이나믹한 비교 디자인 */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/2 left-0 w-96 h-96 bg-yellow-400 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-orange-400 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <div
            className={`transition-all duration-1000 delay-500 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="text-center mb-16">
              <h3 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
                무플이 다른 이유
              </h3>
              <div className="w-24 h-1 bg-gradient-to-r from-orange-500 to-yellow-500 mx-auto rounded-full"></div>
            </div>

            <div className="space-y-8">
              {/* 다른 솔루션 */}
              <div className="group bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gray-200/50 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex items-start gap-6 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 font-bold text-xl mb-2 group-hover:text-gray-900 transition-colors">
                      다른 솔루션: "더 많은 현장을 관리하세요"
                    </p>
                    <p className="text-gray-600 text-base">확장을 위한 도구, 효율적인 관리 시스템</p>
                  </div>
                </div>
              </div>

              {/* 무플 */}
              <div className="group bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 border-2 border-blue-500 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex items-start gap-6 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300 border-2 border-white/30">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-xl mb-2">
                      무플: "지금의 현장을 지켜내세요"
                    </p>
                    <p className="text-blue-100 text-base">유지를 위한 구조, 안정성을 만드는 시스템</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 최종 CTA 섹션 - 다이나믹하고 강렬한 CTA */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div
            className={`transition-all duration-1000 delay-600 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <h3 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight">
              지금의 현장을 지켜내고 싶으신가요?
            </h3>
            <p className="text-2xl text-blue-100 mb-12 font-medium">
              무플과 함께 현장을 유지하세요
            </p>
            <Link
              href="/login"
              className="group inline-flex items-center gap-3 px-12 py-6 bg-white text-gray-900 text-xl font-bold rounded-2xl hover:bg-gray-50 transition-all duration-300 shadow-2xl hover:shadow-white/20 hover:scale-105"
            >
              <span>무플 시작하기</span>
              <svg 
                className="w-6 h-6 group-hover:translate-x-1 transition-transform" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <p className="text-blue-200 text-base mt-8 font-medium">
              무료로 시작할 수 있습니다. 로그인 후 바로 사용해보세요.
            </p>
          </div>
        </div>
      </section>

      {/* 관리 사례 섹션 - 가장 아래에 배치 */}
      {caseStudies.length > 0 && (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
          {/* 배경 장식 */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-green-400 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto relative z-10">
            <div
              className={`transition-all duration-1000 delay-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
                  관리 사례
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  무플로 현장을 유지하는 실제 사례를 확인하세요
                </p>
                <div className="w-24 h-1 bg-gradient-to-r from-green-500 to-blue-600 mx-auto rounded-full mt-4"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {caseStudies.map((caseStudy, index) => (
                  <a
                    key={caseStudy.id}
                    href={caseStudy.blog_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden"
                  >
                    {/* 배경 그라데이션 (호버 시) */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100 to-blue-50 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    <div className="relative z-10">
                      {/* 썸네일 */}
                      {caseStudy.thumbnail_url ? (
                        <div className="w-full h-48 rounded-xl overflow-hidden mb-4 bg-gray-100 relative">
                          <img
                            src={
                              caseStudy.thumbnail_url.includes('postfiles.pstatic.net') ||
                              caseStudy.thumbnail_url.includes('blogfiles.naver.net')
                                ? `/api/proxy-image?url=${encodeURIComponent(caseStudy.thumbnail_url)}`
                                : caseStudy.thumbnail_url
                            }
                            alt={caseStudy.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              // 에러 시 플레이스홀더 표시
                              const placeholder = target.nextElementSibling as HTMLElement
                              if (placeholder) {
                                placeholder.style.display = 'flex'
                              }
                            }}
                          />
                          {/* 플레이스홀더 (에러 시 표시) */}
                          <div
                            className="hidden w-full h-full bg-gradient-to-br from-green-400 to-blue-500 items-center justify-center absolute inset-0"
                            style={{ display: 'none' }}
                          >
                            <svg
                              className="w-16 h-16 text-white opacity-80"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                              />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-48 rounded-xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                          <svg
                            className="w-16 h-16 text-white opacity-80"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                            />
                          </svg>
                        </div>
                      )}

                      {/* 제목 */}
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors line-clamp-2">
                        {caseStudy.title}
                      </h3>

                      {/* 설명 */}
                      {caseStudy.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                          {caseStudy.description}
                        </p>
                      )}

                      {/* 링크 표시 */}
                      <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                        <span>자세히 보기</span>
                        <svg
                          className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {/* 더보기 링크 */}
              <div className="text-center mt-12">
                <Link
                  href="/case-studies"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors duration-200"
                >
                  <span>모든 관리 사례 보기</span>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 푸터 - 브라우니 스타일: 심플한 푸터 */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* 왼쪽: 회사 정보 */}
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-4">맨즈컴퍼니</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>사업자 등록번호: 520-52-00347</p>
                <p>대표: 한승필</p>
                <p>주소: 서울 강서구 공항동 1335-4 맨즈컴퍼니</p>
              </div>
            </div>

            {/* 오른쪽: 문의 정보 */}
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-4">문의</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  대표 문의:{' '}
                  <a
                    href="mailto:apeleba2@naver.com"
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    apeleba2@naver.com
                  </a>
                </p>
                <p>
                  제휴/제안:{' '}
                  <a
                    href="mailto:apeleba2@naver.com"
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    apeleba2@naver.com
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              © 2025 무플. 현장을 유지하는 운영 구조.
            </p>
            <div className="flex gap-6">
              <Link
                href="/features"
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                기능 소개
              </Link>
              <Link
                href="/case-studies"
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                관리 사례
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
