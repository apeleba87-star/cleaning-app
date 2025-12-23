import { Checklist, ChecklistItem } from '@/types/db'

interface ChecklistProgress {
  totalItems: number
  completedItems: number
  percentage: number
}

export function calculateChecklistProgress(checklist: Checklist): ChecklistProgress {
  let totalItems = 0
  let completedItems = 0

  if (!checklist || !checklist.items) {
    return { totalItems: 0, completedItems: 0, percentage: 0 }
  }

  checklist.items.forEach((item: ChecklistItem) => {
    if (item.type === 'check') {
      // 체크 항목: 체크만 되면 완료
      totalItems++
      if (item.checked) {
        completedItems++
      }
    } else if (item.type === 'before_photo') {
      // 관리 전 사진: before_photo_url만 확인
      totalItems++
      if (item.before_photo_url) {
        completedItems++
      }
    } else if (item.type === 'after_photo') {
      // 관리 후 사진: after_photo_url만 확인
      totalItems++
      if (item.after_photo_url) {
        completedItems++
      }
    } else if (item.type === 'before_after_photo') {
      // 관리 전/후 사진: before + after 2개로 간주
      totalItems += 2
      if (item.before_photo_url) {
        completedItems++
      }
      if (item.after_photo_url) {
        completedItems++
      }
    }
  })

  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return { totalItems, completedItems, percentage }
}
