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

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // 서버 컴포넌트에서 setAll 호출 시 무시 (읽기 전용)
          }
        },
      } as any,
    }
  )
}

export async function getServerSession() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }
    
    // getUser()는 user만 반환하므로, session 객체를 구성
    // refreshSession()을 통해 session을 가져옴
    const { data: { session } } = await supabase.auth.getSession()
    return session
  } catch (error: any) {
    return null
  }
}

export async function getServerUser() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // 보안: getUser()를 사용하여 서버에서 인증 확인
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser()
    
    if (getUserError || !user) {
      return null
    }
    
    // users 테이블에서 추가 정보 조회
    const { data, error } = await supabase
      .from('users')
      .select('id, role, name, phone, company_id, employment_contract_date, salary_date, salary_amount, employment_active')
      .eq('id', user.id)
      .single()

    // users 테이블에 데이터가 없으면 기본값 반환
    if (error) {
      // RLS 에러일 경우, 기본값 반환
      if (error.code === 'PGRST116' || error.message.includes('permission')) {
        return {
          ...user,
          role: 'staff' as const,
          name: user.email?.split('@')[0] || 'User',
          phone: null,
          company_id: null,
          employment_contract_date: null,
          salary_date: null,
          salary_amount: null,
          employment_active: true,
        }
      }
      
      // 다른 에러도 기본값 반환
      return {
        ...user,
        role: 'staff' as const,
        name: user.email?.split('@')[0] || 'User',
        phone: null,
        company_id: null,
        employment_contract_date: null,
        salary_date: null,
        salary_amount: null,
        employment_active: true,
      }
    }
  
    if (!data) {
      return {
        ...user,
        role: 'staff' as const,
        name: user.email?.split('@')[0] || 'User',
        phone: null,
        company_id: null,
        employment_contract_date: null,
        salary_date: null,
        salary_amount: null,
        employment_active: true,
      }
    }
  
    return { ...user, ...data }
  } catch (error: any) {
    return null
  }
}

/**
 * 세션을 갱신합니다.
 * @returns 갱신 성공 여부
 */
export async function refreshServerSession(): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient()
    
    // getUser()로 먼저 인증 확인
    const { data: { user }, error: getUserError } = await supabase.auth.getUser()
    
    if (getUserError || !user) {
      return false
    }
    
    // 세션 갱신 시도
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
    
    if (refreshError || !refreshData.session) {
      return false
    }
    
    return true
  } catch (error: any) {
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
    
    const supabase = await createServerSupabaseClient()
    
    // getUser()로 인증 확인
    const { data: { user }, error: getUserError } = await supabase.auth.getUser()
    
    // 자정 근처 시간대이고 사용자가 있으면 사전 갱신 시도
    if (nearMidnight && user) {
      await refreshServerSession()
    }
    
    // 사용자가 없으면 갱신 시도
    if (getUserError || !user) {
      const refreshed = await refreshServerSession()
      if (!refreshed) {
        return false
      }
      
      // 갱신 후 다시 확인
      const { data: { user: newUser } } = await supabase.auth.getUser()
      return !!newUser
    }
    
    return true
  } catch (error: any) {
    return false
  }
}
