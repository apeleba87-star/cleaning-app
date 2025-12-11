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
      totalItems++
      if (item.checked && (item.status === 'good' || (item.status === 'bad' && item.comment))) {
        completedItems++
      }
    } else if (item.type === 'photo') {
      // 각 사진 항목은 before + after 2개로 간주
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
