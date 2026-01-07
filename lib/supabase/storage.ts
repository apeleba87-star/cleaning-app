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

// 버킷 정보: 버킷 이름과 public 여부
const BUCKET_CONFIG: Record<string, { name: string; public: boolean }> = {
  cleaning: { name: 'cleaning-photos', public: false },
  issue: { name: 'issue-photos', public: false },
  supply: { name: 'supply-photos', public: false },
  selfie: { name: 'selfies', public: false },
  checklist: { name: 'checklist-photos', public: false },
  checklist_before: { name: 'checklist-photos', public: false },
  checklist_after: { name: 'checklist-photos', public: false },
  product: { name: 'cleaning-photos', public: false }, // 임시로 cleaning-photos 버킷 사용
  request: { name: 'issue-photos', public: false },
}

export function getStorageBucket(entity: 'cleaning' | 'issue' | 'supply' | 'selfie' | 'checklist' | 'checklist_before' | 'checklist_after' | 'product' | 'request'): string {
  return BUCKET_CONFIG[entity].name
}

export function isBucketPublic(bucketName: string): boolean {
  const config = Object.values(BUCKET_CONFIG).find(b => b.name === bucketName)
  return config?.public || false
}

export function generateFilePath(
  storeId: string,
  entity: 'cleaning' | 'issue' | 'supply' | 'selfie' | 'checklist' | 'checklist_before' | 'checklist_after' | 'product' | 'request',
  userId: string
): string {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const uuid = generateUUID()
  // 체크리스트 항목별로 폴더 구분
  // RLS 정책에서 (storage.foldername(name))[1]이 userId를 가리키므로 첫 번째 폴더는 userId여야 함
  const entityFolder = entity === 'checklist_before' ? 'before' : entity === 'checklist_after' ? 'after' : entity === 'checklist' ? 'items' : entity === 'product' ? 'product' : entity === 'request' ? 'request' : entity
  return `${userId}/${storeId}/${yearMonth}/${entityFolder}/${uuid}.jpg`
}

