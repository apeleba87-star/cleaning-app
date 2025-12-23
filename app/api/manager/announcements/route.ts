import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

// GET: 점주용 공지사항 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'manager') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    if (!user.company_id) {
      return NextResponse.json({ error: '회사 정보가 없습니다.' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // 점주용 공지사항 조회
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('company_id', user.company_id)
      .eq('type', 'owner')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching announcements:', error)
      return NextResponse.json({ error: '공지사항 조회에 실패했습니다.' }, { status: 500 })
    }

    // 각 공지사항의 읽음 여부 확인
    const announcementsWithReadStatus = await Promise.all(
      (announcements || []).map(async (announcement) => {
        const { data: readData } = await supabase
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
    console.error('Error in GET /api/manager/announcements:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// POST: 공지사항 읽음 표시
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'manager') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const body = await request.json()
    const { announcement_id } = body

    if (!announcement_id) {
      return NextResponse.json({ error: 'announcement_id는 필수입니다.' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // 공지사항이 점주용인지 확인
    const { data: announcement, error: announcementError } = await supabase
      .from('announcements')
      .select('id, type, company_id')
      .eq('id', announcement_id)
      .single()

    if (announcementError || !announcement) {
      return NextResponse.json({ error: '공지사항을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (announcement.type !== 'owner') {
      return NextResponse.json({ error: '점주용 공지사항이 아닙니다.' }, { status: 403 })
    }

    if (announcement.company_id !== user.company_id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // 읽음 표시 생성 (이미 있으면 업데이트)
    const { error: readError } = await supabase
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
    console.error('Error in POST /api/manager/announcements:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}











