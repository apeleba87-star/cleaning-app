export type HomepageTemplateCategory = 'showcase' | 'sales' | 'interactive'

export type HomepagePageSlug =
  | 'home'
  | 'about'
  | 'services'
  | 'portfolio'
  | 'estimate'
  | 'reviews'
  | 'faq'
  | 'contact'

export type HomepageColorPaletteKey = 'primary' | 'calm' | 'bold' | 'warm'

export type HomepageTemplateKey =
  | 'showcase-basic'
  | 'showcase-portfolio'
  | 'showcase-local'
  | 'sales-reviews'
  | 'sales-services'
  | 'sales-fast-contact'
  | 'interactive-calculator'
  | 'interactive-steps'
  | 'interactive-campaign'

export type HomepageIndustry = 'move_in_cleaning'

export type HomepageSubmissionStatus = 'new' | 'checked' | 'consulting' | 'completed' | 'hold'

export type HomepageSite = {
  id: string
  tenant_id: string | null
  slug: string
  name: string
  template_key: HomepageTemplateKey
  template_category: HomepageTemplateCategory
  color_palette?: HomepageColorPaletteKey
  status: 'draft' | 'published' | 'paused'
  business_name: string
  headline: string
  subheadline: string
  description: string | null
  phone: string | null
  kakao_url: string | null
  blog_url: string | null
  naver_place_url: string | null
  instagram_url: string | null
  address: string | null
  service_area: string | null
  business_hours: string | null
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string[]
  hero_image_url: string | null
  portfolio_title: string | null
  portfolio_enabled: boolean
  calculator_enabled: boolean
  created_at?: string
  updated_at?: string
}

export type HomepageDomain = {
  id: string
  site_id: string
  domain: string
  verified: boolean
  is_primary: boolean
}

export type HomepageCalculatorSettings = {
  id?: string
  site_id: string
  industry: HomepageIndustry
  enabled: boolean
  base_unit_price: number
  minimum_price: number
  pollution_extra_light: number
  pollution_extra_normal: number
  pollution_extra_heavy: number
  no_elevator_extra: number
  region_extras: Record<string, number>
  option_extras: Record<string, number>
  discount_rate: number
  result_notice: string
  caution_note: string
}

export type HomepageBlogPost = {
  id: string
  site_id: string
  title: string
  url: string
  summary: string | null
  thumbnail_url: string | null
  published_at: string | null
  is_visible: boolean
  is_pinned: boolean
}

export type HomepagePublicPackage = {
  site: HomepageSite
  domains: HomepageDomain[]
  calculator: HomepageCalculatorSettings | null
  blogPosts: HomepageBlogPost[]
}

export type HomepageEstimateInput = {
  region: string
  area_pyeong: number
  cleaning_type: 'move_in' | 'move_out'
  options: string[]
  elevator: 'yes' | 'no'
  pollution: 'light' | 'normal' | 'heavy'
}

export type HomepageEstimateResult = {
  baseAmount: number
  extraAmount: number
  discountAmount: number
  estimatedAmount: number
}
