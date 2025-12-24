import dynamic from 'next/dynamic'

const ChecklistClient = dynamic(() => import('./ChecklistClient'), {
  ssr: false,
  loading: () => (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 mb-16 md:mb-0">
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    </div>
  ),
})

export default function ChecklistPage() {
  return <ChecklistClient />
}
