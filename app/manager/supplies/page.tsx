'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SupplyRequest, SupplyRequestStatus } from '@/types/db'

export default function ManagerSuppliesPage() {
  const [supplies, setSupplies] = useState<SupplyRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSupplies()
  }, [])

  const loadSupplies = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('supply_requests')
      .select('*')
      .order('created_at', { ascending: false })

    setSupplies(data || [])
    setLoading(false)
  }

  const handleStatusChange = async (id: string, status: SupplyRequestStatus) => {
    const response = await fetch(`/api/supply/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })

    if (response.ok) {
      loadSupplies()
    } else {
      alert('상태 변경 실패')
    }
  }

  const getStatusLabel = (status: SupplyRequestStatus) => {
    switch (status) {
      case 'requested':
        return '요청됨'
      case 'received':
        return '수신됨'
      case 'completed':
        return '완료됨'
      case 'rejected':
        return '거부됨'
      default:
        return status
    }
  }

  const getStatusColor = (status: SupplyRequestStatus) => {
    switch (status) {
      case 'requested':
        return 'bg-yellow-100 text-yellow-800'
      case 'received':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">물품 관리</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">요청 목록</h2>
        {supplies.length === 0 ? (
          <p className="text-gray-500 text-center py-8">요청이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {supplies.map((supply) => (
              <div
                key={supply.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(supply.status)}`}
                      >
                        {getStatusLabel(supply.status)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(supply.created_at).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    {supply.description && (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
                        {supply.description}
                      </p>
                    )}
                    {supply.item_name && (
                      <p className="text-sm text-gray-600">
                        품목: {supply.item_name}
                        {supply.quantity && ` (${supply.quantity}개)`}
                      </p>
                    )}
                    {supply.manager_comment && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <p className="text-xs font-medium text-gray-600">관리자 코멘트:</p>
                        <p className="text-sm text-gray-700">{supply.manager_comment}</p>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    {supply.status === 'requested' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(supply.id, 'received')}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          수신
                        </button>
                        <button
                          onClick={() => handleStatusChange(supply.id, 'rejected')}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          거부
                        </button>
                      </>
                    )}
                    {supply.status === 'received' && (
                      <button
                        onClick={() => handleStatusChange(supply.id, 'completed')}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        완료
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
