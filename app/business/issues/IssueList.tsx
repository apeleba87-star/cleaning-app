'use client'

import { useState } from 'react'
import { Issue, IssueStatus } from '@/types/db'

interface IssueWithRelations extends Issue {
  users: { id: string; name: string } | null
  request_categories: { id: string; name: string } | null
}

interface IssueListProps {
  initialIssues: IssueWithRelations[]
  storeMap: Map<string, string>
}

export default function IssueList({ initialIssues, storeMap }: IssueListProps) {
  const [issues, setIssues] = useState<IssueWithRelations[]>(initialIssues)
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'all'>('all')

  const filteredIssues = statusFilter === 'all'
    ? issues
    : issues.filter(issue => issue.status === statusFilter)

  const getStatusLabel = (status: IssueStatus) => {
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

  const getStatusColor = (status: IssueStatus) => {
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

  return (
    <div>
      <div className="mb-4 flex space-x-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            statusFilter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setStatusFilter('submitted')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            statusFilter === 'submitted'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          제출됨
        </button>
        <button
          onClick={() => setStatusFilter('in_progress')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            statusFilter === 'in_progress'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          진행중
        </button>
        <button
          onClick={() => setStatusFilter('completed')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            statusFilter === 'completed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          완료
        </button>
        <button
          onClick={() => setStatusFilter('rejected')}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            statusFilter === 'rejected'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          거부됨
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                매장
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                제목
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작성자
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                카테고리
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작성일
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredIssues.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  이슈가 없습니다.
                </td>
              </tr>
            ) : (
              filteredIssues.map((issue) => (
                <tr key={issue.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {storeMap.get(issue.store_id) || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {issue.title}
                    </div>
                    {issue.description && (
                      <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                        {issue.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {issue.users?.name || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {issue.request_categories?.name || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(issue.status)}`}
                    >
                      {getStatusLabel(issue.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(issue.created_at).toLocaleDateString('ko-KR')}
                    </div>
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

