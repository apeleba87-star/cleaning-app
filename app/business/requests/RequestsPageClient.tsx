'use client'

import { useState } from 'react'
import { Request, SupplyRequest } from '@/types/db'
import RequestList from './RequestList'
import SupplyRequestList from './SupplyRequestList'

interface RequestWithRelations extends Request {
  users: { id: string; name: string } | null
  stores: { id: string; name: string } | null
}

interface SupplyRequestWithRelations extends SupplyRequest {
  users: { id: string; name: string } | null
  stores: { id: string; name: string } | null
}

interface RequestsPageClientProps {
  initialRequests: RequestWithRelations[]
  initialSupplyRequests: SupplyRequestWithRelations[]
  storeMap: Map<string, string>
}

export default function RequestsPageClient({
  initialRequests,
  initialSupplyRequests,
  storeMap,
}: RequestsPageClientProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'requests' | 'supply'>('all')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">요청 관리</h1>
          <p className="text-sm text-gray-500">모든 요청을 한 곳에서 관리하세요</p>
        </div>
        <a
          href="/business/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          대시보드로
        </a>
      </div>

      {/* 탭 메뉴 */}
      <div className="mb-6 overflow-x-auto">
        <nav className="flex space-x-2 min-w-max bg-gray-50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200 ${
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            전체 요청
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200 relative ${
              activeTab === 'requests'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            일반 요청
            <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === 'requests'
                ? 'bg-white/20 text-white'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {initialRequests.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('supply')}
            className={`px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200 ${
              activeTab === 'supply'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md shadow-purple-500/30'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            물품요청
            <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === 'supply'
                ? 'bg-white/20 text-white'
                : 'bg-purple-100 text-purple-700'
            }`}>
              {initialSupplyRequests.length}
            </span>
          </button>
        </nav>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="space-y-6">
        {activeTab === 'all' && (
          <div className="space-y-6">
            {/* 일반 요청 섹션 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-1 shadow-lg shadow-blue-500/10">
              <div className="bg-white rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/30">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">일반 요청</h2>
                      <p className="text-sm text-gray-500">{initialRequests.length}건의 요청</p>
                    </div>
                  </div>
                </div>
                <RequestList initialRequests={initialRequests} storeMap={storeMap} />
              </div>
            </div>

            {/* 물품요청 섹션 */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-1 shadow-lg shadow-purple-500/10">
              <div className="bg-white rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/30">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">물품요청</h2>
                      <p className="text-sm text-gray-500">{initialSupplyRequests.length}건의 요청</p>
                    </div>
                  </div>
                </div>
                <SupplyRequestList initialSupplyRequests={initialSupplyRequests} storeMap={storeMap} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-1 shadow-lg shadow-blue-500/10">
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/30">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">일반 요청</h2>
                    <p className="text-sm text-gray-500">{initialRequests.length}건의 요청</p>
                  </div>
                </div>
              </div>
              <RequestList initialRequests={initialRequests} storeMap={storeMap} />
            </div>
          </div>
        )}

        {activeTab === 'supply' && (
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-1 shadow-lg shadow-purple-500/10">
            <div className="bg-white rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/30">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">물품요청</h2>
                    <p className="text-sm text-gray-500">{initialSupplyRequests.length}건의 요청</p>
                  </div>
                </div>
              </div>
              <SupplyRequestList initialSupplyRequests={initialSupplyRequests} storeMap={storeMap} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
