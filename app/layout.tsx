import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Inter } from 'next/font/google'
import './globals.css'
import PWARegister from '@/components/PWARegister'
import KakaoConsultFab from '@/components/KakaoConsultFab'

const NAVER_ANALYTICS_WA = '6ee301d54f8f28'
const GTM_ID = 'GTM-MHC6FP8Z'
const GA_MEASUREMENT_ID = 'G-HC84YK3YF1'

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
        {/* Google Tag Manager - head 상단 */}
        <Script id="gtm-head" strategy="beforeInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
        {/* Google tag (gtag.js) - GA4 직접 설치 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-config" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
        </Script>
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
        <meta name="naver-site-verification" content="dd8aa4e731fa35e5850c8e12fcd0e3eb39fd36ab" />
      </head>
      <body className={inter.className}>
        {/* Google Tag Manager (noscript) - body 직후 */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
            title="Google Tag Manager"
          />
        </noscript>
        <PWARegister />
        <KakaoConsultFab />
        {children}
        {/* 네이버 애널리틱스 - 사이트 통계 (닫는 body 앞) */}
        <Script
          src="https://wcs.pstatic.net/wcslog.js"
          strategy="afterInteractive"
        />
        <Script id="naver-analytics-wa" strategy="afterInteractive">
          {`if(!wcs_add) var wcs_add = {}; wcs_add["wa"] = "${NAVER_ANALYTICS_WA}"; if(window.wcs) { wcs_do(); }`}
        </Script>
      </body>
    </html>
  )
}

