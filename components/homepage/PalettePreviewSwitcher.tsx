import { getHomepagePalettes, getHomepageTemplate } from '@/lib/homepage/templates'
import type { CSSProperties } from 'react'

type Props = {
  templateKey: string
  currentPalette?: string
  pageSlug?: string
}

export default function PalettePreviewSwitcher({ templateKey, currentPalette, pageSlug }: Props) {
  const template = getHomepageTemplate(templateKey)
  const palettes = Object.values(getHomepagePalettes(templateKey))
  const basePath = pageSlug
    ? `/homepage-preview/${templateKey}/${pageSlug}`
    : `/homepage-preview/${templateKey}`
  const homeHref = currentPalette
    ? `/homepage-preview/${templateKey}?palette=${currentPalette}`
    : `/homepage-preview/${templateKey}`

  return (
    <div className="homepage-site sticky top-0 z-[70] border-b border-black/10 bg-white/95 px-3 py-2 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto">
        <a
          href="/homepage-preview"
          className="shrink-0 rounded-full bg-gray-950 px-3 py-1.5 text-xs font-black text-white"
        >
          ← 템플릿 목록
        </a>
        <a
          href={homeHref}
          className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-black text-gray-900"
        >
          홈 보기
        </a>
        <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-600">
          {template.name} 미리보기 중
        </span>
        <span className="ml-2 shrink-0 text-xs font-black text-gray-500">전체 분위기</span>
        {palettes.map((palette) => {
          const active = (currentPalette || '').toLowerCase() === palette.key
          return (
            <a
              key={palette.key}
              href={`${basePath}?palette=${palette.key}`}
              style={palette.cssVars as CSSProperties}
              className={`shrink-0 rounded-full border px-2.5 py-1.5 text-xs font-black ${
                active ? 'border-gray-950 bg-gray-950 text-white' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <span className="mr-2 inline-block h-3 w-3 rounded-full align-middle ring-1 ring-black/10" style={{ background: 'var(--hp-bg)' }} />
              <span className="mr-2 inline-block h-3 w-3 rounded-full align-middle ring-1 ring-black/10" style={{ background: 'var(--hp-primary)' }} />
              {palette.name}
            </a>
          )
        })}
      </div>
    </div>
  )
}
