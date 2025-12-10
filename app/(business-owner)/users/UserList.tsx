'use client'

import { useState } from 'react'
import { User, UserRole } from '@/types/db'
import { Store } from '@/types/db'
import UserForm from './UserForm'
import UserStoreAssign from './UserStoreAssign'
import CreateUserForm from './CreateUserForm'

interface UserListProps {
  initialUsers: User[]
  stores: Store[]
  userStoreMap: Map<string, string[]>
  companyId: string
}

export default function UserList({ initialUsers, stores, userStoreMap, companyId }: UserListProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [assigningUser, setAssigningUser] = useState<User | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = () => {
    setEditingUser(null)
    setShowCreateForm(true)
    setShowForm(false)
    setError(null)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setShowForm(true)
    setShowCreateForm(false)
    setError(null)
  }

  const handleAssign = (user: User) => {
    setAssigningUser(user)
    setShowAssign(true)
    setError(null)
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/business/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '역할 변경에 실패했습니다.')
      }

      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFormSuccess = (user: User) => {
    if (editingUser) {
      setUsers(users.map((u) => (u.id === user.id ? user : u)))
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
      case 'admin':
        return '관리자'
      case 'manager':
        return '매니저'
      case 'staff':
        return '직원'
      default:
        return role
    }
  }

  const getUserStores = (userId: string) => {
    const storeIds = userStoreMap.get(userId) || []
    return stores.filter((s) => storeIds.includes(s.id))
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          + 새 직원 초대
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {showCreateForm && (
        <div className="mb-6">
          <CreateUserForm
            stores={stores}
            companyId={companyId}
            onSuccess={handleCreateSuccess}
            onCancel={handleCreateCancel}
          />
        </div>
      )}

      {showForm && editingUser && (
        <div className="mb-6">
          <UserForm
            user={editingUser}
            stores={stores}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      {showAssign && assigningUser && (
        <div className="mb-6">
          <UserStoreAssign
            user={assigningUser}
            stores={stores}
            assignedStoreIds={userStoreMap.get(assigningUser.id) || []}
            onSuccess={handleAssignSuccess}
            onCancel={handleAssignCancel}
          />
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
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  등록된 직원이 없습니다.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                      disabled={loading || user.role === 'business_owner' || user.role === 'platform_admin'}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="staff">직원</option>
                      <option value="manager">매니저</option>
                      <option value="business_owner">업체관리자</option>
                    </select>
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
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleAssign(user)}
                      className="text-green-600 hover:text-green-900"
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



