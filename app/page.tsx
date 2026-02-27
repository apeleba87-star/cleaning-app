import { redirect } from 'next/navigation'
import { getServerUser, getServerSession } from '@/lib/supabase/server'
import LandingPage from '@/components/LandingPage'
import Link from 'next/link'

export default async function HomePage() {
  try {
    // 먼저 세션 확인
    const session = await getServerSession()

    // 세션이 없으면 랜딩 페이지 표시
    if (!session?.user) {
      return <LandingPage />
    }

    // 사용자 정보 가져오기
    const user = await getServerUser()

    // 사용자 정보가 없으면 기본값으로 처리
    if (!user) {
      // 세션은 있지만 users 테이블에 없으면 기본 staff로 처리
      redirect('/attendance')
    }

    // 역할별 리다이렉트
    if (user.role === 'staff' || user.role === 'subcontract_company' || user.role === 'subcontract_individual') {
      redirect('/mobile-dashboard')
    } else if (user.role === 'manager') {
      redirect('/reviews')
    } else if (user.role === 'business_owner') {
      redirect('/business/dashboard')
    } else if (user.role === 'franchise_manager') {
      redirect('/franchise/dashboard')
    } else if (user.role === 'store_manager') {
      redirect('/store-manager/dashboard')
    } else if (user.role === 'platform_admin') {
      redirect('/platform/dashboard')
    } else if (user.role === 'admin') {
      redirect('/dashboard')
    }

    redirect('/login')
  } catch (err: unknown) {
    // Next.js redirect는 throw로 동작하므로 재throw
    if (err && typeof err === 'object' && 'digest' in err && String((err as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw err
    }
    console.error('[HomePage]', err)
    // 예외 시 최소한의 폴백 UI (로그인/랜딩 링크)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <h1 className="text-xl font-bold text-gray-800 mb-2">무플 청소 관리</h1>
        <p className="text-gray-600 text-sm mb-4 text-center">
          일시적인 오류가 발생했거나 연결을 확인해 주세요.
        </p>
        <Link
          href="/login"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          로그인
        </Link>
      </div>
    )
  }
}

