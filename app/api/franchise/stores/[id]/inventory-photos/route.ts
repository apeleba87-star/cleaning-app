import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getTodayDateKST } from '@/lib/utils/date'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'franchise_manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // franchise_manager의 경우 franchise_id를 별도로 조회
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('franchise_id, company_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData || !userData.franchise_id) {
      return NextResponse.json({ error: 'Franchise information not found' }, { status: 403 })
    }

    // 서비스 역할 클라이언트 (있으면 매장 조회·제품사진 RLS 우회)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const adminSupabase =
      serviceRoleKey && supabaseUrl
        ? createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        : null

    // 매장 존재·소속 확인 (RLS 우회: 서비스 역할로 조회 후 franchise_id 검증)
    const storeClient = adminSupabase || supabase
    const { data: store, error: storeError } = await storeClient
      .from('stores')
      .select('id, franchise_id, company_id')
      .eq('id', params.id)
      .single()

    if (storeError || !store || store.franchise_id !== userData.franchise_id || store.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const productPhotosClient = adminSupabase || supabase

    // 오늘 날짜 범위 (한국 시간 기준)
    const todayDateKST = getTodayDateKST()
    const todayStart = new Date(`${todayDateKST}T00:00:00+09:00`)
    const todayEnd = new Date(`${todayDateKST}T23:59:59.999+09:00`)

    // 당일 제품 입고 사진 (type = 'receipt')
    const { data: todayReceiptPhotos, error: receiptError } = await productPhotosClient
      .from('product_photos')
      .select('id, photo_urls, description, created_at')
      .eq('store_id', params.id)
      .eq('type', 'receipt')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false })

    if (receiptError) {
      console.error('Error fetching receipt photos:', receiptError)
    }

    // 당일 보관 사진만 (type = 'storage')
    const { data: storagePhotos, error: storageError } = await productPhotosClient
      .from('product_photos')
      .select('id, photo_urls, description, created_at')
      .eq('store_id', params.id)
      .eq('type', 'storage')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    if (storageError) {
      console.error('Error fetching storage photos:', storageError)
    }

    // photo_urls 배열을 개별 사진 객체로 변환
    const productInflow = (todayReceiptPhotos || []).flatMap((item: any) => {
      const urls = Array.isArray(item.photo_urls) ? item.photo_urls : []
      return urls.map((url: string, idx: number) => ({
        id: `${item.id}-${idx}`,
        photo_url: url,
        photo_type: 'receipt',
        description: item.description,
        created_at: item.created_at,
      }))
    })

    const storage = (storagePhotos || []).flatMap((item: any) => {
      const urls = Array.isArray(item.photo_urls) ? item.photo_urls : []
      return urls.map((url: string, idx: number) => ({
        id: `${item.id}-${idx}`,
        photo_url: url,
        photo_type: 'storage',
        description: item.description,
        created_at: item.created_at,
      }))
    })

    return NextResponse.json({
      success: true,
      data: {
        product_inflow: productInflow,
        storage: storage,
      },
    })
  } catch (error: any) {
    console.error('Error in GET /api/franchise/stores/[id]/inventory-photos:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

