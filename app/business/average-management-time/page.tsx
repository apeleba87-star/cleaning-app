import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

type SearchParams = {
  range?: string
  start?: string
  end?: string
  franchiseId?: string
}

function toDateInputValue(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDuration(minutes: number | null) {
  if (minutes == null || Number.isNaN(minutes)) return '-'
  if (minutes < 60) return `${Math.round(minutes)}분`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`
}

const MAX_MANAGEMENT_MINUTES = 5 * 60

export default async function AverageManagementTimePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const user = await getServerUser()
  const supabase = await createServerSupabaseClient()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const dataClient =
    serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabase

  if (!user || user.role !== 'business_owner' || !user.company_id) {
    redirect('/business/dashboard')
  }

  const today = new Date()
  const todayStr = toDateInputValue(today)
  const defaultStart = new Date(today)
  defaultStart.setDate(defaultStart.getDate() - 29)
  const defaultStartStr = toDateInputValue(defaultStart)

  const range = searchParams?.range === 'custom' ? 'custom' : searchParams?.range || '30d'
  const startStr = range === 'custom' ? searchParams?.start || defaultStartStr : defaultStartStr
  const endStr = range === 'custom' ? searchParams?.end || todayStr : todayStr
  const franchiseId = searchParams?.franchiseId || 'all'

  const startDate = new Date(`${startStr}T00:00:00`)
  const endDate = new Date(`${endStr}T00:00:00`)
  const endExclusive = new Date(endDate)
  endExclusive.setDate(endExclusive.getDate() + 1)

  const [storesResult, franchisesResult] = await Promise.all([
    dataClient
      .from('stores')
      .select('id, name, franchise_id')
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .order('name'),
    dataClient
      .from('franchises')
      .select('id, name')
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .eq('status', 'active')
      .order('name'),
  ])
  const stores = storesResult.data
  const storesError = storesResult.error
  const franchises = franchisesResult.data || []

  if (storesError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">매장 정보를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  const filteredStores =
    franchiseId === 'all' ? stores || [] : (stores || []).filter((s) => s.franchise_id === franchiseId)

  const storeIds = filteredStores.map((s) => s.id)
  let attendanceRows: Array<{ store_id: string; clock_in_at: string; clock_out_at: string }> = []

  if (storeIds.length > 0) {
    const { data, error } = await dataClient
      .from('attendance')
      .select('store_id, clock_in_at, clock_out_at')
      .in('store_id', storeIds)
      .not('clock_in_at', 'is', null)
      .not('clock_out_at', 'is', null)
      .gte('clock_in_at', startDate.toISOString())
      .lt('clock_in_at', endExclusive.toISOString())

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">출퇴근 데이터를 불러오는 중 오류가 발생했습니다.</p>
        </div>
      )
    }
    attendanceRows = (data || []) as Array<{ store_id: string; clock_in_at: string; clock_out_at: string }>
  }

  const durationMap = new Map<string, { totalMinutes: number; count: number }>()
  for (const row of attendanceRows) {
    const start = new Date(row.clock_in_at).getTime()
    const end = new Date(row.clock_out_at).getTime()
    const minutes = (end - start) / 60000
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > MAX_MANAGEMENT_MINUTES) continue

    const current = durationMap.get(row.store_id) || { totalMinutes: 0, count: 0 }
    current.totalMinutes += minutes
    current.count += 1
    durationMap.set(row.store_id, current)
  }

  const rows = filteredStores.map((store) => {
    const stat = durationMap.get(store.id)
    const avgMinutes = stat && stat.count > 0 ? stat.totalMinutes / stat.count : null
    return {
      storeId: store.id,
      storeName: store.name,
      avgMinutes,
    }
  })

  rows.sort((a, b) => {
    if (a.avgMinutes == null && b.avgMinutes == null) return a.storeName.localeCompare(b.storeName, 'ko')
    if (a.avgMinutes == null) return 1
    if (b.avgMinutes == null) return -1
    return b.avgMinutes - a.avgMinutes
  })

  return (
    <div className="w-full max-w-[96vw] sm:max-w-6xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">평균 관리시간</h1>
        <a
          href="/business/dashboard"
          className="text-sm lg:text-base text-blue-600 hover:text-blue-800 whitespace-nowrap"
        >
          ← 대시보드로
        </a>
      </div>

      <form className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3 sm:gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">기간</label>
            <select
              name="range"
              defaultValue={range}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full lg:w-auto"
            >
              <option value="30d">최근 30일</option>
              <option value="custom">직접 선택</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">프렌차이즈</label>
            <select
              name="franchiseId"
              defaultValue={franchiseId}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full lg:w-auto"
            >
              <option value="all">전체 프렌차이즈</option>
              {franchises.map((franchise) => (
                <option key={franchise.id} value={franchise.id}>
                  {franchise.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">시작일</label>
            <input
              type="date"
              name="start"
              defaultValue={startStr}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">종료일</label>
            <input
              type="date"
              name="end"
              defaultValue={endStr}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 whitespace-nowrap"
          >
            조회
          </button>
        </div>
      </form>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 border-b border-gray-100 bg-gray-50 text-sm text-gray-600">
          전 매장 평균 관리시간 (완료된 관리 건 기준)
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">매장명</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평균 관리시간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-8 text-center text-sm text-gray-500">
                    표시할 매장이 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.storeId} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900">{row.storeName}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-blue-700">{formatDuration(row.avgMinutes)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-100">
          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">표시할 매장이 없습니다.</div>
          ) : (
            rows.map((row) => (
              <div key={row.storeId} className="px-4 py-3">
                <p className="text-sm text-gray-900 font-medium">{row.storeName}</p>
                <p className="text-sm text-blue-700 font-semibold mt-1">{formatDuration(row.avgMinutes)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

