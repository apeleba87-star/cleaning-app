'use client'

import { Issue } from '@/types/db'

interface IssueListProps {
  issues: Issue[]
  userRole?: 'staff' | 'business'
}

export function IssueList({ issues, userRole = 'staff' }: IssueListProps) {
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'submitted':
        return '제출됨'
      case 'in_progress':
        return '진행중'
      case 'completed':
        return '완료'
      case 'rejected':
        return '거부됨'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (issues.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        등록된 이슈가 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {issues.map((issue) => (
        <div
          key={issue.id}
          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {issue.title}
              </h3>
              {issue.description && (
                <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">
                  {issue.description}
                </p>
              )}
            </div>
            <span
              className={`ml-4 px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(
                issue.status
              )}`}
            >
              {getStatusLabel(issue.status)}
            </span>
          </div>

          {issue.photo_url && (
            <div className="mt-3">
              <img
                src={issue.photo_url}
                alt={issue.title}
                className="max-w-full h-auto rounded-md max-h-64 object-contain"
                onError={(e) => {
                  // 이미지 로드 실패 시 숨김
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )}

          <div className="mt-3 text-xs text-gray-500">
            {new Date(issue.created_at).toLocaleString('ko-KR', {
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















