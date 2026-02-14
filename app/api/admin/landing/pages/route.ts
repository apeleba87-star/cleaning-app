import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// 커스텀 페이지 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    // 관리자는 모든 페이지 조회, 일반 사용자는 발행된 페이지만 조회
    let query = dataClient.from('custom_pages').select('*')

    if (user && (user.role === 'admin' || user.role === 'platform_admin')) {
      // 관리자는 모든 페이지 조회
      query = query.order('created_at', { ascending: false })
    } else {
      // 일반 사용자는 발행된 페이지만 조회
      query = query.eq('is_published', true).eq('is_active', true).order('created_at', { ascending: false })
    }

    const { data: pages, error } = await query

    if (error) {
      console.error('Error fetching custom pages:', error)
      return NextResponse.json(
        { error: '페이지 목록을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: pages || [],
    })
  } catch (error: any) {
    console.error('Error in GET /api/admin/landing/pages:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}

// 커스텀 페이지 생성
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
    const { slug, title, content, meta_title, meta_description, is_published } = body

    if (!slug || !title) {
      return NextResponse.json(
        { error: '슬러그와 제목은 필수입니다.' },
        { status: 400 }
      )
    }

    // 슬러그 유효성 검사 (영문, 숫자, 하이픈만 허용)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: '슬러그는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    // 중복 체크
    const { data: existing } = await dataClient
      .from('custom_pages')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: '이미 사용 중인 슬러그입니다.' },
        { status: 400 }
      )
    }

    // 페이지 생성
    const { data: page, error } = await dataClient
      .from('custom_pages')
      .insert({
        slug,
        title,
        content: content || {},
        meta_title,
        meta_description,
        is_published: is_published || false,
        is_active: true,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating custom page:', error)
      return NextResponse.json(
        { error: '페이지 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: page,
      message: '페이지가 생성되었습니다.',
    })
  } catch (error: any) {
    console.error('Error in POST /api/admin/landing/pages:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}
