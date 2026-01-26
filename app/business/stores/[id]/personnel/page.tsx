'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { User } from '@/types/db'

interface StorePersonnel {
  franchise_managers: User[]
  store_managers: User[]
  staff: User[]
  managers: User[]
  subcontract_individuals: User[]
  subcontract_companies: User[]
}

export default function StorePersonnelPage() {
  const params = useParams()
  const router = useRouter()
  const storeId = params.id as string

  const [storeName, setStoreName] = useState('')
  const [personnel, setPersonnel] = useState<StorePersonnel>({
    franchise_managers: [],
    store_managers: [],
    staff: [],
    managers: [],
    subcontract_individuals: [],
    subcontract_companies: [],
  })
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAssignForm, setShowAssignForm] = useState(false)

  useEffect(() => {
    loadStoreInfo()
    loadPersonnel()
    loadAllUsers()
  }, [storeId])

  const loadStoreInfo = async () => {
    try {
      const response = await fetch(`/api/business/stores/${storeId}`)
      const data = await response.json()

      if (response.ok && data.data) {
        setStoreName(data.data.name || '')
      }
    } catch (err) {
      console.error('Error loading store info:', err)
    }
  }

  const loadPersonnel = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/business/stores/${storeId}/users`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '인원 정보를 불러오는데 실패했습니다.')
      }

      setPersonnel(data)
      setSelectedUserIds([
        ...data.franchise_managers.map((u: User) => u.id),
        ...data.store_managers.map((u: User) => u.id),
        ...data.staff.map((u: User) => u.id),
        ...data.managers.map((u: User) => u.id),
        ...(data.subcontract_individuals || []).map((u: User) => u.id),
        ...(data.subcontract_companies || []).map((u: User) => u.id),
      ])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadAllUsers = async () => {
    try {
      const response = await fetch('/api/business/users')
      const data = await response.json()

      if (response.ok && data.users) {
        setAllUsers(data.users)
      }
    } catch (err) {
      console.error('Error loading users:', err)
    }
  }

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/business/stores/${storeId}/users`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_ids: selectedUserIds,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '인원 배정에 실패했습니다.')
      }

      await loadPersonnel()
      setShowAssignForm(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      franchise_manager: '프렌차이즈 관리자',
      store_manager: '매장 관리자(점주)',
      staff: '직원',
      manager: '매니저',
      subcontract_individual: '도급(개인)',
      subcontract_company: '도급(업체)',
    }
    return labels[role] || role
  }

  const filteredUsers = allUsers.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm))
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole && user.employment_active
  })

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{storeName || '매장 인원 관리'}</h1>
          <Link
            href="/business/stores"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← 매장 관리로
          </Link>
        </div>
        <button
          onClick={() => setShowAssignForm(!showAssignForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showAssignForm ? '취소' : '+ 인원 배정'}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {showAssignForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">인원 배정</h2>

          {/* 검색 및 필터 */}
          <div className="mb-4 space-y-4">
            <div>
              <input
                type="text"
                placeholder="이름 또는 전화번호로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">전체</option>
                <option value="franchise_manager">프렌차이즈 관리자</option>
                <option value="store_manager">매장 관리자(점주)</option>
                <option value="staff">직원</option>
                <option value="manager">매니저</option>
                <option value="subcontract_individual">도급(개인)</option>
                <option value="subcontract_company">도급(업체)</option>
              </select>
            </div>
          </div>

          {/* 사용자 목록 */}
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md p-4 mb-4">
            {filteredUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">검색 결과가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => handleToggleUser(user.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500">
                        {getRoleLabel(user.role)} {user.phone && `· ${user.phone}`}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowAssignForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 프렌차이즈 관리자 */}
          {personnel.franchise_managers.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">프렌차이즈 관리자</h2>
              <div className="space-y-2">
                {personnel.franchise_managers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{user.name}</div>
                      {user.phone && <div className="text-sm text-gray-500">{user.phone}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 매장 관리자(점주) */}
          {personnel.store_managers.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">매장 관리자(점주)</h2>
              <div className="space-y-2">
                {personnel.store_managers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{user.name}</div>
                      {user.phone && <div className="text-sm text-gray-500">{user.phone}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 매니저 */}
          {personnel.managers.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">매니저</h2>
              <div className="space-y-2">
                {personnel.managers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{user.name}</div>
                      {user.phone && <div className="text-sm text-gray-500">{user.phone}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 직원 */}
          {personnel.staff.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">직원</h2>
              <div className="space-y-2">
                {personnel.staff.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{user.name}</div>
                      {user.phone && <div className="text-sm text-gray-500">{user.phone}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 도급(개인) */}
          {personnel.subcontract_individuals && personnel.subcontract_individuals.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">도급(개인)</h2>
              <div className="space-y-2">
                {personnel.subcontract_individuals.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{user.name}</div>
                      {user.phone && <div className="text-sm text-gray-500">{user.phone}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 도급(업체) */}
          {personnel.subcontract_companies && personnel.subcontract_companies.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">도급(업체)</h2>
              <div className="space-y-2">
                {personnel.subcontract_companies.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{user.name}</div>
                      {user.phone && <div className="text-sm text-gray-500">{user.phone}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {personnel.franchise_managers.length === 0 &&
            personnel.store_managers.length === 0 &&
            personnel.managers.length === 0 &&
            personnel.staff.length === 0 &&
            (!personnel.subcontract_individuals || personnel.subcontract_individuals.length === 0) &&
            (!personnel.subcontract_companies || personnel.subcontract_companies.length === 0) && (
              <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
                배정된 인원이 없습니다.
              </div>
            )}
        </div>
      )}
    </div>
  )
}











