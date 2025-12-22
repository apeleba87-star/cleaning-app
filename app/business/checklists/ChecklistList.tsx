'use client'

import { useState } from 'react'
import { Store, Checklist as ChecklistType, ReviewStatus } from '@/types/db'
import ChecklistForm from './ChecklistForm'

interface User {
  id: string
  name: string
  role: string
}

interface Checklist extends Partial<ChecklistType> {
  id: string
  store_id: string
  assigned_user_id: string | null
  items: any[]
  note: string | null
  review_status: ReviewStatus
  work_date: string
  requires_photos?: boolean
  created_at: string
  stores?: { name: string }
  users?: { name: string }
}

interface ChecklistListProps {
  stores: Store[]
  staffUsers: User[]
  companyId: string
}

export default function ChecklistList({ stores, staffUsers, companyId }: ChecklistListProps) {
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStoreChange = async (storeId: string) => {
    setSelectedStoreId(storeId)
    if (!storeId) {
      setChecklists([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/business/checklists?store_id=${storeId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '체크리스트 조회에 실패했습니다.')
      }

      setChecklists(data.checklists || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSuccess = () => {
    setShowForm(false)
    setEditingChecklist(null)
    if (selectedStoreId) {
      handleStoreChange(selectedStoreId)
    }
  }

  const handleEdit = (checklist: Checklist) => {
    setEditingChecklist(checklist)
    setShowForm(true)
  }

  const handleDelete = async (checklistId: string) => {
    if (!confirm('정말 이 체크리스트를 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/business/checklists/${checklistId}`, {
        method: 'DELETE',
      })

      // Content-Type 확인
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        throw new Error(`서버 오류가 발생했습니다. (${response.status} ${response.statusText})`)
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '체크리스트 삭제에 실패했습니다.')
      }

      // 목록 새로고침
      if (selectedStoreId) {
        handleStoreChange(selectedStoreId)
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기중'
      case 'approved':
        return '승인됨'
      case 'reshoot_requested':
        return '재촬영 요청'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'reshoot_requested':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <label htmlFor="store" className="text-sm font-medium text-gray-700">
            매장 선택:
          </label>
          <select
            id="store"
            value={selectedStoreId}
            onChange={(e) => handleStoreChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">매장을 선택하세요</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>
        {selectedStoreId && (
          <button
            onClick={() => {
              setEditingChecklist(null)
              setShowForm(true)
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            + 새 체크리스트 생성
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {showForm && selectedStoreId && (
        <div className="mb-6">
          <ChecklistForm
            storeId={selectedStoreId}
            stores={stores}
            staffUsers={staffUsers}
            onSuccess={handleCreateSuccess}
            onCancel={() => {
              setShowForm(false)
              setEditingChecklist(null)
            }}
            initialChecklist={editingChecklist}
          />
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      )}

      {!loading && selectedStoreId && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  항목 수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  필수 사진
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  비고
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  생성일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {checklists.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    체크리스트가 없습니다.
                  </td>
                </tr>
              ) : (
                checklists.map((checklist) => (
                  <tr key={checklist.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {Array.isArray(checklist.items) ? checklist.items.length : 0}개
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {checklist.requires_photos ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            필수
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          checklist.review_status
                        )}`}
                      >
                        {getStatusLabel(checklist.review_status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {checklist.note || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(checklist.created_at).toLocaleDateString('ko-KR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(checklist)}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(checklist.id)}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!selectedStoreId && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">매장을 선택하면 체크리스트를 조회하고 생성할 수 있습니다.</p>
        </div>
      )}
    </div>
  )
}

