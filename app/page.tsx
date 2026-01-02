import { redirect } from 'next/navigation'
import { getServerUser, getServerSession } from '@/lib/supabase/server'

export default async function HomePage() {
  // 먼저 세션 확인
  const session = await getServerSession()
  
  // 세션이 없으면 로그인 페이지로
  if (!session?.user) {
    redirect('/login')
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
}

