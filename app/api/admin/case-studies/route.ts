import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// 관리 사례 목록 조회 (관리자용 - 비활성 포함)
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { data: caseStudies, error } = await supabase
      .from('case_studies')
      .select('*')
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
    console.error('Error in GET /api/admin/case-studies:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}

// 관리 사례 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, blog_url, thumbnail_url, display_order, is_active } = body

    if (!title || !blog_url) {
      return NextResponse.json(
        { error: '제목과 블로그 URL은 필수입니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 빈 문자열을 null로 변환
    const cleanedThumbnailUrl = thumbnail_url && thumbnail_url.trim() ? thumbnail_url.trim() : null
    const cleanedDescription = description && description.trim() ? description.trim() : null

    const { data: caseStudy, error } = await supabase
      .from('case_studies')
      .insert({
        title: title.trim(),
        description: cleanedDescription,
        blog_url: blog_url.trim(),
        thumbnail_url: cleanedThumbnailUrl,
        display_order: display_order || 0,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating case study:', error)
      return NextResponse.json(
        { error: `관리 사례 생성 실패: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: caseStudy,
    })
  } catch (error: any) {
    console.error('Error in POST /api/admin/case-studies:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}
