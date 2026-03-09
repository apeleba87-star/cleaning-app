import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import UserList from './UserList'
import PendingOwnerSignupsSection from './PendingOwnerSignupsSection'

export default async function PlatformUsersPage() {
  const user = await getServerUser()
  const supabase = await createServerSupabaseClient()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const dataClient = serviceRoleKey && supabaseUrl
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    : supabase

  if (!user || user.role !== 'platform_admin') {
    redirect('/platform/dashboard')
  }

  // 모든 사용자 조회 (dataClient로 RLS 우회, 회사 요금제/무료기간 포함)
  const { data: users, error: usersError } = await dataClient
    .from('users')
    .select(`
      *,
      companies:company_id (
        id,
        name,
        subscription_plan,
        subscription_status,
        trial_ends_at
      )
    `)
    .order('created_at', { ascending: false })

  // 모든 매장 조회
  const { data: stores, error: storesError } = await dataClient
    .from('stores')
    .select('id, name, company_id')
    .is('deleted_at', null)
    .order('name')

  // 모든 회사 조회
  const { data: companies, error: companiesError } = await dataClient
    .from('companies')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')

  // 매장 배정 정보 조회 (platform_admin은 모든 배정 조회 가능)
  const { data: storeAssigns, error: assignsError } = await dataClient
    .from('store_assign')
    .select('user_id, store_id')

  if (usersError || storesError || assignsError || companiesError) {
    console.error('Error fetching data:', { 
      usersError: usersError?.message, 
      storesError: storesError?.message, 
      assignsError: assignsError?.message, 
      companiesError: companiesError?.message 
    })
    console.error('Full error details:', { usersError, storesError, assignsError, companiesError })
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  // 매장 배정을 맵으로 변환
  const userStoreMap = new Map<string, string[]>()
  storeAssigns?.forEach((assign) => {
    if (!userStoreMap.has(assign.user_id)) {
      userStoreMap.set(assign.user_id, [])
    }
    userStoreMap.get(assign.user_id)?.push(assign.store_id)
  })

  // auth.users에서 이메일 가져오기 (Service Role Key 사용)
  let usersWithEmail = users || []

  if (serviceRoleKey && supabaseUrl) {
    try {
      const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      const { data: authUsersData, error: authError } = await adminSupabase.auth.admin.listUsers()
      
      if (!authError && authUsersData?.users) {
        const emailMap = new Map<string, string>()
        authUsersData.users.forEach((authUser: any) => {
          if (authUser.email) {
            emailMap.set(authUser.id, authUser.email)
          }
        })

        usersWithEmail = (users || []).map((u: any) => ({
          ...u,
          email: emailMap.get(u.id) || null,
        }))
      }
    } catch (authErr) {
      console.error('Error fetching auth users:', authErr)
    }
  }

  return (
    <div className="w-full max-w-[96vw] sm:max-w-6xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">전체 사용자 관리</h1>
        <a
          href="/platform/dashboard"
          className="text-sm lg:text-base text-blue-600 hover:text-blue-800 whitespace-nowrap"
        >
          ← 대시보드로
        </a>
      </div>

      <PendingOwnerSignupsSection />
      
      <UserList 
        initialUsers={usersWithEmail} 
        stores={stores || []}
        companies={companies || []}
        userStoreMap={userStoreMap}
      />
    </div>
  )
}

