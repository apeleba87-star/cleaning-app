import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/supabase/server'
import PhotoReviewsClient from './PhotoReviewsClient'

export default async function BusinessPhotoReviewsPage() {
  const user = await getServerUser()
  if (!user || user.role !== 'business_owner') {
    redirect('/business/dashboard')
  }
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">사진 검수</h1>
        <a href="/business/dashboard" className="text-blue-600 hover:text-blue-800 text-sm">
          ← 대시보드로
        </a>
      </div>
      <p className="text-gray-600 text-sm mb-4">
        직원이 갤러리에서 선택한 체크리스트 사진만 표시됩니다. 확인 처리한 사진은 1일 후 목록에서 사라집니다.
      </p>
      <PhotoReviewsClient />
    </div>
  )
}
