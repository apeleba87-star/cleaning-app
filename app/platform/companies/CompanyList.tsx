'use client'

import { useState } from 'react'
import { Company } from '@/types/db'
import CompanyForm from './CompanyForm'
import AssignOwnerModal from './AssignOwnerModal'

interface CompanyWithStats extends Company {
  storeCount: number
  userCount: number
}

interface CompanyListProps {
  initialCompanies: CompanyWithStats[]
}

export default function CompanyList({ initialCompanies }: CompanyListProps) {
  const [companies, setCompanies] = useState<CompanyWithStats[]>(initialCompanies)
  const [editingCompany, setEditingCompany] = useState<CompanyWithStats | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [assigningOwner, setAssigningOwner] = useState<CompanyWithStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = () => {
    setEditingCompany(null)
    setShowForm(true)
    setError(null)
  }

  const handleEdit = (company: CompanyWithStats) => {
    setEditingCompany(company)
    setShowForm(true)
    setError(null)
  }

  const handleFormSuccess = (company: Company) => {
    if (editingCompany) {
      setCompanies(companies.map((c) => (c.id === company.id ? { ...company, storeCount: c.storeCount, userCount: c.userCount } : c)))
    } else {
      setCompanies([{ ...company, storeCount: 0, userCount: 0 }, ...companies])
    }
    setShowForm(false)
    setEditingCompany(null)
    setError(null)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingCompany(null)
    setError(null)
  }

  const handleAssignOwner = (company: CompanyWithStats) => {
    setAssigningOwner(company)
    setError(null)
  }

  const handleAssignOwnerSuccess = () => {
    setAssigningOwner(null)
    window.location.reload() // 데이터 새로고침
  }

  const handleAssignOwnerCancel = () => {
    setAssigningOwner(null)
  }

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'free':
        return '무료'
      case 'basic':
        return '베이직'
      case 'premium':
        return '프리미엄'
      default:
        return plan
    }
  }

  const getPlanBadgeClass = (plan: string) => {
    switch (plan) {
      case 'free':
        return 'bg-slate-100 text-slate-700'
      case 'basic':
        return 'bg-blue-100 text-blue-700'
      case 'premium':
        return 'bg-violet-100 text-violet-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '활성'
      case 'suspended':
        return '중지'
      case 'cancelled':
        return '취소'
      default:
        return status
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getTrialInfo = (company: CompanyWithStats) => {
    if (company.subscription_plan !== 'free') {
      return { label: '-', className: 'text-gray-400' }
    }

    if (!company.trial_ends_at || Number.isNaN(Date.parse(company.trial_ends_at))) {
      return { label: '종료일 없음', className: 'text-red-600 font-medium' }
    }

    const endDate = new Date(company.trial_ends_at)
    const now = new Date()
    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
    const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const diffDays = Math.ceil((endDay.getTime() - nowDay.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { label: '만료', className: 'text-red-700 font-semibold' }
    }
    if (diffDays === 0) {
      return { label: '오늘 만료', className: 'text-orange-700 font-semibold' }
    }
    if (diffDays <= 3) {
      return { label: `D-${diffDays}`, className: 'text-orange-600 font-semibold' }
    }
    if (diffDays <= 7) {
      return { label: `D-${diffDays}`, className: 'text-amber-600 font-medium' }
    }
    return { label: `D-${diffDays}`, className: 'text-slate-600' }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          + 새 회사 추가
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="mb-6">
          <CompanyForm
            company={editingCompany}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      {assigningOwner && (
        <AssignOwnerModal
          company={assigningOwner}
          onSuccess={handleAssignOwnerSuccess}
          onCancel={handleAssignOwnerCancel}
        />
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                회사명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                요금제
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                무료체험
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                베이직 결제 수
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                프리미엄 결제 수
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                매장 수
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                직원 수
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                가입일
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {companies.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                  등록된 회사가 없습니다.
                </td>
              </tr>
            ) : (
              companies.map((company) => {
                const trialInfo = getTrialInfo(company)
                return (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {company.name}
                    </div>
                    {company.address && (
                      <div className="text-xs text-gray-500 mt-1">
                        {company.address}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadgeClass(company.subscription_plan)}`}>
                      {getPlanLabel(company.subscription_plan)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm ${trialInfo.className}`}>
                      {trialInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {Number(company.basic_units ?? 0)}개
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {Number(company.premium_units ?? 0)}개
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(company.subscription_status)}`}
                    >
                      {getStatusLabel(company.subscription_status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {company.storeCount}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {company.userCount}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(company.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleAssignOwner(company)}
                        className="text-green-600 hover:text-green-900"
                      >
                        업체관리자 지정
                      </button>
                      <button
                        onClick={() => handleEdit(company)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        수정
                      </button>
                    </div>
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

