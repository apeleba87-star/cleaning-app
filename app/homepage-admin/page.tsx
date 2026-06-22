'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { homepageFetch, homepageGetCached, homepageInvalidateCache } from '@/lib/homepage/client'
import { getHomepagePalettes, HOMEPAGE_TEMPLATES } from '@/lib/homepage/templates'

export default function HomepageAdminPage() {
  const [sites, setSites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [templateKey, setTemplateKey] = useState('interactive-calculator')
  const [paletteKey, setPaletteKey] = useState('primary')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const load = () => {
    setLoading(true)
    homepageGetCached<{ sites: any[] }>('/api/homepage/sites', 30_000)
      .then((data) => setSites(data.sites || []))
      .catch((err) => setError(err.message || '홈페이지 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const createSite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const data = await homepageFetch<{ site: any }>('/api/homepage/sites', {
        method: 'POST',
        body: JSON.stringify({ name, template_key: templateKey, color_palette: paletteKey }),
      })
      homepageInvalidateCache('/api/homepage/sites')
      router.push(`/homepage-admin/sites/${data.site.id}`)
    } catch (err: any) {
      setError(err.message || '홈페이지를 만들지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black">내 홈페이지</h1>
          <p className="mt-1 text-sm text-gray-600">홈페이지 유형을 고르고 가격과 문구만 쉽게 관리하세요.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((value) => !value)}
          className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"
        >
          + 홈페이지 만들기
        </button>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {showCreate && (
        <form onSubmit={createSite} className="rounded-2xl border bg-white p-4 shadow-sm">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">홈페이지 이름</span>
            <input
              className="w-full rounded-xl border px-3 py-3"
              placeholder="예: 강남입주청소 홈페이지"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-gray-700">템플릿 선택</p>
            <div className="grid gap-2 md:grid-cols-3">
              {HOMEPAGE_TEMPLATES.map((template) => (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => {
                    setTemplateKey(template.key)
                    setPaletteKey(template.defaultPalette)
                  }}
                  className={`rounded-xl border p-3 text-left ${
                    templateKey === template.key ? 'border-blue-600 bg-blue-50' : 'bg-white'
                  }`}
                >
                  <p className="font-bold">{template.name}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-600">{template.description}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-gray-700">전체 색감 선택</p>
            <div className="grid gap-2 sm:grid-cols-4">
              {Object.values(getHomepagePalettes(templateKey)).map((palette) => (
                <button
                  key={palette.key}
                  type="button"
                  onClick={() => setPaletteKey(palette.key)}
                  className={`rounded-xl border p-3 text-left ${
                    paletteKey === palette.key ? 'border-blue-600 bg-blue-50' : 'bg-white'
                  }`}
                >
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${palette.accent} ${palette.accentText}`}>
                    {palette.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 w-full rounded-xl bg-gray-950 py-3 font-bold text-white disabled:opacity-60"
          >
            {saving ? '생성 중...' : '홈페이지 생성'}
          </button>
        </form>
      )}

      <section className="grid gap-3 md:grid-cols-2">
        {loading ? (
          <div className="rounded-2xl border bg-white p-5 text-sm text-gray-500">불러오는 중...</div>
        ) : sites.length ? (
          sites.map((site) => (
            <Link
              key={site.id}
              href={`/homepage-admin/sites/${site.id}`}
              prefetch
              onMouseEnter={() => homepageGetCached(`/api/homepage/sites/${site.id}`, 60_000).catch(() => {})}
              className="rounded-2xl border bg-white p-5 shadow-sm hover:border-blue-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black">{site.name}</p>
                  <p className="mt-1 text-sm text-gray-600">/{site.slug}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    site.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {site.status === 'published' ? '공개중' : site.status === 'paused' ? '중지' : '작성중'}
                </span>
              </div>
              <p className="mt-4 text-sm text-gray-500">{site.headline}</p>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border bg-white p-5 text-sm text-gray-500">
            아직 홈페이지가 없습니다. 첫 홈페이지를 만들어보세요.
          </div>
        )}
      </section>
    </main>
  )
}
