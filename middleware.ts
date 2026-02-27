import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const BARCODE_PRODUCTS_ALLOWED_EMAILS = new Set(['apeleba2@naver.com'])

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
      // 바코드 제품 등록 기능 이메일 화이트리스트
      const pathname = request.nextUrl.pathname
      const isBarcodeProductsPage = pathname.startsWith('/business/products')
      const isBarcodeProductsApi = pathname.startsWith('/api/business/products')
      if (isBarcodeProductsPage || isBarcodeProductsApi) {
        const userEmail = user.email?.toLowerCase() || ''
        const isAllowedUser = BARCODE_PRODUCTS_ALLOWED_EMAILS.has(userEmail)
        if (!isAllowedUser) {
          if (isBarcodeProductsApi) {
            return NextResponse.json(
              { error: '바코드 제품 등록 기능은 지정된 계정만 사용할 수 있습니다.' },
              { status: 403 }
            )
          }
          return NextResponse.redirect(new URL('/business/dashboard', request.url))
        }
      }

      // 사용자 정보 조회
      const { data: userData } = await supabase
        .from('users')
        .select('role, approval_status, company_id')
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

        // 업체관리자 무료체험 만료 시 전체 기능 비활성화
        if (userData.role === 'business_owner' && userData.company_id) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('subscription_plan, subscription_status, trial_ends_at')
            .eq('id', userData.company_id)
            .single()

          if (companyData) {
            const isFreeTrialExpired =
              companyData.subscription_plan === 'free' &&
              companyData.subscription_status === 'active' &&
              !!companyData.trial_ends_at &&
              !Number.isNaN(Date.parse(companyData.trial_ends_at)) &&
              Date.parse(companyData.trial_ends_at) < Date.now()

            if (isFreeTrialExpired) {
              const allowedPagePaths = ['/trial-expired', '/login']
              const isAllowedPagePath = allowedPagePaths.some((path) => pathname.startsWith(path))
              if (!isApiRoute && !isAllowedPagePath) {
                const redirectUrl = new URL('/trial-expired', request.url)
                return NextResponse.redirect(redirectUrl)
              }

              // business API는 만료 시 전체 차단
              const isBusinessApi = pathname.startsWith('/api/business')
              if (isBusinessApi) {
                return NextResponse.json(
                  { error: '무료체험 기간이 종료되었습니다. 플랜 변경은 시스템 관리자에게 문의하세요.' },
                  { status: 403 }
                )
              }
            }
          }
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

