import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

/** GET: 공지사항 읽음 현황 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) throw new UnauthorizedError('Authentication required')

    if (user.role !== 'business_owner' && user.role !== 'franchise_manager' && user.role !== 'platform_admin') {
      return Response.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const announcementId = searchParams.get('announcement_id')
    const type = searchParams.get('type') // 'staff' | 'owner'

    if (!announcementId || !type) {
      return Response.json({ error: 'announcement_id와 type이 필요합니다.' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const companyId = user.company_id
    if (!companyId) {
      return Response.json({ error: '회사 정보가 없습니다.' }, { status: 400 })
    }

    const { data: usersData } = await dataClient
      .from('users')
      .select('id, name')
      .eq('company_id', companyId)
      .eq('role', type === 'staff' ? 'staff' : 'manager')

    const { data: readsData } = await dataClient
      .from('announcement_reads')
      .select('user_id, read_at')
      .eq('announcement_id', announcementId)

    const readsMap = new Map((readsData || []).map((r: any) => [r.user_id, r.read_at]))

    const statuses = (usersData || []).map((u: any) => ({
      user_id: u.id,
      user_name: u.name,
      read_at: readsMap.get(u.id) || null,
    }))

    return Response.json({ success: true, data: statuses })
  } catch (err) {
    return handleApiError(err)
  }
}
