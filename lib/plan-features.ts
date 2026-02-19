/**
 * 요금 플랜별 기능 제어
 *
 * 시스템관리자(플랫폼 관리)에서 업체의 요금제(subscription_plan)와 상태(subscription_status)를 설정하면,
 * 업체관리자 앱의 메뉴·API 접근이 아래 규칙에 따라 제어됩니다.
 *
 * - 메뉴: app/business/layout에서 회사 플랜을 조회해 NavRoleSwitch에 전달하고,
 *   NavRoleSwitch가 허용된 기능만 표시합니다.
 * - API: app/api/business/* 라우트에서 assertBusinessFeature(company_id, featureKey)로
 *   허용 여부를 검사하고, 비허용 시 403과 안내 메시지를 반환합니다.
 *
 * 플랜 단계: free → basic → premium (무료는 기본 기능만, 베이직/프리미엄에서 확장)
 * 상태가 suspended/cancelled이면 모든 기능 접근이 차단됩니다.
 */

export type SubscriptionPlan = 'free' | 'basic' | 'premium'
export type SubscriptionStatus = 'active' | 'suspended' | 'cancelled'

/** 업체관리자 메뉴/기능 키 (NavRoleSwitch 및 API에서 동일 키 사용) */
export type BusinessFeatureKey =
  | 'dashboard'
  | 'attendance_report'
  | 'stores'
  | 'stores_status'
  | 'franchises'
  | 'payrolls'
  | 'receivables'
  | 'financial'
  | 'users'
  | 'products'
  | 'checklists'
  | 'announcements'
  | 'reports'
  | 'supply_requests'
  | 'company'

/** 플랜별 사용 가능 기능 (플랜이 높을수록 포함 범위 확대) */
const PLAN_FEATURES: Record<SubscriptionPlan, BusinessFeatureKey[]> = {
  free: [
    'dashboard',
    'stores',
    'stores_status',
    'payrolls',
    'receivables',
    'financial',
    'users',
    'checklists',
    'announcements',
    'reports',
    'supply_requests',
    'company',
  ],
  basic: [
    'dashboard',
    'stores',
    'stores_status',
    'payrolls',
    'receivables',
    'financial',
    'users',
    'checklists',
    'announcements',
    'reports',
    'supply_requests',
    'company',
  ],
  premium: [
    'dashboard',
    'attendance_report',
    'stores',
    'stores_status',
    'franchises',
    'payrolls',
    'receivables',
    'financial',
    'users',
    'checklists',
    'announcements',
    'reports',
    'supply_requests',
    'company',
  ],
}

/**
 * 구독 상태가 활성인지 확인 (suspended/cancelled 시 기능 제한)
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === 'active'
}

/** 프리미엄 전용 기능 키 (premium_units >= 1 이면 오픈) */
const PREMIUM_ONLY_FEATURES: BusinessFeatureKey[] = ['attendance_report', 'franchises']

/**
 * 해당 플랜·상태에서 기능 사용 가능 여부
 * premiumUnits: 1 이상이면 프리미엄 전용 기능도 허용
 */
export function isFeatureAllowed(
  plan: SubscriptionPlan,
  status: SubscriptionStatus,
  feature: BusinessFeatureKey,
  premiumUnits?: number
): boolean {
  if (!isSubscriptionActive(status)) {
    return false
  }
  if (PREMIUM_ONLY_FEATURES.includes(feature) && premiumUnits != null && premiumUnits >= 1) {
    return true
  }
  const allowed = PLAN_FEATURES[plan] ?? []
  return allowed.includes(feature)
}

/**
 * 플랜에 허용된 기능 목록 반환 (상태 비활성이면 빈 배열)
 * premiumUnits: 1 이상이면 프리미엄 전용 기능도 포함
 */
export function getAllowedFeatures(
  plan: SubscriptionPlan,
  status: SubscriptionStatus,
  premiumUnits?: number
): BusinessFeatureKey[] {
  if (!isSubscriptionActive(status)) {
    return []
  }
  const base = PLAN_FEATURES[plan] ?? []
  if (premiumUnits != null && premiumUnits >= 1) {
    const withPremium = new Set(base)
    PREMIUM_ONLY_FEATURES.forEach((f) => withPremium.add(f))
    return Array.from(withPremium)
  }
  return base
}

/**
 * 플랜 라벨 (UI 표시용)
 */
export function getPlanLabel(plan: SubscriptionPlan): string {
  switch (plan) {
    case 'free':
      return '무료'
    case 'basic':
      return '베이직'
    case 'premium':
      return '프리미엄'
    default:
      return plan
  }
}
