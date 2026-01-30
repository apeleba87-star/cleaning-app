/**
 * 서버 전용: 업체 요금 플랜·단위 조회 및 기능 허용·한도 검사
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
  basic_units: number
  premium_units: number
}

/**
 * company_id로 업체의 요금 플랜·상태·단위 조회
 */
export async function getCompanyPlan(companyId: string | null): Promise<CompanyPlanInfo | null> {
  if (!companyId) return null
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('companies')
    .select('id, subscription_plan, subscription_status, basic_units, premium_units')
    .eq('id', companyId)
    .single()
  if (error || !data) return null
  return {
    company_id: data.id,
    subscription_plan: (data.subscription_plan as SubscriptionPlan) ?? 'free',
    subscription_status: (data.subscription_status as SubscriptionStatus) ?? 'active',
    basic_units: Number(data.basic_units ?? 0),
    premium_units: Number(data.premium_units ?? 0),
  }
}

/**
 * 업체관리자(business_owner)의 company_id에 대해 기능 허용 여부 확인.
 * premium_units >= 1 이면 프리미엄 전용 기능도 허용.
 */
export async function assertBusinessFeature(
  companyId: string | null,
  feature: BusinessFeatureKey
): Promise<{ allowed: true; plan: CompanyPlanInfo } | { allowed: false; message: string }> {
  const plan = await getCompanyPlan(companyId)
  if (!plan) {
    return { allowed: false, message: '업체 정보를 찾을 수 없습니다.' }
  }
  if (!isFeatureAllowed(plan.subscription_plan, plan.subscription_status, feature, plan.premium_units)) {
    return {
      allowed: false,
      message: '버전 업그레이드가 필요합니다. 플랜 변경은 시스템 관리자에게 문의하세요.',
    }
  }
  return { allowed: true, plan }
}

/** 직원 역할 (한도에 포함): staff, manager, subcontract_individual, subcontract_company */
const EMPLOYEE_ROLES = ['staff', 'manager', 'subcontract_individual', 'subcontract_company'] as const

/**
 * 회사 매장 수 (삭제되지 않은 것만)
 */
export async function getCompanyStoreCount(companyId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { count, error } = await supabase
    .from('stores')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .is('deleted_at', null)
  if (error) return 0
  return count ?? 0
}

/**
 * 회사 직원 수 (직원 역할만, employment_active)
 */
export async function getCompanyEmployeeCount(companyId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('employment_active', true)
    .in('role', [...EMPLOYEE_ROLES])
  if (error) return 0
  return count ?? 0
}

/**
 * 회사 점주/현장관리자 수 (store_manager, employment_active)
 */
export async function getCompanyStoreManagerCount(companyId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('employment_active', true)
    .eq('role', 'store_manager')
  if (error) return 0
  return count ?? 0
}
