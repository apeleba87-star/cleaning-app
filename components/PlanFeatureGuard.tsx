import { getServerUser } from '@/lib/supabase/server'
import { getCompanyPlan } from '@/lib/plan-features-server'
import { isFeatureAllowed } from '@/lib/plan-features'
import type { BusinessFeatureKey } from '@/lib/plan-features'
import Link from 'next/link'

/** 베이직 등 하위 플랜 사용자가 프리미엄 전용 기능에 접근할 때 표시하는 안내 화면 */
export function PlanUpgradeRequiredView() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-amber-800 mb-2">버전 업그레이드가 필요합니다</h2>
        <p className="text-amber-700 mb-6">
          이 기능은 프리미엄 플랜에서 이용할 수 있습니다.<br />
          플랜 변경을 원하시면 시스템 관리자에게 문의해 주세요.
        </p>
        <Link
          href="/business/dashboard"
          className="inline-block px-6 py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    </div>
  )
}

interface PlanFeatureGuardProps {
  feature: BusinessFeatureKey
  children: React.ReactNode
}

/**
 * 업체관리자 페이지에서 요금 플랜별 기능 접근을 제어합니다.
 * 허용되지 않은 플랜이면 "버전 업그레이드가 필요합니다" 안내를 표시하고, 허용 시 children을 렌더합니다.
 */
export async function PlanFeatureGuard({ feature, children }: PlanFeatureGuardProps) {
  const user = await getServerUser()
  if (!user || user.role !== 'business_owner' || !user.company_id) {
    return <>{children}</>
  }

  const plan = await getCompanyPlan(user.company_id)
  if (!plan) {
    return <>{children}</>
  }

  if (!isFeatureAllowed(plan.subscription_plan, plan.subscription_status, feature)) {
    return <PlanUpgradeRequiredView />
  }

  return <>{children}</>
}
