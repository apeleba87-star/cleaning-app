import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 새로운 응답 생성 (쿠키를 설정하기 위해)
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          
          // 쿠키 설정
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, {
              ...options,
              sameSite: 'lax',
              path: '/',
            })
          })
        },
      },
    }
  )

  // 보안: getUser()를 사용하여 서버에서 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 사용자가 있고, 동시 접속 제한이 필요한 역할인 경우 세션 갱신
  if (user) {
    try {
      // 사용자 정보 조회
      const { data: userData } = await supabase
        .from('users')
        .select('role, approval_status')
        .eq('id', user.id)
        .single()

      if (userData) {
        // 승인 대기 계정은 로그인 이후 서비스 화면 접근 차단
        const pendingAllowedPaths = ['/signup/pending', '/login', '/signup']
        const isApiRoute = pathname.startsWith('/api')
        const isPendingAllowedPath = pendingAllowedPaths.some((path) => pathname.startsWith(path))
        if (userData.approval_status === 'pending' && !isApiRoute && !isPendingAllowedPath) {
          const redirectUrl = new URL('/signup/pending', request.url)
          return NextResponse.redirect(redirectUrl)
        }

        const restrictedRoles = ['franchise_manager', 'business_owner', 'store_manager']
        if (restrictedRoles.includes(userData.role)) {
          // 세션 활동 시간 갱신 (비동기, 에러 무시)
          // 가장 최근 세션을 찾아서 갱신 (session_id 없이 호출하면 자동으로 최근 세션 갱신)
          fetch(`${request.nextUrl.origin}/api/auth/sessions`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          }).catch(() => {
            // 에러는 무시 (비동기 처리)
          })
        }
      }
    } catch (error) {
      // 에러는 무시 (비동기 처리)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

