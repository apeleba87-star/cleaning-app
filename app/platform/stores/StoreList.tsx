'use client'

import { useState } from 'react'
import { Store } from '@/types/db'
import StoreForm from './StoreForm'

interface Company {
  id: string
  name: string
}

interface StoreWithCompany extends Store {
  companies: { id: string; name: string } | null
}

interface StoreListProps {
  initialStores: StoreWithCompany[]
  companies: Company[]
}

export default function StoreList({ initialStores, companies }: StoreListProps) {
  const [stores, setStores] = useState<StoreWithCompany[]>(initialStores)
  const [filterCompany, setFilterCompany] = useState<string>('all')
  const [editingStore, setEditingStore] = useState<StoreWithCompany | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredStores = stores.filter(store => {
    if (filterCompany !== 'all' && store.company_id !== filterCompany) return false
    return true
  })

  const uniqueCompanies = Array.from(
    new Set(stores.map(s => s.company_id).filter(Boolean))
  )

  const handleCreate = () => {
    setEditingStore(null)
    setShowForm(true)
    setError(null)
  }

  const handleEdit = (store: StoreWithCompany) => {
    setEditingStore(store)
    setShowForm(true)
    setError(null)
  }

  const handleFormSuccess = (store: StoreWithCompany) => {
    if (editingStore) {
      setStores(stores.map((s) => (s.id === store.id ? store : s)))
    } else {
      setStores([store, ...stores])
    }
    setShowForm(false)
    setEditingStore(null)
    setError(null)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingStore(null)
    setError(null)
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <div>
        <select
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">전체 회사</option>
          {uniqueCompanies.map(companyId => {
            const store = stores.find(s => s.company_id === companyId)
            return (
              <option key={companyId} value={companyId}>
                {store?.companies?.name || '회사 없음'}
              </option>
            )
          })}
        </select>
        </div>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          + 새 매장 추가
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="mb-6">
          <StoreForm
            store={editingStore}
            companies={companies}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                회사
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                본사명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                매장명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                주소
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                카테고리
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                서비스진행
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                생성일
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStores.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  매장이 없습니다.
                </td>
              </tr>
            ) : (
              filteredStores.map((store) => (
                <tr key={store.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {store.companies?.name || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {store.head_office_name || '개인'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {store.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {store.address || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {store.category || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        store.service_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {store.service_active ? '진행중' : '중지'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(store.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(store)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      수정
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

