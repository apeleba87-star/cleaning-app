import { getServerUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function TestUserPage() {
  const user = await getServerUser()

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">사용자 정보 없음</h1>
        <p>로그인이 필요합니다.</p>
        <a href="/login" className="text-blue-600 underline">로그인 페이지로</a>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">사용자 정보</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-3">
          <div>
            <span className="font-semibold">이메일:</span> {user.email}
          </div>
          <div>
            <span className="font-semibold">역할:</span> {user.role}
          </div>
          <div>
            <span className="font-semibold">이름:</span> {user.name}
          </div>
          <div>
            <span className="font-semibold">ID:</span> {user.id}
          </div>
        </div>
        
        <div className="mt-6">
          {user.role === 'admin' && (
            <a
              href="/dashboard"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              관리자 대시보드로 이동
            </a>
          )}
          {user.role === 'staff' && (
            <a
              href="/attendance"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              출퇴근 페이지로 이동
            </a>
          )}
          {user.role === 'manager' && (
            <a
              href="/reviews"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              리뷰 페이지로 이동
            </a>
          )}
        </div>
      </div>
    </div>
  )
}


