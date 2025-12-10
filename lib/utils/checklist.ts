import { Checklist, ChecklistItem } from '@/types/db'

/**
 * 체크리스트 항목이 완료되었는지 확인
 */
export function isChecklistItemCompleted(item: ChecklistItem): boolean {
  if (item.type === 'check') {
    // 일반 체크 항목: checked가 true이고, status가 'good'이거나 'bad'인 경우
    // 'bad'인 경우 comment가 필수
    if (!item.checked) return false
    if (item.status === 'bad' && !item.comment?.trim()) return false
    return true
  } else if (item.type === 'photo') {
    // 사진 항목: before_photo_url과 after_photo_url이 모두 있어야 함
    return !!(item.before_photo_url && item.after_photo_url)
  }
  return false
}

/**
 * 체크리스트가 완료되었는지 확인
 * 모든 항목이 완료되었는지 확인
 */
export function isChecklistCompleted(checklist: Checklist): boolean {
  if (!Array.isArray(checklist.items) || checklist.items.length === 0) {
    return false
  }

  // 모든 항목이 완료되었는지 확인
  return checklist.items.every((item) => {
    // area가 비어있으면 무시
    if (!item.area?.trim()) return true
    return isChecklistItemCompleted(item)
  })
}

/**
 * 체크리스트 수행률 계산 (백분율)
 * @returns 완료된 항목 수, 전체 항목 수, 백분율
 */
export function calculateChecklistProgress(checklist: Checklist): {
  completed: number
  total: number
  percentage: number
} {
  if (!Array.isArray(checklist.items) || checklist.items.length === 0) {
    return { completed: 0, total: 0, percentage: 0 }
  }

  // area가 비어있지 않은 항목만 카운트
  const validItems = checklist.items.filter((item) => item.area?.trim())
  const total = validItems.length
  const completed = validItems.filter((item) => isChecklistItemCompleted(item)).length

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return { completed, total, percentage }
}



