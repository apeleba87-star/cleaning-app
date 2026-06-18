export type V2UserRole = 'staff' | 'business_owner' | 'store_manager' | 'platform_admin'
export type V2AssignmentRole = 'staff' | 'store_manager'
export type V2IssueStatus = 'pending' | 'approved' | 'rejected' | 'acknowledged' | 'closed'
export type V2IssueType = 'problem' | 'shortage' | 'other'
export type V2PhotoKind = 'before' | 'after' | 'issue' | 'extra'

export interface V2User {
  id: string
  company_id: string | null
  role: V2UserRole
  name: string
  phone: string | null
  active: boolean
}

export interface V2Company {
  id: string
  name: string
  region_sido: string | null
  region_sigungu: string | null
}

export interface V2Store {
  id: string
  company_id: string
  name: string
  address: string | null
  region_sido: string | null
  region_sigungu: string | null
  management_days: string | null
  is_night_shift: boolean
  work_start_hour: number
  work_end_hour: number
  service_active: boolean
}

export interface V2ChecklistItem {
  id: string
  label: string
  cleaning_area?: string
  cleaning_method?: string
  requires_before_after?: boolean
  checked?: boolean
  before_photo_path?: string | null
  after_photo_path?: string | null
}

export const V2_WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'] as const

export type V2Weekday = (typeof V2_WEEKDAYS)[number]

export interface V2AdPayload {
  campaign_id: string
  title: string | null
  body: string | null
  image_url: string | null
  link_url: string | null
  interstitial_seconds: number
}

export interface V2PhotoAsset {
  id: string
  store_id: string
  issue_id: string | null
  user_id?: string | null
  work_date?: string | null
  kind: V2PhotoKind
  storage_path: string
  url?: string | null
  memo?: string | null
  upload_status?: string
  created_at: string
}

export const V2_STORE_NOTE_KEYS = [
  'entrance_password',
  'cleaning_notes',
  'payment_date',
  'payment_amount',
  'manager_memo',
] as const

export type V2StoreNoteKey = (typeof V2_STORE_NOTE_KEYS)[number]

export const V2_NOTE_LABELS: Record<V2StoreNoteKey, string> = {
  entrance_password: '출입 비밀번호',
  cleaning_notes: '청소 특이사항',
  payment_date: '결제일',
  payment_amount: '결제금액',
  manager_memo: '매장관리자 메모',
}
