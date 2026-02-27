import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()

    const allowedRoles = ['staff', 'subcontract_individual', 'subcontract_company', 'business_owner']
    if (!user || !allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    if (!user.company_id) {
      return NextResponse.json({ error: '회사 정보가 없습니다.' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { data: announcements, error } = await dataClient
      .from('announcements')
      .select('*')
      .eq('company_id', user.company_id)
      .eq('type', 'staff')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching announcements:', error)
      return NextResponse.json({ error: '공지사항 조회에 실패했습니다.' }, { status: 500 })
    }

    const announcementsWithReadStatus = await Promise.all(
      (announcements || []).map(async (announcement) => {
        const { data: readData } = await dataClient
          .from('announcement_reads')
          .select('read_at')
          .eq('announcement_id', announcement.id)
          .eq('user_id', user.id)
          .maybeSingle()

        return {
          ...announcement,
          is_read: !!readData,
          read_at: readData?.read_at || null,
        }
      })
    )

    return NextResponse.json({ success: true, data: announcementsWithReadStatus })
  } catch (error: any) {
    console.error('Error in GET /api/staff/announcements:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// POST: 공지사항 읽음 표시
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    const allowedRoles = ['staff', 'subcontract_individual', 'subcontract_company', 'business_owner']
    if (!user || !allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { announcement_id } = body

    if (!announcement_id) {
      return NextResponse.json({ error: 'announcement_id는 필수입니다.' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { data: announcement, error: announcementError } = await dataClient
      .from('announcements')
      .select('id, type, company_id')
      .eq('id', announcement_id)
      .single()

    if (announcementError || !announcement) {
      return NextResponse.json({ error: '공지사항을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (announcement.type !== 'staff') {
      return NextResponse.json({ error: '직원용 공지사항이 아닙니다.' }, { status: 403 })
    }

    if (announcement.company_id !== user.company_id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const { error: readError } = await dataClient
      .from('announcement_reads')
      .upsert(
        {
          announcement_id,
          user_id: user.id,
          read_at: new Date().toISOString(),
        },
        {
          onConflict: 'announcement_id,user_id',
        }
      )

    if (readError) {
      console.error('Error marking announcement as read:', readError)
      return NextResponse.json({ error: '읽음 표시에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in POST /api/staff/announcements:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
















