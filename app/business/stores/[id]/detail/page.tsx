'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface StoreDetailData {
  date: string
  attendance_count: number
  checklist_count: number
  checklist_completed: number
  issue_count: number
  supply_request_count: number
  cleaning_photo_count: number
  inventory_photo_count: number
}

export default function StoreDetailPage() {
  const params = useParams()
  const router = useRouter()
  const storeId = params.id as string

  const [storeName, setStoreName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'7days' | 'custom'>('7days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [detailData, setDetailData] = useState<StoreDetailData[]>([])

  useEffect(() => {
    loadStoreInfo()
    loadDetailData()
  }, [storeId, dateRange, customStartDate, customEndDate])

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

  const loadDetailData = async () => {
    try {
      setLoading(true)
      let startDate: string
      let endDate: string = new Date().toISOString().split('T')[0]

      if (dateRange === '7days') {
        const date = new Date()
        date.setDate(date.getDate() - 7)
        startDate = date.toISOString().split('T')[0]
      } else {
        if (!customStartDate || !customEndDate) {
          setLoading(false)
          return
        }
        startDate = customStartDate
        endDate = customEndDate

        // 최대 3개월 체크
        const start = new Date(startDate)
        const end = new Date(endDate)
        const diffTime = Math.abs(end.getTime() - start.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays > 90) {
          setError('날짜 범위는 최대 3개월(90일)까지 선택 가능합니다.')
          setLoading(false)
          return
        }
      }

      const response = await fetch(
        `/api/business/stores/${storeId}/detail?start_date=${startDate}&end_date=${endDate}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '데이터를 불러오는데 실패했습니다.')
      }

      setDetailData(data.data || [])
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const dayName = dayNames[date.getDay()]
    return `${month}월 ${day}일 (${dayName})`
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{storeName || '매장 상세'}</h1>
          <Link
            href="/business/stores/status"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← 매장 상태로
          </Link>
        </div>
        <Link
          href={`/business/stores/${storeId}/request`}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          요청란 보내기
        </Link>
      </div>

      {/* 날짜 선택 */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="7days"
                checked={dateRange === '7days'}
                onChange={(e) => setDateRange(e.target.value as '7days' | 'custom')}
                className="mr-2"
              />
              최근 7일
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="custom"
                checked={dateRange === 'custom'}
                onChange={(e) => setDateRange(e.target.value as '7days' | 'custom')}
                className="mr-2"
              />
              날짜 선택 (최대 3개월)
            </label>
          </div>

          {dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm text-gray-600 mb-1">시작일</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">종료일</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  날짜
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  출근
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  체크리스트
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  문제보고
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  물품요청
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  관리사진
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  입고/보관사진
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {detailData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                detailData.map((data) => (
                  <tr key={data.date} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(data.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{data.attendance_count}명</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {data.checklist_completed}/{data.checklist_count}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{data.issue_count}건</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{data.supply_request_count}건</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{data.cleaning_photo_count}건</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{data.inventory_photo_count}건</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}





