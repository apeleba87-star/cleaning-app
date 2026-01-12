'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

interface Feature {
  id: string
  title: string
  description: string
  icon_name: string
  icon_color: string
  display_order: number
  category: string
  benefits: string[]
  is_active: boolean
}

interface FeaturesClientProps {
  features: Feature[]
}

export default function FeaturesClient({ features }: FeaturesClientProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 - 랜딩 페이지와 동일한 스타일 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4 sm:gap-8">
              <Link href="/" className="text-xl sm:text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
                무플
              </Link>
              <Link
                href="/features"
                className="text-sm sm:text-base text-blue-600 hover:text-blue-700 font-medium transition-colors border-b-2 border-blue-600"
              >
                기능 소개
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

      {/* 히어로 섹션 */}
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div
            className={`transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
              무플의 핵심 기능
            </h1>
            <p className="text-2xl text-gray-600 max-w-3xl mx-auto mb-8">
              현장을 유지하는 10가지 핵심 기능
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto rounded-full"></div>
          </div>
        </div>
      </section>

      {/* 기능 그리드 섹션 */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          {features.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-gray-600 mb-4">기능 데이터가 없습니다.</p>
              <p className="text-gray-500">
                관리자 페이지에서 기능을 추가해주세요.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
              <div
                key={feature.id}
                className="group bg-white rounded-2xl p-8 border-2 border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* 배경 그라데이션 (호버 시) */}
                <div
                  className="absolute top-0 right-0 w-40 h-40 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(to bottom right, ${feature.icon_color}15, ${feature.icon_color}05)`,
                  }}
                ></div>

                <div className="relative z-10">
                  {/* 아이콘 */}
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300"
                    style={{
                      background: `linear-gradient(to bottom right, ${feature.icon_color}, ${feature.icon_color}dd)`,
                    }}
                  >
                    <span className="text-4xl">{feature.icon_name}</span>
                  </div>

                  {/* 제목 */}
                  <h3
                    className="text-2xl font-bold text-gray-900 mb-4 group-hover:transition-colors"
                    style={{
                      color: isVisible ? undefined : feature.icon_color,
                    }}
                  >
                    {feature.title}
                  </h3>

                  {/* 설명 */}
                  <p className="text-gray-600 leading-relaxed mb-6 text-base">
                    {feature.description}
                  </p>

                  {/* 주요 장점 */}
                  {feature.benefits && feature.benefits.length > 0 && (
                    <ul className="space-y-2">
                      {feature.benefits.slice(0, 3).map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 group/item">
                          <div
                            className="w-1.5 h-1.5 rounded-full mt-2 group-hover/item:scale-150 transition-transform flex-shrink-0"
                            style={{ backgroundColor: feature.icon_color }}
                          ></div>
                          <span className="text-sm text-gray-600">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div
            className={`transition-all duration-1000 delay-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              지금 바로 시작하세요
            </h2>
            <p className="text-xl text-blue-100 mb-10">
              무플의 모든 기능을 체험해보세요
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            © 2025 무플. 현장을 유지하는 운영 구조.
          </p>
        </div>
      </footer>
    </div>
  )
}
