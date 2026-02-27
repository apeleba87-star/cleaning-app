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
    const { store_id, category, title, description, photo_url, photo_urls, vending_machine_number, product_number } = body

    if (!store_id || !title) {
      return NextResponse.json(
        { error: 'store_id and title are required' },
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

    // 매장 배정 확인
    const { data: storeAssign } = await dataClient
      .from('store_assign')
      .select('id')
      .eq('user_id', user.id)
      .eq('store_id', store_id)
      .maybeSingle()
    if (!storeAssign) {
      return NextResponse.json({ error: '해당 매장에 대한 권한이 없습니다.' }, { status: 403 })
    }

    // 데이터베이스의 category 컬럼은 체크 제약 조건이 있어서 'other'만 허용하는 것으로 보임
    // 실제 분류는 title과 description으로 처리
    const dbCategory = 'other'

    // photo_urls 배열이 있으면 첫 번째 사진을 photo_url에 저장
    // 데이터베이스에는 photo_url 컬럼만 있으므로 첫 번째 사진만 저장
    let finalPhotoUrl: string | null = null
    if (photo_urls && Array.isArray(photo_urls) && photo_urls.length > 0) {
      finalPhotoUrl = photo_urls[0] // 첫 번째 사진만 사용
    } else if (photo_url) {
      finalPhotoUrl = photo_url
    }

    const insertData: any = {
      store_id,
      category: dbCategory,
      title,
      description: description || null,
      photo_url: finalPhotoUrl,
      status: 'submitted',
      user_id: user.id,
    }

    // 자판기 관련 필드 추가
    if (vending_machine_number !== undefined) {
      insertData.vending_machine_number = vending_machine_number
    }
    if (product_number) {
      insertData.product_number = product_number
    }

    const { data, error } = await dataClient
      .from('problem_reports')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creating problem report:', error)
      console.error('Insert data:', insertData)
      return NextResponse.json(
        { error: `Failed to create problem report: ${error.message || error.code || JSON.stringify(error)}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error in POST /api/staff/problem-reports:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

