import { createClient } from '@/lib/supabase/client'

// UUID 생성 함수 (crypto.randomUUID 폴백)
function generateUUID(): string {
  // crypto.randomUUID가 지원되는 경우 사용
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // 폴백: 랜덤 UUID v4 생성
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export function getStorageBucket(entity: 'cleaning' | 'issue' | 'supply' | 'selfie' | 'checklist' | 'checklist_before' | 'checklist_after'): string {
  const buckets = {
    cleaning: 'cleaning-photos',
    issue: 'issue-photos',
    supply: 'supply-photos',
    selfie: 'selfies',
    checklist: 'checklist-photos',
    checklist_before: 'checklist-photos',
    checklist_after: 'checklist-photos',
  }
  return buckets[entity]
}

export function generateFilePath(
  storeId: string,
  entity: 'cleaning' | 'issue' | 'supply' | 'selfie' | 'checklist' | 'checklist_before' | 'checklist_after',
  userId: string
): string {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const uuid = generateUUID()
  // 체크리스트 항목별로 폴더 구분
  // RLS 정책에서 (storage.foldername(name))[1]이 userId를 가리키므로 첫 번째 폴더는 userId여야 함
  const entityFolder = entity === 'checklist_before' ? 'before' : entity === 'checklist_after' ? 'after' : entity === 'checklist' ? 'items' : entity
  return `${userId}/${storeId}/${yearMonth}/${entityFolder}/${uuid}.jpg`
}

