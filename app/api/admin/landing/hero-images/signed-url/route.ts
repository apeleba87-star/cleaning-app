import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 이미지 URL을 Signed URL로 변환 (private 버킷용)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageUrl } = body

    if (!imageUrl) {
      return NextResponse.json(
        { error: '이미지 URL이 필요합니다.' },
        { status: 400 }
      )
    }

    // Supabase Storage URL에서 경로 추출
    // 예: https://xxx.supabase.co/storage/v1/object/public/cleaning-photos/hero-images/xxx.jpg
    const urlMatch = imageUrl.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)$/)
    
    if (!urlMatch) {
      // 이미 Signed URL이거나 다른 형식이면 그대로 반환
      return NextResponse.json({
        success: true,
        signedUrl: imageUrl,
      })
    }

    const bucket = urlMatch[1]
    const filePath = urlMatch[2]

    // 서비스 역할 키로 Signed URL 생성
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: '서버 설정 오류입니다.' },
        { status: 500 }
      )
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 1년 유효한 Signed URL 생성
    const { data: signedData, error: signedError } = await adminSupabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600 * 24 * 365)

    if (signedError || !signedData?.signedUrl) {
      console.error('Failed to create signed URL:', signedError)
      // 실패 시 원본 URL 반환
      return NextResponse.json({
        success: true,
        signedUrl: imageUrl,
      })
    }

    return NextResponse.json({
      success: true,
      signedUrl: signedData.signedUrl,
    })
  } catch (error: any) {
    console.error('Error in POST /api/admin/landing/hero-images/signed-url:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}
