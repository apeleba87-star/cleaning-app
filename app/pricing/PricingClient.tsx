'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function PricingClient() {
  const [isVisible, setIsVisible] = useState(false)

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
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div
            className={`transition-all duration-1000 delay-100 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="text-center mb-16">
              <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
                투명한 요금제
              </h1>
              <p className="text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto mb-6">
                매장당 합리적인 가격으로 현장을 유지하세요
              </p>
              <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* 요금제 카드 */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {plans.map((plan, index) => (
              <div
                key={plan.name}
                className={`group relative rounded-3xl p-8 border-2 transition-all duration-500 hover:shadow-2xl ${
                  plan.popular
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl scale-105'
                    : 'border-gray-200 bg-white shadow-lg hover:-translate-y-2'
                }`}
                style={{
                  animationDelay: `${index * 200}ms`,
                }}
              >
                {/* 인기 배지 */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                      가장 인기
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-6">{plan.description}</p>
                  <div className="mb-4">
                    <span className="text-5xl sm:text-6xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-xl text-gray-600 ml-2">원</span>
                  </div>
                  <p className="text-sm text-gray-500">{plan.period}</p>
                </div>

                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      {feature.included ? (
                        <svg
                          className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-6 h-6 text-gray-300 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )}
                      <span
                        className={`text-base ${
                          feature.included ? 'text-gray-900 font-medium' : 'text-gray-400 line-through'
                        }`}
                      >
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/login"
                  className={`block w-full text-center py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl hover:scale-105'
                      : 'bg-gray-900 text-white hover:bg-gray-800 shadow-md hover:shadow-lg'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          {/* 추가 옵션 */}
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">추가 옵션</h3>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border-2 border-gray-200">
              {addOns.map((addOn, index) => (
                <div key={index} className="text-center">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">{addOn.name}</h4>
                  <p className="text-gray-600 mb-4">{addOn.description}</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-3xl font-bold text-gray-900">{addOn.price}</span>
                    <span className="text-lg text-gray-600">원</span>
                    <span className="text-sm text-gray-500 ml-2">{addOn.period}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ 섹션 */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">자주 묻는 질문</h2>
          <div className="space-y-6">
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
                className="bg-white rounded-xl p-6 border-2 border-gray-100 shadow-md hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            지금 시작하세요
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            무료로 시작하고 필요에 따라 확장하세요
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-gray-900 text-lg font-bold rounded-xl hover:bg-gray-50 transition-all duration-300 shadow-2xl hover:shadow-white/20 hover:scale-105"
          >
            <span>무료로 시작하기</span>
            <svg
              className="w-5 h-5"
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
