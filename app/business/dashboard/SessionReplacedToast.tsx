'use client'

import { useEffect } from 'react'
import { useToast } from '@/components/Toast'

export function SessionReplacedToast() {
  const { showToast, ToastContainer } = useToast()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sessionReplaced = localStorage.getItem('sessionReplaced')
      if (sessionReplaced === 'true') {
        showToast('동시 접속 제한으로 인해 기존 세션이 종료되었습니다. 다른 기기에서 로그인하셨다면 해당 기기에서 로그아웃되었습니다.', 'info', 5000)
        localStorage.removeItem('sessionReplaced')
      }
    }
  }, [showToast])

  return <ToastContainer />
}
