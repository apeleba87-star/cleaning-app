'use client'

import { useEffect, useState } from 'react'
import { v2Fetch } from '@/lib/v2/client'

export default function V2ManageUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'staff' | 'store_manager'>('staff')
  const [storeIds, setStoreIds] = useState<string[]>([])

  const load = () => {
    v2Fetch<{ users: any[] }>('/api/v2/users').then((d) => setUsers(d.users || []))
    v2Fetch<{ stores: any[] }>('/api/v2/stores').then((d) => setStores(d.stores || []))
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await v2Fetch('/api/v2/users', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, role, store_ids: storeIds }),
      })
      setEmail('')
      setPassword('')
      setName('')
      load()
      alert('사용자가 생성되었습니다.')
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">사용자</h1>
      <form onSubmit={submit} className="bg-white border rounded-xl p-4 space-y-3">
        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="이메일"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="임시 비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <select
          className="w-full border rounded-lg px-3 py-2"
          value={role}
          onChange={(e) => setRole(e.target.value as 'staff' | 'store_manager')}
        >
          <option value="staff">직원</option>
          <option value="store_manager">매장관리자</option>
        </select>
        <div className="text-sm">
          <p className="font-medium mb-1">매장 배정</p>
          {stores.map((s) => (
            <label key={s.id} className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={storeIds.includes(s.id)}
                onChange={(e) => {
                  setStoreIds((prev) =>
                    e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                  )
                }}
              />
              {s.name}
            </label>
          ))}
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          사용자 추가
        </button>
      </form>
      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id} className="bg-white border rounded-lg p-3 flex justify-between">
            <span>{u.name}</span>
            <span className="text-sm text-gray-500">{u.role}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
