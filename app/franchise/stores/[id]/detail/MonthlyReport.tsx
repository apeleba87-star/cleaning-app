'use client'

import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface MonthlyReportData {
  store_name: string
  year: number
  month: number
  summary: {
    total_days: number
    management_completion_rate: number
    checklist_completion_rate: number
    total_problems: number
    total_lost_items: number
    total_requests: number
    request_completion_rate: number
    management_days: number
    // 전달대비 데이터
    prev_management_completion_rate?: number
    prev_checklist_completion_rate?: number
    prev_total_problems?: number
    prev_user_coverage?: number
    management_rate_diff?: number
    checklist_rate_diff?: number
    problem_diff?: number
    user_coverage_diff?: number
  }
  daily_stats: Array<{
    date: string
    attendance_count: number
    attendance_completed: number
    checklist_count: number
    checklist_completed: number
    problem_count: number
    lost_item_count: number
    request_count: number
    request_completed: number
  }>
  weekly_stats: Array<{
    week: number
    attendance_count: number
    attendance_completed: number
    checklist_count: number
    checklist_completed: number
    problem_count: number
    request_count: number
    request_completed: number
  }>
  problem_type_stats: { [type: string]: number }
  request_status_stats: { [status: string]: number }
}

interface MonthlyReportProps {
  storeId: string
  storeName?: string
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function MonthlyReport({ storeId, storeName }: MonthlyReportProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<MonthlyReportData | null>(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [shareUrl, setShareUrl] = useState('')
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadReportData()
    updateShareUrl()
  }, [storeId, selectedYear, selectedMonth])

  const updateShareUrl = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', 'monthlyReport')
    url.searchParams.set('year', selectedYear.toString())
    url.searchParams.set('month', selectedMonth.toString())
    setShareUrl(url.toString())
  }

  const loadReportData = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/franchise/stores/${storeId}/monthly-report?year=${selectedYear}&month=${selectedMonth}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '리포트 데이터를 불러오는데 실패했습니다.')
      }

      setReportData(data.data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const fileName = `${reportData?.store_name || storeName || '매장'}_${selectedYear}년_${selectedMonth}월_리포트.pdf`
      pdf.save(fileName)
    } catch (err) {
      console.error('PDF 생성 실패:', err)
      alert('PDF 다운로드에 실패했습니다.')
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      alert('링크가 클립보드에 복사되었습니다!')
    } catch (err) {
      console.error('링크 복사 실패:', err)
      alert('링크 복사에 실패했습니다.')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  const getMonthName = (month: number) => {
    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
    return months[month - 1]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500">
        리포트 데이터가 없습니다.
      </div>
    )
  }

  // 일별 완료율 데이터 (차트용)
  const dailyCompletionData = reportData.daily_stats.map((stat) => ({
    date: formatDate(stat.date),
    관리완료율: stat.attendance_count > 0 ? Math.round((stat.attendance_completed / stat.attendance_count) * 100) : 0,
    체크리스트완료율: stat.checklist_count > 0 ? Math.round((stat.checklist_completed / stat.checklist_count) * 100) : 0,
  }))

  // 주차별 데이터
  const weeklyData = reportData.weekly_stats.map((stat) => ({
    주차: `${stat.week}주차`,
    관리완료율: stat.attendance_count > 0 ? Math.round((stat.attendance_completed / stat.attendance_count) * 100) : 0,
    체크리스트완료율: stat.checklist_count > 0 ? Math.round((stat.checklist_completed / stat.checklist_count) * 100) : 0,
    문제건수: stat.problem_count,
    요청건수: stat.request_count,
  }))

  // 문제 유형별 데이터
  const problemTypeData = Object.entries(reportData.problem_type_stats).map(([name, value]) => ({
    name,
    value,
  }))

  // 요청 상태별 데이터
  const requestStatusData = Object.entries(reportData.request_status_stats).map(([name, value]) => ({
    name: name === 'received' ? '접수' : name === 'in_progress' ? '처리중' : name === 'completed' ? '처리완료' : name === 'rejected' ? '반려' : name,
    value,
  }))

  // 평균 계산
  const avgManagementRate = reportData.daily_stats.length > 0
    ? Math.round(reportData.daily_stats.reduce((sum, stat) => {
        const rate = stat.attendance_count > 0 ? (stat.attendance_completed / stat.attendance_count) * 100 : 0
        return sum + rate
      }, 0) / reportData.daily_stats.length)
    : 0

  const avgChecklistRate = reportData.daily_stats.length > 0
    ? Math.round(reportData.daily_stats.reduce((sum, stat) => {
        const rate = stat.checklist_count > 0 ? (stat.checklist_completed / stat.checklist_count) * 100 : 0
        return sum + rate
      }, 0) / reportData.daily_stats.length)
    : 0

  return (
    <div className="space-y-6">
      {/* 헤더 - 월 선택 및 액션 버튼 */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">{reportData.store_name || storeName || '매장'} 월간 리포트</h2>
            <div className="flex items-center gap-4">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <option key={year} value={year} className="text-gray-900">
                    {year}년
                  </option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month} className="text-gray-900">
                    {month}월
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-md hover:bg-white/30 transition-colors flex items-center gap-2"
            >
              <span>🔗</span>
              <span>공유</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-white text-purple-600 rounded-md hover:bg-gray-100 transition-colors font-semibold flex items-center gap-2"
            >
              <span>📥</span>
              <span>PDF 다운로드</span>
            </button>
          </div>
        </div>
      </div>

      {/* 리포트 내용 */}
      <div ref={reportRef} className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* KPI 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 관리 완료율 */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform relative">
            <div className="absolute top-3 right-3">
              <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm opacity-90 mb-2">관리 완료율</div>
            <div className="text-3xl font-bold mb-2">{reportData.summary.management_completion_rate}%</div>
            {reportData.summary.management_rate_diff !== undefined && reportData.summary.management_rate_diff !== 0 && (
              <div className="flex items-center gap-1 text-xs opacity-90">
                <span>전달대비</span>
                <span className={reportData.summary.management_rate_diff > 0 ? 'text-green-200' : 'text-red-200'}>
                  {reportData.summary.management_rate_diff > 0 ? '+' : ''}{reportData.summary.management_rate_diff}점
                </span>
                {reportData.summary.management_rate_diff > 0 ? (
                  <svg className="w-4 h-4 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
                <span className="ml-1">({reportData.summary.management_rate_diff > 0 ? '+' : ''}{Math.abs(reportData.summary.management_rate_diff)}%)</span>
              </div>
            )}
            <div className="text-xs opacity-75 mt-2">관리일수: {reportData.summary.management_days}일</div>
          </div>

          {/* 체크리스트 완료율 */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform relative">
            <div className="absolute top-3 right-3">
              <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="text-sm opacity-90 mb-2">체크리스트 완료율</div>
            <div className="text-3xl font-bold mb-2">{reportData.summary.checklist_completion_rate}%</div>
            {reportData.summary.checklist_rate_diff !== undefined && reportData.summary.checklist_rate_diff !== 0 && (
              <div className="flex items-center gap-1 text-xs opacity-90 mb-1">
                <span className={reportData.summary.checklist_rate_diff > 0 ? 'text-green-200' : 'text-red-200'}>
                  {reportData.summary.checklist_rate_diff > 0 ? '+' : ''}{reportData.summary.checklist_rate_diff}%
                </span>
                {reportData.summary.checklist_rate_diff > 0 && (
                  <svg className="w-4 h-4 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                )}
              </div>
            )}
            <div className="text-xs opacity-75">총 {reportData.summary.total_days}일</div>
          </div>

          {/* 문제 보고 */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform relative">
            <div className="absolute top-3 right-3">
              <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-sm opacity-90 mb-2">문제 보고</div>
            <div className="text-3xl font-bold mb-2">{reportData.summary.total_problems}건</div>
            {reportData.summary.problem_diff !== undefined && reportData.summary.problem_diff !== 0 && (
              <div className="flex items-center gap-1 text-xs opacity-90">
                <span>전달대비</span>
                <span className={reportData.summary.problem_diff < 0 ? 'text-green-200' : 'text-red-200'}>
                  {reportData.summary.problem_diff > 0 ? '+' : ''}{reportData.summary.problem_diff}건
                </span>
                {reportData.summary.problem_diff < 0 && (
                  <svg className="w-4 h-4 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                )}
                {reportData.summary.problem_diff > 0 && (
                  <svg className="w-4 h-4 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
              </div>
            )}
            <div className="text-xs opacity-75 mt-2">분실물: {reportData.summary.total_lost_items}건</div>
          </div>

          {/* 요청 처리 */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform relative">
            <div className="absolute top-3 right-3">
              <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm opacity-90 mb-2">요청 처리</div>
            <div className="text-3xl font-bold mb-2">{reportData.summary.total_requests}건</div>
            <div className="text-xs opacity-75 mt-2">완료율: {reportData.summary.request_completion_rate}%</div>
          </div>

          {/* 관리일수 */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform relative">
            <div className="absolute top-3 right-3">
              <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-sm opacity-90 mb-2">관리일수</div>
            <div className="text-3xl font-bold mb-2">{reportData.summary.management_days}일</div>
            <div className="text-xs opacity-75 mt-2">전체 {reportData.summary.total_days}일 중</div>
          </div>
        </div>

        {/* 차트 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 일별 완료율 추이 */}
          <div className="bg-gray-50 rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800">일별 관리 완료율 추이</h3>
              <span className="text-xs text-gray-500">Daily Management Completion Rate</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyCompletionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="관리완료율" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 4 }}
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
                <Line 
                  type="monotone" 
                  dataKey="체크리스트완료율" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 4 }}
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 주차별 통계 */}
          <div className="bg-gray-50 rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800">주차별 통계</h3>
              <span className="text-xs text-gray-500">Weekly Statistics Overview</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="주차" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="관리완료율" 
                  fill="#3B82F6"
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
                <Bar 
                  dataKey="체크리스트완료율" 
                  fill="#10B981"
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
                <Bar 
                  dataKey="문제건수" 
                  fill="#EF4444"
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
                <Bar 
                  dataKey="요청건수" 
                  fill="#8B5CF6"
                  isAnimationActive={true}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 문제 유형별 분포 */}
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800">문제 유형별 분포</h3>
            </div>
            {problemTypeData.length > 0 ? (
              <div className="flex gap-6">
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={problemTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percent, value }) => {
                          const percentValue = (percent * 100).toFixed(0)
                          return `${percentValue}%`
                        }}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        isAnimationActive={true}
                        animationDuration={1000}
                        animationEasing="ease-out"
                      >
                        {problemTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1">
                  <div className="space-y-2 mt-4">
                    {problemTypeData.map((entry, index) => {
                      const percent = (entry.value / problemTypeData.reduce((sum, e) => sum + e.value, 0)) * 100
                      return (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div 
                            className="w-4 h-4 rounded flex-shrink-0" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="text-gray-700 flex-1">{entry.name}</span>
                          <span className="text-gray-500">({entry.value}건)</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                문제 데이터가 없습니다.
              </div>
            )}
          </div>

          {/* 요청 상태별 분포 */}
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800">요청 상태별 분포</h3>
            </div>
            {requestStatusData.length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={requestStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => {
                        const percentValue = (percent * 100).toFixed(0)
                        return `${name} ${percentValue}%`
                      }}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    >
                      {requestStatusData.map((entry, index) => {
                        // 완료는 초록색, 반려는 파란색
                        const color = entry.name === '처리완료' || entry.name === 'completed' ? '#10B981' : 
                                     entry.name === '반려' || entry.name === 'rejected' ? '#3B82F6' : 
                                     COLORS[index % COLORS.length]
                        return <Cell key={`cell-${index}`} fill={color} />
                      })}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {requestStatusData.map((entry, index) => {
                    const percent = (entry.value / requestStatusData.reduce((sum, e) => sum + e.value, 0)) * 100
                    const color = entry.name === '처리완료' || entry.name === 'completed' ? '#10B981' : 
                                 entry.name === '반려' || entry.name === 'rejected' ? '#3B82F6' : 
                                 COLORS[index % COLORS.length]
                    const displayName = entry.name === '처리완료' ? '처리완료' : entry.name === '반려' ? '반려' : entry.name
                    return (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: color }}
                        ></div>
                        <span className="text-gray-700">{displayName} {percent.toFixed(0)}%</span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 flex gap-4">
                  {requestStatusData.map((entry, index) => {
                    const percent = (entry.value / requestStatusData.reduce((sum, e) => sum + e.value, 0)) * 100
                    const color = entry.name === '처리완료' || entry.name === 'completed' ? '#10B981' : 
                                 entry.name === '반려' || entry.name === 'rejected' ? '#3B82F6' : 
                                 COLORS[index % COLORS.length]
                    const displayName = entry.name === '처리완료' ? '처리완료' : entry.name === '반려' ? '반려' : entry.name
                    return (
                      <div key={index} className="flex flex-col items-center">
                        <div className="text-sm font-medium text-gray-700">{displayName}</div>
                        <div className="text-lg font-bold mt-1" style={{ color }}>{percent.toFixed(0)}%</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                요청 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 일별 상세 통계 테이블 */}
        <div className="bg-gray-50 rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-800">일별 상세 통계</h3>
              <span className="text-xs text-gray-500">Daily Detailed Statistics</span>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="날짜 검색..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-white sticky top-0 z-10">
                <tr className="border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">날짜</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">관리 완료율</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">체크리스트 완료율</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">문제</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">분실물</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">요청</th>
                </tr>
              </thead>
              <tbody>
                {reportData.daily_stats.map((stat, index) => {
                  const managementRate = stat.attendance_count > 0 
                    ? Math.round((stat.attendance_completed / stat.attendance_count) * 100) 
                    : 0
                  const checklistRate = stat.checklist_count > 0 
                    ? Math.round((stat.checklist_completed / stat.checklist_count) * 100) 
                    : 0
                  const hasData = managementRate > 0 || checklistRate > 0 || stat.problem_count > 0 || stat.lost_item_count > 0 || stat.request_count > 0

                  return (
                    <tr key={stat.date} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {formatDate(stat.date)}
                          {hasData && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {managementRate > 0 ? (
                          <span className={`inline-block px-2 py-1 rounded font-semibold ${
                            managementRate >= 80 ? 'bg-green-100 text-green-600' : 
                            managementRate >= 50 ? 'bg-yellow-100 text-yellow-600' : 
                            'bg-red-100 text-red-600'
                          }`}>
                            {managementRate}%
                          </span>
                        ) : (
                          <span className="text-gray-400">0%</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {checklistRate > 0 ? (
                          <span className={`inline-block px-2 py-1 rounded font-semibold ${
                            checklistRate >= 80 ? 'bg-green-100 text-green-600' : 
                            checklistRate >= 50 ? 'bg-yellow-100 text-yellow-600' : 
                            'bg-red-100 text-red-600'
                          }`}>
                            {checklistRate}%
                          </span>
                        ) : (
                          <span className="text-gray-400">0%</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {stat.problem_count > 0 ? (
                          <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                            {stat.problem_count}건
                          </span>
                        ) : (
                          <span className="text-gray-400">0건</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {stat.lost_item_count > 0 ? (
                          <span className="inline-block px-2 py-1 rounded bg-orange-100 text-orange-700 font-medium">
                            {stat.lost_item_count}건
                          </span>
                        ) : (
                          <span className="text-gray-400">0건</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {stat.request_count > 0 ? (
                          <span className="inline-block px-2 py-1 rounded bg-purple-100 text-purple-700 font-medium">
                            {stat.request_count}건
                          </span>
                        ) : (
                          <span className="text-gray-400">0건</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-sm text-blue-600 mb-1">평균 관리율</div>
              <div className="text-2xl font-bold text-blue-700">{avgManagementRate.toFixed(1)}%</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-sm text-green-600 mb-1">평균 체크율</div>
              <div className="text-2xl font-bold text-green-700">{avgChecklistRate.toFixed(1)}%</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="text-sm text-orange-600 mb-1">총 문제</div>
              <div className="text-2xl font-bold text-orange-700">{reportData.summary.total_problems}건</div>
            </div>
            <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
              <div className="text-sm text-pink-600 mb-1">총 분실물</div>
              <div className="text-2xl font-bold text-pink-700">{reportData.summary.total_lost_items}건</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

