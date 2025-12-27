'use client'

import { useState, useEffect } from 'react'

interface StoreProduct {
  store_id: string
  store_name: string
  product_count: number
  products: Array<{
    product_id: string
    product_name: string
    location_count: number
  }>
}

interface StoreProductSectionProps {
  stores: Array<{ id: string; name: string }>
}

export default function StoreProductSection({ stores }: StoreProductSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')

  const loadStoreProducts = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (selectedStoreId) {
        params.append('store_id', selectedStoreId)
      }

      const response = await fetch(`/api/business/products/store-products?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '매장별 제품 조회에 실패했습니다.')
      }

      if (data.success) {
        setStoreProducts(data.data)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isExpanded) {
      loadStoreProducts()
    }
  }, [isExpanded, selectedStoreId])

  return (
    <div className="bg-white rounded-lg shadow-md mb-6">
      <div
        className="p-6 cursor-pointer flex justify-between items-center"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-lg font-semibold">제품 등록 매장 관리</h2>
        <button className="text-gray-500 hover:text-gray-700">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>
      {isExpanded && (
        <div className="px-6 pb-6 space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div className="flex-1 max-w-md">
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체 매장</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {loading && (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          )}

          {!loading && (
            <div className="space-y-4">
              {storeProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  등록된 제품이 있는 매장이 없습니다.
                </div>
              ) : (
                storeProducts.map((storeProduct) => (
                  <div key={storeProduct.store_id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold">{storeProduct.store_name}</h3>
                      <span className="text-sm text-gray-600">
                        {storeProduct.product_count}개 제품
                      </span>
                    </div>
                    <div className="space-y-2">
                      {storeProduct.products.map((product) => (
                        <div key={product.product_id} className="bg-white rounded p-3 flex justify-between items-center">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{product.product_name}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {product.location_count}개 위치
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}



