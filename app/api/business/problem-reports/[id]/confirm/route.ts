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

    // 문제 보고가 존재하고 사용자의 회사 매장에 속하는지 확인
    const { data: problemReport, error: fetchError } = await dataClient
      .from('problem_reports')
      .select('id, store_id, stores!inner(company_id)')
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

    // 이미 확인 처리된 경우
    const { data: currentProblem, error: fetchCurrentError } = await dataClient
      .from('problem_reports')
      .select('business_confirmed_at')
      .eq('id', params.id)
      .single()

    if (fetchCurrentError) {
      console.error('Error fetching current problem:', fetchCurrentError)
      return NextResponse.json(
        { error: 'Failed to fetch problem' },
        { status: 500 }
      )
    }

    if (currentProblem?.business_confirmed_at) {
      return NextResponse.json({ 
        success: true, 
        message: 'Already confirmed'
      })
    }

    // business_confirmed_at과 business_confirmed_by 업데이트 (dataClient로 RLS 우회)
    const { data: updatedProblem, error: updateError } = await dataClient
      .from('problem_reports')
      .update({ 
        business_confirmed_at: new Date().toISOString(),
        business_confirmed_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating problem confirmation:', updateError)
      return NextResponse.json(
        { error: 'Failed to confirm problem' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      data: updatedProblem
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/business/problem-reports/[id]/confirm:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


