import { calculateWorkDate, getCurrentHourKST } from '@/lib/utils/date'

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
