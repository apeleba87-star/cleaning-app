'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LandingPageManager from './LandingPageManager'

export default function LandingPageAdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">랜딩 페이지 관리</h1>
          <p className="mt-2 text-sm text-gray-600">
            웹사이트의 히어로 섹션과 콘텐츠를 관리할 수 있습니다.
          </p>
        </div>
        <LandingPageManager />
      </div>
    </div>
  )
}
