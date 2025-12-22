import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'franchise_manager' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { store_ids } = body

    if (!Array.isArray(store_ids)) {
      return NextResponse.json(
        { error: 'store_ids는 배열이어야 합니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // business_owner와 franchise_manager는 자신의 회사 직원만 배정 가능
    if (user.role === 'business_owner' || user.role === 'franchise_manager') {
      const { data: targetUser } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', params.id)
        .single()

      if (!targetUser || targetUser.company_id !== user.company_id) {
        return NextResponse.json(
          { error: '권한이 없습니다.' },
          { status: 403 }
        )
      }

      // 배정하려는 매장이 모두 자신의 회사 매장인지 확인
      if ((user.role === 'business_owner' || user.role === 'franchise_manager') && store_ids.length > 0) {
        const { data: stores } = await supabase
          .from('stores')
          .select('id, company_id')
          .in('id', store_ids)

        const invalidStores = stores?.filter(s => s.company_id !== user.company_id)
        if (invalidStores && invalidStores.length > 0) {
          return NextResponse.json(
            { error: '자신의 회사 매장만 배정할 수 있습니다.' },
            { status: 403 }
          )
        }
      }
    }

    // 기존 배정 삭제
    const { error: deleteError } = await supabase
      .from('store_assign')
      .delete()
      .eq('user_id', params.id)

    if (deleteError) {
      console.error('Error deleting existing store assignments:', deleteError)
      console.error('Delete error details:', JSON.stringify(deleteError, null, 2))
      return NextResponse.json(
        { error: `기존 매장 배정 삭제에 실패했습니다: ${deleteError.message || '알 수 없는 오류'}` },
        { status: 500 }
      )
    }

    // 새 배정 추가
    if (store_ids.length > 0) {
      const assignments = store_ids.map((storeId: string) => ({
        user_id: params.id,
        store_id: storeId,
      }))

      const { error: insertError } = await supabase
        .from('store_assign')
        .insert(assignments)

      if (insertError) {
        console.error('Error inserting store assignments:', insertError)
        console.error('Insert error details:', JSON.stringify(insertError, null, 2))
        return NextResponse.json(
          { error: `매장 배정에 실패했습니다: ${insertError.message || '알 수 없는 오류'}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in PUT /api/business/users/[id]/stores:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

