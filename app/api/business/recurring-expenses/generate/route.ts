import { NextRequest } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { createClient } from '@supabase/supabase-js'
import { getTodayDateKST } from '@/lib/utils/date'

// 고정비 템플릿을 기반으로 해당 월 지출 자동 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    if (user.role !== 'business_owner') {
      throw new ForbiddenError('Only business owners can generate recurring expenses')
    }

    if (!user.company_id) {
      throw new ForbiddenError('Company ID is required')
    }

    const body = await request.json()
    const { target_month } = body // YYYY-MM 형식 (선택사항, 없으면 현재 월)

    const supabase = await createServerSupabaseClient()

    // RLS 우회를 위해 서비스 역할 키 사용
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error('Server configuration error: Service role key is required')
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 대상 월 결정
    let targetYear: number
    let targetMonth: number
    
    if (target_month) {
      const [year, month] = target_month.split('-').map(Number)
      targetYear = year
      targetMonth = month
    } else {
      const today = new Date()
      targetYear = today.getFullYear()
      targetMonth = today.getMonth() + 1
    }

    const firstDayOfMonth = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`

    // 활성화된 고정비 템플릿 조회
    const { data: recurringExpenses, error: fetchError } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('company_id', user.company_id)
      .eq('is_active', true)
      .is('deleted_at', null)

    if (fetchError) {
      throw new Error(`Failed to fetch recurring expenses: ${fetchError.message}`)
    }

    if (!recurringExpenses || recurringExpenses.length === 0) {
      return Response.json({
        success: true,
        data: { generated_count: 0, message: '활성화된 고정비 템플릿이 없습니다.' },
      })
    }

    // 각 템플릿에 대해 지출 생성 (중복 방지)
    let generatedCount = 0
    const errors: string[] = []

    for (const template of recurringExpenses) {
      try {
        // 해당 월에 이미 생성된 지출이 있는지 확인
        const { data: existing } = await adminSupabase
          .from('expenses')
          .select('id')
          .eq('company_id', user.company_id)
          .eq('recurring_expense_id', template.id)
          .gte('date', firstDayOfMonth)
          .lte('date', `${targetYear}-${String(targetMonth).padStart(2, '0')}-31`)
          .is('deleted_at', null)
          .maybeSingle()

        if (existing) {
          // 이미 생성된 경우 스킵
          continue
        }

        // 지출 생성
        const { error: insertError } = await adminSupabase
          .from('expenses')
          .insert({
            company_id: user.company_id,
            date: firstDayOfMonth,
            category: template.category,
            amount: template.amount,
            memo: template.memo ? `${template.memo} (고정비)` : '고정비',
            store_id: template.store_id,
            created_by: user.id,
            recurring_expense_id: template.id,
          })

        if (insertError) {
          errors.push(`템플릿 "${template.category}": ${insertError.message}`)
        } else {
          generatedCount++
        }
      } catch (err: any) {
        errors.push(`템플릿 "${template.category}": ${err.message}`)
      }
    }

    return Response.json({
      success: true,
      data: {
        generated_count: generatedCount,
        total_templates: recurringExpenses.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}
