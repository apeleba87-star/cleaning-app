import { NextResponse } from 'next/server'

export async function GET() {
  const manifest = {
    name: '청소 관리 앱',
    short_name: '청소관리',
    description: '청소 관리 시스템 - 직원용 앱',
    start_url: '/mobile-dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    orientation: 'portrait',
    icons: [
      // 개발 환경에서는 아이콘 제외 (필요시 추가)
      // {
      //   src: '/icon-192.png',
      //   sizes: '192x192',
      //   type: 'image/png',
      //   purpose: 'any maskable',
      // },
      // {
      //   src: '/icon-512.png',
      //   sizes: '512x512',
      //   type: 'image/png',
      //   purpose: 'any maskable',
      // },
    ],
    categories: ['business', 'productivity'],
  }

  return NextResponse.json(manifest)
}


