import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const BARCODE_PRODUCTS_ALLOWED_EMAILS = new Set(['apeleba2@naver.com'])

function normalizeHost(host: string | null) {
  return (host || '').toLowerCase().replace(/:\d+$/, '').replace(/^www\./, '')
}

function getConfiguredHost(value: string | undefined) {
  if (!value) return ''
  try {
    return normalizeHost(new URL(value).host)
  } catch {
    return normalizeHost(value)
  }
}

function isMUPLHost(host: string) {
  const configuredHosts = [
    getConfiguredHost(process.env.NEXT_PUBLIC_APP_HOST),
    getConfiguredHost(process.env.NEXT_PUBLIC_SITE_URL),
    getConfiguredHost(process.env.VERCEL_PROJECT_PRODUCTION_URL),
  ].filter(Boolean)

  return (
    !host ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.localhost') ||
    host.endsWith('.vercel.app') ||
    configuredHosts.includes(host)
  )
}

function isHomepageFastPath(pathname: string) {
  return (
    pathname.startsWith('/_homepage') ||
    pathname.startsWith('/t/') ||
    pathname.startsWith('/api/homepage/public') ||
    pathname.startsWith('/api/homepage/blog/sync-public')
  )
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const host = normalizeHost(request.headers.get('host'))
  const isStaticOrWellKnown =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/homepage-admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/sw.js') ||
    pathname.includes('.')

  if (!isStaticOrWellKnown && !isMUPLHost(host)) {
    const url = request.nextUrl.clone()
    url.pathname = `/_homepage/domain/${encodeURIComponent(host)}${pathname === '/' ? '' : pathname}`
    url.searchParams.set('path', pathname)
    return NextResponse.rewrite(url)
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  if (isHomepageFastPath(pathname)) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

  const isV2App =
    pathname.startsWith('/v2') ||
    pathname.startsWith('/v2-store-manager') ||
    pathname.startsWith('/api/v2')
  const isHomepageApp =
    pathname.startsWith('/homepage-admin') ||
    pathname.startsWith('/api/homepage')

  // V2/홈페이지 관리자: Auth만 공유. V1 users/trial/session PATCH 미적용 (속도·비용)
  if (isV2App || isHomepageApp) {
    if (!user) {
      const isApi = pathname.startsWith('/api/v2') || pathname.startsWith('/api/homepage')
      if (isApi) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
      }
      if (!pathname.startsWith('/login')) {
        const login = new URL('/login', request.url)
        login.searchParams.set('next', pathname)
        return NextResponse.redirect(login)
      }
    }
    return supabaseResponse
  }

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

      const { data: userData } = await supabase
        .from('users')
        .select('role, approval_status, company_id')
        .eq('id', user.id)
        .single()

      if (!userData) {
        const noProfilePaths = ['/login', '/signup', '/auth/complete-signup']
        const isApi = pathname.startsWith('/api')
        const allowed = noProfilePaths.some((p) => pathname.startsWith(p))
        if (!isApi && !allowed) {
          return NextResponse.redirect(new URL('/auth/complete-signup', request.url))
        }
      }

      if (userData) {
        const pendingAllowedPaths = ['/signup/pending', '/signup/verify-email', '/login', '/signup']
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

