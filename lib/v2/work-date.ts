import { calculateWorkDate, getCurrentHourKST } from '@/lib/utils/date'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

export function v2WorkDateForStore(store: {
  is_night_shift: boolean
  work_start_hour: number
  work_end_hour: number
}): string {
  return calculateWorkDate(
    store.is_night_shift,
    store.work_start_hour ?? 18,
    getCurrentHourKST(),
    store.work_end_hour ?? 8
  )
}

export function v2IsManagementDay(
  managementDays: string | null,
  isNightShift: boolean,
  workStartHour: number,
  workEndHour: number
): boolean {
  if (!managementDays?.trim()) return true
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const now = new Date()
  const kstOffset = 9 * 60
  const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000
  const kst = new Date(utc + kstOffset * 60 * 1000)
  let check = kst

  if (isNightShift) {
    const hour = kst.getHours()
    const endHour = workEndHour ?? 8
    if (hour < endHour) {
      check = new Date(kst)
      check.setDate(check.getDate() - 1)
    }
  }

  const dayName = dayNames[check.getDay()]
  const list = managementDays.split(',').map((d) => d.trim())
  if (list.length > 1) return list.includes(dayName)
  return managementDays.replace(/\s/g, '').includes(dayName)
}

export function parseV2ManagementDays(managementDays: string | null): string[] {
  if (!managementDays?.trim()) return []

  const compact = managementDays.replace(/\s/g, '')
  const splitDays = compact.split(',').filter(Boolean)
  if (splitDays.length > 1) {
    return splitDays.filter((day) => DAY_NAMES.includes(day))
  }

  return DAY_NAMES.filter((day) => compact.includes(day))
}

export function v2ManagementScheduleForStore(store: {
  management_days: string | null
  is_night_shift: boolean
  work_start_hour: number
  work_end_hour: number
}): { is_today: boolean; next_day_label: string | null; days_until_next: number } {
  const days = parseV2ManagementDays(store.management_days)
  if (days.length === 0) {
    return { is_today: true, next_day_label: '오늘', days_until_next: 0 }
  }

  const workDate = v2WorkDateForStore({
    is_night_shift: store.is_night_shift,
    work_start_hour: store.work_start_hour,
    work_end_hour: store.work_end_hour,
  })
  const workDayIndex = new Date(`${workDate}T00:00:00+09:00`).getDay()
  const workDayName = DAY_NAMES[workDayIndex]

  if (days.includes(workDayName)) {
    return { is_today: true, next_day_label: '오늘', days_until_next: 0 }
  }

  const sorted = days
    .map((day) => {
      const index = DAY_NAMES.indexOf(day)
      const diff = (index - workDayIndex + 7) % 7
      return { day, diff: diff === 0 ? 7 : diff }
    })
    .sort((a, b) => a.diff - b.diff)

  const next = sorted[0]
  return {
    is_today: false,
    next_day_label: next ? `${next.day}요일 예정` : null,
    days_until_next: next?.diff ?? 7,
  }
}
