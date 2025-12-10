import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Store } from '@/types/db'
import { redirect } from 'next/navigation'
import StoreList from './StoreList'

export default async function StoresPage() {
  const supabase = await createServerSupabaseClient()
  
  const { data: stores, error } = await supabase
    .from('stores')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching stores:', error)
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">매장 목록을 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">매장 관리</h1>
        <a
          href="/dashboard"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로
        </a>
      </div>
      
      <StoreList initialStores={stores || []} />
    </div>
  )
}

