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

  const handleSearch = async (searchText?: string) => {
    // searchText가 제공되면 사용, 없으면 searchValue 상태 사용
    const query = searchText !== undefined ? searchText : searchValue
    
    if (!selectedStoreId) {
      setError('매장을 선택해주세요.')
      return
    }

    if (!query.trim()) {
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
      const isNumeric = /^\d+$/.test(query.trim())
      
      if (isNumeric) {
        params.append('barcode', query.trim())
      } else {
        params.append('name', query.trim())
      }

      const response = await fetch(`/api/staff/products/search?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '검색에 실패했습니다.')
      }

      if (data.success) {
        // 위치 정보가 있는 제품을 먼저, 없는 제품을 나중에 정렬
        const sortedProducts = [...data.data].sort((a, b) => {
          const aHasLocation = a.locations && a.locations.length > 0
          const bHasLocation = b.locations && b.locations.length > 0
          
          // 위치가 있는 제품이 먼저 오도록 (true가 false보다 앞에)
          if (aHasLocation && !bHasLocation) return -1
          if (!aHasLocation && bHasLocation) return 1
          return 0
        })
        
        setProducts(sortedProducts)
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
          // 상태 업데이트와 검색을 동시에 수행
          setSearchValue(decodedText)
          stopBarcodeScan()
          
          // 바코드 값을 직접 전달하여 검색 (상태 업데이트 대기 불필요)
          handleSearch(decodedText)
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 pb-24">
      {/* 헤더 - 모바일 최적화 */}
      <div className="bg-white border-b border-gray-200 shadow-sm px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/mobile-dashboard" className="text-gray-600 text-2xl hover:text-gray-800 transition-colors">
              ←
            </Link>
            <h1 className="text-lg font-bold text-gray-800">제품 위치 찾기</h1>
          </div>
        </div>
      </div>

      <div className="px-3 py-3 space-y-3 max-w-md mx-auto">
        {/* 매장 선택 - 모바일 최적화 */}
        {stores.length > 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">매장 선택</label>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 통합 검색 영역 - 모바일 최적화 */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-3 sticky top-[57px] z-10">
          {/* 검색 입력 영역 */}
          <div className="flex gap-2 mb-2">
            {/* 바코드 스캔 버튼 - 더 큰 터치 영역 */}
            <button
              onClick={scanning ? stopBarcodeScan : startBarcodeScan}
              className={`px-4 py-3 rounded-xl font-semibold transition-all flex-shrink-0 shadow-sm ${
                scanning
                  ? 'bg-red-500 text-white active:bg-red-600'
                  : 'bg-gradient-to-r from-green-500 to-green-600 text-white active:from-green-600 active:to-green-700'
              }`}
            >
              <span className="text-lg">{scanning ? '⏹' : '📷'}</span>
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
                placeholder="바코드 또는 제품명"
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base bg-gray-50"
              />
              <button
                onClick={() => handleSearch()}
                disabled={loading || !selectedStoreId || !searchValue.trim()}
                className="px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-semibold shadow-sm active:scale-95"
              >
                {loading ? (
                  <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  '검색'
                )}
              </button>
            </div>
          </div>

          {/* 스캔 중일 때 카메라 화면 - 모바일 최적화 */}
          {scanning && (
            <div className="mt-3 relative rounded-xl overflow-hidden shadow-lg">
              <div id="barcode-scanner" className="w-full aspect-square bg-black"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {/* 스캔 가이드 프레임 - qrbox 크기(250px)와 정확히 일치 */}
                <div className="relative">
                  <div className="border-4 border-blue-500 rounded-2xl w-[250px] h-[250px] shadow-lg">
                    {/* 모서리 강조 */}
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl"></div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl"></div>
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl"></div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-2xl"></div>
                  </div>
                </div>
                {/* 안내 메시지 */}
                <div className="mt-6 bg-black bg-opacity-75 backdrop-blur-sm px-6 py-3 rounded-full">
                  <p className="text-white text-sm font-medium text-center">
                    📷 바코드를 프레임 안에 맞춰주세요
                  </p>
                </div>
                {/* 스캔 중지 버튼 */}
                <div className="mt-4 pointer-events-auto">
                  <button
                    onClick={stopBarcodeScan}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-full font-semibold shadow-lg active:scale-95 transition-all"
                  >
                    스캔 중지
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 에러 메시지 - 모바일 최적화 */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="text-red-500 text-xl">⚠️</span>
              <p className="text-red-800 text-sm flex-1">{error}</p>
            </div>
          </div>
        )}

        {/* 검색 결과 - 모바일 최적화 */}
        {products.length > 0 && (
          <div className="space-y-3">
            {products.map((product) => {
              const hasLocation = product.locations && product.locations.length > 0
              
              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-xl shadow-md border-2 overflow-hidden transition-all ${
                    hasLocation 
                      ? 'border-blue-200' 
                      : 'border-gray-200 opacity-75'
                  }`}
                >
                  {/* 제품 기본 정보 - 모바일 최적화 */}
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex gap-3 items-start">
                      {product.image_url ? (
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border-2 border-gray-100">
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="80px"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border-2 border-gray-100">
                          <span className="text-3xl">📦</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-800 mb-1.5 line-clamp-2 leading-tight">
                          {product.name}
                        </h3>
                        {product.barcode && (
                          <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md inline-block">
                            🏷️ {product.barcode}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 위치 정보 - 모바일 최적화 */}
                  {hasLocation ? (
                    <div className="px-4 pb-4 pt-2">
                      <div className="space-y-2.5">
                        {product.locations.map((location, idx) => (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl shadow-sm transition-all ${
                              location.is_available
                                ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-400'
                                : 'bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 opacity-70'
                            }`}
                          >
                            <div className="text-center">
                              {/* 위치 정보 - 모바일에서 더 크고 명확하게 */}
                              <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="text-2xl">📍</span>
                                <div className="text-2xl font-extrabold text-blue-700">
                                  {location.vending_machine_number}번 자판기
                                </div>
                              </div>
                              <div className="flex items-center justify-center gap-2 mb-3">
                                <span className="text-xl">🔢</span>
                                <div className="text-3xl font-extrabold text-blue-800">
                                  {location.position_number}번
                                </div>
                              </div>
                              <div className="flex items-center justify-center gap-4 text-sm">
                                <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm">
                                  <span className="text-gray-600 font-medium">재고: </span>
                                  <span className="text-blue-700 font-bold">{location.stock_quantity}개</span>
                                </div>
                              </div>
                              {!location.is_available && (
                                <div className="mt-3">
                                  <span className="px-4 py-1.5 bg-red-100 text-red-700 text-sm rounded-full font-bold shadow-sm">
                                    ⚠️ 품절
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 pb-4 pt-2">
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-2">📍</div>
                        <p className="text-yellow-800 font-semibold text-sm">
                          위치 정보가 없습니다
                        </p>
                        <p className="text-yellow-600 text-xs mt-1">
                          관리자에게 CSV 파일 업로드를 요청해주세요
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 다시 검색 버튼 - 모바일 최적화 */}
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                    <button
                      onClick={resetSearch}
                      className="w-full px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all font-semibold shadow-sm active:scale-98"
                    >
                      🔄 다시 검색
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
