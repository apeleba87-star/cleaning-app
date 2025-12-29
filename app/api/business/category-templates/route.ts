import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

// 카테고리 템플릿 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    const supabase = await createServerSupabaseClient()

    if (!user || !user.company_id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { data: templates, error } = await supabase
      .from('category_templates')
      .select('*')
      .eq('company_id', user.company_id)
      .is('deleted_at', null)
      .order('name')

    if (error) {
      console.error('Error fetching category templates:', error)
      return NextResponse.json(
        { error: '템플릿 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ templates: templates || [] })
  } catch (error: any) {
    console.error('Error in GET /api/business/category-templates:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 카테고리 템플릿 생성
export async function POST(request: NextRequest) {
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

    if (!name || !category) {
      return NextResponse.json(
        { error: '템플릿 이름과 카테고리는 필수입니다.' },
        { status: 400 }
      )
    }

    const { data: template, error } = await supabase
      .from('category_templates')
      .insert({
        company_id: user.company_id,
        name: name.trim(),
        category: category.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating category template:', error)
      return NextResponse.json(
        { error: '템플릿 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ template })
  } catch (error: any) {
    console.error('Error in POST /api/business/category-templates:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}










