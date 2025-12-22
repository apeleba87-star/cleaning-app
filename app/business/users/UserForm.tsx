'use client'

import { useState, FormEvent, useEffect } from 'react'
import { User, Store, UserFile } from '@/types/db'
import { DocumentUploader } from '@/components/DocumentUploader'

// UserForm에서 사용하는 최소 필드 타입
type UserFormStore = Pick<Store, 'id' | 'name'>

interface UserFormProps {
  user: User
  stores: UserFormStore[]
  assignedStoreIds?: string[] // 매장 배정 정보
  onSuccess: (user: User) => void
  onCancel: () => void
}

export default function UserForm({ user, stores, assignedStoreIds = [], onSuccess, onCancel }: UserFormProps) {
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone || '')
  const [position, setPosition] = useState(user.position || '') // 직급
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(assignedStoreIds)
  const [salaryDate, setSalaryDate] = useState(user.salary_date?.toString() || '')
  const [salaryAmount, setSalaryAmount] = useState(
    user.salary_amount ? user.salary_amount.toLocaleString('ko-KR') : ''
  )
  const [employmentActive, setEmploymentActive] = useState(user.employment_active ?? true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 탭 상태 (직원이 아니면 기본 정보만 표시)
  const [activeTab, setActiveTab] = useState<'basic' | 'salary' | 'employment' | 'contracts'>('basic')
  
  // 직원이 아닌 경우 기본 정보 탭으로 강제 이동
  useEffect(() => {
    if (user.role !== 'staff' && activeTab !== 'basic') {
      setActiveTab('basic')
    }
  }, [user.role, activeTab])
  
  // 급여 방식/지급 구조
  const [payType, setPayType] = useState<'monthly' | 'contract' | ''>(user.pay_type === 'daily' ? '' : (user.pay_type || ''))
  const [payAmount, setPayAmount] = useState(user.pay_amount?.toString() || '')
  const [salaryPaymentMethod, setSalaryPaymentMethod] = useState(user.salary_payment_method || '')
  const [bankName, setBankName] = useState(user.bank_name || '')
  const [accountNumber, setAccountNumber] = useState(user.account_number || '')
  
  // 근로 상태/기간
  const [hireDate, setHireDate] = useState(user.hire_date ? user.hire_date.split('T')[0] : '')
  const [resignationDate, setResignationDate] = useState(user.resignation_date ? user.resignation_date.split('T')[0] : '')
  const [employmentType, setEmploymentType] = useState(user.employment_type || '')
  
  // 주민등록번호 (민감 정보)
  const [residentRegistrationNumber, setResidentRegistrationNumber] = useState('')
  const [loadingSensitive, setLoadingSensitive] = useState(false)
  
  // 계약서
  const [userFiles, setUserFiles] = useState<UserFile[]>([])
  
  // 매장 ID가 있으면 문서 로드 및 매장 배정 정보 초기화
  useEffect(() => {
    if (user?.id) {
      loadUserFiles()
      loadSensitiveData()
    }
    // 매장 배정 정보가 변경되면 업데이트
    if (assignedStoreIds && assignedStoreIds.length > 0) {
      setSelectedStoreIds(assignedStoreIds)
    } else {
      setSelectedStoreIds([])
    }
  }, [user?.id, assignedStoreIds])
  
  const loadSensitiveData = async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`/api/business/users/${user.id}/sensitive`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data?.resident_registration_number) {
          setResidentRegistrationNumber(data.data.resident_registration_number)
        }
      }
    } catch (err) {
      console.error('Failed to load sensitive data:', err)
    }
  }
  
  const loadUserFiles = async () => {
    if (!user?.id) return
    
    try {
      const filesRes = await fetch(`/api/business/users/${user.id}/files`)
      if (filesRes.ok) {
        const filesData = await filesRes.json()
        if (filesData.success) {
          setUserFiles(filesData.data || [])
        }
      }
    } catch (err) {
      console.error('Failed to load user files:', err)
    }
  }

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

    try {
      const response = await fetch(`/api/business/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
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
        throw new Error(data.error || '수정에 실패했습니다.')
      }

      // 주민등록번호 저장 (월급/도급 선택사항)
      if ((payType === 'monthly' || payType === 'contract') && residentRegistrationNumber) {
        setLoadingSensitive(true)
        try {
          const sensitiveResponse = await fetch(`/api/business/users/${user.id}/sensitive`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resident_registration_number: residentRegistrationNumber,
            }),
          })
          
          if (!sensitiveResponse.ok) {
            const errorData = await sensitiveResponse.json().catch(() => ({ error: 'Unknown error' }))
            throw new Error(errorData.error || '주민등록번호 저장에 실패했습니다.')
          }
        } catch (sensitiveErr: any) {
          console.error('Failed to save sensitive data:', sensitiveErr)
          setError(sensitiveErr.message || '주민등록번호 저장에 실패했습니다.')
          setLoadingSensitive(false)
          return
        } finally {
          setLoadingSensitive(false)
        }
      } else if (payType !== 'monthly' && payType !== 'contract' && residentRegistrationNumber) {
        // 월급/도급이 아닌데 주민등록번호가 있으면 삭제
        try {
          await fetch(`/api/business/users/${user.id}/sensitive`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resident_registration_number: null,
            }),
          })
        } catch (err) {
          console.error('Failed to delete sensitive data:', err)
        }
      }

      onSuccess(data.user)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (url: string, fileName: string, docType: string, fileSize?: number) => {
    if (!user?.id) {
      setError('사용자 ID가 없어 파일을 저장할 수 없습니다.')
      return
    }
    
    try {
      console.log('Saving file to DB:', { userId: user.id, docType, fileName, url, fileSize })
      
      const response = await fetch(`/api/business/users/${user.id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_type: docType,
          file_url: url,
          file_name: fileName,
          file_size: fileSize || null,
        }),
      })
      
      console.log('File save response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('File save error:', errorData)
        throw new Error(errorData.error || `파일 저장 실패: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('File save response data:', data)
      
      if (data.success) {
        setUserFiles([...userFiles, data.data])
        setError(null) // 성공 시 에러 초기화
      } else {
        throw new Error(data.error || '파일 저장에 실패했습니다.')
      }
    } catch (err: any) {
      console.error('Failed to save file:', err)
      setError(err.message || '파일 저장에 실패했습니다.')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">사용자 정보 수정</h2>

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
            // 직원 역할인 경우에만 급여 방식, 근로 상태, 계약서 탭 표시
            ...(user.role === 'staff' ? [
              { id: 'salary', label: '급여 방식' },
              { id: 'employment', label: '근로 상태' },
              { id: 'contracts', label: '계약서' },
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              역할
            </label>
            <input
              id="role"
              type="text"
              value={
                user.role === 'staff' ? '직원' :
                user.role === 'manager' ? '매니저' :
                user.role === 'franchise_manager' ? '프렌차이즈관리자' :
                user.role === 'store_manager' ? '매장관리자(점주)' :
                user.role === 'business_owner' ? '업체관리자' :
                user.role
              }
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
            />
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

        {/* 급여 방식 탭 */}
        {activeTab === 'salary' && (
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
        {activeTab === 'employment' && user.role === 'staff' && (
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

        {/* 계약서 탭 (직원만) */}
        {activeTab === 'contracts' && user.role === 'staff' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">근로계약서</h3>
              <DocumentUploader
                userId={user?.id}
                entity="user"
                docType="employment_contract"
                onUploadComplete={(url, fileName, fileSize) => handleFileUpload(url, fileName, 'employment_contract', fileSize)}
                onUploadError={(error) => setError(error)}
              />
              <div className="mt-2 space-y-2">
                {userFiles.filter(f => f.doc_type === 'employment_contract').map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {file.file_name}
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {payType === 'contract' && (
              <div>
                <h3 className="text-lg font-semibold mb-3">도급계약서</h3>
                <DocumentUploader
                  userId={user?.id}
                  entity="user"
                  docType="subcontract_contract"
                  onUploadComplete={(url, fileName, fileSize) => handleFileUpload(url, fileName, 'subcontract_contract', fileSize)}
                  onUploadError={(error) => setError(error)}
                />
                <div className="mt-2 space-y-2">
                  {userFiles.filter(f => f.doc_type === 'subcontract_contract').map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {file.file_name}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 기본 정보 탭 내용 */}
        {activeTab !== 'basic' && (
          <div className="text-sm text-gray-500 mb-4">
            * 기본 정보는 위의 필드에서 입력하세요
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
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}

