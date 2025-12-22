'use client'

import { useState, FormEvent, useEffect } from 'react'
import { UserRole, Store, Franchise } from '@/types/db'

// CreateUserForm에서 사용하는 최소 필드 타입
type CreateUserFormStore = Pick<Store, 'id' | 'name'>
type CreateUserFormFranchise = Pick<Franchise, 'id' | 'name'>

interface CreateUserFormProps {
  stores: CreateUserFormStore[]
  franchises: CreateUserFormFranchise[]
  companyId: string
  currentUserRole: UserRole
  onSuccess: () => void
  onCancel: () => void
}

export default function CreateUserForm({ stores, franchises, companyId, currentUserRole, onSuccess, onCancel }: CreateUserFormProps) {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('staff')
  const [position, setPosition] = useState('') // 직급
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>('')
  const [phone, setPhone] = useState('')
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([])
  const [employmentContractDate, setEmploymentContractDate] = useState('')
  const [salaryDate, setSalaryDate] = useState('')
  const [salaryAmount, setSalaryAmount] = useState('')
  const [employmentActive, setEmploymentActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 탭 상태
  const [activeTab, setActiveTab] = useState<'basic' | 'salary' | 'employment'>('basic')
  
  // 급여 방식/지급 구조
  const [payType, setPayType] = useState<'monthly' | 'contract' | ''>('')
  const [payAmount, setPayAmount] = useState('')
  const [salaryPaymentMethod, setSalaryPaymentMethod] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  
  // 근로 상태/기간
  const [hireDate, setHireDate] = useState('')
  const [resignationDate, setResignationDate] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  
  // 주민등록번호 (민감 정보, 월급/도급 선택사항)
  const [residentRegistrationNumber, setResidentRegistrationNumber] = useState('')

  // 역할이 franchise_manager일 때 프렌차이즈 선택 필수
  useEffect(() => {
    if (role === 'franchise_manager' && !selectedFranchiseId && franchises.length > 0) {
      // 자동으로 첫 번째 프렌차이즈 선택하지 않음 (사용자가 선택하도록)
    }
  }, [role, selectedFranchiseId, franchises])

  const handleToggleStore = (storeId: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : [...prev, storeId]
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 이메일 형식 검증
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('아이디(이메일)를 입력해주세요.')
      setLoading(false)
      return
    }

    if (!validateEmail(trimmedEmail)) {
      setEmailError('올바른 이메일 주소 형식으로 입력해주세요 (예: user@example.com)')
      setError('아이디는 이메일 주소 형식으로 입력해주세요.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/business/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: password.trim(),
          name: name.trim(),
          role,
          position: position.trim() || null,
          franchise_id: selectedFranchiseId || null,
          phone: phone.trim() || null,
          company_id: companyId,
          salary_date: salaryDate ? parseInt(salaryDate.replace(/[^0-9]/g, '')) : null,
          salary_amount: salaryAmount ? parseFloat(salaryAmount.replace(/[^0-9]/g, '')) : null,
          employment_active: employmentActive,
          store_ids: selectedStoreIds,
          // 재무 관리 필드
          pay_type: payType || null,
          pay_amount: payAmount ? parseFloat(payAmount) : null,
          salary_payment_method: salaryPaymentMethod || null,
          bank_name: bankName.trim() || null,
          account_number: accountNumber.trim() || null,
          hire_date: hireDate || null,
          resignation_date: resignationDate || null,
          employment_type: employmentType || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `사용자 초대에 실패했습니다. (${response.status})`)
      }

      // 주민등록번호 저장 (월급/도급 선택사항, 사용자 생성 후)
      if ((payType === 'monthly' || payType === 'contract') && residentRegistrationNumber && data.user?.id) {
        try {
          const sensitiveResponse = await fetch(`/api/business/users/${data.user.id}/sensitive`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resident_registration_number: residentRegistrationNumber,
            }),
          })
          
          if (!sensitiveResponse.ok) {
            const errorData = await sensitiveResponse.json().catch(() => ({ error: 'Unknown error' }))
            console.error('주민등록번호 저장 실패:', errorData)
            // 주민등록번호 저장 실패해도 사용자 생성은 성공했으므로 경고만 표시
            setError(`사용자는 생성되었지만 주민등록번호 저장에 실패했습니다: ${errorData.error || 'Unknown error'}`)
          }
        } catch (sensitiveErr: any) {
          console.error('Failed to save sensitive data:', sensitiveErr)
          setError(`사용자는 생성되었지만 주민등록번호 저장에 실패했습니다: ${sensitiveErr.message}`)
        }
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">새 사용자 초대</h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* 탭 메뉴 */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex space-x-4">
          {[
            { id: 'basic', label: '기본 정보' },
            // 직원 역할인 경우에만 급여 방식, 근로 상태 탭 표시
            ...(role === 'staff' ? [
              { id: 'salary', label: '급여 방식' },
              { id: 'employment', label: '근로 상태' },
            ] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 기본 정보 탭 내용 */}
        {activeTab === 'basic' && (
          <>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            아이디 <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            onBlur={() => {
              // 포커스가 벗어날 때 검증
              if (email.trim() && !validateEmail(email)) {
                setEmailError('올바른 이메일 주소 형식으로 입력해주세요 (예: user@example.com)')
              }
            }}
            required
            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              emailError
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="이메일 주소 형식으로 입력하세요 (예: user@example.com)"
            pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
            title="올바른 이메일 주소 형식으로 입력해주세요 (예: user@example.com)"
          />
          {emailError ? (
            <p className="mt-1 text-xs text-red-600">
              {emailError}
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              아이디는 이메일 주소 형식으로 입력해주세요
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호 <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="비밀번호를 입력하세요 (최소 6자)"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="이름을 입력하세요"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              역할 <span className="text-red-500">*</span>
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value as UserRole)
                // 역할 변경 시 프렌차이즈 선택 초기화
                if (e.target.value !== 'franchise_manager') {
                  setSelectedFranchiseId('')
                }
              }}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="staff">직원</option>
              <option value="manager">매니저</option>
              <option value="franchise_manager">프렌차이즈관리자</option>
              <option value="store_manager">매장관리자(점주)</option>
            </select>
          </div>

          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
              직급
            </label>
            <input
              id="position"
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="직급을 입력하세요 (예: 대리, 과장, 차장 등)"
            />
          </div>

          {(role === 'franchise_manager' || role === 'store_manager') && (
            <div>
              <label htmlFor="franchise" className="block text-sm font-medium text-gray-700 mb-1">
                프렌차이즈 {role === 'franchise_manager' && <span className="text-red-500">*</span>}
              </label>
              <select
                id="franchise"
                value={selectedFranchiseId}
                onChange={(e) => setSelectedFranchiseId(e.target.value)}
                required={role === 'franchise_manager'}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">프렌차이즈 선택</option>
                {franchises.map((franchise) => (
                  <option key={franchise.id} value={franchise.id}>
                    {franchise.name}
                  </option>
                ))}
              </select>
              {franchises.length === 0 && (
                <p className="mt-1 text-xs text-red-500">먼저 프렌차이즈를 등록해주세요.</p>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            전화번호
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="전화번호를 입력하세요"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            배정 매장
          </label>
          <div className="border border-gray-300 rounded-md p-4 max-h-60 overflow-y-auto">
            {stores.length === 0 ? (
              <p className="text-gray-500 text-sm">등록된 매장이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {stores.map((store) => (
                  <label
                    key={store.id}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStoreIds.includes(store.id)}
                      onChange={() => handleToggleStore(store.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{store.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {selectedStoreIds.length}개 매장이 선택되었습니다.
          </p>
        </div>

          </>
        )}

        {/* 급여 방식 탭 (직원만) */}
        {activeTab === 'salary' && role === 'staff' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="pay_type" className="block text-sm font-medium text-gray-700 mb-1">
                급여 형태
              </label>
              <select
                id="pay_type"
                value={payType}
                onChange={(e) => setPayType(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택하세요</option>
                <option value="monthly">월급</option>
                <option value="contract">도급</option>
              </select>
            </div>

            <div>
              <label htmlFor="salary_date" className="block text-sm font-medium text-gray-700 mb-1">
                급여일
              </label>
              <div className="flex items-center space-x-2">
                <input
                  id="salary_date"
                  type="number"
                  min="1"
                  max="31"
                  value={salaryDate}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '')
                    if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 31)) {
                      setSalaryDate(value)
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1-31"
                />
                <span className="text-sm text-gray-600">일</span>
              </div>
              {salaryDate && (
                <p className="mt-1 text-xs text-gray-500">
                  매월 {salaryDate}일에 급여 지급
                </p>
              )}
            </div>

            {payType === 'monthly' && (
              <>
                <div>
                  <label htmlFor="pay_amount" className="block text-sm font-medium text-gray-700 mb-1">
                    월급 금액
                  </label>
                  <input
                    id="pay_amount"
                    type="number"
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="월급 금액을 입력하세요"
                  />
                </div>
                <div>
                  <label htmlFor="resident_registration_number" className="block text-sm font-medium text-gray-700 mb-1">
                    주민등록번호
                    <span className="ml-2 text-xs text-gray-500">(선택사항, 세금 처리를 위해 필요할 수 있음)</span>
                  </label>
                  <input
                    id="resident_registration_number"
                    type="text"
                    value={residentRegistrationNumber}
                    onChange={(e) => {
                      // 하이픈 자동 추가 및 숫자만 입력
                      const value = e.target.value.replace(/[^0-9]/g, '')
                      if (value.length <= 13) {
                        let formatted = value
                        if (value.length > 6) {
                          formatted = `${value.substring(0, 6)}-${value.substring(6)}`
                        }
                        setResidentRegistrationNumber(formatted)
                      }
                    }}
                    placeholder="900101-1234567"
                    maxLength={14}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    ⚠️ 주민등록번호는 암호화되어 안전하게 저장됩니다.
                  </p>
                </div>
              </>
            )}

            {payType === 'contract' && (
              <>
                <div>
                  <label htmlFor="pay_amount" className="block text-sm font-medium text-gray-700 mb-1">
                    도급 금액
                  </label>
                  <input
                    id="pay_amount"
                    type="number"
                    step="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="도급 금액을 입력하세요"
                  />
                </div>
                <div>
                  <label htmlFor="resident_registration_number" className="block text-sm font-medium text-gray-700 mb-1">
                    주민등록번호
                    <span className="ml-2 text-xs text-gray-500">(선택사항, 세금 처리를 위해 필요할 수 있음)</span>
                  </label>
                  <input
                    id="resident_registration_number"
                    type="text"
                    value={residentRegistrationNumber}
                    onChange={(e) => {
                      // 하이픈 자동 추가 및 숫자만 입력
                      const value = e.target.value.replace(/[^0-9]/g, '')
                      if (value.length <= 13) {
                        let formatted = value
                        if (value.length > 6) {
                          formatted = `${value.substring(0, 6)}-${value.substring(6)}`
                        }
                        setResidentRegistrationNumber(formatted)
                      }
                    }}
                    placeholder="900101-1234567"
                    maxLength={14}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    ⚠️ 주민등록번호는 암호화되어 안전하게 저장됩니다.
                  </p>
                </div>
              </>
            )}

            <div>
              <label htmlFor="salary_payment_method" className="block text-sm font-medium text-gray-700 mb-1">
                급여 지급 방식
              </label>
              <select
                id="salary_payment_method"
                value={salaryPaymentMethod}
                onChange={(e) => setSalaryPaymentMethod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택하세요</option>
                <option value="account_transfer">계좌이체</option>
                <option value="cash">현금</option>
                <option value="other">기타</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700 mb-1">
                  은행명
                </label>
                <input
                  id="bank_name"
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="은행명"
                />
              </div>
              <div>
                <label htmlFor="account_number" className="block text-sm font-medium text-gray-700 mb-1">
                  계좌번호
                </label>
                <input
                  id="account_number"
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="계좌번호"
                />
              </div>
            </div>
          </div>
        )}

        {/* 근로 상태 탭 (직원만) */}
        {activeTab === 'employment' && role === 'staff' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                근무 여부 <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setEmploymentActive(true)
                    setResignationDate('')
                  }}
                  className={`flex-1 px-4 py-3 rounded-md border-2 font-medium transition-colors ${
                    employmentActive
                      ? 'bg-green-50 border-green-500 text-green-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  근무중
                </button>
                <button
                  type="button"
                  onClick={() => setEmploymentActive(false)}
                  className={`flex-1 px-4 py-3 rounded-md border-2 font-medium transition-colors ${
                    !employmentActive
                      ? 'bg-red-50 border-red-500 text-red-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  퇴사
                </button>
              </div>
            </div>

            {!employmentActive && (
              <div>
                <label htmlFor="resignation_date" className="block text-sm font-medium text-gray-700 mb-1">
                  퇴사일 <span className="text-red-500">*</span>
                </label>
                <input
                  id="resignation_date"
                  type="date"
                  value={resignationDate}
                  onChange={(e) => setResignationDate(e.target.value)}
                  required={!employmentActive}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label htmlFor="hire_date" className="block text-sm font-medium text-gray-700 mb-1">
                입사일
              </label>
              <input
                id="hire_date"
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="employment_type" className="block text-sm font-medium text-gray-700 mb-1">
                고용 형태
              </label>
              <select
                id="employment_type"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택하세요</option>
                <option value="regular">정규</option>
                <option value="daily">일당</option>
                <option value="contract">도급</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '초대 중...' : '초대'}
          </button>
        </div>
      </form>
    </div>
  )
}

