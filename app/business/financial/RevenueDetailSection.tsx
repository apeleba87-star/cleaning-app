'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Revenue {
  id: string
  store_id: string
  service_period: string
  amount: number
  due_date: string
  status: 'unpaid' | 'partial' | 'paid'
  billing_memo: string | null
  stores: {
    id: string
    name: string
  } | null
}

interface RevenueDetailSectionProps {
  period: string
  onRefresh: () => void
}

export default function RevenueDetailSection({ period, onRefresh }: RevenueDetailSectionProps) {
  const [revenues, setRevenues] = useState<Revenue[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadRevenues()
  }, [period])

  const loadRevenues = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/business/revenues?period=${period}`)
      if (!response.ok) {
        throw new Error('매출 데이터를 불러올 수 없습니다.')
      }
      const data = await response.json()
      if (data.success) {
        setRevenues(data.data || [])
      }
    } catch (error: any) {
      console.error('Error loading revenues:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">완납</span>
      case 'partial':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">부분수금</span>
      case 'unpaid':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">미수금</span>
      default:
        return null
    }
  }

  const filteredRevenues = revenues.filter((revenue) => {
    const matchesSearch = revenue.stores?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false
    const matchesStatus = statusFilter === 'all' || revenue.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalAmount = filteredRevenues.reduce((sum, r) => sum + (r.amount || 0), 0)

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">매출 데이터를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">매출 상세</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="매장명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체</option>
            <option value="unpaid">미수금</option>
            <option value="partial">부분수금</option>
            <option value="paid">완납</option>
          </select>
        </div>
      </div>

      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">총 매출:</span>
          <span className="text-lg font-bold text-blue-600">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm font-medium text-gray-700">건수:</span>
          <span className="text-lg font-bold text-gray-900">{filteredRevenues.length}건</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                매장명
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                청구일
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                금액
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                메모
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRevenues.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  매출 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              filteredRevenues.map((revenue) => (
                <tr key={revenue.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {revenue.stores?.name || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(revenue.due_date)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                    {formatCurrency(revenue.amount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getStatusBadge(revenue.status)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {revenue.billing_memo || '-'}
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



