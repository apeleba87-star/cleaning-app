import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    // 분실물이 존재하고 사용자의 회사 매장에 속하는지 확인
    const { data: lostItem, error: fetchError } = await dataClient
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

    // 이미 확인 처리된 경우
    const { data: currentLostItem, error: fetchCurrentError } = await dataClient
      .from('lost_items')
      .select('business_confirmed_at')
      .eq('id', params.id)
      .single()

    if (fetchCurrentError) {
      console.error('Error fetching current lost item:', fetchCurrentError)
    }

    if (currentLostItem?.business_confirmed_at) {
      return NextResponse.json({ 
        success: true, 
        message: 'Already confirmed',
        data: lostItem
      })
    }

    // status 업데이트 시도 (dataClient로 RLS 우회)
    // lost_items 테이블의 상태 값을 확인하여 올바른 값 사용
    // 일반적으로 submitted, pending, received, completed, rejected 등이 가능
    const updatedAt = new Date().toISOString()
    
    console.log('Attempting to update lost item:', { 
      id: params.id, 
      currentStatus: lostItem.status,
      targetStatus: 'completed',
      updated_at: updatedAt 
    })

    // 'completed' 상태와 business_confirmed_at 업데이트 시도 (일반 클라이언트로 먼저 시도)
    let updateError: any = null
    let updateData: any = null
    
    const updateResult = await dataClient
      .from('lost_items')
      .update({ 
        status: 'completed',
        business_confirmed_at: updatedAt,
        business_confirmed_by: user.id,
        updated_at: updatedAt,
      })
      .eq('id', params.id)
      .select('id, status, updated_at, store_id, business_confirmed_at, business_confirmed_by')

    updateError = updateResult.error
    updateData = updateResult.data
    
    console.log('Update result:', { 
      error: updateError, 
      data: updateData,
      rowsAffected: updateData?.length || 0,
      returnedStatus: updateData?.[0]?.status
    })

    // 에러가 있는 경우에만 처리
    if (updateError) {
      console.error('Error updating lost item status:', updateError)
      console.error('Error code:', updateError.code)
      console.error('Error message:', updateError.message)
      console.error('Error details:', JSON.stringify(updateError, null, 2))
      console.error('Full error object:', updateError)
      
      // 'completed'가 허용되지 않는 경우 다른 상태 값 시도
      // 문제 보고와 동일하게 'confirmed' 시도
      const isConstraintError = updateError.code === '23514' || 
                                updateError.code === 'PGRST116' || 
          updateError.message?.includes('check constraint') || 
          updateError.message?.includes('invalid') ||
          updateError.message?.includes('violates') ||
                                updateError.message?.includes('constraint')
      
      if (isConstraintError) {
        // lost_items 테이블은 issue_status enum을 사용하므로 'completed'만 유효
        console.log('Constraint error detected, retrying with dataClient...')
        const { error: retryError, data: retryData } = await dataClient
          .from('lost_items')
          .update({ 
            status: 'completed',
            business_confirmed_at: updatedAt,
            business_confirmed_by: user.id,
            updated_at: updatedAt,
          })
          .eq('id', params.id)
          .select('id, status, updated_at, store_id, business_confirmed_at, business_confirmed_by')
        
        if (retryError) {
          console.error('Retry with Service Role Key also failed:', retryError)
            return NextResponse.json(
            { error: `Failed to update status. Tried with Service Role Key. Error: ${retryError.message || JSON.stringify(retryError)}` },
              { status: 500 }
            )
          }
          
        console.log('Successfully updated with status "completed":', retryData)
        
        // 업데이트 후 최신 데이터 조회
        await new Promise(resolve => setTimeout(resolve, 100))
        const { data: finalItem } = await dataClient
          .from('lost_items')
          .select('id, status, updated_at, store_id, business_confirmed_at, business_confirmed_by')
          .eq('id', params.id)
          .single()
        
        return NextResponse.json({ 
          success: true,
          data: finalItem || retryData?.[0] || null,
          status: 'completed'
        })
      }
      
      // constraint 에러가 아닌 경우
      console.error('Update error details:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      })
      return NextResponse.json(
        { error: `Failed to update status: ${updateError.message || JSON.stringify(updateError)}` },
        { status: 500 }
      )
    }

    // 에러가 없으면 업데이트가 성공한 것으로 간주
    // updateData가 비어있어도 업데이트가 성공했을 수 있으므로 재조회로 확인
    console.log('No update error, verifying update by fetching latest data...')

    // 업데이트 후 데이터 확인 (약간의 지연 후 최신 데이터 조회)
    // 데이터베이스 변경사항이 반영될 시간 확보
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const { data: updatedItem, error: fetchUpdatedError } = await dataClient
      .from('lost_items')
      .select('id, status, updated_at, store_id, business_confirmed_at, business_confirmed_by')
      .eq('id', params.id)
      .single()

    if (fetchUpdatedError) {
      console.error('Error fetching updated lost item:', fetchUpdatedError)
      // 재조회 실패 시 updateData 사용 (있는 경우)
      if (updateData && updateData.length > 0) {
        const responseData = updateData[0]
        console.log('Using updateData as fallback:', responseData)
        return NextResponse.json({ 
          success: true,
          data: responseData,
          status: responseData?.status || 'completed'
        })
      }
      // 둘 다 실패한 경우
      console.error('Both update and fetch failed')
      return NextResponse.json(
        { error: 'Failed to update and verify status' },
        { status: 500 }
      )
    }

    console.log('Lost item fetched after update, status:', updatedItem?.status)
    console.log('Updated item details:', {
      id: updatedItem?.id,
      status: updatedItem?.status,
      updated_at: updatedItem?.updated_at,
      store_id: updatedItem?.store_id,
      previousStatus: lostItem.status
    })
    
    // 상태가 실제로 업데이트되었는지 확인
    const finalStatus = updatedItem?.status
    const wasUpdated = finalStatus !== lostItem.status
    
    if (!wasUpdated) {
      console.error('=== ERROR: Status was not updated ===')
      console.error('Current status:', finalStatus)
      console.error('Previous status:', lostItem.status)
      console.error('This may indicate RLS policy blocking the update or status value not allowed')
      
      // 상태 값이 허용되지 않는 경우 다른 값 시도
      if (finalStatus === 'submitted' || finalStatus === lostItem.status) {
        console.log('=== Trying alternative status values ===')
        
        // lost_items 테이블은 issue_status enum을 사용하므로 'completed'만 허용됨
        // 'completed' 상태로 다시 시도 (Service Role Key 사용)
        console.log('Trying status: "completed" with Service Role Key')
        const completedUpdatedAt = new Date().toISOString()
        const { error: completedError, data: completedData } = await dataClient
          .from('lost_items')
          .update({ 
            status: 'completed',
            business_confirmed_at: completedUpdatedAt,
            business_confirmed_by: user.id,
            updated_at: completedUpdatedAt,
          })
          .eq('id', params.id)
          .select('id, status, updated_at, store_id, business_confirmed_at, business_confirmed_by')
        
        console.log(`Status "completed" result:`, {
          error: completedError ? {
            code: completedError.code,
            message: completedError.message,
            details: completedError.details
          } : null,
          data: completedData,
          success: !completedError && completedData && completedData.length > 0
        })
        
        if (!completedError && completedData && completedData.length > 0) {
          console.log(`✅ Successfully updated with status: completed`)
          return NextResponse.json({ 
            success: true,
            data: completedData[0],
            status: 'completed'
          })
        }
        
        console.error('❌ Status "completed" also failed with Service Role Key')
      }
      
      return NextResponse.json(
        { 
          error: `Status update did not apply. Status remains "${finalStatus}". This may be due to RLS policies or invalid status value. Please check server logs for details.`,
          currentStatus: finalStatus,
          previousStatus: lostItem.status
        },
        { status: 500 }
      )
    }
    
    // 상태가 확인된 상태인지 검증 (lost_items는 issue_status enum 사용, 'completed'만 확인된 상태)
    if (finalStatus !== 'completed') {
      console.warn('WARNING: Status was updated but is not "completed":', finalStatus)
      // 상태는 변경되었지만 예상과 다를 수 있음 - 그래도 성공으로 처리
    }
    
    console.log('Status update verified successfully:', finalStatus)
    return NextResponse.json({ 
      success: true,
      data: updatedItem,
      status: finalStatus
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/lost-items/[id]/confirm:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


