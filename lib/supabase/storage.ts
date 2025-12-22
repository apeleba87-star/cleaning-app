import { createClient } from '@/lib/supabase/client'

// 브라우저 호환 UUID 생성 함수
function generateUUID(): string {
  // crypto.randomUUID()가 지원되는 경우 사용
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  
  // 폴백: RFC4122 v4 호환 UUID 생성
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getStorageBucket(entity: 'cleaning' | 'issue' | 'supply' | 'selfie' | 'checklist' | 'checklist_before' | 'checklist_after' | 'product'): string {
  const buckets = {
    cleaning: 'cleaning-photos',
    issue: 'issue-photos',
    supply: 'supply-photos',
    selfie: 'selfies',
    checklist: 'checklist-photos',
    checklist_before: 'checklist-photos',
    checklist_after: 'checklist-photos',
    // 임시로 cleaning-photos 버킷 사용 (product-photos 버킷이 없을 경우)
    // TODO: Supabase Storage에 product-photos 버킷 생성 후 변경 필요
    product: 'cleaning-photos', // 'product-photos' 대신 'cleaning-photos' 사용
  }
  return buckets[entity]
}

export function generateFilePath(
  storeId: string,
  entity: 'cleaning' | 'issue' | 'supply' | 'selfie' | 'checklist' | 'checklist_before' | 'checklist_after' | 'product',
  userId: string
): string {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const uuid = generateUUID()
  // 체크리스트 항목별로 폴더 구분
  // RLS 정책에서 (storage.foldername(name))[1]이 userId를 가리키므로 첫 번째 폴더는 userId여야 함
  const entityFolder = entity === 'checklist_before' ? 'before' : entity === 'checklist_after' ? 'after' : entity === 'checklist' ? 'items' : entity === 'product' ? 'product' : entity
  return `${userId}/${storeId}/${yearMonth}/${entityFolder}/${uuid}.jpg`
}

