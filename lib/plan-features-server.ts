/**
 * 서버 전용: 업체 요금 플랜 조회 및 기능 허용 검사
 * API 라우트에서 사용합니다.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  type BusinessFeatureKey,
  type SubscriptionPlan,
  type SubscriptionStatus,
  isFeatureAllowed,
} from '@/lib/plan-features'

export type { BusinessFeatureKey }

export interface CompanyPlanInfo {
  company_id: string
  subscription_plan: SubscriptionPlan
  subscription_status: SubscriptionStatus
}

/**
 * company_id로 업체의 요금 플랜·상태 조회
 */
export async function getCompanyPlan(companyId: string | null): Promise<CompanyPlanInfo | null> {
  if (!companyId) return null
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('companies')
    .select('id, subscription_plan, subscription_status')
    .eq('id', companyId)
    .single()
  if (error || !data) return null
  return {
    company_id: data.id,
    subscription_plan: (data.subscription_plan as SubscriptionPlan) ?? 'free',
    subscription_status: (data.subscription_status as SubscriptionStatus) ?? 'active',
  }
}

/**
 * 업체관리자(business_owner)의 company_id에 대해 기능 허용 여부 확인.
 * 허용되지 않으면 null을 반환하고, 허용되면 plan 정보 반환.
 * API에서 403 응답 시 사용할 메시지도 반환합니다.
 */
export async function assertBusinessFeature(
  companyId: string | null,
  feature: BusinessFeatureKey
): Promise<{ allowed: true; plan: CompanyPlanInfo } | { allowed: false; message: string }> {
  const plan = await getCompanyPlan(companyId)
  if (!plan) {
    return { allowed: false, message: '업체 정보를 찾을 수 없습니다.' }
  }
  if (!isFeatureAllowed(plan.subscription_plan, plan.subscription_status, feature)) {
    return {
      allowed: false,
      message: '버전 업그레이드가 필요합니다. 플랜 변경은 시스템 관리자에게 문의하세요.',
    }
  }
  return { allowed: true, plan }
}
