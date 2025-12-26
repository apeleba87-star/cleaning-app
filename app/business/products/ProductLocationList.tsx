'use client'

import { useState, useEffect } from 'react'

interface ProductLocation {
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
}

interface ProductLocationListProps {
  initialLocations: ProductLocation[]
  stores: Array<{ id: string; name: string }>
}

export default function ProductLocationList({ initialLocations, stores }: ProductLocationListProps) {
  const [locations, setLocations] = useState<ProductLocation[]>(initialLocations)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [editingLocation, setEditingLocation] = useState<ProductLocation | null>(null)

  const loadLocations = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (selectedStoreId) {
        params.append('store_id', selectedStoreId)
      }

      const response = await fetch(`/api/business/products/locations?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '위치 정보 조회에 실패했습니다.')
      }

      if (data.success) {
        setLocations(data.data)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLocations()
  }, [selectedStoreId])

  const handleDelete = async (locationId: string) => {
    if (!confirm('정말 이 위치 정보를 삭제하시겠습니까?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/business/products/locations/${locationId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '위치 정보 삭제에 실패했습니다.')
      }

      setLocations(locations.filter(l => l.id !== locationId))
      setSelectedProducts(prev => {
        const next = new Set(prev)
        next.delete(locationId)
        return next
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) {
      setError('삭제할 위치 정보를 선택해주세요.')
      return
    }

    const count = selectedProducts.size
    if (!confirm(`정말 선택한 ${count}개의 위치 정보를 삭제하시겠습니까?`)) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const deletePromises = Array.from(selectedProducts).map(locationId =>
        fetch(`/api/business/products/locations/${locationId}`, {
          method: 'DELETE'
        })
      )

      const responses = await Promise.all(deletePromises)
      const results = await Promise.all(responses.map(async r => {
        const data = await r.json()
        return { ok: r.ok, data }
      }))

      const failed = results.filter(r => !r.ok)
      if (failed.length > 0) {
        const errorMessages = failed.map(r => r.data?.error || '알 수 없는 오류').join(', ')
        throw new Error(`${failed.length}개의 위치 정보 삭제에 실패했습니다: ${errorMessages}`)
      }

      setLocations(locations.filter(l => !selectedProducts.has(l.id)))
      setSelectedProducts(new Set())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(locations.map(l => l.id)))
    } else {
      setSelectedProducts(new Set())
    }
  }

  const handleSelectLocation = (locationId: string, checked: boolean) => {
    setSelectedProducts(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(locationId)
      } else {
        next.delete(locationId)
      }
      return next
    })
  }

  const handleUpdate = async (location: ProductLocation, updates: { stock_quantity?: number; is_available?: boolean }) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/business/products/locations/${location.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '위치 정보 수정에 실패했습니다.')
      }

      setLocations(locations.map(l => 
        l.id === location.id 
          ? { ...l, ...updates }
          : l
      ))
      setEditingLocation(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredLocations = selectedStoreId
    ? locations.filter(l => l.store_id === selectedStoreId)
    : locations

  return (
    <div className="space-y-4">
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
        {selectedProducts.size > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors"
          >
            선택 삭제 ({selectedProducts.size})
          </button>
        )}
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
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filteredLocations.length > 0 && selectedProducts.size === filteredLocations.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  매장
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  제품명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  자판기/위치
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  재고
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    등록된 위치 정보가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredLocations.map((location) => (
                  <tr key={location.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(location.id)}
                        onChange={(e) => handleSelectLocation(location.id, e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{location.store_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{location.product_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {location.vending_machine_number}번 자판기 / {location.position_number}번
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {location.stock_quantity}개
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {location.is_available ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          재고 있음
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                          품절
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingLocation(location)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(location.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 수정 모달 */}
      {editingLocation && (
        <LocationEditModal
          location={editingLocation}
          onSave={(updates) => handleUpdate(editingLocation, updates)}
          onCancel={() => setEditingLocation(null)}
        />
      )}
    </div>
  )
}

// 위치 정보 수정 모달
function LocationEditModal({
  location,
  onSave,
  onCancel
}: {
  location: ProductLocation
  onSave: (updates: { stock_quantity?: number; is_available?: boolean }) => void
  onCancel: () => void
}) {
  const [stockQuantity, setStockQuantity] = useState(location.stock_quantity)
  const [isAvailable, setIsAvailable] = useState(location.is_available)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        stock_quantity: stockQuantity,
        is_available: isAvailable
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">위치 정보 수정</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              매장
            </label>
            <input
              type="text"
              value={location.store_name}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제품명
            </label>
            <input
              type="text"
              value={location.product_name}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              위치
            </label>
            <input
              type="text"
              value={`${location.vending_machine_number}번 자판기 / ${location.position_number}번`}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              재고 수량
            </label>
            <input
              type="number"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">재고 있음</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

