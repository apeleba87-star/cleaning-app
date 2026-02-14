import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// 랜딩 페이지 설정 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section') // 특정 섹션만 조회 가능

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    let query = dataClient.from('landing_page_settings').select('*')

    if (section) {
      query = query.eq('section', section)
    }

    const { data: settings, error } = await query.order('section')

    if (error) {
      console.error('Error fetching landing page settings:', error)
      return NextResponse.json(
        { error: '설정을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 섹션별로 객체로 변환
    const settingsMap: Record<string, any> = {}
    if (settings) {
      settings.forEach((setting) => {
        settingsMap[setting.section] = setting.settings
      })
    }

    return NextResponse.json({
      success: true,
      data: section ? settingsMap[section] : settingsMap,
    })
  } catch (error: any) {
    console.error('Error in GET /api/admin/landing/settings:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}

// 랜딩 페이지 설정 저장
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
    const { section, settings } = body

    if (!section || !settings) {
      return NextResponse.json(
        { error: '섹션과 설정이 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    // upsert (있으면 업데이트, 없으면 생성)
    const { data, error } = await dataClient
      .from('landing_page_settings')
      .upsert(
        {
          section,
          settings,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'section',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving landing page settings:', error)
      return NextResponse.json(
        { error: '설정 저장에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: '설정이 저장되었습니다.',
    })
  } catch (error: any) {
    console.error('Error in POST /api/admin/landing/settings:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}
