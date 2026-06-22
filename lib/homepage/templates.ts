import type {
  HomepageColorPaletteKey,
  HomepagePageSlug,
  HomepageTemplateCategory,
  HomepageTemplateKey,
} from '@/types/homepage'

export type HomepageTemplateDefinition = {
  key: HomepageTemplateKey
  category: HomepageTemplateCategory
  name: string
  description: string
  defaultPalette: HomepageColorPaletteKey
  calculatorPosition: 'none' | 'secondary' | 'hero'
  pages: HomepagePageSlug[]
}

export type HomepagePalette = {
  key: HomepageColorPaletteKey
  name: string
  cssVars: Record<string, string>
  page: string
  surface: string
  muted: string
  text: string
  subtext: string
  primary: string
  primaryText: string
  accent: string
  accentText: string
  dark: string
  darkText: string
  border: string
  hero: string
}

export const HOMEPAGE_PAGE_LABELS: Record<HomepagePageSlug, string> = {
  home: '홈',
  about: '회사소개',
  services: '서비스',
  portfolio: '시공사례',
  estimate: '견적계산',
  reviews: '후기',
  faq: 'FAQ',
  contact: '문의',
}

export const HOMEPAGE_TEMPLATES: HomepageTemplateDefinition[] = [
  {
    key: 'showcase-basic',
    category: 'showcase',
    name: '기본 회사소개형',
    description: '회사소개, 서비스, 문의폼 중심의 기본 홈페이지입니다.',
    defaultPalette: 'calm',
    calculatorPosition: 'none',
    pages: ['home', 'about', 'services', 'portfolio', 'reviews', 'faq', 'contact'],
  },
  {
    key: 'showcase-portfolio',
    category: 'showcase',
    name: '시공사례 강조형',
    description: '블로그 포트폴리오와 현장 사례를 크게 보여줍니다.',
    defaultPalette: 'primary',
    calculatorPosition: 'none',
    pages: ['home', 'portfolio', 'services', 'about', 'reviews', 'faq', 'contact'],
  },
  {
    key: 'showcase-local',
    category: 'showcase',
    name: '지역업체 신뢰형',
    description: '지역명, 후기, 빠른 문의를 강조합니다.',
    defaultPalette: 'warm',
    calculatorPosition: 'none',
    pages: ['home', 'about', 'services', 'portfolio', 'reviews', 'contact'],
  },
  {
    key: 'sales-reviews',
    category: 'sales',
    name: '후기 전환형',
    description: '후기와 사례 사이에서 견적계산기로 자연스럽게 이동합니다.',
    defaultPalette: 'bold',
    calculatorPosition: 'secondary',
    pages: ['home', 'services', 'portfolio', 'reviews', 'estimate', 'faq', 'contact'],
  },
  {
    key: 'sales-services',
    category: 'sales',
    name: '서비스 비교형',
    description: '서비스 카드 비교 후 계산기로 유도합니다.',
    defaultPalette: 'primary',
    calculatorPosition: 'secondary',
    pages: ['home', 'services', 'estimate', 'portfolio', 'reviews', 'faq', 'contact'],
  },
  {
    key: 'sales-fast-contact',
    category: 'sales',
    name: '빠른 상담형',
    description: '전화, 카카오톡, 견적계산 버튼을 계속 노출합니다.',
    defaultPalette: 'bold',
    calculatorPosition: 'secondary',
    pages: ['home', 'services', 'estimate', 'portfolio', 'reviews', 'contact'],
  },
  {
    key: 'interactive-calculator',
    category: 'interactive',
    name: '계산기 첫화면형',
    description: '첫 화면에서 바로 예상 견적을 계산합니다.',
    defaultPalette: 'primary',
    calculatorPosition: 'hero',
    pages: ['home', 'estimate', 'services', 'portfolio', 'reviews', 'faq', 'contact'],
  },
  {
    key: 'interactive-steps',
    category: 'interactive',
    name: '단계형 계산기형',
    description: '지역, 평수, 옵션을 단계적으로 입력합니다.',
    defaultPalette: 'calm',
    calculatorPosition: 'hero',
    pages: ['home', 'estimate', 'services', 'portfolio', 'about', 'reviews', 'contact'],
  },
  {
    key: 'interactive-campaign',
    category: 'interactive',
    name: '캠페인 랜딩형',
    description: '빠른 견적 확인과 상담 전환에 집중합니다.',
    defaultPalette: 'warm',
    calculatorPosition: 'hero',
    pages: ['home', 'estimate', 'portfolio', 'reviews', 'faq', 'contact'],
  },
]

const sharedPalettes: Record<HomepageColorPaletteKey, HomepagePalette> = {
  primary: {
    key: 'primary',
    name: '클린 블루',
    cssVars: {
      '--hp-bg': '#f4f9ff',
      '--hp-bg-2': '#dceeff',
      '--hp-surface': '#ffffff',
      '--hp-soft': '#eaf5ff',
      '--hp-text': '#0b1f33',
      '--hp-muted': '#506578',
      '--hp-primary': '#0f74c8',
      '--hp-accent': '#bfe3ff',
      '--hp-dark': '#08243d',
      '--hp-border': '#cae2f7',
    },
    page: 'bg-slate-50',
    surface: 'bg-white',
    muted: 'bg-blue-50',
    text: 'text-slate-950',
    subtext: 'text-slate-600',
    primary: 'bg-blue-600',
    primaryText: 'text-white',
    accent: 'bg-sky-100',
    accentText: 'text-blue-700',
    dark: 'bg-slate-950',
    darkText: 'text-white',
    border: 'border-blue-100',
    hero: 'bg-gradient-to-br from-blue-50 via-white to-sky-100',
  },
  calm: {
    key: 'calm',
    name: '민트 그린',
    cssVars: {
      '--hp-bg': '#f0fbf8',
      '--hp-bg-2': '#cdf7eb',
      '--hp-surface': '#ffffff',
      '--hp-soft': '#e6f8f2',
      '--hp-text': '#10231f',
      '--hp-muted': '#536b64',
      '--hp-primary': '#07836f',
      '--hp-accent': '#bff0df',
      '--hp-dark': '#0a302b',
      '--hp-border': '#c9e9df',
    },
    page: 'bg-emerald-50',
    surface: 'bg-white',
    muted: 'bg-emerald-50',
    text: 'text-stone-950',
    subtext: 'text-stone-600',
    primary: 'bg-emerald-700',
    primaryText: 'text-white',
    accent: 'bg-lime-100',
    accentText: 'text-emerald-800',
    dark: 'bg-emerald-950',
    darkText: 'text-white',
    border: 'border-emerald-100',
    hero: 'bg-gradient-to-br from-emerald-50 via-white to-lime-100',
  },
  bold: {
    key: 'bold',
    name: '네이비 화이트',
    cssVars: {
      '--hp-bg': '#f5f7fb',
      '--hp-bg-2': '#d8e0ee',
      '--hp-surface': '#ffffff',
      '--hp-soft': '#edf1f7',
      '--hp-text': '#0c1524',
      '--hp-muted': '#536071',
      '--hp-primary': '#1e3a5f',
      '--hp-accent': '#cbd8e9',
      '--hp-dark': '#07111f',
      '--hp-border': '#d9e1ee',
    },
    page: 'bg-slate-100',
    surface: 'bg-white',
    muted: 'bg-indigo-50',
    text: 'text-slate-950',
    subtext: 'text-slate-600',
    primary: 'bg-indigo-700',
    primaryText: 'text-white',
    accent: 'bg-violet-100',
    accentText: 'text-indigo-800',
    dark: 'bg-indigo-950',
    darkText: 'text-white',
    border: 'border-indigo-100',
    hero: 'bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-900',
  },
  warm: {
    key: 'warm',
    name: '아이보리 세이지',
    cssVars: {
      '--hp-bg': '#f8f6ef',
      '--hp-bg-2': '#dfe7d7',
      '--hp-surface': '#fffdf8',
      '--hp-soft': '#eef3e8',
      '--hp-text': '#1f241d',
      '--hp-muted': '#60685c',
      '--hp-primary': '#5f7f65',
      '--hp-accent': '#d8e5ca',
      '--hp-dark': '#20281f',
      '--hp-border': '#dce5d3',
    },
    page: 'bg-[#f8f6ef]',
    surface: 'bg-white',
    muted: 'bg-stone-50',
    text: 'text-stone-950',
    subtext: 'text-stone-600',
    primary: 'bg-lime-800',
    primaryText: 'text-white',
    accent: 'bg-lime-100',
    accentText: 'text-lime-900',
    dark: 'bg-stone-950',
    darkText: 'text-white',
    border: 'border-lime-100',
    hero: 'bg-gradient-to-br from-stone-50 via-white to-lime-100',
  },
}

const templatePaletteOverrides: Partial<Record<HomepageTemplateKey, Record<HomepageColorPaletteKey, HomepagePalette>>> = {
  'showcase-local': {
    ...sharedPalettes,
    warm: { ...sharedPalettes.warm, name: '지역 세이지' },
  },
  'sales-fast-contact': {
    ...sharedPalettes,
    bold: { ...sharedPalettes.bold, name: '상담 네이비' },
  },
  'interactive-campaign': {
    ...sharedPalettes,
    warm: { ...sharedPalettes.warm, name: '아이보리 세이지' },
  },
}

export function getHomepageTemplate(key: string | null | undefined) {
  return HOMEPAGE_TEMPLATES.find((template) => template.key === key) || HOMEPAGE_TEMPLATES[6]
}

export function getTemplateCategory(key: string | null | undefined): HomepageTemplateCategory {
  return getHomepageTemplate(key).category
}

export function getHomepagePalettes(templateKey: string | null | undefined) {
  const template = getHomepageTemplate(templateKey)
  return templatePaletteOverrides[template.key] || sharedPalettes
}

export function getHomepagePalette(
  templateKey: string | null | undefined,
  paletteKey: string | null | undefined
) {
  const template = getHomepageTemplate(templateKey)
  const palettes = getHomepagePalettes(template.key)
  return palettes[(paletteKey as HomepageColorPaletteKey) || template.defaultPalette] || palettes[template.defaultPalette]
}

export function normalizeHomepagePageSlug(
  value: string | null | undefined,
  templateKey?: string | null
): HomepagePageSlug {
  const slug = (value || 'home') as HomepagePageSlug
  const template = getHomepageTemplate(templateKey)
  return template.pages.includes(slug) ? slug : 'home'
}
