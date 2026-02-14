import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// 커스텀 페이지 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await getServerUser()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { data: page, error } = await dataClient
      .from('custom_pages')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !page) {
      return NextResponse.json(
        { error: '페이지를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 관리자가 아니면 발행된 페이지만 조회 가능
    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      if (!page.is_published || !page.is_active) {
        return NextResponse.json(
          { error: '페이지를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: page,
    })
  } catch (error: any) {
    console.error('Error in GET /api/admin/landing/pages/[id]:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}

// 커스텀 페이지 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { slug, title, content, meta_title, meta_description, is_published, is_active } = body

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    // 슬러그 변경 시 중복 체크
    if (slug) {
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return NextResponse.json(
          { error: '슬러그는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.' },
          { status: 400 }
        )
      }

      const { data: existing } = await dataClient
        .from('custom_pages')
        .select('id')
        .eq('slug', slug)
        .neq('id', params.id)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: '이미 사용 중인 슬러그입니다.' },
          { status: 400 }
        )
      }
    }

    // 페이지 수정
    const updateData: any = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }

    if (slug !== undefined) updateData.slug = slug
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (meta_title !== undefined) updateData.meta_title = meta_title
    if (meta_description !== undefined) updateData.meta_description = meta_description
    if (is_published !== undefined) updateData.is_published = is_published
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: page, error } = await dataClient
      .from('custom_pages')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating custom page:', error)
      return NextResponse.json(
        { error: '페이지 수정에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: page,
      message: '페이지가 수정되었습니다.',
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/landing/pages/[id]:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}

// 커스텀 페이지 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Soft delete (is_active = false)
    const { error } = await dataClient
      .from('custom_pages')
      .update({ is_active: false, updated_by: user.id })
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting custom page:', error)
      return NextResponse.json(
        { error: '페이지 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '페이지가 삭제되었습니다.',
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/landing/pages/[id]:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}
