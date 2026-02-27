import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    const allowedRoles = ['staff', 'subcontract_individual', 'subcontract_company', 'business_owner']
    if (!user || !allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { store_id, type, photo_type, photo_urls, description } = body

    if (!store_id || !type || !photo_urls || !Array.isArray(photo_urls) || photo_urls.length === 0) {
      return NextResponse.json(
        { error: 'store_id, type, and photo_urls array are required' },
        { status: 400 }
      )
    }

    if (type !== 'receipt' && type !== 'storage') {
      return NextResponse.json(
        { error: 'type must be either "receipt" or "storage"' },
        { status: 400 }
      )
    }

    if (type === 'receipt' && photo_type && photo_type !== 'product' && photo_type !== 'order_sheet') {
      return NextResponse.json(
        { error: 'photo_type must be either "product" or "order_sheet" when type is "receipt"' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient =
      serviceRoleKey && supabaseUrl
        ? createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        : supabase

    const { data: storeAssign } = await dataClient
      .from('store_assign')
      .select('id')
      .eq('user_id', user.id)
      .eq('store_id', store_id)
      .maybeSingle()
    if (!storeAssign) {
      return NextResponse.json({ error: '해당 매장에 대한 권한이 없습니다.' }, { status: 403 })
    }

    // product_photos 테이블에 저장
    // type='receipt'일 때는 photo_type으로 구분 (product 또는 order_sheet)
    const insertData: any = {
      store_id,
      type,
      photo_urls: photo_urls,
      description: description || null,
      user_id: user.id,
    }
    
    // 제품 입고일 때 photo_type 추가
    if (type === 'receipt' && photo_type) {
      insertData.photo_type = photo_type
    }

    const { data, error } = await dataClient
      .from('product_photos')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating product photo record:', error)
      console.error('Insert data:', { store_id, type, photo_urls, description, user_id: user.id })
      return NextResponse.json(
        { error: `Failed to create product photo record: ${error.message || error.code || JSON.stringify(error)}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error in POST /api/staff/product-photos:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

