import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserList from './UserList'

export default async function BusinessUsersPage() {
  const user = await getServerUser()
  const supabase = await createServerSupabaseClient()

  if (!user || !user.company_id) {
    redirect('/business/dashboard')
  }

  // 회사 직원 조회 - Service role key로 이메일 포함하여 가져오기
  const { createClient } = await import('@supabase/supabase-js')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  
  let users: any[] = []
  let usersError: any = null
  
  // RLS 우회: 서비스 역할로 users, stores, franchises, store_assign 등 조회
  let adminSupabase: ReturnType<typeof createClient> | null = null
  if (serviceRoleKey && supabaseUrl) {
    adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  const dataClient = adminSupabase || supabase

  // users 테이블에서 조회
  const { data: usersData, error: queryError } = await dataClient
    .from('users')
    .select('*')
    .eq('company_id', user.company_id)
    .order('created_at', { ascending: false })

  if (queryError) {
    usersError = queryError
  } else {
    users = usersData || []
    if (adminSupabase) {
      try {
        const { data: authUsersData, error: authError } = await adminSupabase.auth.admin.listUsers()
        if (!authError && authUsersData?.users) {
          const emailMap = new Map<string, string>()
          authUsersData.users.forEach((authUser: any) => {
            if (authUser.email) emailMap.set(authUser.id, authUser.email)
          })
          users = users.map((u: any) => ({
            ...u,
            email: emailMap.get(u.id) || null,
          }))
        }
      } catch (authErr) {
        console.error('Error fetching auth users:', authErr)
      }
    }
  }

  // 회사 매장 조회
  const { data: stores, error: storesError } = await dataClient
    .from('stores')
    .select('id, name')
    .eq('company_id', user.company_id)
    .is('deleted_at', null)
    .order('name')

  // 회사 프렌차이즈 조회
  const { data: franchises, error: franchisesError } = await dataClient
    .from('franchises')
    .select('id, name')
    .eq('company_id', user.company_id)
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('name')

  // 매장 배정 정보 조회 (회사 사용자에 한해 필터링은 UserList 등에서)
  const { data: storeAssigns, error: assignsError } = await dataClient
    .from('store_assign')
    .select('user_id, store_id')

  // 회사 프리미엄 결제 수 (프렌차이즈·매장관리자 등 프리미엄 기능 제어)
  const { data: companyPlan } = await dataClient
    .from('companies')
    .select('premium_units')
    .eq('id', user.company_id)
    .single()
  const premiumUnits = Number(companyPlan?.premium_units ?? 0)

  if (usersError || storesError || franchisesError || assignsError) {
    console.error('Error fetching data:', { usersError, storesError, franchisesError, assignsError })
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  // users가 비어있고 에러가 없으면 빈 배열로 초기화
  if (!users) {
    users = []
  }

  // 매장 배정을 맵으로 변환
  const userStoreMap = new Map<string, string[]>()
  storeAssigns?.forEach((assign) => {
    if (!userStoreMap.has(assign.user_id)) {
      userStoreMap.set(assign.user_id, [])
    }
    userStoreMap.get(assign.user_id)?.push(assign.store_id)
  })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">사용자 관리</h1>
        <a
          href="/business/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>
      
      <UserList 
        initialUsers={users || []} 
        stores={stores || []}
        franchises={franchises || []}
        userStoreMap={userStoreMap}
        companyId={user.company_id}
        currentUserRole={user.role}
        premiumUnits={premiumUnits}
      />
    </div>
  )
}

