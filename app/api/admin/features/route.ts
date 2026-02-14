import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// 기능 목록 조회 (관리자용 - 비활성 포함)
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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { data: features, error } = await dataClient
      .from('feature_introductions')
      .select('*')
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
    console.error('Error in GET /api/admin/features:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}

// 기능 생성
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
    const { title, description, icon_name, icon_color, display_order, category, benefits, is_active } = body

    if (!title || !description) {
      return NextResponse.json(
        { error: '제목과 설명은 필수입니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { data: feature, error } = await dataClient
      .from('feature_introductions')
      .insert({
        title,
        description,
        icon_name: icon_name || '📌',
        icon_color: icon_color || '#3B82F6',
        display_order: display_order || 0,
        category: category || 'general',
        benefits: benefits || [],
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating feature:', error)
      return NextResponse.json(
        { error: `기능 생성 실패: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: feature,
    })
  } catch (error: any) {
    console.error('Error in POST /api/admin/features:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}
