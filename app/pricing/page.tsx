import PricingClient from './PricingClient'

export const metadata = {
  title: '요금제 | 무플 청소 관리 솔루션',
  description: '무플의 투명한 요금제를 확인하세요. 매장당 9,900원부터 시작하는 합리적인 가격으로 현장을 유지하세요.',
}

export default function PricingPage() {
  return <PricingClient />
}
