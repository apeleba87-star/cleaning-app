'use client'

import { useState, useEffect, useMemo } from 'react'

interface AttendanceData {
  date: string
  store_id: string
  store_name: string
  attendance_count: number
}

interface AttendanceCalendarProps {
  attendanceData: AttendanceData[]
  storeStatuses: Array<{ store_id: string; store_name: string }>
  onDateSelect?: (date: string) => void
  selectedDate?: string
}

export function AttendanceCalendar({ attendanceData, storeStatuses, onDateSelect, selectedDate }: AttendanceCalendarProps) {
  const [mounted, setMounted] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // 출근 데이터를 날짜별로 그룹화
  const attendanceByDate = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    
    attendanceData.forEach((item) => {
      if (!map.has(item.date)) {
        map.set(item.date, new Map())
      }
      const dateMap = map.get(item.date)!
      dateMap.set(item.store_id, item.attendance_count)
    })
    
    return map
  }, [attendanceData])

  // 달력 날짜 생성
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    // 해당 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // 첫 날의 요일 (0 = 일요일)
    const firstDayOfWeek = firstDay.getDay()
    
    // 달력에 표시할 날짜 배열
    const days: Date[] = []
    
    // 이전 달의 마지막 날들 (첫 주를 채우기 위해)
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      days.push(date)
    }
    
    // 해당 월의 모든 날짜
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day))
    }
    
    // 다음 달의 첫 날들 (마지막 주를 채우기 위해)
    const remainingDays = 42 - days.length // 6주 * 7일 = 42
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day))
    }
    
    return days
  }

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const handleDateClick = (date: Date) => {
    const dateStr = formatDate(date)
    if (onDateSelect) {
      onDateSelect(dateStr)
    }
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  const weekDays = ['일', '월', '화', '수', '목', '금', '토']
  const calendarDays = getCalendarDays()
  const today = new Date()
  const todayStr = formatDate(today)

  // 클라이언트 마운트 전에는 빈 div만 렌더링
  if (!mounted) {
    return <div className="bg-white rounded-lg shadow-md p-4 min-h-[300px]"></div>
  }

  const monthYear = `${currentMonth.getFullYear()}년 ${currentMonth.getMonth() + 1}월`
  const isMultiStore = storeStatuses.length > 1

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
        >
          ←
        </button>
        <h3 className="text-lg font-semibold">
          {monthYear}
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
          >
            오늘
          </button>
          <button
            onClick={goToNextMonth}
            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
          >
            →
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const dateStr = formatDate(date)
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
          const isToday = dateStr === todayStr
          const isSelected = selectedDate === dateStr
          
          // 해당 날짜의 출근 데이터
          const dateAttendance = attendanceByDate.get(dateStr)
          
          // 출근한 매장 수 계산
          let attendedStoreCount = 0
          let totalAttendanceCount = 0
          
          if (dateAttendance) {
            attendedStoreCount = dateAttendance.size
            dateAttendance.forEach((count) => {
              totalAttendanceCount += count
            })
          }

          // 다매장인 경우: 출근한 매장 수 표시
          // 단매장인 경우: 출근 여부만 표시
          const hasAttendance = attendedStoreCount > 0

          return (
            <button
              key={index}
              onClick={() => handleDateClick(date)}
              className={`flex flex-col items-center justify-center min-h-[60px] p-1 rounded-lg transition-all text-sm ${
                !isCurrentMonth
                  ? 'text-gray-300 bg-gray-50'
                  : isSelected
                  ? 'bg-blue-600 text-white font-semibold shadow-md scale-105'
                  : isToday
                  ? 'bg-blue-100 text-blue-800 font-semibold border-2 border-blue-400'
                  : hasAttendance
                  ? 'bg-green-100 text-green-900 hover:bg-green-200 border-2 border-green-400 font-semibold shadow-sm'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
              }`}
            >
              <span className={`text-xs md:text-sm font-medium ${hasAttendance && isCurrentMonth ? 'text-green-900' : ''}`}>{date.getDate()}</span>
              {isCurrentMonth && hasAttendance && (
                <span className={`text-[11px] mt-0.5 font-bold ${isSelected ? 'text-white' : 'text-green-700'}`}>
                  {isMultiStore ? (
                    <span>{attendedStoreCount}/{storeStatuses.length}</span>
                  ) : (
                    <span className="text-base">✓</span>
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 범례 */}
      <div className="mt-4 flex items-center justify-center flex-wrap gap-3 text-xs text-gray-600">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-100 border-2 border-green-400 rounded"></div>
          <span>관리 완료</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-100 border-2 border-blue-400 rounded"></div>
          <span>오늘</span>
        </div>
      </div>
    </div>
  )
}

