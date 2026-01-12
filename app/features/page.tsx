import { createServerSupabaseClient } from '@/lib/supabase/server'
import FeaturesClient from './FeaturesClient'

export const metadata = {
  title: '무플의 핵심 기능 | 무인 플레이스 청소 관리 솔루션',
  description: '무플의 10가지 핵심 기능을 확인하세요. 실시간 매장 상태 관리, 스마트 요청란, 체크리스트 자동화 등 현장을 유지하는 운영 구조를 제공합니다.',
}

export default async function FeaturesPage() {
  const supabase = await createServerSupabaseClient()

  // 기능 목록 불러오기
  const { data: features, error } = await supabase
    .from('feature_introductions')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching features:', error)
  }

  // 데이터가 없으면 기본 기능 데이터 반환 (임시)
  const defaultFeatures = features && features.length > 0 ? features : []

  return <FeaturesClient features={defaultFeatures} />
}
