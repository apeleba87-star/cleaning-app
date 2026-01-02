'use client'

import { useState } from 'react'
import { User, UserRole, Franchise, Store } from '@/types/db'
import UserForm from './UserForm'
import UserStoreAssign from './UserStoreAssign'
import CreateUserForm from './CreateUserForm'
import PendingUsersSection from './PendingUsersSection'

// UserList에서 사용하는 최소 필드 타입
type UserListStore = Pick<Store, 'id' | 'name'>
type UserListFranchise = Pick<Franchise, 'id' | 'name'>

interface UserListProps {
  initialUsers: User[]
  stores: UserListStore[]
  franchises: UserListFranchise[]
  userStoreMap: Map<string, string[]>
  companyId: string
  currentUserRole: UserRole
}

export default function UserList({ initialUsers, stores, franchises, userStoreMap, companyId, currentUserRole }: UserListProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [assigningUser, setAssigningUser] = useState<User | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = () => {
    // 사용자 수정 폼이 열려있으면 경고 메시지 표시
    if (showForm && editingUser) {
      const confirmClose = window.confirm(
        `"${editingUser.name}" 사용자 수정을 진행 중입니다. 새 사용자를 추가하려면 현재 작업을 취소해야 합니다.\n\n사용자 수정을 취소하고 새 사용자를 추가하시겠습니까?`
      )
      if (!confirmClose) {
        return // 사용자가 취소를 선택하면 아무것도 하지 않음
      }
    }
    
    // 매장 배정 폼이 열려있으면 경고 메시지 표시
    if (showAssign && assigningUser) {
      const confirmClose = window.confirm(
        `"${assigningUser.name}" 사용자의 매장 배정을 진행 중입니다. 새 사용자를 추가하려면 현재 작업을 취소해야 합니다.\n\n매장 배정을 취소하고 새 사용자를 추가하시겠습니까?`
      )
      if (!confirmClose) {
        return
      }
    }
    
    setEditingUser(null)
    setAssigningUser(null)
    setShowCreateForm(true)
    setShowForm(false)
    setShowAssign(false)
    setError(null)
  }

  const handleEdit = (user: User) => {
    // 새 사용자 추가 폼이 열려있으면 경고 메시지 표시
    if (showCreateForm) {
      const confirmClose = window.confirm(
        '새 사용자 추가를 진행 중입니다. 다른 직원을 수정하려면 현재 작업을 취소해야 합니다.\n\n새 사용자 추가를 취소하고 수정하시겠습니까?'
      )
      if (!confirmClose) {
        return // 사용자가 취소를 선택하면 아무것도 하지 않음
      }
    }
    
    // 다른 사용자 수정 폼이 열려있으면 경고 메시지 표시
    if (showForm && editingUser && editingUser.id !== user.id) {
      const confirmClose = window.confirm(
        `"${editingUser.name}" 사용자 수정을 진행 중입니다. "${user.name}" 사용자를 수정하려면 현재 작업을 취소해야 합니다.\n\n현재 수정을 취소하고 다른 사용자를 수정하시겠습니까?`
      )
      if (!confirmClose) {
        return
      }
    }
    
    // 매장 배정 폼이 열려있으면 경고 메시지 표시
    if (showAssign && assigningUser) {
      const confirmClose = window.confirm(
        `"${assigningUser.name}" 사용자의 매장 배정을 진행 중입니다. "${user.name}" 사용자를 수정하려면 현재 작업을 취소해야 합니다.\n\n매장 배정을 취소하고 사용자를 수정하시겠습니까?`
      )
      if (!confirmClose) {
        return
      }
    }
    
    setEditingUser(user)
    setAssigningUser(null)
    setShowForm(true)
    setShowCreateForm(false)
    setShowAssign(false)
    setError(null)
  }

  const handleAssign = (user: User) => {
    // 새 사용자 추가 폼이 열려있으면 경고 메시지 표시
    if (showCreateForm) {
      const confirmClose = window.confirm(
        '새 사용자 추가를 진행 중입니다. 매장 배정을 하려면 현재 작업을 취소해야 합니다.\n\n새 사용자 추가를 취소하고 매장 배정하시겠습니까?'
      )
      if (!confirmClose) {
        return // 사용자가 취소를 선택하면 아무것도 하지 않음
      }
    }
    
    // 사용자 수정 폼이 열려있으면 경고 메시지 표시
    if (showForm && editingUser) {
      const confirmClose = window.confirm(
        `"${editingUser.name}" 사용자 수정을 진행 중입니다. "${user.name}" 사용자의 매장 배정을 하려면 현재 작업을 취소해야 합니다.\n\n사용자 수정을 취소하고 매장 배정하시겠습니까?`
      )
      if (!confirmClose) {
        return
      }
    }
    
    // 다른 사용자의 매장 배정 폼이 열려있으면 경고 메시지 표시
    if (showAssign && assigningUser && assigningUser.id !== user.id) {
      const confirmClose = window.confirm(
        `"${assigningUser.name}" 사용자의 매장 배정을 진행 중입니다. "${user.name}" 사용자의 매장 배정을 하려면 현재 작업을 취소해야 합니다.\n\n현재 매장 배정을 취소하고 다른 사용자의 매장 배정하시겠습니까?`
      )
      if (!confirmClose) {
        return
      }
    }
    
    setAssigningUser(user)
    setEditingUser(null)
    setShowAssign(true)
    setShowCreateForm(false)
    setShowForm(false)
    setError(null)
  }

  const [roleChangingUser, setRoleChangingUser] = useState<{ id: string; newRole: UserRole } | null>(null)
  const [selectedFranchiseForRole, setSelectedFranchiseForRole] = useState<string>('')

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    // 프렌차이즈 관리자로 변경하는 경우 프렌차이즈 선택 필요
    if (newRole === 'franchise_manager') {
      const user = users.find(u => u.id === userId)
      if (!user?.franchise_id) {
        setRoleChangingUser({ id: userId, newRole })
        return
      }
    }

    // 프렌차이즈 관리자가 아닌 다른 역할로 변경하는 경우 franchise_id 제거
    await updateUserRole(userId, newRole, newRole === 'franchise_manager' ? undefined : null)
  }

  const updateUserRole = async (userId: string, newRole: UserRole, franchiseId: string | null | undefined) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/business/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          role: newRole,
          franchise_id: franchiseId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '역할 변경에 실패했습니다.')
      }

      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole, franchise_id: franchiseId || null } : u)))
      setRoleChangingUser(null)
      setSelectedFranchiseForRole('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmRoleChange = () => {
    if (!roleChangingUser) return
    
    if (roleChangingUser.newRole === 'franchise_manager' && !selectedFranchiseForRole) {
      setError('프렌차이즈를 선택해주세요.')
      return
    }

    updateUserRole(
      roleChangingUser.id, 
      roleChangingUser.newRole, 
      roleChangingUser.newRole === 'franchise_manager' ? selectedFranchiseForRole : null
    )
  }

  const handleFormSuccess = (user: User) => {
    if (editingUser) {
      // 기존 사용자의 이메일 정보 유지
      const existingUser = users.find((u) => u.id === user.id)
      const updatedUser = {
        ...user,
        email: (existingUser as any)?.email || (user as any)?.email || null,
      }
      setUsers(users.map((u) => (u.id === user.id ? updatedUser : u)))
    } else {
      setUsers([user, ...users])
    }
    setShowForm(false)
    setEditingUser(null)
    setError(null)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingUser(null)
    setError(null)
  }

  const handleCreateSuccess = () => {
    setShowCreateForm(false)
    setError(null)
    window.location.reload()
  }

  const handleCreateCancel = () => {
    setShowCreateForm(false)
    setError(null)
  }

  const handleAssignSuccess = () => {
    setShowAssign(false)
    setAssigningUser(null)
    setError(null)
    window.location.reload()
  }

  const handleAssignCancel = () => {
    setShowAssign(false)
    setAssigningUser(null)
    setError(null)
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'platform_admin':
        return '시스템관리자'
      case 'business_owner':
        return '업체관리자'
      case 'franchise_manager':
        return '프렌차이즈관리자'
      case 'store_manager':
        return '매장관리자(점주)'
      case 'admin':
        return '관리자'
      case 'manager':
        return '매니저'
      case 'staff':
        return '직원'
      case 'subcontract_individual':
        return '도급(개인)'
      case 'subcontract_company':
        return '도급(업체)'
      default:
        return role
    }
  }

  const getUserStores = (userId: string) => {
    const storeIds = userStoreMap.get(userId) || []
    return stores.filter((s) => storeIds.includes(s.id))
  }

  const handleApprovalComplete = () => {
    // 승인 완료 후 사용자 목록 새로고침
    // 실제로는 페이지 새로고침이 필요할 수 있음
    window.location.reload()
  }

  // 승인된 사용자만 필터링 (승인 대기 제외)
  const approvedUsers = users.filter((u) => u.approval_status !== 'pending')

  return (
    <div>
      {/* 승인 대기 섹션 */}
      <PendingUsersSection stores={stores} onApprove={handleApprovalComplete} />

      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleCreate}
          disabled={showForm || showAssign}
          className={`px-4 py-2 rounded-md transition-colors ${
            showForm || showAssign
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          title={showForm || showAssign ? '다른 작업을 완료하거나 취소한 후 새 사용자를 추가할 수 있습니다.' : ''}
        >
          + 새 사용자 초대
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {showCreateForm && (
        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  새 사용자 추가 중
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    현재 새 사용자 추가를 진행 중입니다. 다른 직원을 수정하거나 매장을 배정하려면 먼저 이 작업을 완료하거나 취소해주세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <CreateUserForm
            stores={stores}
            franchises={franchises}
            companyId={companyId}
            currentUserRole={currentUserRole}
            onSuccess={handleCreateSuccess}
            onCancel={handleCreateCancel}
          />
        </div>
      )}

      {showForm && editingUser && (
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-blue-800">
                  사용자 수정 중: {editingUser.name}
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    현재 "{editingUser.name}" 사용자 정보를 수정 중입니다. 다른 작업을 하려면 먼저 이 작업을 완료하거나 취소해주세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <UserForm
            user={editingUser}
            stores={stores}
            assignedStoreIds={userStoreMap.get(editingUser.id) || []}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      {showAssign && assigningUser && (
        <div className="mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-green-800">
                  매장 배정 중: {assigningUser.name}
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    현재 "{assigningUser.name}" 사용자의 매장 배정을 진행 중입니다. 다른 작업을 하려면 먼저 이 작업을 완료하거나 취소해주세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <UserStoreAssign
            user={assigningUser}
            stores={stores}
            assignedStoreIds={userStoreMap.get(assigningUser.id) || []}
            onSuccess={handleAssignSuccess}
            onCancel={handleAssignCancel}
          />
        </div>
      )}

      {roleChangingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">프렌차이즈 선택</h3>
            <p className="text-sm text-gray-600 mb-4">
              프렌차이즈 관리자 역할을 부여하려면 프렌차이즈를 선택해야 합니다.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프렌차이즈 <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedFranchiseForRole}
                onChange={(e) => setSelectedFranchiseForRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">프렌차이즈 선택</option>
                {franchises.map((franchise) => (
                  <option key={franchise.id} value={franchise.id}>
                    {franchise.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setRoleChangingUser(null)
                  setSelectedFranchiseForRole('')
                  setError(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleConfirmRoleChange}
                disabled={!selectedFranchiseForRole || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                이름
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                이메일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                역할
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                전화번호
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                배정 매장
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                근무여부
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {approvedUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  등록된 사용자가 없습니다.
                </td>
              </tr>
            ) : (
              approvedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {(user as any).email || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-2">
                      {user.role === 'business_owner' || user.role === 'platform_admin' ? (
                        <div className="text-sm font-medium text-gray-900">
                          {getRoleLabel(user.role)}
                        </div>
                      ) : (
                        <>
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                            disabled={loading}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                          >
                            <option value="staff">직원</option>
                            <option value="manager">매니저</option>
                            <option value="franchise_manager">프렌차이즈관리자</option>
                            <option value="store_manager">매장관리자(점주)</option>
                            <option value="subcontract_individual">도급(개인)</option>
                            <option value="subcontract_company">도급(업체)</option>
                          </select>
                          {user.role === 'franchise_manager' && user.franchise_id && (
                            <div className="text-xs text-gray-500">
                              {franchises.find(f => f.id === user.franchise_id)?.name || '프렌차이즈 연결됨'}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.phone || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {getUserStores(user.id).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {getUserStores(user.id).map((store) => (
                            <span
                              key={store.id}
                              className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                            >
                              {store.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">배정 없음</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.employment_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.employment_active ? '근무중' : '퇴사'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(user)}
                      disabled={showCreateForm || (showForm && editingUser?.id !== user.id) || showAssign}
                      className={`mr-4 ${
                        showCreateForm || (showForm && editingUser?.id !== user.id) || showAssign
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-blue-600 hover:text-blue-900'
                      }`}
                      title={
                        showCreateForm
                          ? '새 사용자 추가를 완료하거나 취소한 후 수정할 수 있습니다.'
                          : showForm && editingUser?.id !== user.id
                          ? `"${editingUser?.name}" 사용자 수정을 완료하거나 취소한 후 수정할 수 있습니다.`
                          : showAssign
                          ? '매장 배정을 완료하거나 취소한 후 수정할 수 있습니다.'
                          : ''
                      }
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleAssign(user)}
                      disabled={showCreateForm || showForm || (showAssign && assigningUser?.id !== user.id)}
                      className={
                        showCreateForm || showForm || (showAssign && assigningUser?.id !== user.id)
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-green-600 hover:text-green-900'
                      }
                      title={
                        showCreateForm
                          ? '새 사용자 추가를 완료하거나 취소한 후 매장 배정할 수 있습니다.'
                          : showForm
                          ? `"${editingUser?.name}" 사용자 수정을 완료하거나 취소한 후 매장 배정할 수 있습니다.`
                          : showAssign && assigningUser?.id !== user.id
                          ? `"${assigningUser?.name}" 사용자의 매장 배정을 완료하거나 취소한 후 매장 배정할 수 있습니다.`
                          : ''
                      }
                    >
                      매장 배정
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

