import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'business_owner') {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    if (!user.company_id || user.company_id !== params.id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      address,
      business_registration_number,
      signup_code,
      signup_code_active,
      requires_approval,
      default_role,
    } = body

    const supabase = await createServerSupabaseClient()

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: '회사명은 필수입니다.' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (address !== undefined) {
      updateData.address = address?.trim() || null
    }

    if (business_registration_number !== undefined) {
      updateData.business_registration_number = business_registration_number?.trim() || null
    }

    // 가입 코드 관련 필드 업데이트
    if (signup_code !== undefined) {
      const trimmedCode = signup_code?.trim() || null
      
      // 코드가 변경되는 경우 중복 확인
      if (trimmedCode) {
        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .eq('signup_code', trimmedCode)
          .neq('id', params.id)
          .single()

        if (existingCompany) {
          return NextResponse.json(
            { error: '이미 사용 중인 코드입니다.' },
            { status: 400 }
          )
        }
      }

      updateData.signup_code = trimmedCode
    }

    if (signup_code_active !== undefined) {
      updateData.signup_code_active = signup_code_active
    }

    if (requires_approval !== undefined) {
      updateData.requires_approval = requires_approval
    }

    if (default_role !== undefined) {
      const allowedRoles = ['staff', 'manager', 'store_manager', 'subcontract_individual', 'subcontract_company']
      if (!allowedRoles.includes(default_role)) {
        return NextResponse.json(
          { error: '유효하지 않은 기본 역할입니다.' },
          { status: 400 }
        )
      }
      updateData.default_role = default_role
    }

    const { data: updatedCompany, error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating company:', error)
      return NextResponse.json(
        { error: '회사 정보 수정에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ company: updatedCompany })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/company/[id]:', error)
    return NextResponse.json(
      { error: `서버 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}


