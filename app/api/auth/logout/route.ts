import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // 로그아웃 처리
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Logout error:', error)
      return NextResponse.json(
        { error: '로그아웃 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 로그인 페이지로 리다이렉트
    const response = NextResponse.redirect(new URL('/login', request.url))
    
    // 인증 관련 쿠키 삭제
    const cookieNames = [
      'sb-access-token',
      'sb-refresh-token',
      'sb-auth-token',
    ]
    
    // Supabase 쿠키 패턴 확인 (프로젝트별로 다를 수 있음)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || ''
    
    if (projectRef) {
      cookieNames.push(`sb-${projectRef}-auth-token`)
    }
    
    // 모든 인증 쿠키 삭제
    cookieNames.forEach(cookieName => {
      response.cookies.delete(cookieName)
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
      })
    })
    
    return response
  } catch (error: any) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: '로그아웃 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

