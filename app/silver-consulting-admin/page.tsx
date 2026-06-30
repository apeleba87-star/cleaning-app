'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { homepageFetch } from '@/lib/homepage/client'

type BlogCheckRequest = {
  id: string
  center_name: string | null
  role: string
  phone: string
  source_page: string
  status: 'submitted' | 'contacted' | 'completed' | 'archived'
  memo: string | null
  privacy_agreed: boolean
  privacy_agreed_at: string | null
  created_at: string
  updated_at: string
}

const statusLabels: Record<BlogCheckRequest['status'], string> = {
  submitted: '신규',
  contacted: '연락완료',
  completed: '점검완료',
  archived: '보관',
}

const statusClasses: Record<BlogCheckRequest['status'], string> = {
  submitted: 'bg-blue-50 text-blue-700',
  contacted: 'bg-amber-50 text-amber-700',
  completed: 'bg-green-50 text-green-700',
  archived: 'bg-slate-100 text-slate-600',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function SilverConsultingAdminPage() {
  const [requests, setRequests] = useState<BlogCheckRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const counts = useMemo(() => {
    return requests.reduce(
      (acc, item) => {
        acc.total += 1
        acc[item.status] += 1
        return acc
      },
      { total: 0, submitted: 0, contacted: 0, completed: 0, archived: 0 }
    )
  }, [requests])

  const load = () => {
    setLoading(true)
    setError('')
    homepageFetch<{ requests: BlogCheckRequest[] }>('/api/silver-consulting/requests')
      .then((data) => setRequests(data.requests || []))
      .catch((err) => setError(err.message || '신청 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function updateRequest(id: string, status: BlogCheckRequest['status'], memo: string | null) {
    setSavingId(id)
    setError('')
    try {
      const data = await homepageFetch<{ request: BlogCheckRequest }>('/api/silver-consulting/requests', {
        method: 'PATCH',
        body: JSON.stringify({ id, status, memo: memo || '' }),
      })
      setRequests((items) => items.map((item) => (item.id === id ? data.request : item)))
    } catch (err: any) {
      setError(err.message || '상태를 저장하지 못했습니다.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F8FA] px-5 py-8 text-[#1A1A2E]">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 rounded-[2rem] bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#2E6DA4]">admin</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.055em]">블로그 무료점검 신청</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">신청자 연락처와 처리 상태를 확인합니다.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/silver-consulting" className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
              랜딩 보기
            </Link>
            <button type="button" onClick={load} className="rounded-full bg-[#2E6DA4] px-4 py-3 text-sm font-black text-white">
              새로고침
            </button>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-5">
          {[
            ['전체', counts.total, 'bg-slate-900 text-white'],
            ['신규', counts.submitted, 'bg-blue-50 text-blue-700'],
            ['연락완료', counts.contacted, 'bg-amber-50 text-amber-700'],
            ['점검완료', counts.completed, 'bg-green-50 text-green-700'],
            ['보관', counts.archived, 'bg-slate-100 text-slate-600'],
          ].map(([label, value, className]) => (
            <div key={String(label)} className={`rounded-2xl p-5 ${className}`}>
              <p className="text-sm font-black">{label}</p>
              <p className="mt-2 text-3xl font-black">{value}</p>
            </div>
          ))}
        </section>

        {error && <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}

        <section className="mt-5 overflow-hidden rounded-[2rem] bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-sm font-bold text-slate-500">불러오는 중...</div>
          ) : requests.length ? (
            <div className="divide-y divide-slate-100">
              {requests.map((request) => (
                <article key={request.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_220px] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClasses[request.status]}`}>
                        {statusLabels[request.status]}
                      </span>
                      <span className="text-xs font-bold text-slate-400">{formatDate(request.created_at)}</span>
                    </div>
                    <div className="mt-4 rounded-2xl bg-[#F5F8FA] p-4">
                      <p className="text-xs font-black text-slate-400">센터명</p>
                      <p className="mt-1 text-2xl font-black">{request.center_name || '-'}</p>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-[#F5F8FA] p-4">
                        <p className="text-xs font-black text-slate-400">직급</p>
                        <p className="mt-1 text-xl font-black">{request.role}</p>
                      </div>
                      <div className="rounded-2xl bg-[#F5F8FA] p-4">
                        <p className="text-xs font-black text-slate-400">연락처</p>
                        <a href={`tel:${request.phone.replace(/\D/g, '')}`} className="mt-1 block text-xl font-black text-[#2E6DA4]">
                          {request.phone}
                        </a>
                      </div>
                    </div>
                    <div className="mt-3 rounded-2xl bg-[#F5F8FA] p-4">
                      <p className="text-xs font-black text-slate-400">개인정보 동의</p>
                      <p className="mt-1 text-sm font-black text-[#1A1A2E]">
                        {request.privacy_agreed ? `동의 완료${request.privacy_agreed_at ? ` · ${formatDate(request.privacy_agreed_at)}` : ''}` : '동의 정보 없음'}
                      </p>
                    </div>
                    <textarea
                      defaultValue={request.memo || ''}
                      placeholder="메모"
                      className="mt-3 min-h-20 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold outline-none focus:border-[#2E6DA4]"
                      onBlur={(event) => {
                        if (event.target.value !== (request.memo || '')) {
                          updateRequest(request.id, request.status, event.target.value)
                        }
                      }}
                    />
                  </div>

                  <div className="grid gap-2">
                    {Object.entries(statusLabels).map(([status, label]) => (
                      <button
                        key={status}
                        type="button"
                        disabled={savingId === request.id || request.status === status}
                        onClick={() => updateRequest(request.id, status as BlogCheckRequest['status'], request.memo)}
                        className={`rounded-2xl px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-45 ${
                          request.status === status ? 'bg-slate-900 text-white' : 'bg-[#F5F8FA] text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {savingId === request.id ? '저장 중...' : label}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm font-bold text-slate-500">아직 신청 내역이 없습니다.</div>
          )}
        </section>
      </div>
    </main>
  )
}
