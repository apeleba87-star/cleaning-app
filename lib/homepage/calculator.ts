import type {
  HomepageCalculatorSettings,
  HomepageEstimateInput,
  HomepageEstimateResult,
} from '@/types/homepage'

export const HOMEPAGE_CLEANING_OPTIONS = [
  { key: 'balcony', label: '베란다 추가' },
  { key: 'window', label: '창틀 집중 청소' },
  { key: 'mold', label: '곰팡이/오염 집중 관리' },
]

export const DEFAULT_HOMEPAGE_CALCULATOR: HomepageCalculatorSettings = {
  site_id: '',
  industry: 'move_in_cleaning',
  enabled: true,
  base_unit_price: 13000,
  minimum_price: 250000,
  pollution_extra_light: 0,
  pollution_extra_normal: 0,
  pollution_extra_heavy: 50000,
  no_elevator_extra: 30000,
  region_extras: {},
  option_extras: {
    balcony: 30000,
    window: 40000,
    mold: 50000,
  },
  discount_rate: 0,
  result_notice: '실제 견적은 오염도, 구조, 현장 상황에 따라 달라질 수 있습니다.',
  caution_note: '방문 상담 후 최종 금액이 확정됩니다.',
}

export function toNumber(value: unknown, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function calculateHomepageEstimate(
  input: HomepageEstimateInput,
  settings: HomepageCalculatorSettings
): HomepageEstimateResult {
  const area = Math.max(0, toNumber(input.area_pyeong))
  const baseAmount = Math.round(area * toNumber(settings.base_unit_price))
  const optionExtras = input.options.reduce((sum, key) => {
    return sum + toNumber(settings.option_extras?.[key])
  }, 0)
  const regionExtra = toNumber(settings.region_extras?.[input.region])
  const pollutionExtra =
    input.pollution === 'heavy'
      ? toNumber(settings.pollution_extra_heavy)
      : input.pollution === 'normal'
        ? toNumber(settings.pollution_extra_normal)
        : toNumber(settings.pollution_extra_light)
  const elevatorExtra = input.elevator === 'no' ? toNumber(settings.no_elevator_extra) : 0
  const extraAmount = optionExtras + regionExtra + pollutionExtra + elevatorExtra
  const beforeDiscount = Math.max(baseAmount + extraAmount, toNumber(settings.minimum_price))
  const discountAmount = Math.round(beforeDiscount * (toNumber(settings.discount_rate) / 100))
  const estimatedAmount = Math.max(0, beforeDiscount - discountAmount)

  return {
    baseAmount,
    extraAmount,
    discountAmount,
    estimatedAmount,
  }
}

export function formatWon(amount: number) {
  return `${Math.round(amount).toLocaleString('ko-KR')}원`
}
