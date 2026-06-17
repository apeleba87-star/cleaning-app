import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getV2User } from '@/lib/v2/server'

export default async function V2StoreManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getV2User()
  if (!user) redirect('/login?next=/v2-store-manager')
  if (user.role !== 'store_manager') redirect('/v2')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-700 text-white px-4 py-3 flex justify-between items-center">
        <Link href="/v2-store-manager" className="font-bold">
          무플 매장관리자
        </Link>
        <span className="text-sm">{user.name}</span>
      </header>
      <main className="p-4">{children}</main>
    </div>
  )
}
