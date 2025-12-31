'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

// CategoryGroupedSections를 동적으로 로드
const CategoryGroupedSections = dynamic(() => import('./CategoryGroupedSections'), {
  ssr: false,
})

interface Section {
  title: string
  href: string
  description: string
  category: string
  icon?: string
}

interface CategoryGroupedSectionsLazyProps {
  sections: Section[]
}

export default function CategoryGroupedSectionsLazy({ sections }: CategoryGroupedSectionsLazyProps) {
  const [shouldLoad, setShouldLoad] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Intersection Observer로 뷰포트에 들어올 때 로드
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' } // 200px 전에 미리 로드
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef}>
      {shouldLoad ? (
        <CategoryGroupedSections sections={sections} />
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">전체 기능</h2>
            <button
              onClick={() => setShouldLoad(true)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              펼치기 ▼
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
