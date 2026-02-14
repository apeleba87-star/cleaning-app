import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

/** GET: 공지사항 목록 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) throw new UnauthorizedError('Authentication required')

    if (user.role !== 'business_owner' && user.role !== 'franchise_manager' && user.role !== 'platform_admin') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const companyId = user.company_id
    if (!companyId) {
      return NextResponse.json({ success: true, data: [] })
    }

    const { data: announcementsData, error } = await dataClient
      .from('announcements')
      .select(`
        *,
        created_by_user:users!announcements_created_by_fkey(name)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching announcements:', error)
      throw new Error('공지사항 조회에 실패했습니다.')
    }

    const announcementsWithStats = await Promise.all(
      (announcementsData || []).map(async (announcement: any) => {
        const { data: usersData } = await dataClient
          .from('users')
          .select('id')
          .eq('company_id', companyId)
          .eq('role', announcement.type === 'staff' ? 'staff' : 'manager')

        const { data: readsData } = await dataClient
          .from('announcement_reads')
          .select('id')
          .eq('announcement_id', announcement.id)

        return {
          ...announcement,
          created_by_name: announcement.created_by_user?.name || '알 수 없음',
          read_count: readsData?.length || 0,
          total_users: usersData?.length || 0,
        }
      })
    )

    return NextResponse.json({ success: true, data: announcementsWithStats })
  } catch (err) {
    return handleApiError(err)
  }
}

/** POST: 공지사항 생성 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) throw new UnauthorizedError('Authentication required')

    if (user.role !== 'business_owner' && user.role !== 'franchise_manager' && user.role !== 'platform_admin') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const companyId = user.company_id
    if (!companyId) {
      return NextResponse.json({ error: '회사 정보가 없습니다.' }, { status: 400 })
    }

    const body = await request.json()
    const { title, content, type } = body

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: '제목과 내용은 필수입니다.' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { error } = await dataClient
      .from('announcements')
      .insert({
        company_id: companyId,
        title: title.trim(),
        content: content.trim(),
        type: type === 'owner' ? 'owner' : 'staff',
        created_by: user.id,
      })

    if (error) {
      console.error('Error creating announcement:', error)
      return NextResponse.json({ error: '공지사항 생성에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}

/** DELETE: 공지사항 삭제 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) throw new UnauthorizedError('Authentication required')

    if (user.role !== 'business_owner' && user.role !== 'franchise_manager' && user.role !== 'platform_admin') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id는 필수입니다.' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { error } = await dataClient
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: '공지사항 삭제에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
