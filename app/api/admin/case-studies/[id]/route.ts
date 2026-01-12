import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// 관리 사례 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const supabase = await createServerSupabaseClient()

    const { data: caseStudy, error } = await supabase
      .from('case_studies')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating case study:', error)
      return NextResponse.json(
        { error: `관리 사례 수정 실패: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: caseStudy,
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/case-studies/[id]:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}

// 관리 사례 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || (user.role !== 'admin' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
      .from('case_studies')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting case study:', error)
      return NextResponse.json(
        { error: `관리 사례 삭제 실패: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/case-studies/[id]:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}
