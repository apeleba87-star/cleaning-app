import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PWARegister from '@/components/PWARegister'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '무플 - 현장을 유지하는 운영 구조',
  description: '새로운 현장을 늘리는 것보다, 지금의 현장을 지켜내는 게 더 중요합니다. 무플은 현장을 관리가 아니라 유지하게 만드는 운영 구조입니다.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '무플(MUPL)',
  },
  openGraph: {
    title: '무플 - 현장을 유지하는 운영 구조',
    description: '새로운 현장을 늘리는 것보다, 지금의 현장을 지켜내는 게 더 중요합니다. 무플은 현장을 관리가 아니라 유지하게 만드는 운영 구조입니다.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '무플 - 현장을 유지하는 운영 구조',
    description: '새로운 현장을 늘리는 것보다, 지금의 현장을 지켜내는 게 더 중요합니다.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="무플(MUPL)" />
        <meta property="og:title" content="무플 - 현장을 유지하는 운영 구조" />
        <meta property="og:description" content="새로운 현장을 늘리는 것보다, 지금의 현장을 지켜내는 게 더 중요합니다. 무플은 현장을 관리가 아니라 유지하게 만드는 운영 구조입니다." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="무플 - 현장을 유지하는 운영 구조" />
        <meta name="twitter:description" content="새로운 현장을 늘리는 것보다, 지금의 현장을 지켜내는 게 더 중요합니다." />
      </head>
      <body className={inter.className}>
        <PWARegister />
        {children}
      </body>
    </html>
  )
}

