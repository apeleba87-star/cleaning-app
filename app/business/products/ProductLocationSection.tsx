'use client'

import { useState } from 'react'
import ProductLocationList from './ProductLocationList'

interface ProductLocation {
  id: string
  store_id: string
  store_name?: string
  product_id: string
  product_name?: string
  vending_machine_number: number
  position_number: number
  stock_quantity: number
  is_available: boolean
  last_updated_at: string
  stores?: { id: string; name: string }
  products?: { id: string; name: string }
}

interface ProductLocationSectionProps {
  initialLocations: any[]
  stores: Array<{ id: string; name: string }>
}

export default function ProductLocationSection({ initialLocations, stores }: ProductLocationSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 데이터 변환
  const locations: Array<{
    id: string
    store_id: string
    store_name: string
    product_id: string
    product_name: string
    vending_machine_number: number
    position_number: number
    stock_quantity: number
    is_available: boolean
    last_updated_at: string
  }> = initialLocations.map((loc: any) => ({
    id: loc.id,
    store_id: loc.store_id,
    store_name: loc.stores?.name || loc.store_name || '알 수 없음',
    product_id: loc.product_id,
    product_name: loc.products?.name || loc.product_name || '알 수 없음',
    vending_machine_number: loc.vending_machine_number,
    position_number: loc.position_number,
    stock_quantity: loc.stock_quantity,
    is_available: loc.is_available,
    last_updated_at: loc.last_updated_at
  }))

  return (
    <div className="bg-white rounded-lg shadow-md mb-6">
      <div
        className="p-6 cursor-pointer flex justify-between items-center"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-lg font-semibold">제품 위치 정보 관리</h2>
        <button className="text-gray-500 hover:text-gray-700">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>
      {isExpanded && (
        <div className="px-6 pb-6">
          <ProductLocationList initialLocations={locations} stores={stores} />
        </div>
      )}
    </div>
  )
}




