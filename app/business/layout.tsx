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

  return (
    <div className="min-h-screen bg-gray-50">
      <NavRoleSwitch
        userRole={user.role}
        userName={user.name}
        subscriptionPlan={companyPlan?.subscription_plan ?? 'free'}
        subscriptionStatus={companyPlan?.subscription_status ?? 'active'}
      />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}



