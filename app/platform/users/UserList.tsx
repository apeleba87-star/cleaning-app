'use client'

import { useState, useMemo } from 'react'
import { User, UserRole, Store } from '@/types/db'
import CreateUserForm from './CreateUserForm'
import UserForm from './UserForm'

interface CompanyWithPlan {
  id: string
  name: string
  subscription_plan?: string | null
  subscription_status?: string | null
  trial_ends_at?: string | null
}

interface UserWithCompany extends User {
  companies: CompanyWithPlan | null
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

const ITEMS_PER_PAGE = 20

export default function UserList({ initialUsers, stores, companies, userStoreMap }: UserListProps) {
  const [users, setUsers] = useState<UserWithCompany[]>(initialUsers)
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all')
  const [filterCompany, setFilterCompany] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithCompany | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserWithCompany | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredUsers = useMemo(() => users.filter(user => {
    if (filterRole !== 'all' && user.role !== filterRole) return false
    if (filterCompany !== 'all' && user.company_id !== filterCompany) return false
    return true
  }), [users, filterRole, filterCompany])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE))
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredUsers, currentPage])

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

  /** 업체 요금제 표시 (업체관리자만 회사 소속이 있으므로 해당 회사 기준) */
  const getPlanDisplay = (user: UserWithCompany) => {
    const company = user.companies
    if (!company) return { label: '-', freeUntil: null }
    const plan = company.subscription_plan || 'free'
    const label = plan === 'free' ? '무료' : plan === 'basic' ? '베이직' : plan === 'premium' ? '프리미엄' : plan
    const freeUntil = plan === 'free' && company.trial_ends_at ? company.trial_ends_at : null
    return { label, freeUntil }
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
    <div className="w-full min-w-0">
      <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <select
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value as UserRole | 'all'); setCurrentPage(1) }}
            className="px-3 py-2 sm:px-4 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
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
            onChange={(e) => { setFilterCompany(e.target.value); setCurrentPage(1) }}
            className="px-3 py-2 sm:px-4 sm:py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0 max-w-full"
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
          className="bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base whitespace-nowrap"
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

      {/* 데스크톱: 테이블 */}
      <div className="hidden md:block bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-4 lg:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
              <th className="px-3 sm:px-4 lg:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이메일</th>
              <th className="px-3 sm:px-4 lg:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">역할</th>
              <th className="px-3 sm:px-4 lg:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">회사</th>
              <th className="px-3 sm:px-4 lg:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">요금제</th>
              <th className="px-3 sm:px-4 lg:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">전화번호</th>
              <th className="px-3 sm:px-4 lg:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">배정 매장</th>
              <th className="px-3 sm:px-4 lg:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">근무여부</th>
              <th className="px-3 sm:px-4 lg:px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가입일</th>
              <th className="px-3 sm:px-4 lg:px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 whitespace-nowrap w-28">작업</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-gray-500 text-sm">
                  사용자가 없습니다.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => {
                const plan = getPlanDisplay(user)
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-4 lg:px-5 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-3 sm:px-4 lg:px-5 py-3 whitespace-nowrap text-sm text-gray-500">{user.email || '-'}</td>
                    <td className="px-3 sm:px-4 lg:px-5 py-3 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{getRoleLabel(user.role)}</span>
                    </td>
                    <td className="px-3 sm:px-4 lg:px-5 py-3 whitespace-nowrap text-sm text-gray-500">{user.companies?.name || '-'}</td>
                    <td className="px-3 sm:px-4 lg:px-5 py-3 whitespace-nowrap text-sm">
                      <span className={plan.label === '무료' ? 'text-amber-600 font-medium' : plan.label === '베이직' ? 'text-blue-600' : ''}>{plan.label}</span>
                      {plan.freeUntil && (
                        <div className="text-xs text-gray-500 mt-0.5">~{new Date(plan.freeUntil).toLocaleDateString('ko-KR')}</div>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 lg:px-5 py-3 whitespace-nowrap text-sm text-gray-500">{user.phone || '-'}</td>
                    <td className="px-3 sm:px-4 lg:px-5 py-3 text-sm text-gray-500">
                      {getUserStores(user.id).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {getUserStores(user.id).slice(0, 2).map((store) => (
                            <span key={store.id} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{store.name}</span>
                          ))}
                          {getUserStores(user.id).length > 2 && <span className="text-xs text-gray-400">+{getUserStores(user.id).length - 2}</span>}
                        </div>
                      ) : (
                        <span className="text-gray-400">배정 없음</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 lg:px-5 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.employment_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.employment_active ? '근무중' : '퇴사'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 lg:px-5 py-3 whitespace-nowrap text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString('ko-KR')}</td>
                    <td className="px-3 sm:px-4 lg:px-5 py-3 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white hover:bg-gray-50">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(user)} className="px-2 py-1 text-blue-600 hover:text-blue-900 hover:underline">수정</button>
                        <button onClick={() => handleDeleteClick(user)} className="px-2 py-1 text-red-600 hover:text-red-900 hover:underline" disabled={!!deletingId}>삭제</button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 모바일: 카드 목록 */}
      <div className="md:hidden space-y-3">
        {paginatedUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500 text-sm">사용자가 없습니다.</div>
        ) : (
          paginatedUsers.map((user) => {
            const plan = getPlanDisplay(user)
            const storesList = getUserStores(user.id)
            return (
              <div key={user.id} className="bg-white rounded-lg shadow p-4 border border-gray-100">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email || '-'}</p>
                  </div>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 shrink-0">{getRoleLabel(user.role)}</span>
                </div>
                <dl className="grid grid-cols-1 gap-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">회사</dt>
                    <dd className="text-gray-900">{user.companies?.name || '-'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">요금제</dt>
                    <dd>
                      <span className={plan.label === '무료' ? 'text-amber-600 font-medium' : ''}>{plan.label}</span>
                      {plan.freeUntil && <span className="text-xs text-gray-500 ml-1">~{new Date(plan.freeUntil).toLocaleDateString('ko-KR')}</span>}
                    </dd>
                  </div>
                  {user.phone && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">전화</dt>
                      <dd className="text-gray-900">{user.phone}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-500">배정 매장</dt>
                    <dd className="text-gray-900">{storesList.length > 0 ? storesList.map(s => s.name).join(', ') : '배정 없음'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">근무</dt>
                    <dd><span className={user.employment_active ? 'text-green-600' : 'text-red-600'}>{user.employment_active ? '근무중' : '퇴사'}</span></dd>
                  </div>
                </dl>
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => handleEdit(user)} className="flex-1 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50">수정</button>
                  <button onClick={() => handleDeleteClick(user)} className="flex-1 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50" disabled={!!deletingId}>삭제</button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-0 sm:px-1">
          <p className="text-sm text-gray-600">
            전체 <span className="font-medium">{filteredUsers.length}</span>명 · {currentPage} / {totalPages}페이지
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              .map((p, i, arr) => (
                <span key={p}>
                  {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-gray-400">…</span>}
                  <button
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1.5 text-sm rounded-md ${currentPage === p ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

