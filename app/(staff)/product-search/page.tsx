'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  barcode: string | null
  image_url: string | null
  category_1: string | null
  category_2: string | null
  locations: Array<{
    vending_machine_number: number
    position_number: number
    stock_quantity: number
    is_available: boolean
  }>
}

interface Store {
  id: string
  name: string
}

export default function ProductSearchPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')
  const [searchType, setSearchType] = useState<'barcode' | 'name'>('barcode')
  const [searchValue, setSearchValue] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadUserAndStores()
  }, [])

  const loadUserAndStores = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('id', session.user.id)
        .single()

      if (!userData) {
        router.push('/login')
        return
      }

      setUser(userData)

      // 배정된 매장 조회
      const { data: storeAssignments } = await supabase
        .from('store_assign')
        .select(`
          store_id,
          stores:store_id (
            id,
            name
          )
        `)
        .eq('user_id', session.user.id)

      if (storeAssignments) {
        const storesData = storeAssignments
          .map((assignment: any) => assignment.stores)
          .filter((store: any) => store !== null) as Store[]

        setStores(storesData)

        // 첫 번째 매장을 기본 선택
        if (storesData.length > 0) {
          setSelectedStoreId(storesData[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading user and stores:', error)
    }
  }

  const handleSearch = async () => {
    if (!selectedStoreId) {
      setError('매장을 선택해주세요.')
      return
    }

    if (!searchValue.trim()) {
      setError('검색어를 입력해주세요.')
      return
    }

    setLoading(true)
    setError(null)
    setProducts([])

    try {
      const params = new URLSearchParams({
        store_id: selectedStoreId,
      })

      // 바코드 모드인데 숫자가 아닌 텍스트를 입력한 경우 자동으로 제품명 검색으로 전환
      const isNumeric = /^\d+$/.test(searchValue.trim())
      let actualSearchType = searchType
      
      if (searchType === 'barcode' && !isNumeric) {
        // 바코드는 보통 숫자이므로, 텍스트면 제품명 검색으로 자동 전환
        actualSearchType = 'name'
      }

      if (actualSearchType === 'barcode') {
        params.append('barcode', searchValue.trim())
      } else {
        params.append('name', searchValue.trim())
      }

      const response = await fetch(`/api/staff/products/search?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '검색에 실패했습니다.')
      }

      if (data.success) {
        setProducts(data.data)
        if (data.data.length === 0) {
          setError(data.message || '검색 결과가 없습니다. 제품명을 확인하거나 관리자에게 CSV 파일 업로드를 요청해주세요.')
        }
      }
    } catch (error: any) {
      console.error('Search error:', error)
      setError(error.message || '검색 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const startBarcodeScan = async () => {
    try {
      setScanning(true)
      setError(null)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        // 바코드 스캔 시도 (간단한 방법: 사용자가 Enter 키를 누르면 현재 입력값으로 검색)
        // 실제 바코드 스캔 라이브러리 통합은 나중에 추가 가능
        // 현재는 카메라 화면을 보여주고, 바코드를 수동으로 입력하도록 안내
      }
    } catch (error: any) {
      setError('카메라 접근 권한이 필요합니다.')
      setScanning(false)
    }
  }

  const stopBarcodeScan = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setScanning(false)
  }

  useEffect(() => {
    return () => {
      stopBarcodeScan()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/mobile-dashboard" className="text-gray-600">
              ←
            </Link>
            <h1 className="text-lg font-semibold">바코드 제품 찾기</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* 매장 선택 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            매장 선택
          </label>
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">매장을 선택하세요</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        {/* 검색 타입 선택 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            검색 방법
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSearchType('barcode')
                setSearchValue('')
                setProducts([])
              }}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                searchType === 'barcode'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              바코드
            </button>
            <button
              onClick={() => {
                setSearchType('name')
                setSearchValue('')
                setProducts([])
              }}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                searchType === 'name'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              제품명
            </button>
          </div>
        </div>

        {/* 검색 입력 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          {searchType === 'barcode' ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch()
                    }
                  }}
                  placeholder="바코드를 입력하거나 스캔하세요"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={scanning ? stopBarcodeScan : startBarcodeScan}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  {scanning ? '스캔 중지' : '📷 스캔'}
                </button>
              </div>
              {scanning && (
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full rounded-md"
                    autoPlay
                    playsInline
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="border-2 border-blue-500 w-64 h-64 rounded-lg"></div>
                    <p className="mt-4 text-white bg-black bg-opacity-50 px-4 py-2 rounded text-sm">
                      바코드를 카메라에 비춰주세요
                    </p>
                    <p className="mt-2 text-white bg-black bg-opacity-50 px-4 py-2 rounded text-xs">
                      (현재는 수동 입력을 사용해주세요)
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
              placeholder="제품명을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <button
            onClick={handleSearch}
            disabled={loading || !selectedStoreId || !searchValue.trim()}
            className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '검색 중...' : '검색'}
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* 검색 결과 */}
        {products.length > 0 && (
          <div className="space-y-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow-md p-4"
              >
                {/* 제품 정보 */}
                <div className="flex gap-4 mb-4">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-4xl">📦</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-1">{product.name}</h3>
                    {product.barcode && (
                      <p className="text-sm text-gray-600 mb-1">
                        바코드: {product.barcode}
                      </p>
                    )}
                    {(product.category_1 || product.category_2) && (
                      <p className="text-xs text-gray-500">
                        {product.category_1} {product.category_2 && `> ${product.category_2}`}
                      </p>
                    )}
                  </div>
                </div>

                {/* 위치 정보 */}
                {product.locations.length > 0 ? (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">📍 위치 정보</h4>
                    <div className="space-y-2">
                      {product.locations.map((location, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg ${
                            location.is_available
                              ? 'bg-blue-50 border border-blue-200'
                              : 'bg-gray-50 border border-gray-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-blue-600">
                                {location.vending_machine_number}번 자판기 / {location.position_number}번
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                재고: {location.stock_quantity}개
                              </p>
                            </div>
                            {!location.is_available && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                품절
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500 text-center py-2">
                      위치 정보가 없습니다.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

