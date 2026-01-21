import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    
    if (!user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: '새 비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // 보안: getUser()를 사용하여 서버에서 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 400 }
      )
    }

    // 현재 비밀번호 확인
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (signInError) {
      // 더 구체적인 에러 메시지 반환
      let errorMessage = '현재 비밀번호가 올바르지 않습니다.'
      if (signInError.message) {
        if (signInError.message.includes('Invalid login credentials')) {
          errorMessage = '현재 비밀번호가 올바르지 않습니다. 다시 확인해주세요.'
        } else if (signInError.message.includes('Email not confirmed')) {
          errorMessage = '이메일 인증이 완료되지 않았습니다.'
        } else {
          errorMessage = `로그인 실패: ${signInError.message}`
        }
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    // 새 비밀번호로 업데이트
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      console.error('Error updating password:', updateError)
      // Supabase 에러 메시지를 더 구체적으로 반환
      let errorMessage = '비밀번호 변경에 실패했습니다.'
      if (updateError.message) {
        if (updateError.message.includes('password')) {
          errorMessage = '비밀번호 형식이 올바르지 않습니다. 비밀번호는 최소 6자 이상이어야 합니다.'
        } else if (updateError.message.includes('session')) {
          errorMessage = '세션이 만료되었습니다. 다시 로그인해주세요.'
        } else {
          errorMessage = `비밀번호 변경 실패: ${updateError.message}`
        }
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.',
    })
  } catch (error: any) {
    console.error('Error in change-password:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

