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

    const body = await request.json()
    const { description, photo_urls } = body

    const supabase = await createServerSupabaseClient()

    // 문제 보고가 존재하고 사용자의 회사 매장에 속하는지 확인
    const { data: problemReport, error: fetchError } = await supabase
      .from('problem_reports')
      .select('id, store_id, description, photo_url, status, stores!inner(company_id)')
      .eq('id', params.id)
      .single()

    if (fetchError || !problemReport) {
      return NextResponse.json(
        { error: 'Problem report not found' },
        { status: 404 }
      )
    }

    // 권한 확인
    if ((problemReport.stores as any).company_id !== user.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 기존 description과 photo_url 파싱
    let existingDescription = problemReport.description || ''
    let existingPhotoUrls: string[] = []
    
    try {
      if (problemReport.photo_url) {
        const parsed = typeof problemReport.photo_url === 'string' 
          ? JSON.parse(problemReport.photo_url) 
          : problemReport.photo_url
        existingPhotoUrls = Array.isArray(parsed) ? parsed : []
      }
    } catch (e) {
      // photo_url이 JSON이 아닌 경우 그대로 사용
      if (typeof problemReport.photo_url === 'string') {
        existingPhotoUrls = [problemReport.photo_url]
      }
    }

    // 새로운 description과 photo_urls 결합
    const completionDescription = description || '처리 완료'
    const newDescription = existingDescription 
      ? `${existingDescription}\n\n[처리 완료] ${completionDescription}`
      : `[처리 완료] ${completionDescription}`
    
    const allPhotoUrls = [
      ...existingPhotoUrls,
      ...(photo_urls || [])
    ]

    // status를 먼저 업데이트
    const { error: statusError } = await supabase
      .from('problem_reports')
      .update({ status: 'completed' })
      .eq('id', params.id)

    if (statusError) {
      console.error('Error updating status:', statusError)
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      )
    }

    // description과 photo_url 업데이트
    const { error: updateError } = await supabase
      .from('problem_reports')
      .update({
        description: newDescription,
        photo_url: allPhotoUrls.length > 0 ? JSON.stringify(allPhotoUrls) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating description and photo_url:', updateError)
      return NextResponse.json(
        { error: 'Failed to update description and photos' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/problem-reports/[id]/complete:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}















