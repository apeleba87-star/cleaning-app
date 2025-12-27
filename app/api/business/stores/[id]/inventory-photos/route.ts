import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'business_owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // 매장이 사용자의 회사에 속하는지 확인
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, company_id')
      .eq('id', params.id)
      .single()

    if (storeError || !store || store.company_id !== user.company_id) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    // 오늘 날짜 범위
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // 당일 제품 입고 사진 (type = 'receipt')
    const { data: todayReceiptPhotos, error: receiptError } = await supabase
      .from('product_photos')
      .select('id, photo_urls, description, created_at')
      .eq('store_id', params.id)
      .eq('type', 'receipt')
      .gte('created_at', today.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false })

    if (receiptError) {
      console.error('Error fetching receipt photos:', receiptError)
    }

    // 최근 보관 사진 (type = 'storage')
    const { data: storagePhotos, error: storageError } = await supabase
      .from('product_photos')
      .select('id, photo_urls, description, created_at')
      .eq('store_id', params.id)
      .eq('type', 'storage')
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
    console.error('Error in GET /api/business/stores/[id]/inventory-photos:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


















