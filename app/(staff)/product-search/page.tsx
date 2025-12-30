'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Html5Qrcode } from 'html5-qrcode'

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
  const [searchValue, setSearchValue] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

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

      // 스마트 전환: 숫자만 입력하면 바코드, 텍스트면 제품명
      const isNumeric = /^\d+$/.test(searchValue.trim())
      
      if (isNumeric) {
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

      // 카메라 권한 확인
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        stream.getTracks().forEach(track => track.stop())
      } catch (permissionError: any) {
        console.error('Camera permission error:', permissionError)
        setError('카메라 접근 권한이 필요합니다. 브라우저에서 카메라 권한을 허용해주세요.')
        setScanning(false)
        return
      }

      const scannerElementId = 'barcode-scanner'
      const html5QrCode = new Html5Qrcode(scannerElementId)
      html5QrCodeRef.current = html5QrCode

      // 바코드 스캔 시작
      await html5QrCode.start(
        {
          facingMode: 'environment'
        },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText, decodedResult) => {
          console.log('Barcode detected:', decodedText)
          setSearchValue(decodedText)
          stopBarcodeScan()
          
          setTimeout(() => {
            handleSearch()
          }, 500)
        },
        (errorMessage) => {
          // 에러는 무시 (계속 스캔 시도)
        }
      )
    } catch (error: any) {
      console.error('Barcode scan error:', error)
      
      let errorMessage = '카메라를 시작할 수 없습니다.'
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = '카메라 접근 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.'
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = '카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.'
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = '카메라에 접근할 수 없습니다. 다른 앱에서 카메라를 사용 중일 수 있습니다.'
      }
      
      setError(errorMessage)
      setScanning(false)
    }
  }

  const stopBarcodeScan = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        await html5QrCodeRef.current.clear()
      } catch (error) {
        console.error('Error stopping scanner:', error)
      }
      html5QrCodeRef.current = null
    }
    setScanning(false)
  }

  const resetSearch = () => {
    setSearchValue('')
    setProducts([])
    setError(null)
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }

  useEffect(() => {
    return () => {
      stopBarcodeScan()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/mobile-dashboard" className="text-gray-600 text-xl">
              ←
            </Link>
            <h1 className="text-lg font-semibold">제품 위치 찾기</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* 매장 선택 - 간소화 */}
        {stores.length > 1 && (
          <div className="bg-white rounded-lg shadow-md p-3">
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 통합 검색 영역 - 상단 고정 */}
        <div className="bg-white rounded-lg shadow-md p-4 sticky top-[73px] z-10">
          <div className="flex gap-2">
            {/* 바코드 스캔 버튼 */}
            <button
              onClick={scanning ? stopBarcodeScan : startBarcodeScan}
              className={`px-4 py-3 rounded-lg font-medium transition-colors flex-shrink-0 ${
                scanning
                  ? 'bg-red-600 text-white'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {scanning ? '⏹ 중지' : '📷 스캔'}
            </button>
            
            {/* 통합 검색 입력창 */}
            <div className="flex-1 flex gap-2">
              <input
                ref={searchInputRef}
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch()
                  }
                }}
                placeholder="바코드 또는 제품명 입력"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              />
              <button
                onClick={handleSearch}
                disabled={loading || !selectedStoreId || !searchValue.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? '...' : '검색'}
              </button>
            </div>
          </div>

          {/* 스캔 중일 때 카메라 화면 */}
          {scanning && (
            <div className="mt-4 relative">
              <div id="barcode-scanner" className="w-full rounded-lg min-h-[300px] bg-black"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="border-2 border-blue-500 w-64 h-64 rounded-lg"></div>
                <p className="mt-4 text-white bg-black bg-opacity-70 px-4 py-2 rounded text-sm">
                  바코드를 카메라에 비춰주세요
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* 검색 결과 - 위치 정보 중심 */}
        {products.length > 0 && (
          <div className="space-y-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow-md p-5"
              >
                {/* 제품 기본 정보 - 간소화 */}
                <div className="flex gap-3 mb-4">
                  {product.image_url ? (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">📦</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold mb-1 truncate">{product.name}</h3>
                    {product.barcode && (
                      <p className="text-xs text-gray-500">
                        바코드: {product.barcode}
                      </p>
                    )}
                  </div>
                </div>

                {/* 위치 정보 - 가장 크고 명확하게 */}
                {product.locations.length > 0 ? (
                  <div className="border-t pt-4">
                    <div className="space-y-3">
                      {product.locations.map((location, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl ${
                            location.is_available
                              ? 'bg-blue-50 border-2 border-blue-500'
                              : 'bg-gray-50 border-2 border-gray-300 opacity-60'
                          }`}
                        >
                          <div className="text-center">
                            {/* 위치 정보 - 가장 크게 표시 */}
                            <div className="text-3xl font-bold text-blue-600 mb-2">
                              {location.vending_machine_number}번 자판기
                            </div>
                            <div className="text-2xl font-bold text-blue-700 mb-2">
                              {location.position_number}번
                            </div>
                            <div className="text-sm text-gray-600">
                              재고: {location.stock_quantity}개
                            </div>
                            {!location.is_available && (
                              <div className="mt-2">
                                <span className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full font-medium">
                                  품절
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border-t pt-4 text-center">
                    <p className="text-gray-500 text-sm py-2">
                      위치 정보가 없습니다.
                    </p>
                  </div>
                )}

                {/* 다시 검색 버튼 */}
                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={resetSearch}
                    className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    다시 검색
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
