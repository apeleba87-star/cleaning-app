'use client'

import { useState } from 'react'
import { User, UserRole, Store } from '@/types/db'
import CreateUserForm from './CreateUserForm'
import UserForm from './UserForm'

interface UserWithCompany extends User {
  companies: { id: string; name: string } | null
  email?: string | null
}

interface Company {
  id: string
  name: string
}

// UserList에서 사용하는 최소 필드 타입
type PlatformUserListStore = Pick<Store, 'id' | 'name' | 'company_id'>

interface UserListProps {
  initialUsers: UserWithCompany[]
  stores: PlatformUserListStore[]
  companies: Company[]
  userStoreMap: Map<string, string[]>
}

export default function UserList({ initialUsers, stores, companies, userStoreMap }: UserListProps) {
  const [users, setUsers] = useState<UserWithCompany[]>(initialUsers)
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all')
  const [filterCompany, setFilterCompany] = useState<string>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithCompany | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserWithCompany | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredUsers = users.filter(user => {
    if (filterRole !== 'all' && user.role !== filterRole) return false
    if (filterCompany !== 'all' && user.company_id !== filterCompany) return false
    return true
  })

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

  const uniqueCompanies = Array.from(
    new Set(users.map(u => u.company_id).filter(Boolean))
  )

  const handleCreateSuccess = () => {
    setShowCreateForm(false)
    window.location.reload()
  }

  const handleCreateCancel = () => {
    setShowCreateForm(false)
  }

  const handleEdit = (user: UserWithCompany) => {
    setEditingUser(user)
    setShowEditForm(true)
    setShowCreateForm(false)
  }

  const handleEditSuccess = (updatedUser: UserWithCompany) => {
    setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)))
    setShowEditForm(false)
    setEditingUser(null)
    window.location.reload() // 데이터 새로고침
  }

  const handleEditCancel = () => {
    setShowEditForm(false)
    setEditingUser(null)
  }

  const handleDeleteClick = (user: UserWithCompany) => {
    setDeleteConfirmUser(user)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmUser) return
    setDeletingId(deleteConfirmUser.id)
    try {
      const res = await fetch(`/api/platform/users/${deleteConfirmUser.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data?.error || '삭제에 실패했습니다.')
        return
      }
      setUsers(users.filter((u) => u.id !== deleteConfirmUser.id))
      setDeleteConfirmUser(null)
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmUser(null)
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <div className="flex space-x-2">
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">전체 역할</option>
          <option value="platform_admin">시스템관리자</option>
          <option value="business_owner">업체관리자</option>
          <option value="admin">관리자</option>
          <option value="manager">매니저</option>
          <option value="staff">직원</option>
        </select>

        <select
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">전체 회사</option>
          {uniqueCompanies.map(companyId => {
            const user = users.find(u => u.company_id === companyId)
            return (
              <option key={companyId} value={companyId}>
                {user?.companies?.name || '회사 없음'}
              </option>
            )
          })}
        </select>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          + 새 사용자 추가
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6">
          <CreateUserForm
            stores={stores}
            companies={companies}
            onSuccess={handleCreateSuccess}
            onCancel={handleCreateCancel}
          />
        </div>
      )}

      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">사용자 삭제</h3>
            <p className="text-gray-600 mb-4">
              <span className="font-medium">{deleteConfirmUser.name}</span>
              ({deleteConfirmUser.email || deleteConfirmUser.id})를
              삭제하시겠습니까? 사용자와 연관된 세션·매장 배정·출퇴근·인건비 등 모든 데이터가 삭제됩니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleDeleteCancel}
                disabled={!!deletingId}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={!!deletingId}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deletingId ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditForm && editingUser && (
        <div className="mb-6">
          <UserForm
            user={editingUser}
            stores={stores}
            companies={companies}
            initialStoreIds={userStoreMap.get(editingUser.id) || []}
            onSuccess={handleEditSuccess}
            onCancel={handleEditCancel}
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full min-w-[900px]">
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
                회사
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                가입일
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 whitespace-nowrap w-28">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                  사용자가 없습니다.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.email || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.companies?.name || '-'}
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
                          {getUserStores(user.id).slice(0, 2).map((store) => (
                            <span
                              key={store.id}
                              className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                            >
                              {store.name}
                            </span>
                          ))}
                          {getUserStores(user.id).length > 2 && (
                            <span className="text-xs text-gray-400">
                              +{getUserStores(user.id).length - 2}
                            </span>
                          )}
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white hover:bg-gray-50">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="px-2 py-1 text-blue-600 hover:text-blue-900 hover:underline"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user)}
                        className="px-2 py-1 text-red-600 hover:text-red-900 hover:underline"
                        disabled={!!deletingId}
                      >
                        삭제
                      </button>
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

