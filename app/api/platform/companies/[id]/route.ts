import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user || user.role !== 'platform_admin') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      name,
      address,
      business_registration_number,
      subscription_plan,
      subscription_status,
      trial_ends_at,
      basic_units,
      premium_units,
    } = body

    const supabase = await createServerSupabaseClient()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const dataClient = serviceRoleKey && supabaseUrl
      ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : supabase

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (name !== undefined) updateData.name = typeof name === 'string' ? name.trim() : null
    if (address !== undefined) updateData.address = address?.trim() ?? null
    if (business_registration_number !== undefined) updateData.business_registration_number = business_registration_number?.trim() ?? null
    if (subscription_plan !== undefined && ['free', 'basic', 'premium'].includes(subscription_plan)) {
      updateData.subscription_plan = subscription_plan
    }
    if (subscription_status !== undefined && ['active', 'suspended', 'cancelled'].includes(subscription_status)) {
      updateData.subscription_status = subscription_status
    }
    if (trial_ends_at !== undefined) updateData.trial_ends_at = trial_ends_at || null
    if (basic_units !== undefined) updateData.basic_units = Math.max(0, Number(basic_units) || 0)
    if (premium_units !== undefined) updateData.premium_units = Math.max(0, Number(premium_units) || 0)

    const { data: company, error } = await dataClient
      .from('companies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating company:', error)
      return NextResponse.json({ error: '회사 수정에 실패했습니다.' }, { status: 500 })
    }
    return NextResponse.json({ company })
  } catch (err: unknown) {
    console.error('Error in PATCH /api/platform/companies/[id]:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
