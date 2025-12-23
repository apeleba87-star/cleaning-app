'use client'

import Link from 'next/link'

interface InitialSetupGuideProps {
  hasCompany: boolean
  storeCount: number
  userCount: number
}

export default function InitialSetupGuide({ hasCompany, storeCount, userCount }: InitialSetupGuideProps) {
  // 초기 설정 완료 여부 확인
  const isSetupComplete = hasCompany && storeCount > 0 && userCount > 0

  // 설정 완료되면 표시하지 않음
  if (isSetupComplete) {
    return null
  }

  const steps = [
    {
      id: 1,
      title: '회사 정보 등록',
      completed: hasCompany,
      href: '/business/company',
      description: '회사 기본 정보를 등록하세요',
    },
    {
      id: 2,
      title: '매장 등록',
      completed: storeCount > 0,
      href: '/business/stores',
      description: '관리할 매장을 등록하세요',
    },
    {
      id: 3,
      title: '직원 초대',
      completed: userCount > 0,
      href: '/business/users',
      description: '직원을 초대하고 권한을 설정하세요',
    },
  ]

  const completedSteps = steps.filter((s) => s.completed).length
  const totalSteps = steps.length
  const progress = (completedSteps / totalSteps) * 100

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6 border-l-4 border-blue-500">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">초기 설정 가이드</h2>
          <p className="text-sm text-gray-600">시작하기 전에 다음 단계를 완료해주세요</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-600">{completedSteps}/{totalSteps}</p>
          <p className="text-xs text-gray-500">단계 완료</p>
        </div>
      </div>

      {/* 진행률 바 */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 단계 목록 */}
      <div className="space-y-3">
        {steps.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
              step.completed
                ? 'bg-green-50 border-green-200 hover:bg-green-100'
                : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  step.completed
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step.completed ? '✓' : step.id}
              </div>
              <div>
                <p className={`font-medium ${step.completed ? 'text-green-700' : 'text-gray-900'}`}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
            </div>
            {!step.completed && (
              <span className="text-blue-600 text-sm font-medium">시작하기 →</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}


