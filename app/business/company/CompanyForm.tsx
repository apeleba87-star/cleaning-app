'use client'

import { useState, FormEvent } from 'react'
import { Company, UserRole } from '@/types/db'

interface CompanyFormProps {
  company: Company
}

export default function CompanyForm({ company }: CompanyFormProps) {
  const isTrialExpired =
    company.subscription_plan === 'free' &&
    !!company.trial_ends_at &&
    !Number.isNaN(Date.parse(company.trial_ends_at)) &&
    Date.parse(company.trial_ends_at) < Date.now()

  const [name, setName] = useState(company.name)
  const [address, setAddress] = useState(company.address || '')
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState(
    company.business_registration_number || ''
  )
  const [signupCode, setSignupCode] = useState(company.signup_code || '')
  const [signupCodeActive, setSignupCodeActive] = useState(company.signup_code_active ?? true)
  const [requiresApproval, setRequiresApproval] = useState(company.requires_approval ?? true)
  const [defaultRole, setDefaultRole] = useState<UserRole>(company.default_role || 'staff')
  const [codeCopied, setCodeCopied] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // 비밀번호 변경 관련 state
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  
  // 개별 필드별 에러 상태
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch(`/api/business/company/${company.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || null,
          business_registration_number: businessRegistrationNumber.trim() || null,
          signup_code: signupCode.trim() || null,
          signup_code_active: signupCodeActive,
          requires_approval: requiresApproval,
          default_role: defaultRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '수정에 실패했습니다.')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 새 비밀번호 확인 실시간 검증
  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value)
    if (value && newPassword && value !== newPassword) {
      setConfirmPasswordError('새 비밀번호와 일치하지 않습니다.')
    } else {
      setConfirmPasswordError(null)
    }
  }

  // 새 비밀번호 변경 시 확인 비밀번호도 재검증
  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value)
    if (confirmPassword && value !== confirmPassword) {
      setConfirmPasswordError('새 비밀번호와 일치하지 않습니다.')
    } else {
      setConfirmPasswordError(null)
    }
  }

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordError(null)
    setCurrentPasswordError(null)
    setConfirmPasswordError(null)
    setPasswordSuccess(false)

    // 입력 검증
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('모든 필드를 입력해주세요.')
      setPasswordLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('새 비밀번호는 최소 6자 이상이어야 합니다.')
      setPasswordLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('새 비밀번호와 일치하지 않습니다.')
      setPasswordError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.')
      setPasswordLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const text = await response.text()
      let data
      
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        throw new Error('서버 응답을 처리할 수 없습니다.')
      }

      if (!response.ok) {
        // 에러 메시지를 더 명확하게 표시
        const errorMessage = data?.error || `비밀번호 변경에 실패했습니다. (오류 코드: ${response.status})`
        
        console.log('비밀번호 변경 실패:', { errorMessage, status: response.status, data })
        
        // 현재 비밀번호 오류인 경우 (에러 메시지 패턴으로 판단)
        // API에서 반환하는 메시지: "현재 비밀번호가 올바르지 않습니다." 또는 "현재 비밀번호가 올바르지 않습니다. 다시 확인해주세요."
        // status 400이고 현재 비밀번호 관련 메시지인 경우
        const isCurrentPasswordError = 
          (response.status === 400 && errorMessage.includes('현재 비밀번호')) || 
          errorMessage.includes('현재 비밀번호가 올바르지 않습니다') ||
          errorMessage.includes('Invalid login') ||
          errorMessage.includes('로그인 실패')
        
        console.log('비밀번호 오류 분석:', { 
          isCurrentPasswordError, 
          errorMessage, 
          status: response.status,
          includesCurrentPassword: errorMessage.includes('현재 비밀번호'),
          includesInvalid: errorMessage.includes('Invalid login')
        })
        
        if (isCurrentPasswordError) {
          console.log('✅ 현재 비밀번호 오류로 설정합니다.')
          setCurrentPasswordError('현재 비밀번호가 올바르지 않습니다.')
          setPasswordError(null)
        } else {
          console.log('❌ 일반 에러로 설정합니다:', errorMessage)
          setPasswordError(errorMessage)
          setCurrentPasswordError(null)
        }
        
        setPasswordLoading(false)
        return
      }

      // 성공 처리
      setPasswordSuccess(true)
      setPasswordError(null)
      setCurrentPasswordError(null)
      setConfirmPasswordError(null)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      // 3초 후 성공 메시지 숨기고 폼 닫기
      setTimeout(() => {
        setPasswordSuccess(false)
        setShowPasswordChange(false)
      }, 3000)
    } catch (err: any) {
      // 네트워크 오류 등 예상치 못한 오류 처리
      const errorMessage = err.message || '비밀번호 변경 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.'
      setPasswordError(errorMessage)
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold">회사 정보 설정</h2>
        {isTrialExpired && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
            무료체험 만료
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-green-800 text-sm">회사 정보가 수정되었습니다.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" id="company-form">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            회사 ID
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={company.id}
              readOnly
              className="w-full px-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600 text-sm"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(company.id)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                } catch (_) {
                  setCopied(false)
                }
              }}
              className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm hover:bg-gray-200"
            >
              {copied ? '복사됨' : '복사'}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">API 연동 시 회사 구분용으로 사용됩니다.</p>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            회사명 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="회사명을 입력하세요"
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            주소
          </label>
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="회사 주소를 입력하세요"
          />
        </div>

        <div>
          <label htmlFor="business_registration_number" className="block text-sm font-medium text-gray-700 mb-1">
            사업자등록번호
          </label>
          <input
            id="business_registration_number"
            type="text"
            value={businessRegistrationNumber}
            onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="사업자등록번호를 입력하세요"
          />
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="font-semibold mb-4 text-blue-900">회원가입 코드 설정</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="signup_code" className="block text-sm font-medium text-gray-700 mb-1">
                업체 코드 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="signup_code"
                  type="text"
                  value={signupCode}
                  onChange={(e) => setSignupCode(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: CLEAN001"
                  required
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(signupCode)
                      setCodeCopied(true)
                      setTimeout(() => setCodeCopied(false), 1500)
                    } catch (_) {
                      setCodeCopied(false)
                    }
                  }}
                  disabled={!signupCode}
                  className="px-3 py-2 bg-blue-100 border border-blue-300 rounded-md text-sm hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {codeCopied ? '복사됨' : '복사'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                신규 사용자가 회원가입 시 입력하는 코드입니다.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={signupCodeActive}
                  onChange={(e) => setSignupCodeActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">코드 활성화</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={requiresApproval}
                  onChange={(e) => setRequiresApproval(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">가입 승인 필요</span>
              </label>
            </div>

            <div>
              <label htmlFor="default_role" className="block text-sm font-medium text-gray-700 mb-1">
                기본 역할
              </label>
              <select
                id="default_role"
                value={defaultRole}
                onChange={(e) => setDefaultRole(e.target.value as UserRole)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="staff">직원</option>
                <option value="manager">매니저</option>
                <option value="store_manager">매장 관리자</option>
                <option value="subcontract_individual">도급(개인)</option>
                <option value="subcontract_company">도급(업체)</option>
              </select>
              <p className="mt-1 text-xs text-gray-600">
                신규 사용자가 가입 시 자동으로 부여되는 기본 역할입니다.
              </p>
            </div>
          </div>
        </div>

        {/* 요금제 정보 - 2026 스타일 */}
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-bold text-slate-800">요금제 정보</h3>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-medium text-slate-600">2026</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg bg-white border border-slate-100 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">현재 요금제</p>
              <p className="text-xl font-bold text-slate-800 capitalize">{company.subscription_plan}</p>
            </div>
            <div className="rounded-lg bg-white border border-slate-100 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">상태</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold ${
                isTrialExpired
                  ? 'bg-red-100 text-red-700'
                  : company.subscription_status === 'active'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {isTrialExpired ? '무료체험 만료' : company.subscription_status === 'active' ? '활성' : '비활성'}
              </span>
            </div>
            <div className="rounded-lg bg-blue-50/80 border border-blue-100 p-4">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">베이직 결제 수</p>
              <p className="text-2xl font-bold text-blue-700">{Number(company.basic_units ?? 0)}<span className="text-base font-semibold text-blue-600 ml-0.5">개</span></p>
            </div>
            <div className="rounded-lg bg-violet-50/80 border border-violet-100 p-4">
              <p className="text-xs font-medium text-violet-600 uppercase tracking-wide mb-1">프리미엄 결제 수</p>
              <p className="text-2xl font-bold text-violet-700">{Number(company.premium_units ?? 0)}<span className="text-base font-semibold text-violet-600 ml-0.5">개</span></p>
            </div>
          </div>
          {company.trial_ends_at && (
            <div className={`mt-4 rounded-lg px-4 py-3 border ${
              isTrialExpired ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-100'
            }`}>
              <p className={`text-xs font-medium uppercase tracking-wide mb-0.5 ${
                isTrialExpired ? 'text-red-700' : 'text-amber-700'
              }`}>
                무료체험 종료일
              </p>
              <p className={`text-sm font-semibold ${isTrialExpired ? 'text-red-800' : 'text-amber-800'}`}>
                {new Date(company.trial_ends_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              {isTrialExpired && (
                <p className="text-xs text-red-700 mt-1">
                  무료체험 기간이 종료되었습니다. 플랜 변경은 시스템 관리자에게 문의하세요.
                </p>
              )}
            </div>
          )}
          <p className="mt-4 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-slate-400" />
            요금제·결제 수 변경은 시스템 관리자에게 문의하세요.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>

      {/* 비밀번호 변경 섹션 - 별도의 폼으로 분리 */}
      <div className="border-t border-gray-200 pt-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">비밀번호 변경</h3>
            <button
              type="button"
              onClick={() => {
                setShowPasswordChange(!showPasswordChange)
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
                setPasswordError(null)
                setCurrentPasswordError(null)
                setConfirmPasswordError(null)
                setPasswordSuccess(false)
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showPasswordChange ? '취소' : '비밀번호 변경'}
            </button>
          </div>

          {showPasswordChange && (
            <form onSubmit={handlePasswordChange} className="space-y-4 bg-gray-50 p-4 rounded-lg">
              {/* 성공 메시지 - 더 눈에 띄게 표시 */}
              {passwordSuccess && (
                <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-green-800 font-semibold">✓ 비밀번호가 성공적으로 변경되었습니다.</p>
                  </div>
                </div>
              )}

              {/* 에러 메시지 - 더 눈에 띄게 표시 */}
              {passwordError && (
                <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-red-800 font-semibold mb-1">비밀번호 변경 실패</p>
                      <p className="text-red-700 text-sm">{passwordError}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  현재 비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                    // 입력 시 에러 초기화 (재시도)
                    if (currentPasswordError) {
                      setCurrentPasswordError(null)
                    }
                  }}
                  required
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    currentPasswordError
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="현재 비밀번호를 입력하세요"
                />
                {currentPasswordError && (
                  <p className="mt-1 text-sm text-red-600">{currentPasswordError}</p>
                )}
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => handleNewPasswordChange(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="새 비밀번호를 입력하세요 (최소 6자)"
                />
                <p className="mt-1 text-xs text-gray-500">최소 6자 이상 입력해주세요.</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호 확인 <span className="text-red-500">*</span>
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  required
                  minLength={6}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    confirmPasswordError
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="새 비밀번호를 다시 입력하세요"
                />
                {confirmPasswordError && (
                  <p className="mt-1 text-sm text-red-600">{confirmPasswordError}</p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {passwordLoading ? '변경 중...' : '비밀번호 변경'}
                </button>
              </div>
            </form>
          )}
        </div>
    </div>
  )
}

