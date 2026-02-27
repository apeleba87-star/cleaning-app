import { NavRoleSwitch } from '@/components/NavRoleSwitch'
import { getServerUser } from '@/lib/supabase/server'
import { getCompanyPlan } from '@/lib/plan-features-server'
import { redirect } from 'next/navigation'

export default async function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'business_owner') {
    redirect('/')
  }

  const companyPlan = user.company_id
    ? await getCompanyPlan(user.company_id)
    : null
  const isTrialExpired = !!companyPlan?.is_trial_expired

  return (
    <div className="min-h-screen bg-gray-50">
      <NavRoleSwitch
        userRole={user.role}
        userName={user.name}
        subscriptionPlan={companyPlan?.subscription_plan ?? 'free'}
        subscriptionStatus={companyPlan?.subscription_status ?? 'active'}
        subscriptionPremiumUnits={companyPlan?.premium_units ?? 0}
      />
      {isTrialExpired && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="container mx-auto px-4 py-3">
            <p className="text-sm text-red-700">
              무료체험 기간이 종료되었습니다. 현재는 <span className="font-semibold">회사 관리</span> 화면만 이용할 수 있습니다.
              플랜 변경은 시스템 관리자에게 문의하세요.
            </p>
          </div>
        </div>
      )}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}



