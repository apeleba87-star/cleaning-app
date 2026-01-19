import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isNearMidnightKST } from '@/lib/utils/date' 

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please check your .env.local file."
    )
  }

  // 디버깅: 쿠키 확인 (더 상세하게)
  const allCookies = cookieStore.getAll()
  const supabaseCookies = allCookies.filter(c => 
    c.name.includes('sb-') || c.name.includes('supabase')
  )
  if (supabaseCookies.length > 0) {
    console.log('Server: Found Supabase cookies:', supabaseCookies.map(c => ({
      name: c.name,
      hasValue: !!c.value,
      valueLength: c.value?.length || 0
    })))
  } else {
    console.log('Server: No Supabase cookies found. All cookies:', allCookies.map(c => c.name))
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          const cookies = cookieStore.getAll()
          console.log('Server: getAll() called, returning', cookies.length, 'cookies')
          return cookies
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
            console.log('Server: setAll() called for', cookiesToSet.length, 'cookies')
          } catch (error) {
            // 서버 컴포넌트에서 setAll 호출 시 무시 (읽기 전용)
            console.log('Cookie setAll error (expected in server components):', error)
          }
        },
      } as any,
    }
  )
}

export async function getServerSession() {
  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const authCookie = allCookies.find(c => c.name.includes('sb-') && c.name.includes('auth-token'))
    
    if (authCookie) {
      console.log('Server: Auth cookie found:', authCookie.name)
      console.log('Server: Cookie value length:', authCookie.value?.length || 0)
      console.log('Server: Cookie value preview:', authCookie.value?.substring(0, 50) || 'empty')
    }
    
    const supabase = await createServerSupabaseClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()
    
    if (error) {
      console.log('Server: getSession() error:', error.message, error.status)
      console.log('Server: Error details:', JSON.stringify(error, null, 2))
      return null
    }
    
    if (session) {
      console.log('Server: Session found for user:', session.user.email)
    } else {
      console.log('Server: No session found')
      // 쿠키 값 직접 확인
      if (authCookie?.value) {
        try {
          const decoded = decodeURIComponent(authCookie.value)
          console.log('Server: Decoded cookie preview:', decoded.substring(0, 100))
        } catch (e) {
          console.log('Server: Failed to decode cookie:', e)
        }
      }
    }
    
    return session
  } catch (error: any) {
    console.log('Server: getServerSession() exception:', error.message)
    console.log('Server: Exception stack:', error.stack)
    return null
  }
}

export async function getServerUser() {
  const session = await getServerSession()
  if (!session?.user) return null

  const supabase = await createServerSupabaseClient()
  
  // RLS를 우회하기 위해 service role key 사용 시도 (하지만 anon key로 시도)
  const { data, error } = await supabase
    .from('users')
    .select('id, role, name, phone, company_id, employment_contract_date, salary_date, salary_amount, employment_active')
    .eq('id', session.user.id)
    .single()

  // users 테이블에 데이터가 없으면 세션 정보만 반환 (기본값: staff)
  // 하지만 admin 계정의 경우 DB에 데이터가 있어야 함
  if (error) {
    console.log('Error fetching user:', error.message, error.code)
    console.log('Session user ID:', session.user.id)
    console.log('Session user email:', session.user.email)
    
    // RLS 에러일 경우, 세션 정보만 반환
    if (error.code === 'PGRST116' || error.message.includes('permission')) {
      console.log('RLS permission denied, returning session only')
      return {
        ...session.user,
        role: 'staff' as const,
        name: session.user.email?.split('@')[0] || 'User',
        phone: null,
        company_id: null,
        employment_contract_date: null,
        salary_date: null,
        salary_amount: null,
        employment_active: true,
      }
    }
    
    // 다른 에러도 세션 정보 반환
    return {
      ...session.user,
      role: 'staff' as const,
      name: session.user.email?.split('@')[0] || 'User',
      phone: null,
      company_id: null,
      employment_contract_date: null,
      salary_date: null,
      salary_amount: null,
      employment_active: true,
    }
  }
  
  if (!data) {
    console.log('No user data found in users table')
    return {
      ...session.user,
      role: 'staff' as const,
      name: session.user.email?.split('@')[0] || 'User',
      phone: null,
      company_id: null,
      employment_contract_date: null,
      salary_date: null,
      salary_amount: null,
      employment_active: true,
    }
  }
  
  return { ...session.user, ...data }
}

/**
 * 세션을 갱신합니다.
 * @returns 갱신 성공 여부
 */
export async function refreshServerSession(): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session }, error: getSessionError } = await supabase.auth.getSession()
    
    if (getSessionError || !session) {
      console.log('Server: Cannot refresh session - no session found')
      return false
    }
    
    // 세션 갱신 시도
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
    
    if (refreshError) {
      console.log('Server: Session refresh error:', refreshError.message)
      return false
    }
    
    if (refreshData.session) {
      console.log('Server: Session refreshed successfully')
      return true
    }
    
    return false
  } catch (error: any) {
    console.log('Server: refreshServerSession() exception:', error.message)
    return false
  }
}

/**
 * 세션을 확인하고 필요시 갱신합니다.
 * 자정 근처 시간대(23:50 ~ 00:10)에는 사전 갱신을 시도합니다.
 * 세션이 만료된 경우 갱신을 시도합니다.
 * @returns 세션이 유효한지 여부
 */
export async function ensureValidSession(): Promise<boolean> {
  try {
    // 자정 근처 시간대인지 확인
    const nearMidnight = isNearMidnightKST()
    
    // 세션 확인
    const session = await getServerSession()
    
    // 자정 근처 시간대이고 세션이 있으면 사전 갱신 시도
    if (nearMidnight && session) {
      console.log('Server: Near midnight - attempting preemptive session refresh')
      await refreshServerSession()
    }
    
    // 세션이 없으면 갱신 시도
    if (!session) {
      console.log('Server: Session expired - attempting refresh')
      const refreshed = await refreshServerSession()
      if (!refreshed) {
        console.log('Server: Session refresh failed')
        return false
      }
      
      // 갱신 후 다시 확인
      const newSession = await getServerSession()
      return !!newSession
    }
    
    return true
  } catch (error: any) {
    console.log('Server: ensureValidSession() exception:', error.message)
    return false
  }
}
