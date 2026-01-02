import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errors'

// 역할별 동시 접속 제한
const ROLE_SESSION_LIMITS: Record<string, number> = {
  'franchise_manager': 3, // 프렌차이즈 관리자: 3명
  'business_owner': 1,      // 업체관리자: 1명
  'store_manager': 1,        // 점주: 1명
}

// GET: 현재 사용자의 활성 세션 수 확인
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    
    // 현재 활성 세션 수 조회 (30분 이내 활동)
    const { data: activeSessions, error } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', user.id)
      .gte('last_activity_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (error) {
      throw new Error(`세션 조회 실패: ${error.message}`)
    }

    const activeCount = activeSessions?.length || 0
    const limit = ROLE_SESSION_LIMITS[user.role] || null

    return NextResponse.json({
      success: true,
      data: {
        activeCount,
        limit,
        canLogin: limit === null || activeCount < limit,
      },
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// POST: 새 세션 생성 (로그인 시)
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()
    const { session_id, ip_address, user_agent } = body

    if (!session_id) {
      return NextResponse.json({ error: '세션 ID가 필요합니다.' }, { status: 400 })
    }

    // 역할별 제한 확인
    const limit = ROLE_SESSION_LIMITS[user.role]
    if (limit !== undefined) {
      // 현재 활성 세션 수 조회
      const { data: activeSessions, error: countError } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('user_id', user.id)
        .gte('last_activity_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

      if (countError) {
        throw new Error(`세션 조회 실패: ${countError.message}`)
      }

      const activeCount = activeSessions?.length || 0

      if (activeCount >= limit) {
        // 가장 오래된 세션 삭제 (FIFO 방식)
        const { data: oldestSessions } = await supabase
          .from('user_sessions')
          .select('id')
          .eq('user_id', user.id)
          .order('last_activity_at', { ascending: true })
          .limit(1)

        if (oldestSessions && oldestSessions.length > 0) {
          await supabase
            .from('user_sessions')
            .delete()
            .eq('id', oldestSessions[0].id)
        } else {
          return NextResponse.json({
            error: `동시 접속 제한에 도달했습니다. (최대 ${limit}명)`,
            limit,
            activeCount,
          }, { status: 403 })
        }
      }
    }

    // 만료된 세션 정리 (30분 이상 비활성)
    try {
      await supabase
        .from('user_sessions')
        .delete()
        .lt('last_activity_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
    } catch (error) {
      // 에러는 무시
    }

    // 새 세션 생성
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간 후 만료

    const { data: newSession, error: insertError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_id,
        role: user.role,
        ip_address: ip_address || null,
        user_agent: user_agent || null,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      // 중복 세션인 경우 업데이트
      if (insertError.code === '23505') { // unique_violation
        const { data: updatedSession, error: updateError } = await supabase
          .from('user_sessions')
          .update({
            last_activity_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            ip_address: ip_address || null,
            user_agent: user_agent || null,
          })
          .eq('user_id', user.id)
          .eq('session_id', session_id)
          .select()
          .single()

        if (updateError) {
          throw new Error(`세션 업데이트 실패: ${updateError.message}`)
        }

        return NextResponse.json({
          success: true,
          data: updatedSession,
        })
      }
      throw new Error(`세션 생성 실패: ${insertError.message}`)
    }

    return NextResponse.json({
      success: true,
      data: newSession,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// DELETE: 세션 삭제 (로그아웃 시)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const session_id = searchParams.get('session_id')

    if (session_id) {
      // 특정 세션 삭제
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('session_id', session_id)

      if (error) {
        throw new Error(`세션 삭제 실패: ${error.message}`)
      }
    } else {
      // 모든 세션 삭제
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        throw new Error(`세션 삭제 실패: ${error.message}`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return handleApiError(error)
  }
}

// PATCH: 세션 활동 시간 갱신
export async function PATCH(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const body = await request.json()
    const { session_id } = body

    // session_id가 없으면 현재 사용자의 가장 최근 세션을 갱신
    if (!session_id) {
      // 가장 최근 세션 찾아서 갱신
      const { data: recentSession, error: findError } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('user_id', user.id)
        .order('last_activity_at', { ascending: false })
        .limit(1)
        .single()

      if (findError || !recentSession) {
        // 세션이 없으면 새로 생성 (로그인 시 생성되지 않은 경우)
        return NextResponse.json({ success: true })
      }

      const { error } = await supabase
        .from('user_sessions')
        .update({
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', recentSession.id)

      if (error) {
        throw new Error(`세션 갱신 실패: ${error.message}`)
      }

      return NextResponse.json({ success: true })
    }

    // 세션 활동 시간 갱신
    const { error } = await supabase
      .from('user_sessions')
      .update({
        last_activity_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .like('session_id', session_id + '%') // 부분 일치로 찾기

    if (error) {
      // 세션이 없으면 무시 (이미 만료되었을 수 있음)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return handleApiError(error)
  }
}
