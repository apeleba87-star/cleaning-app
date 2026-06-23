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
export type HomepageSubmissionContactMethod = 'form' | 'phone_click' | 'kakao_click' | 'test'
export type HomepageSubmissionPriority = 'low' | 'normal' | 'high'
export type HomepageMediaItemType = 'gallery' | 'before_after' | 'portfolio' | 'after_photo'

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
  logo_image_url: string | null
  address: string | null
  service_area: string | null
  business_hours: string | null
  seo_title: string | null
  seo_description: string | null
  seo_keywords: string[]
  seo_og_image_url: string | null
  seo_canonical_url: string | null
  seo_noindex: boolean
  seo_naver_verification: string | null
  seo_google_verification: string | null
  hero_image_url: string | null
  portfolio_title: string | null
  portfolio_enabled: boolean
  calculator_enabled: boolean
  footer_company_name: string | null
  footer_representative: string | null
  footer_business_number: string | null
  footer_email: string | null
  footer_address: string | null
  footer_phone: string | null
  footer_business_hours: string | null
  footer_privacy_url: string | null
  footer_terms_url: string | null
  footer_note: string | null
  product_name: string | null
  product_price_note: string | null
  product_included_features: string[]
  onboarding_checklist: Record<string, boolean>
  trust_badges: HomepageTrustBadge[]
  created_at?: string
  updated_at?: string
}

export type HomepageTrustBadge = {
  title: string
  description?: string
}

export type HomepageDomain = {
  id: string
  site_id: string
  domain: string
  verified: boolean
  is_primary: boolean
  verification_token?: string | null
  dns_target?: string | null
  verification_status?: 'pending' | 'verified' | 'error'
  verification_error?: string | null
  ssl_status?: 'pending' | 'issued' | 'error'
  last_checked_at?: string | null
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

export type HomepageMediaItem = {
  id: string
  site_id: string
  item_type: HomepageMediaItemType
  title: string
  description: string | null
  image_url: string
  before_image_url: string | null
  after_image_url: string | null
  alt_text: string | null
  sort_order: number
  is_visible: boolean
  created_at?: string
  updated_at?: string
}

export type HomepageEstimateSubmission = {
  id: string
  site_id: string
  tenant_id: string | null
  industry: HomepageIndustry
  customer_name: string
  customer_phone: string
  region: string | null
  area_pyeong: number | null
  selected_options: Record<string, unknown>
  estimate_input: Record<string, unknown>
  estimated_amount: number
  message: string | null
  source_page: string | null
  status: HomepageSubmissionStatus
  admin_memo: string | null
  contact_method: HomepageSubmissionContactMethod
  consent_marketing: boolean
  priority: HomepageSubmissionPriority
  source_campaign: string | null
  contacted_at: string | null
  scheduled_at: string | null
  completed_at: string | null
  lost_reason: string | null
  created_at?: string
  updated_at?: string
}

export type HomepagePushSubscription = {
  id: string
  site_id: string
  user_id: string
  endpoint: string
  active: boolean
  user_agent: string | null
  last_seen_at: string | null
  created_at?: string
}

export type HomepageNotification = {
  id: string
  site_id: string
  submission_id: string | null
  channel: string
  status: 'pending' | 'sent' | 'failed'
  payload: Record<string, unknown> | string
  error: string | null
  created_at?: string
  sent_at: string | null
}

export type HomepagePublicPackage = {
  site: HomepageSite
  domains: HomepageDomain[]
  calculator: HomepageCalculatorSettings | null
  blogPosts: HomepageBlogPost[]
  mediaItems: HomepageMediaItem[]
}

export type HomepageEstimateInput = {
  region: string
  area_pyeong: number
  cleaning_type: 'move_in' | 'move_out'
  housing_type?: 'apartment' | 'villa' | 'officetel' | 'etc'
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
