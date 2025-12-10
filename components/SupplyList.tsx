'use client'

import { useState } from 'react'
import { SupplyRequest, SupplyRequestStatus } from '@/types/db'

interface SupplyListProps {
  supplies: SupplyRequest[]
  onStatusChange?: (id: string, status: SupplyRequestStatus) => void
  userRole: 'staff' | 'manager' | 'admin'
}

const statusLabels: Record<SupplyRequestStatus, string> = {
  requested: '요청됨',
  received: '수령됨',
  completed: '완료',
  rejected: '거부됨',
}

const statusColors: Record<SupplyRequestStatus, string> = {
  requested: 'bg-blue-500',
  received: 'bg-yellow-500',
  completed: 'bg-green-500',
  rejected: 'bg-red-500',
}

export function SupplyList({
  supplies,
  onStatusChange,
  userRole,
}: SupplyListProps) {
  const [filter, setFilter] = useState<SupplyRequestStatus | 'all'>('all')

  const filteredSupplies =
    filter === 'all'
      ? supplies
      : supplies.filter((supply) => supply.status === filter)

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          전체
        </button>
        {Object.entries(statusLabels).map(([status, label]) => (
          <button
            key={status}
            onClick={() => setFilter(status as SupplyRequestStatus)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 리스트 */}
      <div className="space-y-3">
        {filteredSupplies.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            물품 요청이 없습니다.
          </div>
        ) : (
          filteredSupplies.map((supply) => (
            <div
              key={supply.id}
              className="border border-gray-300 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{supply.item_name}</h3>
                  {supply.quantity && (
                    <p className="text-gray-600 text-sm mt-1">
                      수량: {supply.quantity}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium text-white ${statusColors[supply.status]}`}
                >
                  {statusLabels[supply.status]}
                </span>
              </div>
              {supply.photo_url && (
                <img
                  src={supply.photo_url}
                  alt={supply.item_name}
                  className="mt-2 max-w-xs rounded-lg"
                />
              )}
              {supply.manager_comment && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>매니저 코멘트:</strong> {supply.manager_comment}
                  </p>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {new Date(supply.created_at).toLocaleString('ko-KR')}
                </span>
                {onStatusChange &&
                  userRole === 'manager' &&
                  supply.status === 'requested' && (
                    <button
                      onClick={() => onStatusChange(supply.id, 'received')}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                    >
                      수령 처리
                    </button>
                  )}
                {onStatusChange &&
                  userRole === 'staff' &&
                  supply.status === 'received' && (
                    <button
                      onClick={() => onStatusChange(supply.id, 'completed')}
                      className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
                    >
                      완료 처리
                    </button>
                  )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}


