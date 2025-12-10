'use client'

import { useState, useEffect } from 'react'

interface ChecklistCalendarProps {
  checklists: Array<{ work_date: string; id: string }>
  onDateSelect?: (date: string) => void
  selectedDate?: string
}

export function ChecklistCalendar({ checklists, onDateSelect, selectedDate }: ChecklistCalendarProps) {
  const [mounted, setMounted] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => new Date())

  useEffect(() => {
    setMounted(true)
  }, [])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // 해당 월의 첫 번째 날과 마지막 날
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  // 체크리스트가 있는 날짜를 Set으로 변환
  // 출근한 날(work_date)에 체크리스트가 생성되므로 work_date 기준으로 표시
  const checklistDates = new Set(
    checklists
      .filter((c) => c.work_date) // work_date가 있는 체크리스트만
      .map((c) => {
        const date = new Date(c.work_date)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      })
  )

  const formatDate = (day: number) => {
    const date = new Date(year, month, day)
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const handleDateClick = (day: number) => {
    const dateStr = formatDate(day)
    if (onDateSelect) {
      onDateSelect(dateStr)
    }
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  // 클라이언트 마운트 전에는 빈 div만 렌더링 (Hydration 오류 방지)
  if (!mounted) {
    return <div className="bg-white rounded-lg shadow-md p-4 min-h-[300px]"></div>
  }

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
          {year}년 {month + 1}월
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

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startingDayOfWeek }).map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1
          const dateStr = formatDate(day)
          const hasChecklist = checklistDates.has(dateStr)
          const isSelected = selectedDate === dateStr
          const isToday =
            new Date().getFullYear() === year &&
            new Date().getMonth() === month &&
            new Date().getDate() === day

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              className={`aspect-square flex flex-col items-center justify-center text-sm rounded transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white font-semibold'
                  : isToday
                  ? 'bg-blue-100 text-blue-800 font-semibold'
                  : hasChecklist
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'hover:bg-gray-100'
              }`}
            >
              <span>{day}</span>
              {hasChecklist && (
                <span className="text-xs mt-0.5">●</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-gray-600">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-100 rounded"></div>
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

