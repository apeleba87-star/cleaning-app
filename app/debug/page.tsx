import { getServerUser, getServerSession } from '@/lib/supabase/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export default async function DebugPage() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  const session = await getServerSession()
  const user = await getServerUser()
  const supabase = await createServerSupabaseClient()

  let dbUser = null
  let allUsers = null
  if (session?.user) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()
    dbUser = { data, error: error?.message, errorCode: error?.code }
    
    // 전체 users 테이블 확인 (RLS 테스트)
    const { data: allData, error: allError } = await supabase
      .from('users')
      .select('id, role, name, phone')
      .limit(5)
    allUsers = { data: allData, error: allError?.message, errorCode: allError?.code }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">디버그 정보</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">0. 쿠키 정보</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(
              {
                cookieCount: allCookies.length,
                cookieNames: allCookies.map(c => c.name),
                supabaseCookies: allCookies
                  .filter(c => c.name.includes('sb-') || c.name.includes('supabase'))
                  .map(c => ({ name: c.name, hasValue: !!c.value, valueLength: c.value?.length || 0 })),
              },
              null,
              2
            )}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">1. 세션 정보</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(
              {
                hasSession: !!session,
                userId: session?.user?.id,
                email: session?.user?.email,
              },
              null,
              2
            )}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">2. getServerUser() 결과</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">3. DB users 테이블 조회 결과 (본인)</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(dbUser, null, 2)}
          </pre>
        </div>

        {allUsers && (
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="font-bold mb-2">4. users 테이블 전체 조회 (RLS 테스트)</h2>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(allUsers, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
          <h2 className="font-bold mb-2">해결 방법</h2>
          <p className="text-sm">
            만약 "DB users 테이블 조회 결과"에 데이터가 없다면, 다음 SQL을 실행하세요:
          </p>
          <pre className="mt-2 p-2 bg-white text-xs overflow-auto">
{`DO $$
DECLARE
    user_uuid UUID;
BEGIN
    SELECT id INTO user_uuid
    FROM auth.users
    WHERE email = 'apeleba@naver.com';
    
    IF user_uuid IS NOT NULL THEN
        INSERT INTO public.users (id, role, name, phone)
        VALUES (user_uuid, 'admin', '최고운영자', NULL)
        ON CONFLICT (id) 
        DO UPDATE SET 
            role = 'admin',
            name = '최고운영자',
            updated_at = NOW() AT TIME ZONE 'utc';
        
        RAISE NOTICE 'Admin user created/updated!';
    END IF;
END $$;`}
          </pre>
        </div>
      </div>
    </div>
  )
}

