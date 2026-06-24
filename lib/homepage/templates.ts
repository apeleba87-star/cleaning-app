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
    name: '프리미엄 전시형',
    description: '블랙, 다크그레이, 골드 포인트로 고급 브랜드 느낌을 보여줍니다.',
    defaultPalette: 'primary',
    calculatorPosition: 'none',
    pages: ['home', 'portfolio', 'services', 'about', 'reviews', 'faq', 'contact'],
  },
  {
    key: 'showcase-local',
    category: 'showcase',
    name: '지역업체 전환형',
    description: '지역명과 전화/카카오톡 빠른 상담을 강하게 강조합니다.',
    defaultPalette: 'warm',
    calculatorPosition: 'none',
    pages: ['home', 'about', 'services', 'portfolio', 'reviews', 'faq', 'contact'],
  },
  {
    key: 'showcase-tech',
    category: 'showcase',
    name: '다크 테크 전시형',
    description: '다크모드와 일렉트릭 블루를 사용하는 IT 기업형 프리미엄 홈페이지입니다.',
    defaultPalette: 'bold',
    calculatorPosition: 'none',
    pages: ['home', 'about', 'services', 'portfolio', 'faq', 'contact'],
  },
  {
    key: 'showcase-carenex',
    category: 'showcase',
    name: 'B2B 건물관리형',
    description: '건물 종합관리 기업을 위한 화이트/네이비 기반 신뢰형 랜딩 홈페이지입니다.',
    defaultPalette: 'primary',
    calculatorPosition: 'none',
    pages: ['home', 'about', 'services', 'portfolio', 'faq', 'contact'],
  },
  {
    key: 'showcase-clean-detail',
    category: 'showcase',
    name: '입주청소 정보집약형',
    description: '입주청소 서비스 신뢰 구축과 견적 전환을 위한 정보량 많은 기업형 페이지입니다.',
    defaultPalette: 'primary',
    calculatorPosition: 'none',
    pages: ['home', 'services', 'portfolio', 'faq', 'contact'],
  },
  {
    key: 'silver-daycare',
    category: 'silver',
    name: '주간보호 안심상담형',
    description: '식단, 시설, 프로그램, 장기요양등급 상담과 전화 전환을 강조하는 실버케어 홈페이지입니다.',
    defaultPalette: 'calm',
    calculatorPosition: 'none',
    pages: ['home', 'services', 'portfolio', 'faq', 'contact'],
  },
  {
    key: 'sales-reviews',
    category: 'sales',
    name: '후기 전환형',
    description: '후기, 완료 사진, 예상비용으로 문의 전환을 만듭니다.',
    defaultPalette: 'bold',
    calculatorPosition: 'secondary',
    pages: ['home', 'services', 'portfolio', 'reviews', 'faq', 'contact'],
  },
  {
    key: 'sales-services',
    category: 'sales',
    name: '가격 전환형',
    description: '가격표를 크게 공개해 문의 장벽을 낮춥니다.',
    defaultPalette: 'primary',
    calculatorPosition: 'secondary',
    pages: ['home', 'services', 'portfolio', 'reviews', 'faq', 'contact'],
  },
  {
    key: 'sales-fast-contact',
    category: 'sales',
    name: '긴급 상담형',
    description: '오늘 가능한 일정과 빠른 연락을 강조합니다.',
    defaultPalette: 'bold',
    calculatorPosition: 'secondary',
    pages: ['home', 'services', 'portfolio', 'reviews', 'faq', 'contact'],
  },
  {
    key: 'field-template-studio',
    category: 'showcase',
    name: '현장업 템플릿 판매형',
    description: '현장업 홈페이지 템플릿을 판매하는 다페이지 브랜드 홈페이지입니다.',
    defaultPalette: 'warm',
    calculatorPosition: 'none',
    pages: ['home', 'about', 'services', 'portfolio', 'reviews', 'faq', 'contact'],
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
    name: '단계형 설문형',
    description: '한 번에 하나씩 답하며 예상 결과에 도달합니다.',
    defaultPalette: 'calm',
    calculatorPosition: 'hero',
    pages: ['home', 'estimate', 'services', 'portfolio', 'about', 'reviews', 'contact'],
  },
  {
    key: 'interactive-campaign',
    category: 'interactive',
    name: '추천진단형',
    description: '고객 상황에 맞는 서비스를 추천하고 상담으로 연결합니다.',
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
    warm: {
      ...sharedPalettes.warm,
      name: '스카이 그린',
      cssVars: {
        '--hp-bg': '#f3fbfa',
        '--hp-bg-2': '#d7f4ef',
        '--hp-surface': '#ffffff',
        '--hp-soft': '#e8f7f5',
        '--hp-text': '#123a36',
        '--hp-muted': '#58716c',
        '--hp-primary': '#0f766e',
        '--hp-accent': '#e0f2fe',
        '--hp-dark': '#0b3b45',
        '--hp-border': '#cce7e3',
      },
      page: 'bg-teal-50',
      muted: 'bg-teal-50',
      primary: 'bg-teal-700',
      accent: 'bg-sky-100',
      accentText: 'text-teal-800',
      dark: 'bg-cyan-950',
      border: 'border-teal-100',
    },
  },
  'showcase-portfolio': {
    ...sharedPalettes,
    primary: {
      ...sharedPalettes.bold,
      key: 'primary',
      name: '프리미엄 블랙',
      cssVars: {
        '--hp-bg': '#100c08',
        '--hp-bg-2': '#241a10',
        '--hp-surface': '#17120d',
        '--hp-soft': '#21190f',
        '--hp-text': '#f7f0df',
        '--hp-muted': '#b8aa91',
        '--hp-primary': '#d5b56d',
        '--hp-accent': '#302414',
        '--hp-dark': '#0a0705',
        '--hp-border': '#3b2e1d',
      },
      page: 'bg-[#100c08]',
      surface: 'bg-[#17120d]',
      muted: 'bg-[#21190f]',
      text: 'text-stone-100',
      subtext: 'text-stone-400',
      primary: 'bg-[#d5b56d]',
      primaryText: 'text-black',
      accent: 'bg-[#302414]',
      accentText: 'text-[#d5b56d]',
      dark: 'bg-[#0a0705]',
      darkText: 'text-white',
      border: 'border-[#3b2e1d]',
      hero: 'bg-[#100c08]',
    },
  },
  'sales-fast-contact': {
    ...sharedPalettes,
    bold: { ...sharedPalettes.bold, name: '상담 네이비' },
  },
  'interactive-campaign': {
    ...sharedPalettes,
    warm: {
      ...sharedPalettes.warm,
      name: '코랄 크림',
      cssVars: {
        '--hp-bg': '#fff7ed',
        '--hp-bg-2': '#ffe4d6',
        '--hp-surface': '#fffaf6',
        '--hp-soft': '#fff1e8',
        '--hp-text': '#3b1810',
        '--hp-muted': '#7a5548',
        '--hp-primary': '#be4b2f',
        '--hp-accent': '#ffedd5',
        '--hp-dark': '#3b1810',
        '--hp-border': '#ffd4c7',
      },
      page: 'bg-orange-50',
      surface: 'bg-[#fffaf6]',
      muted: 'bg-orange-50',
      text: 'text-[#3b1810]',
      subtext: 'text-[#7a5548]',
      primary: 'bg-[#be4b2f]',
      accent: 'bg-orange-100',
      accentText: 'text-[#be4b2f]',
      dark: 'bg-[#3b1810]',
      border: 'border-orange-200',
    },
  },
  'interactive-steps': {
    ...sharedPalettes,
    calm: {
      ...sharedPalettes.calm,
      name: '라벤더 블루',
      cssVars: {
        '--hp-bg': '#faf8ff',
        '--hp-bg-2': '#e9e5ff',
        '--hp-surface': '#ffffff',
        '--hp-soft': '#f5f3ff',
        '--hp-text': '#21144f',
        '--hp-muted': '#665f7c',
        '--hp-primary': '#6d4aff',
        '--hp-accent': '#ede9fe',
        '--hp-dark': '#21144f',
        '--hp-border': '#ded6ff',
      },
      page: 'bg-violet-50',
      surface: 'bg-white',
      muted: 'bg-violet-50',
      text: 'text-[#21144f]',
      subtext: 'text-[#665f7c]',
      primary: 'bg-[#6d4aff]',
      accent: 'bg-violet-100',
      accentText: 'text-[#6d4aff]',
      dark: 'bg-[#21144f]',
      border: 'border-violet-100',
    },
  },
}

export function getHomepageTemplate(key: string | null | undefined) {
  return HOMEPAGE_TEMPLATES.find((template) => template.key === key) || HOMEPAGE_TEMPLATES[0]
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
