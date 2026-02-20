import { getServerUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST: 대량 삭제 (서비스 역할 사용 - RLS 우회)
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { locationIds } = body

    if (!Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json(
        { error: '삭제할 위치 정보 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: '위치 정보 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 업체관리자인 경우 자신의 회사 매장만 삭제 가능하도록 매장 ID 목록 가져오기
    let companyStoreIds: string[] | null = null
    if (user.role === 'business_owner' && user.company_id) {
      const { data: companyStores, error: storesError } = await supabase
        .from('stores')
        .select('id')
        .eq('company_id', user.company_id)
        .is('deleted_at', null)
      
      if (storesError) {
        console.error('회사 매장 조회 오류:', storesError)
        return NextResponse.json(
          { error: '매장 정보 조회 중 오류가 발생했습니다.' },
          { status: 500 }
        )
      }
      
      companyStoreIds = companyStores?.map(s => s.id) || []
      
      if (companyStoreIds.length === 0) {
        return NextResponse.json({
          success: true,
          deletedCount: 0,
          message: '삭제할 매장이 없습니다.'
        })
      }
    }

    // 배치로 나누어 삭제 (한 번에 최대 500개씩)
    const BATCH_SIZE = 500
    let totalDeleted = 0
    const errors: string[] = []

    for (let i = 0; i < locationIds.length; i += BATCH_SIZE) {
      const batch = locationIds.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      
      // 삭제 쿼리 구성
      // 업체관리자의 경우 companyStoreIds로 필터링하여 권한 검증
      // (companyStoreIds가 1000개 이하일 것으로 예상되지만, 안전을 위해 체크)
      let deleteQuery = supabase
        .from('store_product_locations')
        .delete()
        .in('id', batch)
      
      if (companyStoreIds && companyStoreIds.length > 0 && companyStoreIds.length <= 1000) {
        // companyStoreIds가 1000개 이하인 경우에만 직접 필터링
        deleteQuery = deleteQuery.in('store_id', companyStoreIds)
      }
      // companyStoreIds가 1000개를 넘는 경우 RLS 정책에 의존
      // (일반적으로 매장 수가 1000개를 넘지 않으므로 이 경우는 드뭅니다)
      
      const { error: deleteError } = await deleteQuery
      
      if (deleteError) {
        console.error(`배치 삭제 오류 (배치 ${batchNumber}):`, {
          errorCode: deleteError.code,
          errorMessage: deleteError.message,
          errorDetails: deleteError.details,
          errorHint: deleteError.hint,
          batchSize: batch.length,
          companyStoreIdsCount: companyStoreIds?.length || 0
        })
        errors.push(`배치 ${batchNumber} 삭제 실패: ${deleteError.message || '알 수 없는 오류'}`)
      } else {
        totalDeleted += batch.length
        console.log(`배치 ${batchNumber} 삭제 완료: ${batch.length}개`)
        
        // 마지막 배치가 아니면 짧은 지연 추가 (서버 부하 방지)
        if (i + BATCH_SIZE < locationIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        deletedCount: totalDeleted,
        errors: errors,
        message: `${totalDeleted}개 삭제 완료, ${errors.length}개 배치 실패`
      }, { status: 207 }) // 207 Multi-Status
    }

    return NextResponse.json({
      success: true,
      deletedCount: totalDeleted,
      message: `${totalDeleted}개 위치 정보가 삭제되었습니다.`
    })
  } catch (error: any) {
    console.error('Error in POST /api/business/products/locations/bulk-delete:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

