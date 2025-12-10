'use client'

import { useState } from 'react'
import { Issue, IssueStatus } from '@/types/db'

interface IssueListProps {
  issues: Issue[]
  onStatusChange?: (id: string, status: IssueStatus) => void
  userRole: 'staff' | 'manager' | 'admin'
}

const statusLabels: Record<IssueStatus, string> = {
  submitted: '제출됨',
  in_progress: '진행 중',
  completed: '완료',
  rejected: '거부됨',
}

const statusColors: Record<IssueStatus, string> = {
  submitted: 'bg-gray-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  rejected: 'bg-red-500',
}

export function IssueList({ issues, onStatusChange, userRole }: IssueListProps) {
  const [filter, setFilter] = useState<IssueStatus | 'all'>('all')

  const filteredIssues =
    filter === 'all'
      ? issues
      : issues.filter((issue) => issue.status === filter)

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
            onClick={() => setFilter(status as IssueStatus)}
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
        {filteredIssues.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            이슈가 없습니다.
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className="border border-gray-300 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{issue.title}</h3>
                  {issue.description && (
                    <p className="text-gray-600 text-sm mt-1">
                      {issue.description}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium text-white ${statusColors[issue.status]}`}
                >
                  {statusLabels[issue.status]}
                </span>
              </div>
              {issue.photo_url && (
                <img
                  src={issue.photo_url}
                  alt={issue.title}
                  className="mt-2 max-w-xs rounded-lg"
                />
              )}
              {issue.manager_comment && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>매니저 코멘트:</strong> {issue.manager_comment}
                  </p>
                </div>
              )}
              <div className="mt-2 text-xs text-gray-500">
                {new Date(issue.created_at).toLocaleString('ko-KR')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}



