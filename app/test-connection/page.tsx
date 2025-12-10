'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestConnectionPage() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState<any>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createClient()
        
        // 1. 기본 연결 테스트 (auth 상태 확인)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        // 2. users 테이블 접근 테스트 (RLS로 보호됨)
        const { data, error } = await supabase
          .from('users')
          .select('count')
          .limit(1)
        
        if (error) {
          // PGRST205: 테이블이나 스키마가 존재하지 않음
          if (error.code === 'PGRST205') {
            setStatus('error')
            setMessage('❌ 데이터베이스 테이블이 존재하지 않습니다. SQL 마이그레이션을 실행해야 합니다.')
            setDetails({
              errorCode: error.code,
              errorMessage: error.message,
              solution: 'Supabase 대시보드 → SQL Editor에서 마이그레이션 SQL을 실행하세요.',
            })
          }
          // RLS 에러는 정상 (인증되지 않은 상태에서 접근 시)
          else if (error.code === 'PGRST116' || error.message.includes('permission')) {
            setStatus('connected')
            setMessage('✅ Supabase 연결 성공! (RLS 정책으로 인해 데이터 조회는 인증 필요)')
            setDetails({
              session: session ? '인증됨' : '인증 안 됨',
              errorCode: error.code,
              errorMessage: error.message,
            })
          } else {
            setStatus('error')
            setMessage(`❌ 연결 오류: ${error.message}`)
            setDetails({ errorCode: error.code, errorMessage: error.message })
          }
        } else {
          setStatus('connected')
          setMessage('✅ Supabase 연결 성공! 데이터 조회 가능')
          setDetails({
            session: session ? '인증됨' : '인증 안 됨',
            dataCount: data?.length,
          })
        }

        // 3. 환경 변수 확인
        const envCheck = {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 설정됨' : '❌ 없음',
          anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ 설정됨' : '❌ 없음',
        }
        setDetails((prev: any) => ({ ...prev, env: envCheck }))
      } catch (err) {
        setStatus('error')
        setMessage(`❌ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
        setDetails({ error: String(err) })
      }
    }
    
    testConnection()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6">Supabase 연결 테스트</h1>
        
        <div className={`p-4 rounded-lg mb-6 ${
          status === 'connected' ? 'bg-green-50 border border-green-200' :
          status === 'error' ? 'bg-red-50 border border-red-200' :
          'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            {status === 'checking' && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
            )}
            <p className={`font-medium ${
              status === 'connected' ? 'text-green-800' :
              status === 'error' ? 'text-red-800' :
              'text-yellow-800'
            }`}>
              {status === 'checking' && '연결 확인 중...'}
              {status === 'connected' && message}
              {status === 'error' && message}
            </p>
          </div>
          
          {details && (
            <div className="mt-4 text-sm">
              <details className="mt-2">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                  상세 정보 보기
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(details, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <p>• 환경 변수 확인: .env.local 파일에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되어 있어야 합니다.</p>
          <p>• 데이터베이스: Supabase 대시보드에서 마이그레이션 SQL을 실행했는지 확인하세요.</p>
          <p>• RLS: Row Level Security가 활성화되어 있으면 인증된 사용자만 데이터에 접근할 수 있습니다.</p>
        </div>

        <div className="mt-6">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← 홈으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  )
}

