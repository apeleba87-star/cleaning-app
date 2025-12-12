import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can view inventory photos')
    }

    const supabase = await createServerSupabaseClient()
    const storeId = params.id

    // 오늘 날짜
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    // 오늘 제품 입고 사진 (product_receipt, order_sheet)
    const { data: productInflowPhotos, error: productError } = await supabase
      .from('inventory_photos')
      .select('id, photo_url, photo_type, created_at')
      .eq('store_id', storeId)
      .in('photo_type', ['product_receipt', 'order_sheet'])
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())
      .order('created_at', { ascending: false })

    // 최근 보관 사진 (store_storage, parcel_locker) - 최대 10개
    const { data: storagePhotos, error: storageError } = await supabase
      .from('inventory_photos')
      .select('id, photo_url, photo_type, created_at')
      .eq('store_id', storeId)
      .in('photo_type', ['store_storage', 'parcel_locker'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (productError || storageError) {
      throw new Error(`Failed to fetch photos: ${productError?.message || storageError?.message}`)
    }

    return Response.json({
      success: true,
      data: {
        product_inflow: productInflowPhotos || [],
        storage: storagePhotos || [],
      },
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}



