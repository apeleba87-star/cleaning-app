'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import V2AdSlot from '@/components/v2/AdSlot'
import { v2Fetch } from '@/lib/v2/client'

export default function V2ManageStoresPage() {
  const [stores, setStores] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [managementDays, setManagementDays] = useState('')

  const load = () => {
    v2Fetch<{ stores: any[] }>('/api/v2/stores').then((d) => setStores(d.stores || []))
  }

  useEffect(() => {
    load()
  }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    await v2Fetch('/api/v2/stores', {
      method: 'POST',
      body: JSON.stringify({ name, management_days: managementDays }),
    })
    setName('')
    setManagementDays('')
    setShowForm(false)
    load()
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">매장</h1>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          + 매장 추가
        </button>
      </div>

      <V2AdSlot slot="manage_store_list" />

      {showForm && (
        <form onSubmit={create} className="bg-white border rounded-xl p-4 space-y-3">
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="매장명"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="관리 요일 (예: 일,목)"
            value={managementDays}
            onChange={(e) => setManagementDays(e.target.value)}
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">
            저장
          </button>
        </form>
      )}

      <ul className="space-y-2">
        {stores.map((s) => (
          <li key={s.id}>
            <Link
              href={`/v2/manage/stores/${s.id}`}
              className="block bg-white border rounded-xl p-4 hover:bg-gray-50"
            >
              {s.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
