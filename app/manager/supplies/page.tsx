'use client'

import { useState, useEffect } from 'react'
import { SupplyList } from '@/components/SupplyList'
import { createClient } from '@/lib/supabase/client'
import { SupplyRequest, SupplyRequestStatus } from '@/types/db'

export default function ManagerSuppliesPage() {
  const [supplies, setSupplies] = useState<SupplyRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSupplies()
  }, [])

  const loadSupplies = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('supply_requests')
      .select('*')
      .order('created_at', { ascending: false })

    setSupplies(data || [])
    setLoading(false)
  }

  const handleStatusChange = async (id: string, status: SupplyRequestStatus) => {
    const response = await fetch(`/api/supply/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })

    if (response.ok) {
      loadSupplies()
    } else {
      alert('상태 변경 실패')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">물품 관리</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <SupplyList
          supplies={supplies}
          onStatusChange={handleStatusChange}
          userRole="manager"
        />
      </div>
    </div>
  )
}

