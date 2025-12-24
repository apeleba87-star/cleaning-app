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

  checklist.items.forEach((item: ChecklistItem, index: number) => {
    // area가 없는 항목은 제외
    if (!item.area || !item.area.trim()) {
      return
    }
    
    // 타입 정규화 (하위 호환성)
    // 구버전 'photo' 타입을 처리하기 위해 any로 캐스팅
    let itemType: string = (item.type as any) || 'check'
    if (itemType === 'photo') {
      itemType = 'before_after_photo'
    }

    if (itemType === 'check') {
      // 체크 항목: 체크만 되면 완료
      totalItems++
      if (item.checked) {
        completedItems++
      }
    } else if (itemType === 'before_photo') {
      // 관리 전 사진: before_photo_url만 확인
      // stage가 지정된 경우에는 해당 단계에서만 계산, 아니면 항상 계산
      if (!stage || stage === 'before') {
        totalItems++
        if (item.before_photo_url) {
          completedItems++
        }
      }
    } else if (itemType === 'after_photo') {
      // 관리 후 사진: after_photo_url만 확인
      // stage가 없으면 항상 계산, stage가 있으면 해당 단계에서만 계산
      if (!stage) {
        totalItems++
        if (item.after_photo_url) {
          completedItems++
        }
      } else if (stage === 'after') {
        totalItems++
        if (item.after_photo_url) {
          completedItems++
        }
      }
      // stage === 'before'일 때는 관리후 사진은 카운트하지 않음
    } else if (itemType === 'before_after_photo') {
      // 관리 전/후 사진: 단계별로 다르게 계산
      if (!stage) {
        // stage가 지정되지 않으면 모든 항목(관리전 + 관리후) 계산
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
