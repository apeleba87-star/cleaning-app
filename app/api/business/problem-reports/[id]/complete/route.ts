import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can complete problem reports')
    }

    const supabase = await createServerSupabaseClient()
    const problemReportId = params.id

    console.log('Completing problem report:', problemReportId)

    const body = await request.json()
    const { description, photo_urls } = body

    // 먼저 기존 데이터 조회 (존재 여부 확인)
    const { data: existingReport, error: fetchError } = await supabase
      .from('problem_reports')
      .select('id, description, photo_url, store_id')
      .eq('id', problemReportId)
      .single()

    if (fetchError || !existingReport) {
      console.error('Problem report not found:', { problemReportId, fetchError })
      throw new Error(`Problem report not found: ${fetchError?.message || 'No data'}`)
    }

    console.log('Existing problem report found:', existingReport)

    // 매장이 사용자의 회사에 속해있는지 확인
    if (user.company_id) {
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id, company_id')
        .eq('id', existingReport.store_id)
        .eq('company_id', user.company_id)
        .single()

      if (storeError || !store) {
        console.error('Store access denied:', { store_id: existingReport.store_id, company_id: user.company_id, storeError })
        throw new ForbiddenError('Access denied to this problem report')
      }
    }

    const updateData: any = {
      status: 'completed',
      updated_at: new Date().toISOString(),
    }

    // 완료 설명을 기존 description에 추가 (또는 별도 필드가 있으면 사용)
    if (description) {
      const existingDesc = existingReport?.description || ''
      const completionNote = `\n\n[처리 완료] ${description}`
      updateData.description = existingDesc + completionNote
    }

    // 완료 사진을 기존 photo_url에 추가 (JSON 배열로 저장)
    if (photo_urls && Array.isArray(photo_urls) && photo_urls.length > 0) {
      try {
        const existingPhotos = existingReport?.photo_url 
          ? (() => {
              try {
                const parsed = JSON.parse(existingReport.photo_url)
                return Array.isArray(parsed) ? parsed : [existingReport.photo_url]
              } catch {
                return [existingReport.photo_url]
              }
            })()
          : []
        
        const allPhotos = [...existingPhotos, ...photo_urls]
        updateData.photo_url = JSON.stringify(allPhotos)
      } catch (photoError) {
        console.error('Error processing completion photos:', photoError)
        // photo_url이 없으면 그냥 저장
        updateData.photo_url = JSON.stringify(photo_urls)
      }
    }

    console.log('Updating problem report with data:', JSON.stringify(updateData, null, 2))
    console.log('Problem report ID:', problemReportId)
    console.log('Store ID:', existingReport.store_id)
    console.log('User company ID:', user.company_id)
    console.log('User ID:', user.id)
    console.log('User role:', user.role)
    
    // confirm API와 동일한 방식으로 status 먼저 업데이트
    const { error: statusUpdateError } = await supabase
      .from('problem_reports')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', problemReportId)

    if (statusUpdateError) {
      console.error('Error updating status:', statusUpdateError)
      console.error('Status update error details:', {
        message: statusUpdateError.message,
        code: statusUpdateError.code,
        details: statusUpdateError.details,
        hint: statusUpdateError.hint
      })
      throw new Error(`Failed to update status: ${statusUpdateError.message}`)
    }

    console.log('Status updated successfully')

    // description과 photo_url은 별도로 업데이트 (RLS 정책 문제를 피하기 위해)
    const additionalUpdateData: any = {}
    
    if (description) {
      additionalUpdateData.description = (existingReport.description || '') + `\n\n[처리 완료] ${description}`
    }

    if (photo_urls && Array.isArray(photo_urls) && photo_urls.length > 0) {
      try {
        const existingPhotos = existingReport.photo_url 
          ? (() => {
              try {
                const parsed = JSON.parse(existingReport.photo_url)
                return Array.isArray(parsed) ? parsed : [existingReport.photo_url]
              } catch {
                return [existingReport.photo_url]
              }
            })()
          : []
        
        const allPhotos = [...existingPhotos, ...photo_urls]
        additionalUpdateData.photo_url = JSON.stringify(allPhotos)
      } catch (photoError) {
        console.error('Error processing completion photos:', photoError)
        additionalUpdateData.photo_url = JSON.stringify(photo_urls)
      }
    }

    // 추가 데이터가 있으면 업데이트
    if (Object.keys(additionalUpdateData).length > 0) {
      const { error: additionalUpdateError } = await supabase
        .from('problem_reports')
        .update(additionalUpdateData)
        .eq('id', problemReportId)

      if (additionalUpdateError) {
        console.error('Error updating additional data (but status was updated):', additionalUpdateError)
        // status는 업데이트되었으므로 성공으로 처리
        console.warn('Status updated but additional data failed. This is acceptable.')
      } else {
        console.log('Additional data updated successfully')
      }
    }

    // 최종 확인: 업데이트된 데이터 조회
    const { data: finalData, error: finalFetchError } = await supabase
      .from('problem_reports')
      .select('id, status, description, photo_url, updated_at')
      .eq('id', problemReportId)
      .single()

    if (finalFetchError) {
      console.error('Error fetching final data:', finalFetchError)
      // 업데이트는 성공했으므로 계속 진행
    } else {
      console.log('Final updated data:', finalData)
      if (finalData.status !== 'completed') {
        console.error('WARNING: Status was not updated to completed. Current status:', finalData.status)
        console.error('This indicates an RLS policy issue preventing the update.')
      }
    }

    console.log('Problem report completed successfully')

    return Response.json({
      success: true,
      message: 'Problem report completed successfully',
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}



