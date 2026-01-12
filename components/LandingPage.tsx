import { createServerSupabaseClient } from '@/lib/supabase/server'
import LandingPageClient from './LandingPageClient'

// 기본 설정 (DB에 데이터가 없을 때 사용)
const defaultHeroSettings = {
  tagline: '[ 현장을 늘리기보다, 지켜내는 운영 관리 ]',
  headline1: '무인 플레이스',
  headline2: '청소 운영 구조',
  brandName: '무플',
  subtitle: '무인 플레이스 청소 관리 솔루션',
  ctaButton1: {
    text: '운영 구조 상담받기',
    link: '/login',
    visible: true,
  },
  ctaButton2: {
    text: '가볍게 상담 받기',
    link: '/login',
    visible: true,
  },
  sliderInterval: 5000,
}

export default async function LandingPage() {
  const supabase = await createServerSupabaseClient()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  // 히어로 이미지 불러오기
  const { data: heroImagesData } = await supabase
    .from('hero_images')
    .select('image_url, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  // 유효한 이미지 URL만 필터링
  let heroImages = (heroImagesData || [])
    .map((img) => img.image_url)
    .filter((url) => url && url.trim().length > 0) || []

  // Private 버킷인 경우 Signed URL 생성
  if (serviceRoleKey && supabaseUrl && heroImages.length > 0) {
    const { createClient } = await import('@supabase/supabase-js')
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 각 이미지 URL을 Signed URL로 변환
    const signedUrls = await Promise.all(
      heroImages.map(async (imageUrl) => {
        try {
          // URL에서 버킷과 경로 추출
          const urlMatch = imageUrl.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/)
          if (!urlMatch) return imageUrl

          const bucket = urlMatch[1]
          const filePath = urlMatch[2]

          // Signed URL 생성 (1년 유효)
          const { data: signedData } = await adminSupabase.storage
            .from(bucket)
            .createSignedUrl(filePath, 3600 * 24 * 365)

          return signedData?.signedUrl || imageUrl
        } catch (error) {
          console.error('Failed to create signed URL for:', imageUrl, error)
          return imageUrl
        }
      })
    )

    heroImages = signedUrls
  }

  // 히어로 설정 불러오기
  const { data: heroSettingsData } = await supabase
    .from('landing_page_settings')
    .select('settings')
    .eq('section', 'hero')
    .single()

  const heroSettings = heroSettingsData?.settings || defaultHeroSettings

  // 관리 사례 불러오기
  const { data: caseStudiesData } = await supabase
    .from('case_studies')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .limit(6) // 최대 6개만 표시

  const caseStudies = caseStudiesData || []

  return <LandingPageClient heroImages={heroImages} heroSettings={heroSettings} caseStudies={caseStudies} />
}
