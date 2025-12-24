// Type inference from Supabase (수동 타입 정의)
export type UserRole = 'staff' | 'manager' | 'business_owner' | 'platform_admin' | 'admin' | 'franchise_manager' | 'store_manager' | 'subcontract_individual' | 'subcontract_company' // admin은 하위 호환성
export type CleaningPhotoKind = 'before' | 'after'
export type ReviewStatus = 'pending' | 'approved' | 'reshoot_requested'
export type IssueStatus = 'submitted' | 'in_progress' | 'completed' | 'rejected'
export type SupplyRequestStatus = 'received' | 'in_progress' | 'manager_in_progress' | 'completed'
export type SupplyRequestCategory = '걸레' | '쓰레기봉투' | '약품' | '직접입력'
export type RequestCategoryType = 'issue' | 'supply'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type AttendanceType = 'regular' | 'rescheduled' | 'emergency'

export interface User {
  id: string
  role: UserRole
  position: string | null // 직급
  name: string
  phone: string | null
  company_id: string | null
  franchise_id: string | null
  employment_contract_date: string | null
  salary_date: number | null
  salary_amount: number | null
  employment_active: boolean
  // 재무 관리 확장 필드
  pay_type: 'monthly' | 'daily' | 'contract' | null
  pay_amount: number | null
  salary_payment_method: string | null
  bank_name: string | null
  account_number: string | null
  hire_date: string | null
  resignation_date: string | null
  employment_type: string | null
  is_active: boolean
  // 도급 관련 필드
  business_registration_number: string | null // 도급(업체)인 경우 사업자등록번호
  // 승인 관련 필드
  approval_status: ApprovalStatus
  approved_at: string | null
  approved_by: string | null
  rejection_reason: string | null
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
  // 가입 코드 관련 필드
  signup_code: string | null
  signup_code_active: boolean
  requires_approval: boolean
  default_role: UserRole
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Store {
  id: string
  name: string
  address: string | null
  company_id: string | null
  franchise_id: string | null
  head_office_name: string | null
  parent_store_name: string | null
  management_days: string | null
  service_amount: number | null
  category: string | null
  contract_start_date: string | null
  contract_end_date: string | null
  service_active: boolean
  // 재무 관리 확장 필드
  payment_method: string | null
  settlement_cycle: string | null
  payment_day: number | null
  tax_invoice_required: boolean
  unpaid_tracking_enabled: boolean
  billing_memo: string | null
  special_notes: string | null
  access_info: string | null
  // 야간 매장 관련 필드
  is_night_shift: boolean
  work_start_hour: number // 근무 시작 시간 (0-23)
  work_end_hour: number // 근무 종료 시간 (0-23, 다음날을 의미할 수 있음)
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Franchise {
  id: string
  company_id: string
  name: string
  business_registration_number: string | null
  address: string | null
  phone: string | null
  email: string | null
  manager_name: string | null
  contract_start_date: string | null
  contract_end_date: string | null
  status: 'active' | 'inactive' | 'suspended'
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CategoryTemplate {
  id: string
  company_id: string
  name: string
  category: string
  description: string | null
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
  // 출근 유형 관련 필드
  attendance_type: AttendanceType
  scheduled_date: string | null // 원래 예정일 (출근일 변경 출근인 경우)
  problem_report_id: string | null // 긴급 출동인 경우 해결한 문제 ID
  change_reason: string | null // 출근일 변경 사유
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
  type: 'check' | 'before_photo' | 'after_photo' | 'before_after_photo' // 'check': 일반 체크리스트, 'before_photo': 관리 전 사진, 'after_photo': 관리 후 사진, 'before_after_photo': 관리 전/후 사진
  status?: 'good' | 'bad' // 일반 체크리스트용
  checked?: boolean // 일반 체크리스트 체크 여부
  comment?: string
  before_photo_url?: string | null // 관리 전 사진 항목 - 관리 전 사진
  after_photo_url?: string | null // 관리 후 사진 항목 - 관리 후 사진
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
  item_name: string | null // 하위 호환성을 위해 nullable 유지
  quantity: number | null
  status: SupplyRequestStatus
  photo_url: string | null // 요청 시 첨부 사진
  manager_comment: string | null
  // 새로운 필드
  title: string // 제목
  description: string | null // 설명
  category: SupplyRequestCategory | null // 카테고리 (걸레, 쓰레기봉투, 약품, 직접입력)
  completion_photo_url: string | null // 처리 완료 사진
  completion_description: string | null // 처리 완료 설명
  completed_at: string | null // 처리 완료 시간
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

export type RequestStatus = 'received' | 'in_progress' | 'completed' | 'rejected'

export interface Request {
  id: string
  store_id: string
  created_by: string
  title: string
  description: string | null
  photo_url: string | null
  status: RequestStatus
  completion_photo_url?: string | null
  completion_description?: string | null
  completed_by?: string | null
  completed_at?: string | null
  rejection_photo_url?: string | null
  rejection_description?: string | null
  rejected_by?: string | null
  rejected_at?: string | null
  created_at: string
  updated_at: string
}

export interface GPSLocation {
  lat: number
  lng: number
  accuracy?: number
}

// ============================================================
// 재무 관리 관련 타입 정의
// ============================================================

export interface StoreFile {
  id: string
  store_id: string
  company_id: string
  doc_type: 'service_contract' | 'subcontract_contract' | 'invoice' | 'receipt' | 'other' | 'business_registration'
  file_url: string
  file_name: string
  file_size: number | null
  uploaded_at: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface StoreContact {
  id: string
  store_id: string
  company_id: string
  name: string
  phone: string | null
  position: string | null
  contact_role: 'main' | 'payment' | 'extra'
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface UserFile {
  id: string
  user_id: string
  company_id: string
  doc_type: 'employment_contract' | 'subcontract_contract'
  file_url: string
  file_name: string
  file_size: number | null
  uploaded_at: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface UserSensitive {
  id: string
  user_id: string
  company_id: string
  resident_registration_number: string | null
  created_at: string
  updated_at: string
}

export type RevenueStatus = 'unpaid' | 'partial' | 'paid'

export interface Revenue {
  id: string
  store_id: string
  company_id: string
  service_period: string // 'YYYY-MM' 형식
  amount: number
  due_date: string
  status: RevenueStatus
  billing_memo: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Receipt {
  id: string
  revenue_id: string
  company_id: string
  received_at: string
  amount: number
  memo: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type ExpenseCategory = 'purchase' | 'operating' | 'vehicle' | 'chemical' | 'supplies' | 'other'

export interface Expense {
  id: string
  date: string
  category: ExpenseCategory
  amount: number
  memo: string | null
  store_id: string | null
  company_id: string
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type PayrollStatus = 'scheduled' | 'paid'

export interface Payroll {
  id: string
  user_id: string | null // 정규 직원인 경우, 일당 근로자는 null
  company_id: string
  pay_period: string // 'YYYY-MM' 형식
  amount: number
  paid_at: string | null
  status: PayrollStatus
  memo: string | null
  // 일당 근로자 필드 (user_id가 null일 때 사용)
  worker_name: string | null
  resident_registration_number_encrypted: string | null // 암호화된 주민등록번호
  work_days: number | null // 근무 일수
  daily_wage: number | null // 일당 금액
  // 관계 데이터 (API 응답에 포함될 수 있음)
  users?: {
    id: string
    name: string
  } | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type SubcontractType = 'company' | 'individual'
export type SubcontractStatus = 'active' | 'inactive' | 'terminated'

export interface Subcontract {
  id: string
  company_id: string
  subcontract_type: SubcontractType // 'company' | 'individual'
  subcontractor_id: string | null // 업체 간 도급 시 하청업체 ID (franchises 테이블 참조)
  worker_id: string | null // 개인 도급 시 개인 ID (users 테이블 참조)
  worker_name: string | null // 개인 도급 시 이름
  resident_registration_number_encrypted: string | null // 개인 도급 시 암호화된 주민등록번호
  bank_name: string | null
  account_number: string | null
  contract_period_start: string // 계약 시작일
  contract_period_end: string | null // 계약 종료일
  monthly_amount: number // 월 도급금액
  tax_rate: number // 세율 (개인은 3.3%, 업체는 0% 또는 별도)
  status: SubcontractStatus
  memo: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // 관계 데이터 (API 응답에 포함될 수 있음)
  subcontractor?: {
    id: string
    name: string
  } | null
  worker?: {
    id: string
    name: string
  } | null
}

export interface SubcontractPayment {
  id: string
  subcontract_id: string
  company_id: string
  pay_period: string // 'YYYY-MM' 형식
  amount: number // 실제 지급 금액 (공제 후)
  base_amount: number // 원금액
  deduction_amount: number // 공제액
  paid_at: string | null
  status: 'scheduled' | 'paid'
  memo: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // 관계 데이터
  subcontract?: Subcontract
}

