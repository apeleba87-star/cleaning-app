'use client'

import { useState, useEffect } from 'react'
import { User, UserRole, Store } from '@/types/db'
import Link from 'next/link'

type UserListStore = Pick<Store, 'id' | 'name'>

interface PendingUsersSectionProps {
  stores: UserListStore[]
  onApprove: () => void
}

export default function PendingUsersSection({ stores, onApprove }: PendingUsersSectionProps) {
  const [pendingUsers, setPendingUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null)
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalRole, setApprovalRole] = useState<UserRole>('staff')
  const [approvalStoreIds, setApprovalStoreIds] = useState<string[]>([])
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  useEffect(() => {
    loadPendingUsers()
  }, [])

  const loadPendingUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/business/users/pending')
      const data = await response.json()

      if (response.ok) {
        setPendingUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error loading pending users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveClick = (user: User) => {
    setSelectedUser(user)
    setApprovalRole(user.role as UserRole)
    setApprovalStoreIds([])
    setShowApprovalModal(true)
  }

  const handleRejectClick = (user: User) => {
    setSelectedUser(user)
    setRejectionReason('')
    setShowRejectModal(true)
  }

  const handleApprove = async () => {
    if (!selectedUser) return

    try {
      setApprovingUserId(selectedUser.id)
      const response = await fetch(`/api/business/users/${selectedUser.id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: approvalRole,
          store_ids: approvalStoreIds,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || '승인 처리에 실패했습니다.')
        return
      }

      setShowApprovalModal(false)
      setSelectedUser(null)
      loadPendingUsers()
      onApprove() // 부모 컴포넌트에 알림
    } catch (error) {
      console.error('Error approving user:', error)
      alert('승인 처리 중 오류가 발생했습니다.')
    } finally {
      setApprovingUserId(null)
    }
  }

  const handleReject = async () => {
    if (!selectedUser) return

    try {
      setRejectingUserId(selectedUser.id)
      const response = await fetch(`/api/business/users/${selectedUser.id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejection_reason: rejectionReason.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || '거절 처리에 실패했습니다.')
        return
      }

      setShowRejectModal(false)
      setSelectedUser(null)
      loadPendingUsers()
    } catch (error) {
      console.error('Error rejecting user:', error)
      alert('거절 처리 중 오류가 발생했습니다.')
    } finally {
      setRejectingUserId(null)
    }
  }

  const toggleStoreSelection = (storeId: string) => {
    setApprovalStoreIds((prev) =>
      prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <p className="text-gray-600">승인 대기 사용자를 불러오는 중...</p>
      </div>
    )
  }

  if (pendingUsers.length === 0) {
    return null
  }

  return (
    <>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-md p-4 sm:p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base sm:text-xl font-semibold text-yellow-900">
            승인 대기 ({pendingUsers.length}명)
          </h2>
        </div>

        {/* 모바일: 카드 형태 */}
        <div className="block sm:hidden space-y-3 p-4">
          {pendingUsers.map((user) => (
            <div key={user.id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50 space-y-2">
              <div className="text-base font-semibold text-gray-900">{user.name}</div>
              <div className="text-xs text-gray-600">{(user as any).email || '-'}</div>
              <div className="text-xs text-gray-600">{user.phone || '-'}</div>
              <div className="text-xs text-gray-600">
                신청일: {user.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-'}
              </div>
              <div className="flex gap-2 pt-2 border-t border-yellow-200">
                <button
                  onClick={() => handleApproveClick(user)}
                  disabled={approvingUserId === user.id}
                  className="flex-1 px-3 py-2 text-sm bg-green-50 text-green-600 rounded-md hover:bg-green-100 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {approvingUserId === user.id ? '승인 중...' : '승인'}
                </button>
                <button
                  onClick={() => handleRejectClick(user)}
                  disabled={rejectingUserId === user.id}
                  className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {rejectingUserId === user.id ? '거절 중...' : '거절'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 데스크톱: 테이블 형태 */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-yellow-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  이름
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  이메일
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  전화번호
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  신청일
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {(user as any).email || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {user.phone || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveClick(user)}
                        disabled={approvingUserId === user.id}
                        className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                      >
                        {approvingUserId === user.id ? '승인 중...' : '승인'}
                      </button>
                      <button
                        onClick={() => handleRejectClick(user)}
                        disabled={rejectingUserId === user.id}
                        className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                      >
                        {rejectingUserId === user.id ? '거절 중...' : '거절'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 승인 모달 */}
      {showApprovalModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">사용자 승인</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">이름: {selectedUser.name}</p>
                <p className="text-sm text-gray-600">이메일: {(selectedUser as any).email || '-'}</p>
                <p className="text-sm text-gray-600">전화번호: {selectedUser.phone || '-'}</p>
                <p className="text-sm text-gray-600">
                  신청일: {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('ko-KR') : '-'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  역할
                </label>
                <select
                  value={approvalRole}
                  onChange={(e) => setApprovalRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="staff">직원</option>
                  <option value="manager">매니저</option>
                  <option value="store_manager">매장 관리자</option>
                  <option value="subcontract_individual">도급(개인)</option>
                  <option value="subcontract_company">도급(업체)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  매장 배정 (선택)
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {stores.length === 0 ? (
                    <p className="text-sm text-gray-500">배정할 매장이 없습니다.</p>
                  ) : (
                    stores.map((store) => (
                      <label key={store.id} className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          checked={approvalStoreIds.includes(store.id)}
                          onChange={() => toggleStoreSelection(store.id)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{store.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowApprovalModal(false)
                    setSelectedUser(null)
                  }}
                  className="px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleApprove}
                  disabled={approvingUserId !== null}
                  className="px-3 sm:px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  {approvingUserId ? '승인 중...' : '승인'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 거절 모달 */}
      {showRejectModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">사용자 거절</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">이름: {selectedUser.name}</p>
                <p className="text-xs sm:text-sm text-gray-600">이메일: {(selectedUser as any).email || '-'}</p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  거절 사유 (선택)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                  placeholder="거절 사유를 입력하세요"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setSelectedUser(null)
                  }}
                  className="px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejectingUserId !== null}
                  className="px-3 sm:px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                >
                  {rejectingUserId ? '거절 중...' : '거절'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

