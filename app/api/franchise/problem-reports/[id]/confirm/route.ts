import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'franchise_manager') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('franchise_id')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData || !userData.franchise_id) {
      return NextResponse.json({ error: 'Franchise information not found' }, { status: 403 })
    }

    const { data: problemReport, error: fetchError } = await dataClient
      .from('problem_reports')
      .select('id, store_id')
      .eq('id', params.id)
      .single()

    if (fetchError || !problemReport) {
      return NextResponse.json(
        { error: 'Problem report not found' },
        { status: 404 }
      )
    }

    const { data: store, error: storeError } = await dataClient
      .from('stores')
      .select('id, franchise_id')
      .eq('id', problemReport.store_id)
      .single()

    if (storeError || !store || store.franchise_id !== userData.franchise_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: currentProblem } = await dataClient
      .from('problem_reports')
      .select('description, updated_at')
      .eq('id', params.id)
      .single()

    if (!currentProblem) {
      return NextResponse.json(
        { error: 'Problem report not found' },
        { status: 404 }
      )
    }

    // description에 이미 확인 정보가 있는지 확인
    const hasConfirmation = currentProblem.description?.includes('[프렌차이즈 확인]')
    if (hasConfirmation) {
      return NextResponse.json({ 
        success: true, 
        message: 'Already confirmed'
      })
    }

    // description에 확인 정보 추가 (status는 변경하지 않음)
    const confirmationText = `\n\n[프렌차이즈 확인] ${new Date().toLocaleString('ko-KR')}`
    const newDescription = currentProblem.description 
      ? `${currentProblem.description}${confirmationText}`
      : confirmationText

    const { data: updatedProblem, error: updateError } = await dataClient
      .from('problem_reports')
      .update({ 
        description: newDescription,
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
    console.error('Error in PATCH /api/franchise/problem-reports/[id]/confirm:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
