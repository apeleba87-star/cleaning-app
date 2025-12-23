import { Checklist, ChecklistItem } from '@/types/db'

interface ChecklistProgress {
  totalItems: number
  completedItems: number
  percentage: number
}

export function calculateChecklistProgress(checklist: Checklist, stage?: 'before' | 'after'): ChecklistProgress {
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
      if (!stage || stage === 'before') {
        totalItems++
        if (item.before_photo_url) {
          completedItems++
        }
      }
    } else if (item.type === 'after_photo') {
      // 관리 후 사진: after_photo_url만 확인
      if (!stage || stage === 'after') {
        totalItems++
        if (item.after_photo_url) {
          completedItems++
        }
      }
    } else if (item.type === 'before_after_photo') {
      // 관리 전/후 사진: 단계별로 다르게 계산
      if (!stage) {
        // 단계가 지정되지 않으면 둘 다 계산
        totalItems += 2
        if (item.before_photo_url) {
          completedItems++
        }
        if (item.after_photo_url) {
          completedItems++
        }
      } else if (stage === 'before') {
        // 관리전 단계: 관리전 사진만 계산
        totalItems++
        if (item.before_photo_url) {
          completedItems++
        }
      } else {
        // 관리후 단계: 관리후 사진만 계산
        totalItems++
        if (item.after_photo_url) {
          completedItems++
        }
      }
    }
  })

  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return { totalItems, completedItems, percentage }
}
