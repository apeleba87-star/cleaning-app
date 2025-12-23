'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Section {
  title: string
  href: string
  description: string
  category: string
  icon?: string
}

interface CategoryGroupedSectionsProps {
  sections: Section[]
}

export default function CategoryGroupedSections({ sections }: CategoryGroupedSectionsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const categories = [
    {
      id: 'store',
      name: '매장 관리',
      icon: '📍',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      sections: sections.filter((s) => s.category === 'store'),
    },
    {
      id: 'user',
      name: '직원 관리',
      icon: '👥',
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
      sections: sections.filter((s) => s.category === 'user'),
    },
    {
      id: 'financial',
      name: '재무 관리',
      icon: '💰',
      color: 'bg-green-50 border-green-200 hover:bg-green-100',
      sections: sections.filter((s) => s.category === 'financial'),
    },
    {
      id: 'operation',
      name: '운영 관리',
      icon: '📋',
      color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
      sections: sections.filter((s) => s.category === 'operation'),
    },
    {
      id: 'settings',
      name: '설정',
      icon: '⚙️',
      color: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
      sections: sections.filter((s) => s.category === 'settings'),
    },
  ]

  const hasContent = categories.some((cat) => cat.sections.length > 0)

  if (!hasContent) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">전체 기능</h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {isExpanded ? '접기 ▲' : '펼치기 ▼'}
        </button>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(
            (category) =>
              category.sections.length > 0 && (
                <div
                  key={category.id}
                  className={`${category.color} rounded-lg p-4 border-2 transition-all`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{category.icon}</span>
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  </div>
                  <div className="space-y-2">
                    {category.sections.map((section) => (
                      <Link
                        key={section.href}
                        href={section.href}
                        className="block p-2 bg-white rounded hover:shadow-md transition-all"
                      >
                        <p className="font-medium text-sm text-gray-900">{section.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )
          )}
        </div>
      )}
    </div>
  )
}



