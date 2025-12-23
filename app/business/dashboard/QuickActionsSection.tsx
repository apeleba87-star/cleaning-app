'use client'

import { useState } from 'react'
import Link from 'next/link'
import QuickExpenseForm from './QuickExpenseForm'

export default function QuickActionsSection() {
  const [activeAction, setActiveAction] = useState<'receipt' | 'payroll' | 'expense' | null>(null)

  const actions = [
    {
      id: 'receipt' as const,
      title: '수금 등록',
      description: '매장 수금 내역을 빠르게 등록',
      icon: '💰',
      href: '/business/receivables',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      id: 'payroll' as const,
      title: '인건비 등록',
      description: '직원 급여 및 일당 등록',
      icon: '💵',
      href: '/business/payrolls',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      id: 'expense' as const,
      title: '지출 등록',
      description: '소모품, 약품비 등 지출 등록',
      icon: '📝',
      href: '/business/financial?section=expense',
      color: 'bg-orange-500 hover:bg-orange-600',
    },
  ]

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 등록</h2>
      
      {/* 빠른 등록 버튼 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {actions.map((action) => (
          <div key={action.id}>
            {action.id === 'expense' ? (
              <button
                onClick={() => setActiveAction(activeAction === 'expense' ? null : 'expense')}
                className={`w-full ${action.color} text-white rounded-lg p-4 text-center transition-all hover:shadow-lg`}
              >
                <div className="text-3xl mb-2">{action.icon}</div>
                <div className="font-semibold">{action.title}</div>
                <div className="text-xs opacity-90 mt-1">{action.description}</div>
              </button>
            ) : (
              <Link
                href={action.href}
                className={`block w-full ${action.color} text-white rounded-lg p-4 text-center transition-all hover:shadow-lg`}
              >
                <div className="text-3xl mb-2">{action.icon}</div>
                <div className="font-semibold">{action.title}</div>
                <div className="text-xs opacity-90 mt-1">{action.description}</div>
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* 지출 빠른 등록 폼 */}
      {activeAction === 'expense' && (
        <div className="mt-4 border-t pt-4">
          <QuickExpenseForm onSuccess={() => setActiveAction(null)} />
        </div>
      )}
    </div>
  )
}


