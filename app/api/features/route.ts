import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// 기능 목록 조회 (공개 API)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: features, error } = await supabase
      .from('feature_introductions')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching features:', error)
      return NextResponse.json(
        { error: '기능 목록을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: features || [],
    })
  } catch (error: any) {
    console.error('Error in GET /api/features:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}
