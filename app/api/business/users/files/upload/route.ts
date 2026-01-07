import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 사용자 파일 업로드 API (Storage 업로드만 처리)
 * DB 저장은 /api/business/users/[id]/files POST에서 처리
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user || user.role !== 'business_owner') {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    if (!user.company_id) {
      return NextResponse.json(
        { error: '회사 정보가 없습니다.' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    const docType = formData.get('docType') as string
    const entity = formData.get('entity') as string

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다.' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 없습니다.' },
        { status: 400 }
      )
    }

    if (entity !== 'user') {
      return NextResponse.json(
        { error: '잘못된 엔티티 타입입니다.' },
        { status: 400 }
      )
    }

    // Service role key를 사용하여 Storage 업로드
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: '서버 설정 오류입니다.' },
        { status: 500 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
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

    // 파일 경로 생성
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `users/${userId}/${docType}/${fileName}`

    console.log('Uploading user file:', { userId, docType, filePath, fileSize: file.size })

    // Storage 버킷 확인 (documents 또는 cleaning-photos)
    const bucket = 'cleaning-photos' // 기본 버킷 사용
    
    // Storage에 업로드
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '31536000', // 1년 (초) - 이미지 캐싱 최적화
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: `파일 업로드 실패: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Public URL 가져오기
    const { data: urlData } = adminSupabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: '파일 URL을 가져올 수 없습니다.' },
        { status: 500 }
      )
    }

    console.log('User file upload successful:', { filePath, publicUrl: urlData.publicUrl })

    return NextResponse.json({
      success: true,
      data: {
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
      },
    })
  } catch (error: any) {
    console.error('Error in POST /api/business/users/files/upload:', error)
    return NextResponse.json(
      { error: `서버 오류: ${error.message || '알 수 없는 오류'}` },
      { status: 500 }
    )
  }
}

