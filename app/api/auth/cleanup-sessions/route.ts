import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errors'

// 만료된 세션 정리 API (주기적으로 호출)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // 30분 이상 비활성 세션 삭제
    const { data: deletedSessions, error } = await supabase
      .from('user_sessions')
      .delete()
      .lt('last_activity_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .select()

    if (error) {
      throw new Error(`세션 정리 실패: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      deletedCount: deletedSessions?.length || 0,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}
