import { NextRequest, NextResponse } from 'next/server'

/**
 * 외부 이미지를 프록시하여 CORS 및 Referer 문제 해결
 * 네이버 블로그 썸네일 이미지 로딩을 위해 사용
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const imageUrl = searchParams.get('url')

    if (!imageUrl) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
    }

    // URL 검증
    let url: URL
    try {
      url = new URL(imageUrl)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // 허용된 도메인만 프록시 (보안)
    const allowedDomains = [
      'postfiles.pstatic.net',
      'blogfiles.naver.net',
      'blogpfthumb.pstatic.net',
      'ssl.pstatic.net',
    ]

    if (!allowedDomains.some((domain) => url.hostname.includes(domain))) {
      return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 })
    }

    // 이미지 가져오기
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Referer: 'https://blog.naver.com/',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      )
    }

    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    // 이미지 반환
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error: any) {
    console.error('Error proxying image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
