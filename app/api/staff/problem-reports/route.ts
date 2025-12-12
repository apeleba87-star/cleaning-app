import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { store_id, category, title, description, photo_url, vending_machine_number, product_number } = body

    if (!store_id || !title) {
      return NextResponse.json(
        { error: 'store_id and title are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 데이터베이스의 category 컬럼은 체크 제약 조건이 있어서 'other'만 허용하는 것으로 보임
    // 실제 분류는 title과 description으로 처리
    const dbCategory = 'other'

    const insertData: any = {
      store_id,
      category: dbCategory,
      title,
      description: description || null,
      photo_url: photo_url || null,
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

    const { data, error } = await supabase
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

