'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface CaseStudy {
  id: string
  title: string
  description: string | null
  blog_url: string
  thumbnail_url: string | null
  display_order: number
  is_active: boolean
}

interface CaseStudiesClientProps {
  caseStudies: CaseStudy[]
}

export default function CaseStudiesClient({ caseStudies }: CaseStudiesClientProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 - 기능 소개 페이지와 동일한 스타일 */}
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
                className="text-sm sm:text-base text-gray-900 font-semibold border-b-2 border-gray-900 transition-colors"
              >
                관리 사례
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
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div
            className={`transition-all duration-1000 delay-100 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="text-center mb-16">
              <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
                관리 사례
              </h1>
              <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-6">
                무플로 현장을 유지하는 실제 사례를 확인하세요
              </p>
              <div className="w-32 h-1 bg-gradient-to-r from-green-500 to-blue-600 mx-auto rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* 관리 사례 그리드 */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-green-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {caseStudies.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-12 h-12 text-gray-400"
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
              <p className="text-xl text-gray-600">등록된 관리 사례가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {caseStudies.map((caseStudy, index) => (
                <a
                  key={caseStudy.id}
                  href={caseStudy.blog_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  {/* 배경 그라데이션 (호버 시) */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100 to-blue-50 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  <div className="relative z-10">
                    {/* 썸네일 */}
                    {caseStudy.thumbnail_url ? (
                      <div className="w-full h-56 rounded-xl overflow-hidden mb-4 bg-gray-100 relative">
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
                          className="hidden w-full h-full bg-gradient-to-br from-green-400 to-blue-500 items-center justify-center"
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
                      <div className="w-full h-56 rounded-xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
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
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-green-600 transition-colors line-clamp-2 min-h-[3rem]">
                      {caseStudy.title}
                    </h3>

                    {/* 설명 */}
                    {caseStudy.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3 min-h-[4rem]">
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
          )}
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            무플의 모든 기능을 체험해보세요
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            현장을 유지하는 운영 구조를 직접 경험해보세요
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <span>지금 시작하기</span>
            <svg
              className="w-5 h-5 group-hover:translate-x-1 transition-transform"
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
      </section>

      {/* 푸터 */}
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
              © {new Date().getFullYear()} 무플. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link
                href="/features"
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                기능 소개
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
