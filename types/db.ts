// Type inference from Supabase (수동 타입 정의)
export type UserRole = 'staff' | 'manager' | 'business_owner' | 'platform_admin' | 'admin' // admin은 하위 호환성
export type CleaningPhotoKind = 'before' | 'after'
export type ReviewStatus = 'pending' | 'approved' | 'reshoot_requested'
export type IssueStatus = 'submitted' | 'in_progress' | 'completed' | 'rejected'
export type SupplyRequestStatus = 'requested' | 'received' | 'completed' | 'rejected'
export type RequestCategoryType = 'issue' | 'supply'
export type RequestStatus = 'received' | 'in_progress' | 'completed'
export type RequestCreatedByRole = 'business_owner' | 'store_owner'

export interface User {
  id: string
  role: UserRole
  name: string
  phone: string | null
  company_id: string | null
  employment_contract_date: string | null
  salary_date: number | null
  salary_amount: number | null
  employment_active: boolean
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  name: string
  address: string | null
  business_registration_number: string | null
  subscription_plan: 'free' | 'basic' | 'premium'
  subscription_status: 'active' | 'suspended' | 'cancelled'
  trial_ends_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Store {
  id: string
  name: string
  address: string | null
  company_id: string | null
  head_office_name: string | null
  parent_store_name: string | null
  management_days: string | null
  service_amount: number | null
  category: string | null
  contract_start_date: string | null
  contract_end_date: string | null
  service_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Attendance {
  id: string
  user_id: string
  store_id: string
  work_date: string
  clock_in_at: string
  clock_in_latitude: number | null
  clock_in_longitude: number | null
  clock_out_at: string | null
  clock_out_latitude: number | null
  clock_out_longitude: number | null
  selfie_url: string | null
  created_at: string
  updated_at: string
}

export interface CleaningPhoto {
  id: string
  store_id: string | null
  checklist_id: string | null
  user_id: string
  area_category: string
  kind: CleaningPhotoKind
  photo_url: string
  review_status: ReviewStatus
  manager_comment: string | null
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  area: string
  type: 'check' | 'photo' // 'check': 일반 체크리스트, 'photo': 사진 필요
  status?: 'good' | 'bad' // 일반 체크리스트용
  checked?: boolean // 일반 체크리스트 체크 여부
  comment?: string
  before_photo_url?: string | null // 사진 필요 항목 - 관리 전 사진
  after_photo_url?: string | null // 사진 필요 항목 - 관리 후 사진
}

export interface Checklist {
  id: string
  store_id: string
  user_id: string
  assigned_user_id?: string | null
  work_date: string
  items: ChecklistItem[]
  review_status: ReviewStatus
  manager_comment: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  before_photo_url?: string | null
  after_photo_url?: string | null
  note?: string | null
  requires_photos?: boolean // 필수 사진 촬영 여부 (관리 전/후)
  created_at: string
  updated_at: string
}

export interface Issue {
  id: string
  store_id: string
  user_id: string
  category_id: string | null
  title: string
  description: string | null
  status: IssueStatus
  photo_url: string | null
  manager_comment: string | null
  created_at: string
  updated_at: string
}

export interface SupplyRequest {
  id: string
  store_id: string
  user_id: string
  category_id: string | null
  item_name: string
  quantity: number | null
  status: SupplyRequestStatus
  photo_url: string | null
  manager_comment: string | null
  created_at: string
  updated_at: string
}

export interface RequestCategory {
  id: string
  store_id: string
  type: RequestCategoryType
  name: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface GPSLocation {
  lat: number
  lng: number
  accuracy?: number
}

export interface Request {
  id: string
  store_id: string
  created_by: string
  created_by_role: RequestCreatedByRole
  title: string
  description: string | null
  category_id: string | null
  photo_url: string | null
  status: RequestStatus
  approved_by: string | null
  approved_at: string | null
  confirmed_at: string | null
  completion_photo_url: string | null
  created_at: string
  updated_at: string
}

