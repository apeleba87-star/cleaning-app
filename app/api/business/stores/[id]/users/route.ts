import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { assertStoreActive } from '@/lib/store-active'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    if (!user || (user.role !== 'business_owner' && user.role !== 'franchise_manager' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { data: store, error: storeError } = await dataClient
      .from('stores')
      .select('id, company_id, franchise_id')
      .eq('id', params.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: '매장을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 권한 확인: business_owner는 자신의 회사 매장만, franchise_manager는 자신의 프렌차이즈 매장만
    if (user.role === 'business_owner' && store.company_id !== user.company_id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    if (user.role === 'franchise_manager') {
      const { data: userData, error: userDataError } = await dataClient
        .from('users')
        .select('franchise_id')
        .eq('id', user.id)
        .single()

      if (userDataError || !userData || store.franchise_id !== userData.franchise_id) {
        return NextResponse.json(
          { error: '권한이 없습니다.' },
          { status: 403 }
        )
      }
    }

    const { data: assignments, error: assignError } = await dataClient
      .from('store_assign')
      .select(`
        user_id,
        users:user_id (
          id,
          name,
          role,
          phone,
          employment_active
        )
      `)
      .eq('store_id', params.id)

    if (assignError) {
      console.error('Error fetching store assignments:', assignError)
      return NextResponse.json(
        { error: '배정된 사용자 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 역할별로 분류 (업체관리자 = 직원모드용 배정 포함)
    const franchiseManagers: any[] = []
    const staff: any[] = []
    const storeManagers: any[] = []
    const managers: any[] = []
    const subcontractIndividuals: any[] = []
    const subcontractCompanies: any[] = []
    const businessOwners: any[] = []

    assignments?.forEach((assign: any) => {
      const user = assign.users
      if (!user) return

      if (user.role === 'franchise_manager') {
        franchiseManagers.push(user)
      } else if (user.role === 'store_manager') {
        storeManagers.push(user)
      } else if (user.role === 'staff') {
        staff.push(user)
      } else if (user.role === 'manager') {
        managers.push(user)
      } else if (user.role === 'subcontract_individual') {
        subcontractIndividuals.push(user)
      } else if (user.role === 'subcontract_company') {
        subcontractCompanies.push(user)
      } else if (user.role === 'business_owner') {
        businessOwners.push(user)
      }
    })

    return NextResponse.json({
      franchise_managers: franchiseManagers,
      store_managers: storeManagers,
      staff: staff,
      managers: managers,
      subcontract_individuals: subcontractIndividuals,
      subcontract_companies: subcontractCompanies,
      business_owners: businessOwners,
    })
  } catch (error: any) {
    console.error('Error in GET /api/business/stores/[id]/users:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    if (!user || (user.role !== 'business_owner' && user.role !== 'franchise_manager' && user.role !== 'platform_admin')) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { data: store, error: storeError } = await dataClient
      .from('stores')
      .select('id, company_id, franchise_id')
      .eq('id', params.id)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: '매장을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 권한 확인
    if (user.role === 'business_owner' && store.company_id !== user.company_id) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    let userFranchiseId: string | null = null
    if (user.role === 'franchise_manager') {
      const { data: userData, error: userDataError } = await dataClient
        .from('users')
        .select('franchise_id')
        .eq('id', user.id)
        .single()

      if (userDataError || !userData || store.franchise_id !== userData.franchise_id) {
        return NextResponse.json(
          { error: '권한이 없습니다.' },
          { status: 403 }
        )
      }
      userFranchiseId = userData.franchise_id
    }
    await assertStoreActive(dataClient, params.id)

    const body = await request.json()
    const { user_ids } = body

    if (!Array.isArray(user_ids)) {
      return NextResponse.json(
        { error: 'user_ids는 배열이어야 합니다.' },
        { status: 400 }
      )
    }

    if (user_ids.length > 0) {
      const { data: users, error: usersError } = await dataClient
        .from('users')
        .select('id, company_id, franchise_id')
        .in('id', user_ids)

      if (usersError) {
        return NextResponse.json(
          { error: '사용자 조회에 실패했습니다.' },
          { status: 500 }
        )
      }

      // business_owner는 자신의 회사 사용자만, franchise_manager는 자신의 프렌차이즈 사용자만
      const invalidUsers = users?.filter((u) => {
        if (user.role === 'business_owner') {
          return u.company_id !== user.company_id
        }
        if (user.role === 'franchise_manager') {
          return u.franchise_id !== userFranchiseId
        }
        return false
      })

      if (invalidUsers && invalidUsers.length > 0) {
        return NextResponse.json(
          { error: '권한이 없는 사용자가 포함되어 있습니다.' },
          { status: 403 }
        )
      }
    }

    const { error: deleteError } = await dataClient
      .from('store_assign')
      .delete()
      .eq('store_id', params.id)

    if (deleteError) {
      console.error('Error deleting existing store assignments:', deleteError)
      return NextResponse.json(
        { error: '기존 배정 삭제에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 새 배정 추가
    if (user_ids.length > 0) {
      const assignments = user_ids.map((userId: string) => ({
        store_id: params.id,
        user_id: userId,
      }))

      const { error: insertError } = await dataClient
        .from('store_assign')
        .insert(assignments)

      if (insertError) {
        console.error('Error inserting store assignments:', insertError)
        return NextResponse.json(
          { error: '매장 배정에 실패했습니다.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in PUT /api/business/stores/[id]/users:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


