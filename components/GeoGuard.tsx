'use client'

import { useState, useEffect } from 'react'
import { GPSLocation } from '@/types/db'

interface GeoGuardProps {
  onLocationReady: (location: GPSLocation) => void
  children: React.ReactNode
  className?: string
}

export function GeoGuard({ onLocationReady, children, className }: GeoGuardProps) {
  const [location, setLocation] = useState<GPSLocation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [useMockLocation, setUseMockLocation] = useState(false)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('브라우저가 위치 서비스를 지원하지 않습니다.')
      setLoading(false)
      return
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc: GPSLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }
        setLocation(loc)
        onLocationReady(loc)
        setLoading(false)
      },
      (err) => {
        // 위치 권한이 거부되거나 실패한 경우 모의 위치 제공 옵션 표시
        setError(
          err.code === 1
            ? '위치 권한이 거부되었습니다. 위치 없이 관리 시작할 수 있습니다.'
            : err.code === 2
            ? '위치를 가져올 수 없습니다. 위치 없이 관리 시작할 수 있습니다.'
            : '위치 요청 시간이 초과되었습니다. 위치 없이 관리 시작할 수 있습니다.'
        )
        setLoading(false)
      },
      options
    )
  }, [onLocationReady])

  const handleUseMockLocation = () => {
    // 서울시청 좌표 (테스트용)
    const mockLocation: GPSLocation = {
      lat: 37.5665,
      lng: 126.9780,
      accuracy: 10,
    }
    setLocation(mockLocation)
    onLocationReady(mockLocation)
    setError(null)
    setUseMockLocation(true)
  }

  if (loading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">위치 정보 수집 중...</span>
        </div>
      </div>
    )
  }

  if (error && !useMockLocation) {
    return (
      <div className={className}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm mb-3">{error}</p>
          <div className="flex space-x-2">
            <button
              onClick={handleUseMockLocation}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              관리 시작 즉시 가기
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
            >
              재시도
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (useMockLocation && location) {
    return (
      <div className={className}>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-blue-800 text-xs">
            ⚠️ 테스트용 모의 위치 사용 중 (서울시청: {location.lat.toFixed(4)}, {location.lng.toFixed(4)})
          </p>
        </div>
        {children}
      </div>
    )
  }

  if (location) {
    return <div className={className}>{children}</div>
  }

  return null
}

// Hook 버전
export function useGeoLocation() {
  const [location, setLocation] = useState<GPSLocation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  return { location, error, loading }
}

