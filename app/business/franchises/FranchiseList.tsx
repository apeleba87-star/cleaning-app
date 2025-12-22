'use client'

import { useState } from 'react'
import { Franchise } from '@/types/db'
import FranchiseForm from './FranchiseForm'

interface FranchiseListProps {
  initialFranchises: Franchise[]
  companyId: string
}

export default function FranchiseList({ initialFranchises, companyId }: FranchiseListProps) {
  const [franchises, setFranchises] = useState<Franchise[]>(initialFranchises)
  const [editingFranchise, setEditingFranchise] = useState<Franchise | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = () => {
    setEditingFranchise(null)
    setShowForm(true)
    setError(null)
  }

  const handleEdit = (franchise: Franchise) => {
    setEditingFranchise(franchise)
    setShowForm(true)
    setError(null)
  }

  const handleDelete = async (franchiseId: string) => {
    if (!confirm('정말 이 프렌차이즈를 삭제하시겠습니까?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/business/franchises/${franchiseId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '삭제에 실패했습니다.')
      }

      setFranchises(franchises.filter((f) => f.id !== franchiseId))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFormSuccess = (franchise: Franchise) => {
    if (editingFranchise) {
      setFranchises(franchises.map((f) => (f.id === franchise.id ? franchise : f)))
    } else {
      setFranchises([franchise, ...franchises])
    }
    setShowForm(false)
    setEditingFranchise(null)
    setError(null)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingFranchise(null)
    setError(null)
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '활성'
      case 'inactive':
        return '비활성'
      case 'suspended':
        return '정지'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          + 새 프렌차이즈 등록
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="mb-6">
          <FranchiseForm
            franchise={editingFranchise}
            companyId={companyId}
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
                프렌차이즈명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                담당자
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                연락처
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                계약기간
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {franchises.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  등록된 프렌차이즈가 없습니다.
                </td>
              </tr>
            ) : (
              franchises.map((franchise) => (
                <tr key={franchise.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {franchise.name}
                    </div>
                    {franchise.business_registration_number && (
                      <div className="text-xs text-gray-500">
                        사업자: {franchise.business_registration_number}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {franchise.manager_name || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {franchise.phone || '-'}
                    </div>
                    {franchise.email && (
                      <div className="text-xs text-gray-400">
                        {franchise.email}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(franchise.status)}`}
                    >
                      {getStatusLabel(franchise.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {franchise.contract_start_date && franchise.contract_end_date ? (
                        <>
                          {new Date(franchise.contract_start_date).toLocaleDateString('ko-KR')} ~{' '}
                          {new Date(franchise.contract_end_date).toLocaleDateString('ko-KR')}
                        </>
                      ) : (
                        '-'
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(franchise)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(franchise.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                    >
                      삭제
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





