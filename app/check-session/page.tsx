'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CheckSessionPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      setSessionInfo({
        hasSession: !!session,
        session: session ? {
          userId: session.user.id,
          email: session.user.email,
        } : null,
        error: error?.message,
      })
      setLoading(false)
    }
    
    checkSession()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">세션 확인 (클라이언트)</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <pre className="text-xs overflow-auto">
          {JSON.stringify(sessionInfo, null, 2)}
        </pre>
        
        {sessionInfo?.hasSession && (
          <div className="mt-4">
            <a
              href="/"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              홈으로 이동
            </a>
          </div>
        )}
        
        {!sessionInfo?.hasSession && (
          <div className="mt-4">
            <p className="text-red-600 mb-2">세션이 없습니다. 로그인이 필요합니다.</p>
            <a
              href="/login"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              로그인 페이지로
            </a>
          </div>
        )}
      </div>
    </div>
  )
}



