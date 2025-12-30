'use client'

import { useState, useEffect } from 'react'

interface MonthlyScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (schedule: Record<string, number[]>) => void
  initialSchedule?: Record<string, number[]>
}

export default function MonthlyScheduleModal({
  isOpen,
  onClose,
  onSave,
  initialSchedule = {},
}: MonthlyScheduleModalProps) {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [schedule, setSchedule] = useState<Record<string, number[]>>(initialSchedule)
  const [year, setYear] = useState<number>(new Date().getFullYear())

  useEffect(() => {
    if (isOpen && initialSchedule) {
      setSchedule(initialSchedule)
    }
  }, [isOpen, initialSchedule])

  if (!isOpen) return null

  const months = [
    { value: 1, label: '1월' },
    { value: 2, label: '2월' },
    { value: 3, label: '3월' },
    { value: 4, label: '4월' },
    { value: 5, label: '5월' },
    { value: 6, label: '6월' },
    { value: 7, label: '7월' },
    { value: 8, label: '8월' },
    { value: 9, label: '9월' },
    { value: 10, label: '10월' },
    { value: 11, label: '11월' },
    { value: 12, label: '12월' },
  ]

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate()
  }

  const toggleDate = (month: number, day: number) => {
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`
    const currentDays = schedule[monthKey] || []
    
    if (currentDays.includes(day)) {
      setSchedule({
        ...schedule,
        [monthKey]: currentDays.filter(d => d !== day).sort((a, b) => a - b),
      })
    } else {
      setSchedule({
        ...schedule,
        [monthKey]: [...currentDays, day].sort((a, b) => a - b),
      })
    }
  }

  const copyToNextMonth = () => {
    if (selectedMonth < 12) {
      const currentMonthKey = `${year}-${selectedMonth.toString().padStart(2, '0')}`
      const nextMonth = selectedMonth + 1
      const nextMonthKey = `${year}-${nextMonth.toString().padStart(2, '0')}`
      
      setSchedule({
        ...schedule,
        [nextMonthKey]: schedule[currentMonthKey] || [],
      })
      setSelectedMonth(nextMonth)
    }
  }

  const clearMonth = () => {
    const monthKey = `${year}-${selectedMonth.toString().padStart(2, '0')}`
    const newSchedule = { ...schedule }
    delete newSchedule[monthKey]
    setSchedule(newSchedule)
  }

  const handleSave = () => {
    onSave(schedule)
    onClose()
  }

  const daysInMonth = getDaysInMonth(selectedMonth, year)
  const monthKey = `${year}-${selectedMonth.toString().padStart(2, '0')}`
  const selectedDays = schedule[monthKey] || []

  // 달력 그리드 생성
  const firstDayOfMonth = new Date(year, selectedMonth - 1, 1).getDay()
  const calendarDays: (number | null)[] = []
  
  // 빈 칸 추가
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }
  
  // 날짜 추가
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">월별 관리일 설정</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* 년도 및 월 선택 */}
          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">년도:</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-md"
              >
                {[year - 1, year, year + 1].map(y => (
                  <option key={y} value={y}>{y}년</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">월:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-md"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={copyToNextMonth}
              disabled={selectedMonth >= 12}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400 text-sm"
            >
              다음 달에 복사
            </button>
            <button
              onClick={clearMonth}
              className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
            >
              이 달 초기화
            </button>
          </div>

          {/* 달력 */}
          <div className="mb-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="text-center font-medium text-gray-600 text-sm py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => day && toggleDate(selectedMonth, day)}
                  disabled={day === null}
                  className={`aspect-square rounded-md border transition-colors text-sm ${
                    day === null
                      ? 'bg-transparent border-transparent'
                      : selectedDays.includes(day)
                      ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* 선택된 날짜 표시 */}
          {selectedDays.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm font-medium text-gray-700 mb-1">
                {year}년 {selectedMonth}월 선택된 날짜:
              </p>
              <p className="text-sm text-gray-600">
                {selectedDays.join('일, ')}일
              </p>
            </div>
          )}

          {/* 전체 미리보기 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-md max-h-40 overflow-y-auto">
            <p className="text-sm font-medium text-gray-700 mb-2">전체 관리일 미리보기:</p>
            <div className="text-xs text-gray-600 space-y-1">
              {Object.keys(schedule)
                .sort()
                .map(monthKey => {
                  const [y, m] = monthKey.split('-')
                  const days = schedule[monthKey]
                  if (days.length === 0) return null
                  return (
                    <div key={monthKey}>
                      {y}년 {parseInt(m)}월: {days.join('일, ')}일
                    </div>
                  )
                })}
              {Object.keys(schedule).length === 0 && (
                <p className="text-gray-400">선택된 관리일이 없습니다.</p>
              )}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}



