'use client'

import { useState, useEffect } from 'react'

interface ChecklistCalendarProps {
  checklists: Array<{ work_date: string; id: string; items?: any[] }>
  completedChecklists?: Array<{ work_date: string; id: string; items?: any[] }>
  onDateSelect?: (date: string) => void
  selectedDate?: string
}

export function ChecklistCalendar({ checklists, completedChecklists = [], onDateSelect, selectedDate }: ChecklistCalendarProps) {
  const [mounted, setMounted] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dayOfWeek)
    return startOfWeek
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  // 체크리스트가 있는 날짜와 완료된 날짜를 Map으로 변환
  const checklistDatesMap = new Map<string, { hasChecklist: boolean; isCompleted: boolean }>()

  // 체크리스트가 있는 날짜
  checklists.forEach((c) => {
    if (c.work_date) {
      const date = new Date(c.work_date)
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      checklistDatesMap.set(dateStr, { hasChecklist: true, isCompleted: false })
    }
  })

  // 완료된 체크리스트 날짜
  completedChecklists.forEach((c) => {
    if (c.work_date) {
        const date = new Date(c.work_date)
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const existing = checklistDatesMap.get(dateStr)
      checklistDatesMap.set(dateStr, { 
        hasChecklist: existing?.hasChecklist || true, 
        isCompleted: true 
      })
    }
  })

  const getWeekDates = (startDate: Date) => {
    const dates: Date[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      dates.push(date)
    }
    return dates
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

  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() - 7)
    setCurrentWeek(newWeek)
  }

  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() + 7)
    setCurrentWeek(newWeek)
  }

  const goToToday = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dayOfWeek)
    setCurrentWeek(startOfWeek)
  }

  const weekDays = ['일', '월', '화', '수', '목', '금', '토']
  const weekDates = getWeekDates(currentWeek)
  const today = new Date()
  const todayStr = formatDate(today)

  // 클라이언트 마운트 전에는 빈 div만 렌더링 (Hydration 오류 방지)
  if (!mounted) {
    return <div className="bg-white rounded-lg shadow-md p-4 min-h-[200px]"></div>
  }

  const weekStartDate = weekDates[0]
  const weekEndDate = weekDates[6]
  const monthYear = `${weekStartDate.getFullYear()}년 ${weekStartDate.getMonth() + 1}월`

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousWeek}
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
            onClick={goToNextWeek}
            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
          >
            →
          </button>
        </div>
      </div>

      {/* 주 단위 가로 스크롤 달력 */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-2 min-w-max">
          {weekDates.map((date, index) => {
            const dateStr = formatDate(date)
            const dateInfo = checklistDatesMap.get(dateStr)
            const hasChecklist = dateInfo?.hasChecklist || false
            const isCompleted = dateInfo?.isCompleted || false
          const isSelected = selectedDate === dateStr
            const isToday = dateStr === todayStr
            const dayName = weekDays[index]

          return (
            <button
                key={dateStr}
                onClick={() => handleDateClick(date)}
                className={`flex flex-col items-center justify-center min-w-[50px] p-2 rounded-lg transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white font-semibold'
                  : isToday
                  ? 'bg-blue-100 text-blue-800 font-semibold'
                    : isCompleted
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : hasChecklist
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
                <span className="text-[10px] text-gray-500 mb-0.5">{dayName}</span>
                <span className="text-sm font-medium">{date.getDate()}</span>
                {isCompleted && (
                  <span className="text-[10px] mt-0.5 text-green-600">✓</span>
                )}
                {hasChecklist && !isCompleted && (
                  <span className="text-[10px] mt-0.5">●</span>
              )}
            </button>
          )
        })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center flex-wrap gap-3 text-xs text-gray-600">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-100 rounded"></div>
          <span>완료됨</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-yellow-100 rounded"></div>
          <span>체크리스트 있음</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-100 rounded"></div>
          <span>오늘</span>
        </div>
      </div>
    </div>
  )
}

