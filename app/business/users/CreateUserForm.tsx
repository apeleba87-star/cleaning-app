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
  /** 프리미엄 결제 수 (1 이상이면 프렌차이즈 선택·매장관리자 역할 사용 가능) */
  premiumUnits?: number
  onSuccess: () => void
  onCancel: () => void
}

// 이메일 형식 검증 함수
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export default function CreateUserForm({ stores, franchises, companyId, currentUserRole, premiumUnits = 0, onSuccess, onCancel }: CreateUserFormProps) {
  const hasPremium = premiumUnits >= 1
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('staff')
  const [position, setPosition] = useState('') // 직급
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>('')
  const [phone, setPhone] = useState('')
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([])
  const [storeSearchTerm, setStoreSearchTerm] = useState('')
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
  
  // 주민등록번호 (민감 정보, 월급/도급(개인) 선택사항)
  const [residentRegistrationNumber, setResidentRegistrationNumber] = useState('')
  
  // 사업자등록번호 (도급(업체) 선택사항)
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState('')

  // 역할이 franchise_manager일 때 프렌차이즈 선택 필수
  useEffect(() => {
    if (role === 'franchise_manager' && !selectedFranchiseId && franchises.length > 0) {
      // 자동으로 첫 번째 프렌차이즈 선택하지 않음 (사용자가 선택하도록)
    }
  }, [role, selectedFranchiseId, franchises])

  // 프리미엄 미사용 시 매장관리자(점주)·프렌차이즈관리자 선택 불가 — 다른 역할로 초기화
  useEffect(() => {
    if (!hasPremium && (role === 'store_manager' || role === 'franchise_manager')) {
      setRole('staff')
    }
  }, [hasPremium, role])

  const handleToggleStore = (storeId: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId)
        ? prev.filter((id) => id !== storeId)
        : [...prev, storeId]
    )
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    // 이메일 에러 초기화
    if (emailError) {
      setEmailError(null)
    }
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
          // 도급 관련 필드
          business_registration_number: role === 'subcontract_company' ? businessRegistrationNumber.trim() || null : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `사용자 초대에 실패했습니다. (${response.status})`)
      }

      // 주민등록번호 저장 (월급/도급(개인) 선택사항, 사용자 생성 후)
      if ((role === 'subcontract_individual' || payType === 'monthly' || payType === 'contract') && residentRegistrationNumber && data.user?.id) {
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
            // 직원 또는 도급 역할인 경우 급여 방식, 근로 상태 탭 표시
            ...((role === 'staff' || role === 'subcontract_individual' || role === 'subcontract_company') ? [
              { id: 'salary', label: '급여 방식' },
              { id: 'employment', label: '근로 상태' },
            ] : []),
          ].map((tab, index) => (
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
              {index + 1} {tab.label}
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
                const val = e.target.value as UserRole
                if (!hasPremium && (val === 'store_manager' || val === 'franchise_manager')) return
                setRole(val)
                // 역할 변경 시 프렌차이즈 선택 초기화
                if (val !== 'franchise_manager') {
                  setSelectedFranchiseId('')
                }
                // 도급 역할이 아니면 도급 관련 필드 초기화
                if (val !== 'subcontract_individual' && val !== 'subcontract_company') {
                  setResidentRegistrationNumber('')
                  setBusinessRegistrationNumber('')
                  setPayAmount('')
                }
              }}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="staff">직원</option>
              {hasPremium ? (
                <option value="franchise_manager">프렌차이즈관리자</option>
              ) : (
                <option value="franchise_manager" disabled>프렌차이즈관리자 — 프리미엄</option>
              )}
              {hasPremium ? (
                <option value="store_manager">매장관리자(점주)</option>
              ) : (
                <option value="store_manager" disabled>매장관리자(점주) — 프리미엄</option>
              )}
              <option value="subcontract_individual">도급(개인)</option>
              <option value="subcontract_company">도급(업체)</option>
            </select>
            {!hasPremium && (
              <p className="mt-1 text-xs text-gray-500">프렌차이즈관리자·매장관리자(점주)는 프리미엄 버전에서 사용 가능합니다.</p>
            )}
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
                프렌차이즈 {role === 'franchise_manager' && hasPremium && <span className="text-red-500">*</span>}
              </label>
              {hasPremium ? (
                <>
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
                </>
              ) : (
                <>
                  <div className="w-full px-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 text-sm">
                    프리미엄 버전 사용 가능
                  </div>
                  <p className="mt-1 text-xs text-gray-500">프렌차이즈 선택은 프리미엄 버전에서 가능합니다.</p>
                </>
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
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              배정 매장
            </label>
            <div className="flex-1 max-w-xs ml-4">
              <input
                type="text"
                value={storeSearchTerm}
                onChange={(e) => setStoreSearchTerm(e.target.value)}
                placeholder="매장명으로 검색..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="border border-gray-300 rounded-md p-4 max-h-60 overflow-y-auto">
            {(() => {
              const filteredStores = stores.filter(store => 
                !storeSearchTerm || store.name.toLowerCase().includes(storeSearchTerm.toLowerCase())
              )
              
              if (filteredStores.length === 0) {
                return (
                  <p className="text-gray-500 text-sm">
                    {storeSearchTerm ? '검색 결과가 없습니다.' : '등록된 매장이 없습니다.'}
                  </p>
                )
              }
              
              return (
                <div className="space-y-2">
                  {filteredStores.map((store) => (
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
              )
            })()}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {selectedStoreIds.length}개 매장이 선택되었습니다.
          </p>
        </div>

          </>
        )}

        {/* 급여 방식 탭 (직원 및 도급 역할) */}
        {activeTab === 'salary' && (role === 'staff' || role === 'subcontract_individual' || role === 'subcontract_company') && (
          <div className="space-y-4">
            {/* 직원 역할인 경우만 급여 형태 선택 */}
            {role === 'staff' && (
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
            )}

            {/* 도급(개인) 역할인 경우 도급 관련 필드 */}
            {role === 'subcontract_individual' && (
              <>
                <div>
                  <label htmlFor="pay_amount_subcontract_individual" className="block text-sm font-medium text-gray-700 mb-1">
                    월 도급금액 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="pay_amount_subcontract_individual"
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="월 도급금액을 입력하세요"
                  />
                </div>
                <div>
                  <label htmlFor="resident_registration_number_subcontract_individual" className="block text-sm font-medium text-gray-700 mb-1">
                    주민등록번호
                    <span className="ml-2 text-xs text-gray-500">(선택사항, 세금 처리를 위해 필요할 수 있음)</span>
                  </label>
                  <input
                    id="resident_registration_number_subcontract_individual"
                    type="text"
                    value={residentRegistrationNumber}
                    onChange={(e) => {
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

            {/* 도급(업체) 역할인 경우 도급 관련 필드 */}
            {role === 'subcontract_company' && (
              <>
                <div>
                  <label htmlFor="pay_amount_subcontract_company" className="block text-sm font-medium text-gray-700 mb-1">
                    월 도급금액 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="pay_amount_subcontract_company"
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="월 도급금액을 입력하세요"
                  />
                </div>
                <div>
                  <label htmlFor="business_registration_number_subcontract" className="block text-sm font-medium text-gray-700 mb-1">
                    사업자등록번호
                    <span className="ml-2 text-xs text-gray-500">(선택사항, 세금 처리를 위해 필요할 수 있음)</span>
                  </label>
                  <input
                    id="business_registration_number_subcontract"
                    type="text"
                    value={businessRegistrationNumber}
                    onChange={(e) => {
                      // 숫자만 추출
                      const numbers = e.target.value.replace(/[^0-9]/g, '')
                      if (numbers.length <= 10) {
                        let formatted = numbers
                        // 하이픈 자동 추가: 123-45-67890 형식
                        if (numbers.length > 3) {
                          formatted = `${numbers.substring(0, 3)}-${numbers.substring(3)}`
                        }
                        if (numbers.length > 5) {
                          formatted = `${numbers.substring(0, 3)}-${numbers.substring(3, 5)}-${numbers.substring(5)}`
                        }
                        setBusinessRegistrationNumber(formatted)
                      }
                    }}
                    placeholder="123-45-67890"
                    maxLength={13}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="business_registration_file" className="block text-sm font-medium text-gray-700 mb-1">
                    사업자등록증 업로드
                    <span className="ml-2 text-xs text-gray-500">(선택사항)</span>
                  </label>
                  <input
                    id="business_registration_file"
                    type="file"
                    accept="image/*,.pdf"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    사업자등록증 이미지 또는 PDF 파일을 업로드할 수 있습니다.
                  </p>
                </div>
              </>
            )}

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

        {/* 근로 상태 탭 (직원 및 도급 역할) */}
        {activeTab === 'employment' && (role === 'staff' || role === 'subcontract_individual' || role === 'subcontract_company') && (
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

        <div className="flex flex-wrap items-center gap-2 pt-4">
          <div className="flex flex-wrap gap-2 order-2 sm:order-1">
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
          {error && (
            <p className="order-1 sm:order-2 text-red-600 text-sm flex-1 min-w-0 sm:max-w-md sm:ml-2">
              {error}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}

