'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface HeroSliderProps {
  images: string[]
  interval?: number
}

export default function HeroSlider({ images, interval = 5000 }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
    }, interval)

    return () => clearInterval(timer)
  }, [images.length, interval])

  if (images.length === 0) {
    // 이미지가 없을 때 기본 배경 - 브라우니 스타일: 어두운 그라데이션
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="absolute inset-0 bg-black/40" />
      </div>
    )
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      {images.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {image ? (
            // Supabase Storage URL은 일반 img 태그 사용 (Next.js Image 최적화 우회)
            <img
              src={image}
              alt={`Hero image ${index + 1}`}
              className="absolute inset-0 w-full h-full object-cover brightness-75"
              style={{ filter: 'brightness(0.6)' }}
              onError={(e) => {
                console.error('Image load error:', image, e)
                // 에러 발생 시 기본 배경 표시
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          )}
          {/* 오버레이 - 텍스트 가독성을 위한 어두운 오버레이 */}
          <div className="absolute inset-0 bg-black/50" />
        </div>
      ))}
      {/* 인디케이터 제거 - 브라우니는 인디케이터가 없음 */}
    </div>
  )
}
