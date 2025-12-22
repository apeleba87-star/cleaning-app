'use client'

import { useState, FormEvent, useEffect } from 'react'
import { Store, Franchise, CategoryTemplate, StoreContact, StoreFile } from '@/types/db'
import { DocumentUploader } from '@/components/DocumentUploader'

// StoreForm에서 사용하는 최소 필드 타입
type StoreFormFranchise = Pick<Franchise, 'id' | 'name'>
type StoreFormCategoryTemplate = Pick<CategoryTemplate, 'id' | 'name' | 'category'>

interface StoreFormProps {
  store: Store | null
  franchises: StoreFormFranchise[]
  categoryTemplates: StoreFormCategoryTemplate[]
  companyId: string
  onSuccess: (store: Store) => void
  onCancel: () => void
  basePath?: string // 기본 경로 (예: '/business' 또는 '/franchise')
}

export default function StoreForm({ store, franchises, categoryTemplates, companyId, onSuccess, onCancel, basePath = '/business' }: StoreFormProps) {
  const [parentStoreName, setParentStoreName] = useState(store?.parent_store_name || '')
  const [name, setName] = useState(store?.name || '')
  const [selectedFranchiseId, setSelectedFranchiseId] = useState(store?.franchise_id || '')
  const [address, setAddress] = useState(store?.address || '')
  // 관리 요일: 기존 데이터 파싱 (쉼표로 구분된 문자열)
  const parseManagementDays = (daysStr: string | null): string[] => {
    if (!daysStr) return []
    return daysStr.split(',').map(d => d.trim()).filter(d => d.length > 0)
  }
  const [selectedDays, setSelectedDays] = useState<string[]>(
    parseManagementDays(store?.management_days || '')
  )
  const [serviceAmount, setServiceAmount] = useState(store?.service_amount?.toString() || '')
  const [category, setCategory] = useState(store?.category || '')
  // 카테고리 템플릿 선택 상태
  const [selectedCategoryTemplateId, setSelectedCategoryTemplateId] = useState<string>('')
  const [contractStartDate, setContractStartDate] = useState(
    store?.contract_start_date ? store.contract_start_date.split('T')[0] : ''
  )
  const [contractEndDate, setContractEndDate] = useState(
    store?.contract_end_date ? store.contract_end_date.split('T')[0] : ''
  )
  const [serviceActive, setServiceActive] = useState(store?.service_active ?? true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 탭 상태
  const [activeTab, setActiveTab] = useState<'basic' | 'payment' | 'contacts' | 'documents' | 'notes'>('basic')
  
  // 결제/정산 정보
  const [paymentMethod, setPaymentMethod] = useState(store?.payment_method || '')
  const [settlementCycle, setSettlementCycle] = useState(store?.settlement_cycle || '')
  const [paymentDay, setPaymentDay] = useState(store?.payment_day?.toString() || '')
  const [taxInvoiceRequired, setTaxInvoiceRequired] = useState(store?.tax_invoice_required ?? false)
  const [unpaidTrackingEnabled, setUnpaidTrackingEnabled] = useState(store?.unpaid_tracking_enabled ?? false)
  const [billingMemo, setBillingMemo] = useState(store?.billing_memo || '')
  
  // 거래처 담당자 (최대 3개)
  const [contacts, setContacts] = useState<StoreContact[]>([])
  const [contactList, setContactList] = useState<Array<{ name: string; phone: string; position: string; role: string }>>([
    { name: '', phone: '', position: '', role: 'main' }
  ])
  const [contactMemo, setContactMemo] = useState('')
  
  // 문서 관리
  const [storeFiles, setStoreFiles] = useState<StoreFile[]>([])
  const [businessRegistrationFiles, setBusinessRegistrationFiles] = useState<StoreFile[]>([])
  // 새 매장 추가 시 임시로 저장된 파일들 (매장 저장 후 연결)
  const [pendingFiles, setPendingFiles] = useState<Array<{ url: string; fileName: string; docType: string }>>([])
  
  // 운영 메모
  const [specialNotes, setSpecialNotes] = useState(store?.special_notes || '')
  const [accessInfo, setAccessInfo] = useState(store?.access_info || '')
  
  // 매장 ID가 있으면 담당자와 문서 로드
  useEffect(() => {
    if (store?.id) {
      loadStoreData()
    }
  }, [store?.id])
  
  const loadStoreData = async () => {
    if (!store?.id) return
    
    try {
      // 담당자 로드
      const contactsRes = await fetch(`/api/business/stores/${store.id}/contacts`)
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json()
        if (contactsData.success) {
          setContacts(contactsData.data || [])
          // 담당자 분류
          // 담당자 목록 초기화
          if (contactsData.data && contactsData.data.length > 0) {
            const contactArray = contactsData.data.map((c: StoreContact) => ({
              name: c.name || '',
              phone: c.phone || '',
              position: c.position || '',
              role: c.contact_role || 'main'
            }))
            setContactList(contactArray.length > 0 ? contactArray : [{ name: '', phone: '', position: '', role: 'main' }])
          }
        }
      }
      
      // 문서 로드
      const filesRes = await fetch(`/api/business/stores/${store.id}/files`)
      if (filesRes.ok) {
        const filesData = await filesRes.json()
        if (filesData.success) {
          const allFiles = filesData.data || []
          setStoreFiles(allFiles.filter((f: StoreFile) => f.doc_type === 'service_contract'))
          setBusinessRegistrationFiles(allFiles.filter((f: StoreFile) => f.doc_type === 'business_registration'))
        }
      }
    } catch (err) {
      console.error('Failed to load store data:', err)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const apiPath = basePath === '/franchise' ? '/api/franchise' : '/api/business'
      const url = store
        ? `${apiPath}/stores/${store.id}`
        : `${apiPath}/stores`
      const method = store ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          franchise_id: selectedFranchiseId || null,
          parent_store_name: parentStoreName.trim() || null,
          name: name.trim(),
          address: address.trim() || null,
          management_days: selectedDays.length > 0 ? selectedDays.join(',') : null,
          service_amount: serviceAmount ? parseFloat(serviceAmount) : null,
          category: category.trim() || null,
          contract_start_date: contractStartDate || null,
          contract_end_date: contractEndDate || null,
          service_active: serviceActive,
          // 재무 관리 필드
          payment_method: paymentMethod || null,
          settlement_cycle: settlementCycle || null,
          payment_day: paymentDay ? parseInt(paymentDay) : null,
          tax_invoice_required: taxInvoiceRequired,
          unpaid_tracking_enabled: unpaidTrackingEnabled,
          billing_memo: billingMemo.trim() || null,
          special_notes: specialNotes.trim() || null,
          access_info: accessInfo.trim() || null,
        }),
      })

      // 응답이 비어있는지 확인
      const text = await response.text()
      if (!text) {
        throw new Error('서버 응답이 없습니다.')
      }

      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        throw new Error(`서버 응답 파싱 오류: ${text}`)
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || '저장에 실패했습니다.')
      }

      // 응답 형식 확인
      const updatedStore = data.store || data.data
      if (!updatedStore) {
        throw new Error('저장된 매장 정보를 받을 수 없습니다.')
      }

      // 담당자 저장
      if (store?.id || updatedStore.id) {
        await saveContacts(store?.id || updatedStore.id)
      }

      // 새 매장 추가 시 임시 파일들을 DB에 연결
      if (!store?.id && updatedStore.id) {
        await savePendingFiles(updatedStore.id)
      }

      onSuccess(updatedStore)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const saveContacts = async (storeId: string) => {
    try {
      const contactsToSave = contactList
        .filter(c => c.name.trim() !== '')
        .map((c, index) => ({
          store_id: storeId,
          name: c.name,
          phone: c.phone,
          position: c.position,
          contact_role: index === 0 ? 'main' : index === 1 ? 'payment' : 'extra',
        }))
      
      if (contactsToSave.length > 0) {
        await fetch(`/api/business/stores/${storeId}/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: contactsToSave }),
        })
      }
    } catch (err) {
      console.error('Failed to save contacts:', err)
    }
  }

  const handleFileUpload = async (url: string, fileName: string, docType: string) => {
    // 새 매장 추가 시에는 임시 저장 (매장 저장 후 연결)
    if (!store?.id) {
      console.log('New store: Saving file temporarily', { url, fileName, docType })
      setPendingFiles([...pendingFiles, { url, fileName, docType }])
      
      // UI에 임시 파일 표시
      const tempFile = {
        id: `temp-${Date.now()}`,
        file_url: url,
        file_name: fileName,
        doc_type: docType,
      } as StoreFile
      
      if (docType === 'business_registration') {
        setBusinessRegistrationFiles([...businessRegistrationFiles, tempFile])
      } else {
        setStoreFiles([...storeFiles, tempFile])
      }
      return
    }
    
    // 기존 매장 수정 시에는 즉시 저장
    try {
      console.log('Calling API to save file:', { storeId: store.id, docType, fileName })
      
      const response = await fetch(`/api/business/stores/${store.id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_type: docType,
          file_url: url,
          file_name: fileName,
        }),
      })
      
      console.log('API response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API error response:', errorData)
        throw new Error(errorData.error || `서버 오류: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('API response data:', data)
      
      if (data.success) {
        if (docType === 'business_registration') {
          setBusinessRegistrationFiles([...businessRegistrationFiles, data.data])
        } else {
          setStoreFiles([...storeFiles, data.data])
        }
      } else {
        throw new Error(data.error || '파일 저장에 실패했습니다.')
      }
    } catch (err: any) {
      console.error('Failed to save file:', err)
      setError(err.message || '파일 저장에 실패했습니다.')
    }
  }
  
  // 매장 저장 후 임시 파일들을 DB에 연결
  const savePendingFiles = async (storeId: string) => {
    if (pendingFiles.length === 0) return
    
    try {
      for (const file of pendingFiles) {
        const response = await fetch(`/api/business/stores/${storeId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doc_type: file.docType,
            file_url: file.url,
            file_name: file.fileName,
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            // 임시 파일을 실제 파일로 교체
            if (file.docType === 'business_registration') {
              setBusinessRegistrationFiles(prev => 
                prev.map(f => f.id?.startsWith('temp-') && f.file_url === file.url ? data.data : f)
              )
            } else {
              setStoreFiles(prev => 
                prev.map(f => f.id?.startsWith('temp-') && f.file_url === file.url ? data.data : f)
              )
            }
          }
        }
      }
      
      // 임시 파일 목록 초기화
      setPendingFiles([])
    } catch (err) {
      console.error('Failed to save pending files:', err)
      // 오류가 발생해도 계속 진행 (파일은 나중에 수동으로 연결 가능)
    }
  }

  const handleFileDelete = async (fileId: string, docType: string) => {
    // 임시 파일(temp-로 시작)인 경우 바로 UI에서 제거
    if (fileId.startsWith('temp-')) {
      if (docType === 'business_registration') {
        setBusinessRegistrationFiles(businessRegistrationFiles.filter(f => f.id !== fileId))
        // pendingFiles에서도 제거
        setPendingFiles(pendingFiles.filter(f => {
          const tempId = `temp-${Date.now()}`
          return tempId !== fileId
        }))
      } else {
        setStoreFiles(storeFiles.filter(f => f.id !== fileId))
      }
      return
    }
    
    // 기존 매장의 파일 삭제
    if (!store?.id) {
      console.error('Store ID is missing, cannot delete file')
      setError('매장 정보가 없어 파일을 삭제할 수 없습니다.')
      return
    }
    
    try {
      console.log('Deleting file:', { fileId, docType, storeId: store.id })
      
      const response = await fetch(`/api/business/stores/${store.id}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId }),
      })
      
      console.log('Delete API response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Delete API error:', errorData)
        throw new Error(errorData.error || `삭제 실패: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Delete API response data:', data)
      
      if (data.success) {
        if (docType === 'business_registration') {
          setBusinessRegistrationFiles(businessRegistrationFiles.filter(f => f.id !== fileId))
        } else {
          setStoreFiles(storeFiles.filter(f => f.id !== fileId))
        }
      } else {
        throw new Error(data.error || '파일 삭제에 실패했습니다.')
      }
    } catch (err: any) {
      console.error('Failed to delete file:', err)
      setError(err.message || '파일 삭제에 실패했습니다.')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">
        {store ? '매장 수정' : '새 매장 추가'}
      </h2>

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
            { id: 'payment', label: '결제/정산' },
            { id: 'contacts', label: '거래처 담당자' },
            { id: 'documents', label: '계약/문서' },
            { id: 'notes', label: '운영 메모' },
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
          <label htmlFor="franchise" className="block text-sm font-medium text-gray-700 mb-1">
            프렌차이즈
          </label>
          <select
            id="franchise"
            value={selectedFranchiseId}
            onChange={(e) => setSelectedFranchiseId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">프렌차이즈 선택 (선택사항)</option>
            {franchises.map((franchise) => (
              <option key={franchise.id} value={franchise.id}>
                {franchise.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="parent_store_name" className="block text-sm font-medium text-gray-700 mb-1">
            상위매장명
          </label>
          <input
            id="parent_store_name"
            type="text"
            value={parentStoreName}
            onChange={(e) => setParentStoreName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="예: 청주1, 청주3"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            매장명 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="매장명을 입력하세요"
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
            placeholder="주소를 입력하세요"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            관리 요일
          </label>
          <div className="flex flex-wrap gap-2">
            {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => {
                  setSelectedDays((prev) =>
                    prev.includes(day)
                      ? prev.filter((d) => d !== day)
                      : [...prev, day]
                  )
                }}
                className={`px-4 py-2 rounded-md border transition-colors ${
                  selectedDays.includes(day)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          {selectedDays.length > 0 && (
            <p className="mt-2 text-sm text-gray-500">
              선택된 요일: {selectedDays.join(', ')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="category_template" className="block text-sm font-medium text-gray-700 mb-1">
            카테고리 템플릿
          </label>
          <select
            id="category_template"
            value={selectedCategoryTemplateId}
            onChange={(e) => {
              setSelectedCategoryTemplateId(e.target.value)
              const template = categoryTemplates.find(t => t.id === e.target.value)
              if (template) {
                setCategory(template.category)
              } else {
                // 템플릿 선택 해제 시 카테고리 초기화하지 않음 (사용자가 수정했을 수 있음)
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
          >
            <option value="">템플릿 선택 (선택사항)</option>
            {categoryTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.category})
              </option>
            ))}
          </select>
          {categoryTemplates.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">
              템플릿이 없습니다.{' '}
              <a
                href="/business/category-templates"
                target="_blank"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                카테고리 템플릿 관리
              </a>
              에서 템플릿을 먼저 생성하세요.
            </p>
          )}
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1 mt-2">
            카테고리
          </label>
          <input
            id="category"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="예: 무인매장, 서울형키즈카페"
          />
          {selectedCategoryTemplateId && (
            <p className="mt-1 text-xs text-blue-600">
              템플릿에서 카테고리가 자동으로 채워졌습니다. 필요시 수정할 수 있습니다.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="contract_start_date" className="block text-sm font-medium text-gray-700 mb-1">
            계약시작일
          </label>
          <input
            id="contract_start_date"
            type="date"
            value={contractStartDate}
            onChange={(e) => setContractStartDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={serviceActive}
              onChange={(e) => setServiceActive(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">서비스 진행 여부</span>
          </label>
        </div>
          </>
        )}

        {/* 결제/정산 정보 탭 */}
        {activeTab === 'payment' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="service_amount" className="block text-sm font-medium text-gray-700 mb-1">
                서비스 금액
              </label>
              <div className="relative">
                <input
                  id="service_amount"
                  type="text"
                  value={serviceAmount ? Number(serviceAmount).toLocaleString('ko-KR') : ''}
                  onChange={(e) => {
                    // 숫자만 추출 (쉼표 제거)
                    const numericValue = e.target.value.replace(/[^0-9]/g, '')
                    setServiceAmount(numericValue)
                  }}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="서비스 금액을 입력하세요"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                  원
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 mb-1">
                결제방식
              </label>
              <select
                id="payment_method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택하세요</option>
                <option value="auto_payment">자동결제</option>
                <option value="account_transfer">계좌이체</option>
                <option value="card">카드</option>
                <option value="cash">현금</option>
                <option value="other">기타</option>
              </select>
              {paymentMethod === 'auto_payment' && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800 mb-1">
                    💡 매월 자동으로 결제됩니다. 입금 확인이 필요 없습니다.
                  </p>
                  <p className="text-xs text-blue-600">
                    ⚠️ 시스템 누락 시 수동 확인이 필요할 수 있습니다.
                  </p>
                </div>
              )}
              {paymentMethod && paymentMethod !== 'auto_payment' && paymentMethod !== '' && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="text-sm text-gray-700">
                    💡 매번 입금 확인이 필요합니다.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="settlement_cycle" className="block text-sm font-medium text-gray-700 mb-1">
                정산주기
              </label>
              <select
                id="settlement_cycle"
                value={settlementCycle}
                onChange={(e) => setSettlementCycle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택하세요</option>
                <option value="monthly">매월</option>
                <option value="weekly">매주</option>
                <option value="per_case">1회성</option>
              </select>
            </div>

            <div>
              <label htmlFor="payment_day" className="block text-sm font-medium text-gray-700 mb-1">
                결제일
              </label>
              <div className="relative">
                <input
                  id="payment_day"
                  type="number"
                  min="1"
                  max="31"
                  value={paymentDay}
                  onChange={(e) => setPaymentDay(e.target.value)}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1-31"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                  일
                </div>
              </div>
              {paymentDay && (
                <p className="mt-1 text-sm text-gray-600">
                  매월 {paymentDay}일
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">세금계산서 발행 여부</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setTaxInvoiceRequired(true)}
                    className={`px-4 py-2 rounded-md border transition-colors ${
                      taxInvoiceRequired
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    발행
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxInvoiceRequired(false)}
                    className={`px-4 py-2 rounded-md border transition-colors ${
                      !taxInvoiceRequired
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    미발행
                  </button>
                </div>
              </div>
              
              <div>
                <label className="flex items-center space-x-3 mb-2">
                  <input
                    type="checkbox"
                    checked={unpaidTrackingEnabled}
                    onChange={(e) => setUnpaidTrackingEnabled(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-base font-medium text-gray-700">미수금 추적 사용</span>
                </label>
                <p className="text-xs text-gray-500 ml-8">
                  이 매장의 미수금(미납 청구금액)을 추적하고 관리합니다. 활성화 시 대시보드에서 미수금 현황을 확인할 수 있습니다.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                사업자등록증
              </label>
              <DocumentUploader
                storeId={store?.id}
                entity="store"
                docType="business_registration"
                onUploadComplete={(url, fileName) => handleFileUpload(url, fileName, 'business_registration')}
                onUploadError={(error) => setError(error)}
              />
              <div className="mt-2 space-y-2">
                {businessRegistrationFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {file.file_name}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleFileDelete(file.id, 'business_registration')}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="billing_memo" className="block text-sm font-medium text-gray-700 mb-1">
                청구서/세금계산서 발행 메모
              </label>
              <textarea
                id="billing_memo"
                value={billingMemo}
                onChange={(e) => setBillingMemo(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="청구서/세금계산서 발행 관련 메모"
              />
            </div>
          </div>
        )}

        {/* 거래처 담당자 탭 */}
        {activeTab === 'contacts' && (
          <div className="space-y-6">
            {contactList.map((contact, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">
                    담당자 {index + 1} {index === 0 && '(주담당자)'}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {index === 0 && contactList.length < 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          setContactList([...contactList, { name: '', phone: '', position: '', role: 'extra' }])
                        }}
                        className="px-3 py-1.5 text-sm border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        + 담당자 추가
                      </button>
                    )}
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setContactList(contactList.filter((_, i) => i !== index))
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => {
                        const newList = [...contactList]
                        newList[index] = { ...newList[index], name: e.target.value }
                        setContactList(newList)
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => {
                        const newList = [...contactList]
                        newList[index] = { ...newList[index], phone: e.target.value }
                        setContactList(newList)
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">직책</label>
                    <input
                      type="text"
                      value={contact.position}
                      onChange={(e) => {
                        const newList = [...contactList]
                        newList[index] = { ...newList[index], position: e.target.value }
                        setContactList(newList)
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <div>
              <label htmlFor="contact_memo" className="block text-sm font-medium text-gray-700 mb-1">
                메모
              </label>
              <textarea
                id="contact_memo"
                value={contactMemo}
                onChange={(e) => setContactMemo(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="담당자 관련 메모를 입력하세요"
              />
            </div>
          </div>
        )}

        {/* 계약/문서 관리 탭 */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">계약서</h3>
              <DocumentUploader
                storeId={store?.id}
                entity="store"
                docType="service_contract"
                onUploadComplete={(url, fileName) => handleFileUpload(url, fileName, 'service_contract')}
                onUploadError={(error) => setError(error)}
              />
              <div className="mt-2 space-y-2">
                {storeFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {file.file_name}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleFileDelete(file.id, 'service_contract')}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 운영 메모 탭 */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="access_info" className="block text-sm font-medium text-gray-700 mb-1">
                출입 정보
              </label>
              <textarea
                id="access_info"
                value={accessInfo}
                onChange={(e) => setAccessInfo(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="도어락 비번, 카드키 여부 등"
              />
            </div>

            <div>
              <label htmlFor="special_notes" className="block text-sm font-medium text-gray-700 mb-1">
                특이사항/주의사항
              </label>
              <textarea
                id="special_notes"
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="운영 시 주의해야 할 사항을 입력하세요"
              />
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
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}

