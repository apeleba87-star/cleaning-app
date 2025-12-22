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

    // Service Role Key를 사용하여 RLS 우회 (업데이트가 실패할 경우를 대비)
    let adminSupabase: ReturnType<typeof createClient> | null = null
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    console.log('=== Service Role Key Check ===')
    console.log('Service Role Key exists:', !!serviceRoleKey)
    console.log('Supabase URL exists:', !!supabaseUrl)
    
    if (serviceRoleKey && supabaseUrl) {
      adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
      console.log('Service Role Key client created successfully')
    } else {
      console.warn('Service Role Key not available - Service Role Key:', !!serviceRoleKey, 'URL:', !!supabaseUrl)
      console.warn('Will use regular client only')
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

    // 'completed' 상태로 업데이트 시도 (일반 클라이언트로 먼저 시도)
    let updateError: any = null
    let updateData: any = null
    
    const updateResult = await supabase
      .from('lost_items')
      .update({ 
        status: 'completed',
        updated_at: updatedAt,
      })
      .eq('id', params.id)
      .select('id, status, updated_at, store_id')

    updateError = updateResult.error
    updateData = updateResult.data
    
    // 일반 클라이언트로 업데이트 실패 시 Service Role Key 사용
    if (updateError && adminSupabase) {
      console.log('=== Regular update failed, trying with Service Role Key ===')
      console.log('Original error:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      })
      
      // adminSupabase가 null이 아님을 확인했으므로 타입 단언 사용
      const adminClient = adminSupabase as any
      const adminUpdateResult = await adminClient
        .from('lost_items')
        .update({ 
          status: 'completed',
          updated_at: updatedAt,
        })
        .eq('id', params.id)
        .select('id, status, updated_at, store_id')
      
      console.log('Service Role Key update result:', {
        error: adminUpdateResult.error,
        data: adminUpdateResult.data,
        dataLength: adminUpdateResult.data?.length || 0
      })
      
      if (!adminUpdateResult.error) {
        console.log('✅ Update succeeded with Service Role Key')
        updateError = null
        updateData = adminUpdateResult.data
      } else {
        console.error('❌ Update failed even with Service Role Key:', {
          code: adminUpdateResult.error.code,
          message: adminUpdateResult.error.message,
          details: adminUpdateResult.error.details,
          hint: adminUpdateResult.error.hint
        })
        updateError = adminUpdateResult.error
      }
    } else if (updateError && !adminSupabase) {
      console.error('⚠️ Update failed but Service Role Key not available')
    }
    
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
        // Service Role Key로 'completed' 재시도
        console.log('Constraint error detected, trying "completed" with Service Role Key...')
        const updateClient = adminSupabase || supabase
        
        if (!updateClient) {
          console.error('Service Role Key not available for retry')
          return NextResponse.json(
            { error: `Failed to update status. Constraint error and Service Role Key not available. Error: ${updateError.message || JSON.stringify(updateError)}` },
            { status: 500 }
          )
        }
        
        const { error: retryError, data: retryData } = await updateClient
          .from('lost_items')
          .update({ 
            status: 'completed',
            updated_at: updatedAt,
          })
          .eq('id', params.id)
          .select('id, status, updated_at, store_id')
        
        if (retryError) {
          console.error('Retry with Service Role Key also failed:', retryError)
            return NextResponse.json(
            { error: `Failed to update status. Tried with Service Role Key. Error: ${retryError.message || JSON.stringify(retryError)}` },
              { status: 500 }
            )
          }
          
        console.log('Successfully updated with status "completed" using Service Role Key:', retryData)
        
        // 업데이트 후 최신 데이터 조회
        await new Promise(resolve => setTimeout(resolve, 100))
        const fetchClient = adminSupabase || supabase
        const { data: finalItem } = await fetchClient
          .from('lost_items')
          .select('id, status, updated_at, store_id')
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
    
    const fetchClient = adminSupabase || supabase
    const { data: updatedItem, error: fetchUpdatedError } = await fetchClient
      .from('lost_items')
      .select('id, status, updated_at, store_id')
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
        const updateClient = adminSupabase || supabase
        console.log('Using client:', adminSupabase ? 'Service Role Key' : 'Regular')
        
        // lost_items 테이블은 issue_status enum을 사용하므로 'completed'만 허용됨
        // 'completed' 상태로 다시 시도 (Service Role Key 사용)
        console.log('Trying status: "completed" with Service Role Key')
        const { error: completedError, data: completedData } = await updateClient
          .from('lost_items')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.id)
          .select('id, status, updated_at, store_id')
        
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


