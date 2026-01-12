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

      {/* 히어로 섹션 */}
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div
            className={`transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100/50 rounded-full mb-6">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-sm font-semibold text-blue-700">10가지 핵심 기능</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
              <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
                무플의 핵심 기능
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
              현장을 유지하는 운영 구조를 만드는<br className="hidden sm:block" /> 10가지 핵심 기능을 확인하세요
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>실시간 관리</span>
              </div>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>스마트 리포트</span>
              </div>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>자동화</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 기능 그리드 섹션 */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {features.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-xl text-gray-600 mb-4 font-semibold">기능 데이터가 없습니다.</p>
              <p className="text-gray-500">
                관리자 페이지에서 기능을 추가해주세요.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {features.map((feature, index) => (
              <div
                key={feature.id}
                className="group relative rounded-3xl overflow-hidden transition-all duration-700 hover:-translate-y-2"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* 배경 그라데이션 */}
                <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50"></div>

                {/* 패턴 오버레이 */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }}></div>
                </div>

                {/* 호버 시 배경 그라데이션 */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(135deg, ${feature.icon_color}08, ${feature.icon_color}03)`,
                  }}
                ></div>

                {/* 테두리 */}
                <div className="absolute inset-0 border-2 border-gray-100 rounded-3xl group-hover:border-opacity-50 transition-all duration-300"
                  style={{
                    borderColor: `transparent`,
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      borderColor: feature.icon_color,
                      borderWidth: '2px',
                    }}
                  ></div>
                </div>

                <div className="relative p-8 lg:p-10">
                  {/* 아이콘 */}
                  <div className="relative mb-6">
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 relative z-10"
                      style={{
                        background: `linear-gradient(135deg, ${feature.icon_color}, ${feature.icon_color}dd)`,
                      }}
                    >
                      <span className="text-4xl">{feature.icon_name}</span>
                    </div>
                    {/* 아이콘 글로우 효과 */}
                    <div
                      className="absolute inset-0 w-20 h-20 rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500"
                      style={{
                        backgroundColor: feature.icon_color,
                      }}
                    ></div>
                  </div>

                  {/* 제목 */}
                  <h3 className="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-4 group-hover:text-gray-800 transition-colors">
                    {feature.title}
                  </h3>

                  {/* 설명 */}
                  <p className="text-gray-600 leading-relaxed mb-6 text-base lg:text-lg">
                    {feature.description}
                  </p>

                  {/* 주요 장점 */}
                  {feature.benefits && feature.benefits.length > 0 && (
                    <ul className="space-y-3">
                      {feature.benefits.slice(0, 3).map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-3 group/item">
                          <div className="flex-shrink-0 mt-1">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center group-hover/item:scale-110 transition-transform duration-300"
                              style={{
                                backgroundColor: `${feature.icon_color}15`,
                              }}
                            >
                              <svg
                                className="w-4 h-4"
                                style={{ color: feature.icon_color }}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                          <span className="text-sm lg:text-base text-gray-700 font-medium flex-1">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 하단 그라데이션 바 */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(to right, ${feature.icon_color}, ${feature.icon_color}dd)`,
                  }}
                ></div>
              </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* 배경 애니메이션 */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
        </div>

        {/* 그리드 패턴 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div
            className={`transition-all duration-1000 delay-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm font-semibold text-white">지금 시작하세요</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
              무플의 모든 기능을<br className="sm:hidden" /> 체험해보세요
            </h2>
            <p className="text-xl lg:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto">
              현장을 유지하는 운영 구조를 지금 바로 시작하세요
            </p>
            <Link
              href="/login"
              className="group inline-flex items-center gap-3 px-10 py-5 bg-white text-gray-900 text-lg font-bold rounded-2xl hover:bg-gray-50 transition-all duration-300 shadow-2xl hover:shadow-white/30 hover:scale-105 transform"
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
            <p className="mt-6 text-sm text-blue-200">
              무료로 시작 · 즉시 사용 가능 · 언제든 해지 가능
            </p>
          </div>
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
              © 2025 무플. 현장을 유지하는 운영 구조.
            </p>
            <div className="flex gap-6">
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
