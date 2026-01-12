'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function PricingClient() {
  const [isVisible, setIsVisible] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const plans = [
    {
      name: '베이직',
      price: '9,900',
      period: '매장당 월',
      description: '직원 중심의 기본 운영',
      features: [
        { text: '직원용 아이디 1개', included: true },
        { text: '점주용 아이디', included: false },
        { text: '기본 청소 관리 기능', included: true },
        { text: '일일 리포트', included: true },
        { text: '체크리스트 관리', included: true },
        { text: '요청란 관리', included: true },
        { text: '사진 업로드', included: true },
        { text: '월간 리포트', included: false },
        { text: '점주 대시보드', included: false },
        { text: '알림 설정', included: false },
      ],
      cta: '베이직 시작하기',
      popular: false,
      color: 'gray',
    },
    {
      name: '스탠다드',
      price: '14,900',
      period: '매장당 월',
      description: '점주와 직원의 협업 운영',
      features: [
        { text: '점주용 아이디 1개', included: true },
        { text: '직원용 아이디 1개', included: true },
        { text: '기본 청소 관리 기능', included: true },
        { text: '일일 리포트', included: true },
        { text: '체크리스트 관리', included: true },
        { text: '요청란 관리', included: true },
        { text: '사진 업로드', included: true },
        { text: '월간 리포트', included: true },
        { text: '점주 대시보드', included: true },
        { text: '알림 설정', included: true },
      ],
      cta: '스탠다드 시작하기',
      popular: true,
      color: 'blue',
    },
  ]

  const addOns = [
    {
      name: '추가 직원',
      price: '2,000',
      period: '명당 월',
      description: '필요한 만큼 직원을 추가하세요',
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
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
                className="text-sm sm:text-base text-gray-900 font-semibold border-b-2 border-gray-900 transition-colors"
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
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div
            className={`transition-all duration-1000 delay-100 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100/50 rounded-full mb-6">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold text-blue-700">투명한 가격 정책</span>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
                <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
                  합리적인 요금제
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                매장당 명확한 가격으로<br className="hidden sm:block" /> 현장을 유지하는 운영 구조를 시작하세요
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>계약 없음</span>
                </div>
                <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>언제든 변경</span>
                </div>
                <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>무료 시작</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 요금제 카드 */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-20">
            {plans.map((plan, index) => (
              <div
                key={plan.name}
                className={`group relative rounded-3xl overflow-hidden transition-all duration-700 ${
                  plan.popular
                    ? 'lg:scale-105 shadow-2xl ring-4 ring-blue-500/20'
                    : 'shadow-xl hover:shadow-2xl hover:-translate-y-1'
                }`}
                style={{
                  animationDelay: `${index * 200}ms`,
                }}
              >
                {/* 배경 그라데이션 */}
                <div
                  className={`absolute inset-0 ${
                    plan.popular
                      ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600'
                      : 'bg-gradient-to-br from-gray-50 to-white'
                  }`}
                />

                {/* 패턴 오버레이 */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }}></div>
                </div>

                {/* 인기 배지 */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-lg opacity-75"></div>
                      <span className="relative bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-xl flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        가장 인기
                      </span>
                    </div>
                  </div>
                )}

                <div className="relative p-8 lg:p-10">
                  {/* 플랜 아이콘 */}
                  <div className={`mb-6 inline-flex p-4 rounded-2xl ${
                    plan.popular
                      ? 'bg-white/20 backdrop-blur-sm'
                      : 'bg-gradient-to-br from-gray-100 to-gray-200'
                  }`}>
                    {plan.popular ? (
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    )}
                  </div>

                  <div className="mb-8">
                    <h3 className={`text-3xl lg:text-4xl font-extrabold mb-3 ${
                      plan.popular ? 'text-white' : 'text-gray-900'
                    }`}>
                      {plan.name}
                    </h3>
                    <p className={`text-base lg:text-lg mb-6 ${
                      plan.popular ? 'text-blue-100' : 'text-gray-600'
                    }`}>
                      {plan.description}
                    </p>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className={`text-5xl lg:text-6xl font-extrabold ${
                        plan.popular ? 'text-white' : 'text-gray-900'
                      }`}>
                        {plan.price}
                      </span>
                      <span className={`text-xl lg:text-2xl font-semibold ${
                        plan.popular ? 'text-blue-100' : 'text-gray-600'
                      }`}>
                        원
                      </span>
                    </div>
                    <p className={`text-sm ${
                      plan.popular ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {plan.period}
                    </p>
                  </div>

                  <div className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3 group/item">
                        <div className={`flex-shrink-0 mt-0.5 ${
                          feature.included ? '' : 'opacity-40'
                        }`}>
                          {feature.included ? (
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        <span
                          className={`text-base lg:text-lg transition-colors ${
                            feature.included
                              ? plan.popular
                                ? 'text-white font-medium'
                                : 'text-gray-900 font-medium'
                              : plan.popular
                                ? 'text-blue-200 line-through'
                                : 'text-gray-400 line-through'
                          }`}
                        >
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href="/login"
                    className={`block w-full text-center py-4 lg:py-5 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 ${
                      plan.popular
                        ? 'bg-white text-blue-600 hover:bg-blue-50 shadow-2xl hover:shadow-white/50'
                        : 'bg-gradient-to-r from-gray-900 to-gray-800 text-white hover:from-gray-800 hover:to-gray-700 shadow-xl hover:shadow-2xl'
                    }`}
                  >
                    {plan.cta}
                    <svg
                      className="w-5 h-5 inline-block ml-2"
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
            ))}
          </div>

          {/* 추가 옵션 */}
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-gray-900 mb-2">추가 옵션</h3>
              <p className="text-gray-600">필요에 따라 기능을 확장하세요</p>
            </div>
            <div className="bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50 rounded-3xl p-8 lg:p-10 border-2 border-gray-200/50 shadow-xl hover:shadow-2xl transition-all duration-300">
              {addOns.map((addOn, index) => (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">{addOn.name}</h4>
                  <p className="text-gray-600 mb-6">{addOn.description}</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-extrabold text-gray-900">{addOn.price}</span>
                    <span className="text-xl text-gray-600">원</span>
                    <span className="text-sm text-gray-500 ml-2">{addOn.period}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ 섹션 */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              자주 묻는 질문
            </h2>
            <p className="text-lg text-gray-600">궁금한 점을 확인하세요</p>
          </div>
          <div className="space-y-4">
            {[
              {
                q: '매장이 여러 개인 경우 어떻게 결제하나요?',
                a: '매장당 요금제를 적용합니다. 예를 들어 매장 3개를 운영하시면 베이직 플랜 기준 29,700원(9,900원 × 3)입니다.',
              },
              {
                q: '직원이 여러 매장을 관리할 수 있나요?',
                a: '네, 직원 1명이 여러 매장을 관리할 수 있습니다. 직원용 아이디는 매장 수와 무관하게 사용 가능합니다.',
              },
              {
                q: '요금제 변경이 가능한가요?',
                a: '언제든지 요금제를 변경할 수 있습니다. 변경 시 즉시 반영되며, 차액은 다음 결제일에 반영됩니다.',
              },
              {
                q: '추가 직원은 언제든지 추가할 수 있나요?',
                a: '네, 필요하실 때마다 추가 직원을 구매하실 수 있습니다. 월 단위로 결제되며, 언제든지 해지 가능합니다.',
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-bold text-gray-900 flex-1">{faq.q}</h3>
                  <svg
                    className={`w-6 h-6 text-gray-400 flex-shrink-0 transition-transform duration-300 ${
                      expandedFaq === index ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    expandedFaq === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-6 pb-6 pt-0">
                    <p className="text-gray-600 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-semibold text-white">지금 시작하세요</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
            현장을 유지하는<br className="sm:hidden" /> 운영 구조를 시작하세요
          </h2>
          <p className="text-xl lg:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto">
            무료로 시작하고 필요에 따라 확장하세요
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-gray-900 text-lg font-bold rounded-2xl hover:bg-gray-50 transition-all duration-300 shadow-2xl hover:shadow-white/30 hover:scale-105 transform"
          >
            <span>무료로 시작하기</span>
            <svg
              className="w-6 h-6"
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
            신용카드 불필요 · 즉시 시작 · 언제든 해지 가능
          </p>
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
