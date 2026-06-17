import Link from 'next/link'

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between">
        <Link href="/v2" className="font-bold text-lg">
          무플 V2
        </Link>
        <span className="text-xs bg-blue-600 px-2 py-1 rounded">무료</span>
      </header>
      <main>{children}</main>
    </div>
  )
}
