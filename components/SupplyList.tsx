import { SupplyRequest, SupplyRequestStatus } from '@/types/db'

type UserRole = 'staff' | 'manager'

interface SupplyListProps {
  supplies: SupplyRequest[]
  onStatusChange?: (id: string, status: SupplyRequestStatus) => void
  userRole?: UserRole
}

const statusLabel: Record<SupplyRequestStatus, string> = {
  received: '접수',
  in_progress: '처리중',
  manager_in_progress: '점주 처리중',
  completed: '처리 완료',
}

const statusColor: Record<SupplyRequestStatus, string> = {
  received: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  manager_in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
}

export function SupplyList({ supplies, onStatusChange, userRole = 'staff' }: SupplyListProps) {
  const canManage = userRole === 'manager' && typeof onStatusChange === 'function'

  const renderActions = (supply: SupplyRequest) => {
    if (!canManage) return null

    const actions: Array<{ label: string; status: SupplyRequestStatus }> = [
      { label: '입고', status: 'received' },
      { label: '완료', status: 'completed' },
      { label: '거부', status: 'rejected' },
    ]

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {actions.map(action => (
          <button
            key={action.status}
            onClick={() => onStatusChange?.(supply.id, action.status)}
            className="px-3 py-1 text-xs rounded-md bg-gray-100 hover:bg-gray-200 transition"
          >
            {action.label}
          </button>
        ))}
      </div>
    )
  }

  if (!supplies || supplies.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-6">
        물품 요청이 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {supplies.map(supply => (
        <div key={supply.id} className="border rounded-lg p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-base font-semibold">{supply.title || supply.item_name || '물품 요청'}</div>
              {supply.category && (
                <div className="text-sm text-gray-600 mt-1">카테고리: {supply.category}</div>
              )}
              {supply.description && (
                <div className="text-sm text-gray-600 mt-1">{supply.description}</div>
              )}
              {supply.quantity !== null && (
                <div className="text-sm text-gray-600 mt-1">수량: {supply.quantity}</div>
              )}
              {supply.manager_comment && (
                <div className="text-xs text-gray-500 mt-1">메모: {supply.manager_comment}</div>
              )}
            </div>
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusColor[supply.status]}`}
            >
              {statusLabel[supply.status]}
            </span>
          </div>

          {supply.photo_url && (
            <div className="mt-3">
              <img
                src={supply.photo_url}
                alt={supply.title || supply.item_name || '물품 요청 사진'}
                className="max-w-full h-auto rounded-md max-h-64 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )}

          {renderActions(supply)}

          <div className="mt-3 text-xs text-gray-500">
            {new Date(supply.created_at).toLocaleString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
















