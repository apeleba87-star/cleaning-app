'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import V2AdSlot from '@/components/v2/AdSlot'
import { v2Fetch, v2GetCached, v2InvalidateCache, v2Prefetch } from '@/lib/v2/client'
import { V2_REGION_OPTIONS, V2_REGION_SIDOS } from '@/lib/v2/regions'
import { V2_WEEKDAYS } from '@/types/v2'

export default function V2ManageStoresPage() {
  const [stores, setStores] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [regionSido, setRegionSido] = useState('')
  const [regionSigungu, setRegionSigungu] = useState('')
  const [managementDays, setManagementDays] = useState<string[]>([])
  const router = useRouter()

  const load = () => {
    v2GetCached<{ stores: any[] }>('/api/v2/stores', 60_000).then((d) => setStores(d.stores || []))
  }

  useEffect(() => {
    load()
  }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    await v2Fetch('/api/v2/stores', {
      method: 'POST',
      body: JSON.stringify({
        name,
        address,
        region_sido: regionSido,
        region_sigungu: regionSigungu,
        management_days: managementDays.join(','),
      }),
    })
    v2InvalidateCache('/api/v2/stores')
    v2InvalidateCache('/api/v2/stores/summary')
    setName('')
    setAddress('')
    setRegionSido('')
    setRegionSigungu('')
    setManagementDays([])
    setShowForm(false)
    load()
  }

  const toggleDay = (day: string) => {
    setManagementDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const prefetchStore = (storeId: string) => {
    router.prefetch(`/v2/manage/stores/${storeId}`)
    v2Prefetch(`/api/v2/stores/${storeId}`)
    v2Prefetch(`/api/v2/stores/${storeId}/notes`)
    v2Prefetch(`/api/v2/stores/${storeId}/assignments`)
    v2Prefetch(`/api/v2/checklist-templates?store_id=${storeId}`)
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
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={regionSido}
              onChange={(e) => {
                setRegionSido(e.target.value)
                setRegionSigungu('')
              }}
              required
            >
              <option value="">시/도 선택</option>
              {V2_REGION_SIDOS.map((sido) => (
                <option key={sido} value={sido}>
                  {sido}
                </option>
              ))}
            </select>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={regionSigungu}
              onChange={(e) => setRegionSigungu(e.target.value)}
              disabled={!regionSido}
              required
            >
              <option value="">시/군/구 선택</option>
              {(V2_REGION_OPTIONS[regionSido] || []).map((sigungu) => (
                <option key={sigungu} value={sigungu}>
                  {sigungu}
                </option>
              ))}
            </select>
          </div>
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="상세주소 또는 위치 설명"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <div>
            <p className="text-sm font-medium mb-2">관리일</p>
            <div className="flex flex-wrap gap-2">
              {V2_WEEKDAYS.map((day) => {
                const selected = managementDays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-2 rounded-lg border text-sm ${
                      selected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>
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
              prefetch
              onMouseEnter={() => prefetchStore(s.id)}
              onFocus={() => prefetchStore(s.id)}
              className="block bg-white border rounded-xl p-4 hover:bg-gray-50"
            >
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {[s.region_sido, s.region_sigungu].filter(Boolean).join(' ')}
                {s.address ? ` · ${s.address}` : ''}
              </p>
              {s.management_days && (
                <p className="text-xs text-gray-500 mt-1">관리일: {s.management_days}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
