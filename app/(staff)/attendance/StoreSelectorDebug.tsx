'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Store } from '@/types/db'

interface StoreSelectorProps {
  selectedStoreId: string
  onSelectStore: (storeId: string) => void
}

export default function StoreSelector({ selectedStoreId: propSelectedStoreId, onSelectStore }: StoreSelectorProps) {
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>(propSelectedStoreId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    loadAssignedStores()
  }, [])

  const loadAssignedStores = async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setError('로그인이 필요합니다.')
      setLoading(false)
      return
    }

    console.log('=== StoreSelector Debug ===')
    console.log('User ID:', session.user.id)
    console.log('User Email:', session.user.email)

    // 배정된 매장 조회
    const { data: assignments, error: assignError } = await supabase
      .from('store_assign')
      .select('store_id, id, created_at')
      .eq('user_id', session.user.id)

    console.log('Store Assign Query Result:')
    console.log('  - Data:', assignments)
    console.log('  - Error:', assignError)
    console.log('  - Error Code:', assignError?.code)
    console.log('  - Error Message:', assignError?.message)
    console.log('  - Error Details:', assignError?.details)
    console.log('  - Error Hint:', assignError?.hint)

    setDebugInfo({
      userId: session.user.id,
      assignments: assignments,
      assignError: assignError,
    })

    if (assignError) {
      console.error('Error fetching store assignments:', assignError)
      setError(`매장 배정 정보를 불러오는 데 실패했습니다: ${assignError.message} (코드: ${assignError.code})`)
      setLoading(false)
      return
    }

    if (!assignments || assignments.length === 0) {
      console.log('No store assignments found for user:', session.user.id)
      setError('배정된 매장이 없습니다. 관리자에게 문의하세요.')
      setLoading(false)
      return
    }

    console.log('Found store assignments:', assignments)

    const storeIds = assignments.map((a) => a.store_id)
    console.log('Store IDs to fetch:', storeIds)

    const { data: storesData, error: storesError } = await supabase
      .from('stores')
      .select('id, name, company_id, deleted_at')
      .in('id', storeIds)
      .is('deleted_at', null)

    console.log('Stores Query Result:')
    console.log('  - Data:', storesData)
    console.log('  - Error:', storesError)
    console.log('  - Error Code:', storesError?.code)
    console.log('  - Error Message:', storesError?.message)

    if (storesError) {
      console.error('Error fetching store details:', storesError)
      setError(`매장 정보를 불러오는 데 실패했습니다: ${storesError.message} (코드: ${storesError.code})`)
      setLoading(false)
      return
    }

    console.log('Final stores:', storesData)
    setStores(storesData || [])
    if (storesData && storesData.length > 0) {
      if (!propSelectedStoreId) {
        setSelectedStoreId(storesData[0].id)
        onSelectStore(storesData[0].id)
      } else {
        setSelectedStoreId(propSelectedStoreId)
      }
    }
    setLoading(false)
  }

  const handleStoreChange = (storeId: string) => {
    setSelectedStoreId(storeId)
    onSelectStore(storeId)
  }

  if (loading) {
    return (
      <div className="w-full space-y-2">
        <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
          <p className="text-sm text-gray-500">매장 목록 로딩 중...</p>
        </div>
        {debugInfo && (
          <div className="px-3 py-2 border border-blue-300 rounded-md bg-blue-50 text-xs">
            <p className="font-semibold">디버그 정보:</p>
            <p>User ID: {debugInfo.userId}</p>
            <p>Assignments: {JSON.stringify(debugInfo.assignments)}</p>
            {debugInfo.assignError && (
              <p className="text-red-600">
                Error: {debugInfo.assignError.message} (코드: {debugInfo.assignError.code})
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full space-y-2">
        <div className="px-3 py-2 border border-red-300 rounded-md bg-red-50">
          <p className="text-sm text-red-800">{error}</p>
        </div>
        {debugInfo && (
          <div className="px-3 py-2 border border-blue-300 rounded-md bg-blue-50 text-xs">
            <p className="font-semibold">디버그 정보:</p>
            <p>User ID: {debugInfo.userId}</p>
            <p>Assignments: {JSON.stringify(debugInfo.assignments)}</p>
            {debugInfo.assignError && (
              <p className="text-red-600">
                Error: {debugInfo.assignError.message} (코드: {debugInfo.assignError.code})
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  if (stores.length === 0) {
    return (
      <div className="w-full space-y-2">
        <div className="px-3 py-2 border border-gray-300 rounded-md bg-yellow-50">
          <p className="text-sm text-yellow-800">배정된 매장이 없습니다. 관리자에게 문의하세요.</p>
        </div>
        {debugInfo && (
          <div className="px-3 py-2 border border-blue-300 rounded-md bg-blue-50 text-xs">
            <p className="font-semibold">디버그 정보:</p>
            <p>User ID: {debugInfo.userId}</p>
            <p>Assignments: {JSON.stringify(debugInfo.assignments)}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full space-y-2">
      <select
        value={selectedStoreId}
        onChange={(e) => handleStoreChange(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
      >
        <option value="">매장을 선택하세요</option>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
      {debugInfo && (
        <div className="px-3 py-2 border border-blue-300 rounded-md bg-blue-50 text-xs">
          <p className="font-semibold">디버그 정보:</p>
          <p>User ID: {debugInfo.userId}</p>
          <p>Found {stores.length} stores</p>
        </div>
      )}
    </div>
  )
}



