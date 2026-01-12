import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// 관리 사례 목록 조회 (공개 API)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: caseStudies, error } = await supabase
      .from('case_studies')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching case studies:', error)
      return NextResponse.json(
        { error: '관리 사례 목록을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: caseStudies || [],
    })
  } catch (error: any) {
    console.error('Error in GET /api/case-studies:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}
