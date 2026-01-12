import { createServerSupabaseClient } from '@/lib/supabase/server'
import CaseStudiesClient from './CaseStudiesClient'

export const metadata = {
  title: '관리 사례 | 무플 무인 플레이스 청소 관리 솔루션',
  description: '무플로 현장을 유지하는 실제 관리 사례를 확인하세요. 다양한 운영 사례와 성공 스토리를 공유합니다.',
}

export default async function CaseStudiesPage() {
  const supabase = await createServerSupabaseClient()

  // 관리 사례 불러오기
  const { data: caseStudies, error } = await supabase
    .from('case_studies')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching case studies:', error)
  }

  const caseStudiesData = caseStudies || []

  return <CaseStudiesClient caseStudies={caseStudiesData} />
}
