import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { getTodayDateKST } from '@/lib/utils/date'

// GET: 매장관리자가 배정된 매장의 제품 사진 조회 (당일 기준)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || !['store_manager', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()
    const todayDateKST = getTodayDateKST()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // 매장이 배정된 매장인지 확인
    const { data: storeAssign } = await supabase
      .from('store_assign')
      .select('id')
      .eq('user_id', user.id)
      .eq('store_id', params.id)
      .maybeSingle()

    if (!storeAssign) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    console.log(`[Product Photos API] Fetching product photos for store ${params.id}`, {
      user_id: user.id,
      store_id: params.id,
      todayStart: todayStart.toISOString(),
      todayEnd: todayEnd.toISOString(),
    })

    // 오늘 날짜 제품 입고 사진 (type = 'receipt')
    const { data: todayReceiptPhotos, error: receiptError } = await supabase
      .from('product_photos')
      .select('id, photo_urls, description, created_at, type, photo_type')
      .eq('store_id', params.id)
      .eq('type', 'receipt')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false })

    // 오늘 날짜 발주서 사진 (type = 'storage')
    const { data: todayStoragePhotos, error: storageError } = await supabase
      .from('product_photos')
      .select('id, photo_urls, description, created_at, type, photo_type')
      .eq('store_id', params.id)
      .eq('type', 'storage')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false })

    console.log(`[Product Photos API] Query results:`, {
      receiptPhotos: todayReceiptPhotos?.length || 0,
      storagePhotos: todayStoragePhotos?.length || 0,
      receiptError: receiptError?.message,
      storageError: storageError?.message,
    })

    if (receiptError) {
      console.error('Error fetching receipt photos:', receiptError)
    }
    if (storageError) {
      console.error('Error fetching storage photos:', storageError)
    }

    // photo_urls 배열을 개별 사진 객체로 변환
    // 제품 입고 사진 (type='receipt')
    const receiptPhotos = (todayReceiptPhotos || []).flatMap((item: any) => {
      const urls = Array.isArray(item.photo_urls) ? item.photo_urls : (item.photo_urls ? [item.photo_urls] : [])
      console.log(`[Product Photos API] Receipt photos for store ${params.id}:`, {
        item_id: item.id,
        photo_urls: urls,
        photo_type: item.photo_type,
        type: item.type,
      })
      return urls.map((url: string, idx: number) => {
        // photo_type='product'이면 'receipt'로 변환 (제품 입고 탭에 표시)
        // photo_type='order_sheet'이면 'order_sheet'로 유지 (제품 입고 탭에 표시)
        const photoType = item.photo_type === 'product' ? 'receipt' : (item.photo_type === 'order_sheet' ? 'order_sheet' : 'receipt')
        return {
          id: `product-${item.id}-receipt-${idx}`,
          photo_url: url,
          photo_type: photoType,
          type: item.type,
          description: item.description,
          created_at: item.created_at,
        }
      })
    })

    // 발주서 사진 (type='storage')
    const storagePhotos = (todayStoragePhotos || []).flatMap((item: any) => {
      const urls = Array.isArray(item.photo_urls) ? item.photo_urls : (item.photo_urls ? [item.photo_urls] : [])
      console.log(`[Product Photos API] Storage photos for store ${params.id}:`, {
        item_id: item.id,
        photo_urls: urls,
        photo_type: item.photo_type,
        type: item.type,
      })
      return urls.map((url: string, idx: number) => ({
        id: `product-${item.id}-storage-${idx}`,
        photo_url: url,
        photo_type: 'storage',
        type: item.type,
        description: item.description,
        created_at: item.created_at,
      }))
    })

    const productPhotos = [...receiptPhotos, ...storagePhotos]
    console.log(`[Product Photos API] Total product photos for store ${params.id}:`, productPhotos.length, productPhotos)

    const error = receiptError || storageError

    if (error) {
      console.error('Error fetching product photos:', error)
      return NextResponse.json({ error: '제품 사진 조회에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ data: productPhotos })
  } catch (error: any) {
    console.error('Error in GET /api/store-manager/stores/[id]/product-photos:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

