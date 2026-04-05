import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authEmailExists } from '@/lib/auth-email-exists'
import {
  RateLimitPresets,
  getClientIp,
  rateLimitHit,
  rateLimitResponse,
} from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rl = rateLimitHit(`check-email:${ip}`, RateLimitPresets.anonymousPublic)
    if (rl.ok === false) {
      return rateLimitResponse(rl.retryAfterSec)
    }

    const email = request.nextUrl.searchParams.get('email')?.trim() || ''

    if (!email) {
      return NextResponse.json(
        { available: false, error: '이메일을 입력해주세요.' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { available: false, error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      )
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { available: false, error: '서버 설정 오류입니다.' },
        { status: 500 }
      )
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { exists, error } = await authEmailExists(adminSupabase, email)
    if (error) {
      return NextResponse.json(
        { available: false, error },
        { status: 503 }
      )
    }

    return NextResponse.json({
      available: !exists,
      message: exists ? '이미 가입된 이메일입니다.' : '사용 가능한 이메일입니다.',
      ...(exists && { error: '이미 가입된 이메일입니다.' }),
    })
  } catch (error) {
    console.error('Error in GET /api/auth/check-email:', error)
    return NextResponse.json(
      { available: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
