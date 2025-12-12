import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'business_owner' || !user.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    // 분실물이 존재하고 사용자의 회사 매장에 속하는지 확인
    const { data: lostItem, error: fetchError } = await supabase
      .from('lost_items')
      .select('id, store_id, status, updated_at, stores!inner(company_id)')
      .eq('id', params.id)
      .single()

    if (fetchError || !lostItem) {
      console.error('Lost item fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Lost item not found' },
        { status: 404 }
      )
    }

    console.log('Found lost item:', { id: lostItem.id, currentStatus: lostItem.status })

    // 권한 확인
    if ((lostItem.stores as any).company_id !== user.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // status 업데이트 시도
    // lost_items 테이블의 상태 값을 확인하여 올바른 값 사용
    // 일반적으로 submitted, pending, received, completed, rejected 등이 가능
    const updatedAt = new Date().toISOString()
    
    console.log('Attempting to update lost item:', { 
      id: params.id, 
      currentStatus: lostItem.status,
      targetStatus: 'completed',
      updated_at: updatedAt 
    })

    // 'completed' 상태로 업데이트 시도
    const { error: updateError, data: updateData } = await supabase
      .from('lost_items')
      .update({ 
        status: 'completed',
        updated_at: updatedAt,
      })
      .eq('id', params.id)
      .select('id, status, updated_at')

    if (updateError) {
      console.error('Error updating lost item status:', updateError)
      console.error('Error code:', updateError.code)
      console.error('Error message:', updateError.message)
      console.error('Error details:', JSON.stringify(updateError, null, 2))
      console.error('Full error object:', updateError)
      
      // 'completed'가 허용되지 않는 경우 다른 상태 값 시도
      // 문제 보고와 동일하게 'confirmed' 시도
      if (updateError.code === '23514' || updateError.code === 'PGRST116' || 
          updateError.message?.includes('check constraint') || 
          updateError.message?.includes('invalid') ||
          updateError.message?.includes('violates') ||
          updateError.message?.includes('constraint')) {
        console.log('Trying alternative status: "confirmed"')
        const { error: altError, data: altData } = await supabase
          .from('lost_items')
          .update({ 
            status: 'confirmed',
            updated_at: updatedAt,
          })
          .eq('id', params.id)
          .select('id, status, updated_at')
        
        if (altError) {
          console.error('Alternative status "confirmed" also failed:', altError)
          
          // 'processed' 시도
          console.log('Trying another alternative status: "processed"')
          const { error: alt2Error, data: alt2Data } = await supabase
            .from('lost_items')
            .update({ 
              status: 'processed',
              updated_at: updatedAt,
            })
            .eq('id', params.id)
            .select('id, status, updated_at')
          
          if (alt2Error) {
            console.error('All status update attempts failed')
            return NextResponse.json(
              { error: `Failed to update status. Tried: completed, confirmed, processed. Last error: ${alt2Error.message || JSON.stringify(alt2Error)}` },
              { status: 500 }
            )
          }
          
          console.log('Successfully updated with status "processed":', alt2Data)
          return NextResponse.json({ 
            success: true,
            data: alt2Data?.[0] || null,
            status: 'processed'
          })
        }
        
        console.log('Successfully updated with status "confirmed":', altData)
        return NextResponse.json({ 
          success: true,
          data: altData?.[0] || null,
          status: 'confirmed'
        })
      }
      
      return NextResponse.json(
        { error: `Failed to update status: ${updateError.message || JSON.stringify(updateError)}` },
        { status: 500 }
      )
    }

    console.log('Update successful with status "completed":', updateData)

    // 업데이트 후 데이터 확인
    const { data: updatedItem, error: fetchUpdatedError } = await supabase
      .from('lost_items')
      .select('id, status, updated_at')
      .eq('id', params.id)
      .single()

    if (fetchUpdatedError) {
      console.error('Error fetching updated lost item:', fetchUpdatedError)
    } else {
      console.log('Lost item updated successfully:', updatedItem)
    }

    return NextResponse.json({ 
      success: true,
      data: updatedItem || updateData?.[0] || null
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/lost-items/[id]/confirm:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


