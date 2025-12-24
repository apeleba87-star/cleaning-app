'use client'

import { useState, useEffect, FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UserProfile {
  id: string
  name: string
  phone: string | null
  email?: string
  role: string
  employment_type: string | null
  pay_type: string | null
  pay_amount: number | null
  salary_amount: number | null
  salary_date: number | null
  hire_date: string | null
  resignation_date: string | null
}

interface Store {
  id: string
  name: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [assignedStores, setAssignedStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  
  // 비밀번호 변경 관련 state
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push('/login')
          return
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, phone, role, employment_type, pay_type, pay_amount, salary_amount, salary_date, hire_date, resignation_date')
          .eq('id', session.user.id)
          .single()

        if (userError) {
          console.error('Error loading user profile:', userError)
          setLoading(false)
          return
        }

        // 이메일은 auth.users에서 가져오기
        const { data: authUser } = await supabase.auth.getUser()
        setUser({
          ...userData,
          email: authUser.user?.email,
        })

        // 배정된 매장 조회
        const { data: storeAssignments, error: assignError } = await supabase
          .from('store_assign')
          .select(`
            store_id,
            stores:store_id (
              id,
              name
            )
          `)
          .eq('user_id', session.user.id)

        if (assignError) {
          console.error('Error loading store assignments:', assignError)
        } else {
          const stores: Store[] = (storeAssignments || [])
            .map((assignment: any) => assignment.stores)
            .filter((store: any): store is Store => store !== null && store !== undefined)
            .sort((a: Store, b: Store) => a.name.localeCompare(b.name))
          
          setAssignedStores(stores)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading profile:', error)
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      staff: '직원',
      manager: '매니저',
      business_owner: '사업주',
      franchise_manager: '프렌차이즈 관리자',
      store_manager: '매장 관리자',
      platform_admin: '플랫폼 관리자',
    }
    return roleMap[role] || role
  }

  const getEmploymentTypeLabel = (type: string | null) => {
    if (!type) return '-'
    const typeMap: Record<string, string> = {
      regular: '정규',
      contract: '계약',
      part_time: '파트타임',
    }
    return typeMap[type] || type
  }

  const getPayTypeLabel = (type: string | null) => {
    if (!type) return '-'
    const typeMap: Record<string, string> = {
      monthly: '월급',
      daily: '일급',
      contract: '도급',
    }
    return typeMap[type] || type
  }

  // 새 비밀번호 확인 실시간 검증
  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value)
    if (value && newPassword && value !== newPassword) {
      setConfirmPasswordError('새 비밀번호와 일치하지 않습니다.')
    } else {
      setConfirmPasswordError(null)
    }
  }

  // 새 비밀번호 변경 시 확인 비밀번호도 재검증
  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value)
    if (confirmPassword && value !== confirmPassword) {
      setConfirmPasswordError('새 비밀번호와 일치하지 않습니다.')
    } else {
      setConfirmPasswordError(null)
    }
  }

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordError(null)
    setCurrentPasswordError(null)
    setConfirmPasswordError(null)
    setPasswordSuccess(false)

    // 입력 검증
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('모든 필드를 입력해주세요.')
      setPasswordLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('새 비밀번호는 최소 6자 이상이어야 합니다.')
      setPasswordLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('새 비밀번호와 일치하지 않습니다.')
      setPasswordError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.')
      setPasswordLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const text = await response.text()
      let data
      
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        throw new Error('서버 응답을 처리할 수 없습니다.')
      }

      if (!response.ok) {
        // 에러 메시지를 더 명확하게 표시
        const errorMessage = data?.error || `비밀번호 변경에 실패했습니다. (오류 코드: ${response.status})`
        
        console.log('비밀번호 변경 실패:', { errorMessage, status: response.status, data })
        
        // 현재 비밀번호 오류인 경우 (에러 메시지 패턴으로 판단)
        const isCurrentPasswordError = 
          (response.status === 400 && errorMessage.includes('현재 비밀번호')) || 
          errorMessage.includes('현재 비밀번호가 올바르지 않습니다') ||
          errorMessage.includes('Invalid login') ||
          errorMessage.includes('로그인 실패')
        
        console.log('비밀번호 오류 분석:', { 
          isCurrentPasswordError, 
          errorMessage, 
          status: response.status,
          includesCurrentPassword: errorMessage.includes('현재 비밀번호'),
          includesInvalid: errorMessage.includes('Invalid login')
        })
        
        if (isCurrentPasswordError) {
          console.log('✅ 현재 비밀번호 오류로 설정합니다.')
          setCurrentPasswordError('현재 비밀번호가 올바르지 않습니다.')
          setPasswordError(null)
        } else {
          console.log('❌ 일반 에러로 설정합니다:', errorMessage)
          setPasswordError(errorMessage)
          setCurrentPasswordError(null)
        }
        
        setPasswordLoading(false)
        return
      }

      // 성공 처리
      setPasswordSuccess(true)
      setPasswordError(null)
      setCurrentPasswordError(null)
      setConfirmPasswordError(null)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      // 3초 후 성공 메시지 숨기고 폼 닫기
      setTimeout(() => {
        setPasswordSuccess(false)
        setShowPasswordChange(false)
      }, 3000)
      
      setPasswordLoading(false)
    } catch (error: any) {
      console.error('Error changing password:', error)
      setPasswordError(error.message || '비밀번호 변경 중 오류가 발생했습니다.')
      setPasswordLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center px-4">
          <p className="text-red-600 mb-4">프로필 정보를 불러올 수 없습니다.</p>
          <Link
            href="/mobile-dashboard"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            대시보드로 이동
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      {/* 헤더 */}
      <div className="bg-blue-600 text-white p-4 mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/mobile-dashboard"
            className="w-8 h-8 flex items-center justify-center hover:bg-blue-700 rounded-full transition-colors"
          >
            ←
          </Link>
          <h1 className="text-lg font-semibold">프로필</h1>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* 프로필 카드 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-purple-400 rounded-full flex items-center justify-center text-3xl">
              👤
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
              <p className="text-sm text-gray-600">{getRoleLabel(user.role)}</p>
            </div>
          </div>

          {/* 기본 정보 */}
          <div className="space-y-4 border-t pt-4">
            <div>
              <label className="text-sm font-medium text-gray-600">이메일</label>
              <p className="mt-1 text-base text-gray-800">{user.email || '-'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">전화번호</label>
              <p className="mt-1 text-base text-gray-800">{user.phone || '-'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">고용 형태</label>
              <p className="mt-1 text-base text-gray-800">{getEmploymentTypeLabel(user.employment_type)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">급여 방식</label>
              <p className="mt-1 text-base text-gray-800">{getPayTypeLabel(user.pay_type)}</p>
            </div>

            {/* 급여/도급급액 */}
            {(user.pay_amount || user.salary_amount) && (
              <div>
                <label className="text-sm font-medium text-gray-600">
                  {user.pay_type === 'contract' ? '도급급액' : '급여'}
                </label>
                <p className="mt-1 text-base text-gray-800 font-semibold">
                  {((user.pay_amount || user.salary_amount || 0).toLocaleString('ko-KR'))}원
                </p>
              </div>
            )}

            {/* 급여일 */}
            {user.salary_date && (
              <div>
                <label className="text-sm font-medium text-gray-600">급여일</label>
                <p className="mt-1 text-base text-gray-800">매월 {user.salary_date}일</p>
              </div>
            )}

            {/* 배정된 매장 */}
            {assignedStores.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600">배정된 매장</label>
                <div className="mt-2 space-y-2">
                  {assignedStores.map((store) => (
                    <div
                      key={store.id}
                      className="px-3 py-2 bg-gray-50 rounded-md border border-gray-200"
                    >
                      <p className="text-base text-gray-800">{store.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {user.hire_date && (
              <div>
                <label className="text-sm font-medium text-gray-600">입사일</label>
                <p className="mt-1 text-base text-gray-800">
                  {new Date(user.hire_date).toLocaleDateString('ko-KR')}
                </p>
              </div>
            )}

            {user.resignation_date && (
              <div>
                <label className="text-sm font-medium text-gray-600">퇴사일</label>
                <p className="mt-1 text-base text-gray-800">
                  {new Date(user.resignation_date).toLocaleDateString('ko-KR')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 비밀번호 변경 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">비밀번호 변경</h3>
            <button
              onClick={() => {
                setShowPasswordChange(!showPasswordChange)
                setPasswordError(null)
                setCurrentPasswordError(null)
                setConfirmPasswordError(null)
                setPasswordSuccess(false)
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
              }}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {showPasswordChange ? '취소' : '변경하기'}
            </button>
          </div>

          {showPasswordChange && (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* 성공 메시지 */}
              {passwordSuccess && (
                <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-green-800 font-semibold">비밀번호가 성공적으로 변경되었습니다.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 에러 메시지 - 더 눈에 띄게 표시 */}
              {passwordError && (
                <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-red-800 font-semibold mb-1">비밀번호 변경 실패</p>
                      <p className="text-red-700 text-sm">{passwordError}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  현재 비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                    // 입력 시 에러 초기화 (재시도)
                    if (currentPasswordError) {
                      setCurrentPasswordError(null)
                    }
                  }}
                  required
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    currentPasswordError
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {currentPasswordError && (
                  <p className="mt-1 text-sm text-red-600">{currentPasswordError}</p>
                )}
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => handleNewPasswordChange(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">최소 6자 이상 입력해주세요.</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호 확인 <span className="text-red-500">*</span>
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  required
                  minLength={6}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    confirmPasswordError
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                {confirmPasswordError && (
                  <p className="mt-1 text-sm text-red-600">{confirmPasswordError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {passwordLoading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          )}
        </div>

        {/* 뒤로 가기 버튼 */}
        <Link
          href="/mobile-dashboard"
          className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    </div>
  )
}

