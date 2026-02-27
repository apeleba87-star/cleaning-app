import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const oneDayMs = 24 * 60 * 60 * 1000

export type PhotoReviewEntry = {
  checklist_id: string
  store_id: string
  store_name: string
  work_date: string
  user_name: string | null
  item_index: number
  item_area: string
  item_type: string
  photo_type: 'before' | 'after'
  photo_url: string
  reviewed_at: string | null
}

// GET: 갤러리 선택 사진 중 검수 대기 또는 검수 완료 후 1일 이내 건만 목록
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'business_owner') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
    }
    const dataClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const companyId = user.company_id
    if (!companyId) {
      return NextResponse.json({ error: '회사 정보가 없습니다.' }, { status: 403 })
    }

    const { data: stores } = await dataClient
      .from('stores')
      .select('id, name')
      .eq('company_id', companyId)
    const storeIds = (stores || []).map((s: { id: string }) => s.id)
    const storeNameMap = new Map((stores || []).map((s: { id: string; name: string }) => [s.id, s.name]))

    if (storeIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const { data: checklists } = await dataClient
      .from('checklist')
      .select('id, store_id, work_date, assigned_user_id, items')
      .in('store_id', storeIds)
      .neq('work_date', '2000-01-01')

    const now = Date.now()
    const oneDayAgo = new Date(now - oneDayMs).toISOString()
    const entries: PhotoReviewEntry[] = []

    for (const cl of checklists || []) {
      const items = (cl.items as any[]) || []
      let userName: string | null = null
      if (cl.assigned_user_id) {
        const { data: u } = await dataClient.from('users').select('name').eq('id', cl.assigned_user_id).single()
        userName = u?.name || null
      }
      const storeName = storeNameMap.get(cl.store_id) || cl.store_id

      for (let i = 0; i < items.length; i++) {
        const item = items[i] || {}
        const beforeFromGallery = !!item.before_photo_from_gallery
        const afterFromGallery = !!item.after_photo_from_gallery
        const beforeReviewedAt = item.before_photo_reviewed_at || null
        const afterReviewedAt = item.after_photo_reviewed_at || null

        const showBefore = beforeFromGallery && item.before_photo_url && (!beforeReviewedAt || beforeReviewedAt >= oneDayAgo)
        const showAfter = afterFromGallery && item.after_photo_url && (!afterReviewedAt || afterReviewedAt >= oneDayAgo)

        if (showBefore) {
          entries.push({
            checklist_id: cl.id,
            store_id: cl.store_id,
            store_name: storeName,
            work_date: cl.work_date,
            user_name: userName,
            item_index: i,
            item_area: item.area || '',
            item_type: item.type || '',
            photo_type: 'before',
            photo_url: item.before_photo_url || '',
            reviewed_at: beforeReviewedAt,
          })
        }
        if (showAfter) {
          entries.push({
            checklist_id: cl.id,
            store_id: cl.store_id,
            store_name: storeName,
            work_date: cl.work_date,
            user_name: userName,
            item_index: i,
            item_area: item.area || '',
            item_type: item.type || '',
            photo_type: 'after',
            photo_url: item.after_photo_url || '',
            reviewed_at: afterReviewedAt,
          })
        }
      }
    }

    return NextResponse.json({ data: entries })
  } catch (error: any) {
    console.error('Error in GET /api/business/photo-reviews:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
