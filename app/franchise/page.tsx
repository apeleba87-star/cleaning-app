import { redirect } from 'next/navigation'

export default function FranchisePage() {
  // 프렌차이즈 관리자는 매장 상태 페이지로 자동 리다이렉트
  redirect('/franchise/stores/status')
}
