import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PWARegister from '@/components/PWARegister'
import KakaoConsultFab from '@/components/KakaoConsultFab'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '무플 청소 관리 솔루션',
  description: '새로운 현장을 늘리는 것보다, 지금의 현장을 지켜내는 게 더 중요합니다. 무플은 현장을 관리가 아니라 유지하게 만드는 운영 구조입니다.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '무플(MUPL)',
  },
  openGraph: {
    title: '무플 청소 관리 솔루션',
    description: '새로운 현장을 늘리는 것보다, 지금의 현장을 지켜내는 게 더 중요합니다. 무플은 현장을 관리가 아니라 유지하게 만드는 운영 구조입니다.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '무플 청소 관리 솔루션',
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="무플(MUPL)" />
        <meta property="og:title" content="무플 청소 관리 솔루션" />
        <meta property="og:description" content="새로운 현장을 늘리는 것보다, 지금의 현장을 지켜내는 게 더 중요합니다. 무플은 현장을 관리가 아니라 유지하게 만드는 운영 구조입니다." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="무플 청소 관리 솔루션" />
        <meta name="twitter:description" content="새로운 현장을 늘리는 것보다, 지금의 현장을 지켜내는 게 더 중요합니다." />
      </head>
      <body className={inter.className}>
        <PWARegister />
        <KakaoConsultFab />
        {children}
      </body>
    </html>
  )
}

