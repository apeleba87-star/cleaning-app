import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

// 카테고리 템플릿 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    const supabase = await createServerSupabaseClient()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    if (!user.company_id) {
      return NextResponse.json(
        { error: '회사 정보가 없습니다.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, category, description } = body

    // 템플릿이 해당 회사에 속하는지 확인 및 기존 데이터 조회
    const { data: existingTemplate, error: checkError } = await supabase
      .from('category_templates')
      .select('company_id, name, category')
      .eq('id', params.id)
      .single()

    if (checkError || !existingTemplate || existingTemplate.company_id !== user.company_id) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const { data: template, error } = await supabase
      .from('category_templates')
      .update({
        name: name?.trim() || existingTemplate.name,
        category: category?.trim() || existingTemplate.category,
        description: description?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating category template:', error)
      return NextResponse.json(
        { error: '템플릿 수정에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ template })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/category-templates/[id]:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 카테고리 템플릿 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    const supabase = await createServerSupabaseClient()

    if (!user || (user.role !== 'business_owner' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    if (!user.company_id) {
      return NextResponse.json(
        { error: '회사 정보가 없습니다.' },
        { status: 400 }
      )
    }

    // 템플릿이 해당 회사에 속하는지 확인
    const { data: existingTemplate, error: checkError } = await supabase
      .from('category_templates')
      .select('company_id')
      .eq('id', params.id)
      .single()

    if (checkError || !existingTemplate || existingTemplate.company_id !== user.company_id) {
      return NextResponse.json(
        { error: '템플릿을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Soft delete
    const { error } = await supabase
      .from('category_templates')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting category template:', error)
      return NextResponse.json(
        { error: '템플릿 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/business/category-templates/[id]:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


